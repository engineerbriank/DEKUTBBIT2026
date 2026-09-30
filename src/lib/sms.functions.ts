import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SMS_PLAN_OPTIONS = [
  { id: "week", label: "1 week", amount: 30 },
  { id: "two_weeks", label: "2 weeks", amount: 50 },
  { id: "month", label: "1 month", amount: 100 },
] as const;

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function hashCode(userId: string, code: string) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: administrator access is required.");
}

export const getSmsStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("sms_subscribers")
      .select("premium_until, phone, phone_verified, pending_phone")
      .eq("user_id", context.userId)
      .maybeSingle();
    const until = data?.premium_until ?? null;
    return {
      premiumUntil: until,
      isPremium: !!until && new Date(until) > new Date(),
      phone: data?.phone ?? null,
      phoneVerified: !!data?.phone_verified,
      pendingPhone: data?.pending_phone ?? null,
    };
  });

export const startSmsPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { plan: string; phone: string }) => input)
  .handler(async ({ data, context }) => {
    const { SMS_PLANS, normalizePhone, mpesaStkPush } = await import("@/lib/sms.server");
    const plan = SMS_PLANS[data.plan as keyof typeof SMS_PLANS];
    if (!plan) throw new Error("Choose a plan");
    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("Enter a valid Safaricom number, e.g. 0712345678");
    const checkoutId = await mpesaStkPush(phone, plan.amount, "BBIT-SMS");
    const { error } = await (await db()).from("sms_payments").insert({
      user_id: context.userId, plan: data.plan, amount: plan.amount, phone, checkout_request_id: checkoutId,
    });
    if (error) throw new Error(error.message);
    return { checkoutId };
  });

export const checkSmsPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { checkoutId: string }) => input)
  .handler(async ({ data, context }) => {
    const admin = await db();
    const { data: pay } = await admin
      .from("sms_payments").select("*")
      .eq("checkout_request_id", data.checkoutId).eq("user_id", context.userId).maybeSingle();
    if (!pay) throw new Error("Payment not found");
    if (pay.status !== "pending") return { status: pay.status };
    const { mpesaStatus, SMS_PLANS } = await import("@/lib/sms.server");
    const res = await mpesaStatus(data.checkoutId);
    if (res.status === "pending") return { status: "pending" };
    // Claim the pending row atomically so the plan is credited exactly once.
    const { data: claimed } = await admin
      .from("sms_payments")
      .update({ status: res.status, receipt: res.receipt, updated_at: new Date().toISOString() })
      .eq("id", pay.id).eq("status", "pending").select("id");
    if (res.status === "completed" && claimed?.length) {
      const days = SMS_PLANS[pay.plan as keyof typeof SMS_PLANS].days;
      const { data: sub } = await admin.from("sms_subscribers").select("premium_until").eq("user_id", context.userId).maybeSingle();
      const base = sub?.premium_until && new Date(sub.premium_until) > new Date() ? new Date(sub.premium_until) : new Date();
      const until = new Date(base.getTime() + days * 86400000).toISOString();
      await admin.from("sms_subscribers").upsert(
        { user_id: context.userId, premium_until: until, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    }
    return { status: res.status };
  });

export const requestPhoneCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string }) => input)
  .handler(async ({ data, context }) => {
    const { normalizePhone, sendSms } = await import("@/lib/sms.server");
    const admin = await db();
    const { data: sub } = await admin.from("sms_subscribers").select("premium_until, code_expires_at").eq("user_id", context.userId).maybeSingle();
    if (!sub?.premium_until || new Date(sub.premium_until) <= new Date()) throw new Error("Upgrade to SMS Premium first");
    if (sub.code_expires_at && new Date(sub.code_expires_at).getTime() - 9 * 60000 > Date.now())
      throw new Error("Wait a minute before requesting another code");
    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("Enter a valid phone number, e.g. 0712345678");
    const { randomInt } = await import("node:crypto");
    const code = String(randomInt(100000, 1000000));
    await admin.from("sms_subscribers").update({
      pending_phone: phone, code_hash: await hashCode(context.userId, code),
      code_expires_at: new Date(Date.now() + 10 * 60000).toISOString(), code_attempts: 0,
    }).eq("user_id", context.userId);
    const res = await sendSms([phone], `DEKUT BBIT 2026: Your verification code is ${code}. It expires in 10 minutes.`);
    if (!res.accepted) throw new Error("Could not send the code. Check the number and try again.");
    return { ok: true };
  });

export const verifyPhoneCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const admin = await db();
    const { data: sub } = await admin.from("sms_subscribers").select("*").eq("user_id", context.userId).maybeSingle();
    if (!sub?.code_hash || !sub.pending_phone || !sub.code_expires_at) throw new Error("Request a code first");
    if (new Date(sub.code_expires_at) < new Date()) throw new Error("Code expired. Request a new one.");
    if (sub.code_attempts >= 5) throw new Error("Too many attempts. Request a new code.");
    if ((await hashCode(context.userId, (data.code ?? "").trim())) !== sub.code_hash) {
      await admin.from("sms_subscribers").update({ code_attempts: sub.code_attempts + 1 }).eq("user_id", context.userId);
      throw new Error("Incorrect code");
    }
    await admin.from("sms_subscribers").update({
      phone: sub.pending_phone, phone_verified: true, pending_phone: null, code_hash: null, code_expires_at: null, code_attempts: 0,
    }).eq("user_id", context.userId);
    return { ok: true };
  });

export const adminListSmsRecipients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { premiumRecipients } = await import("@/lib/sms.server");
    const recips = await premiumRecipients();
    const admin = await db();
    const ids = recips.map((r) => r.user_id);
    const { data: profiles } = ids.length
      ? await admin.from("profiles").select("id, full_name, email").in("id", ids)
      : { data: [] as any[] };
    const { data: logs } = await context.supabase
      .from("sms_logs").select("id, kind, message, recipient_count, accepted_count, status, created_at")
      .order("created_at", { ascending: false }).limit(20);
    return {
      recipients: recips.map((r) => {
        const p = (profiles ?? []).find((x: any) => x.id === r.user_id);
        return { userId: r.user_id, phone: r.phone, name: p?.full_name || p?.email || "Member" };
      }),
      logs: logs ?? [],
    };
  });

export const adminSendSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message: string; userIds?: string[] }) => {
    if (!input?.message?.trim()) throw new Error("Type a message");
    if (input.message.length > 480) throw new Error("Message is too long (max 480 characters)");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { broadcastSms } = await import("@/lib/sms.server");
    const result = await broadcastSms("custom", data.message.trim(), null, context.userId, data.userIds?.length ? data.userIds : undefined);
    if (result.status === "failed") throw new Error("SMS sending failed. Try again.");
    return result;
  });
