/** Server-only SMS (NENA) + M-Pesa (Makamesco) helpers. */
const SMS_URL = "https://nenasolutions.co.ke/v1/api/sms/send";
const MPESA_URL = "https://mpesa.makamescopay.com/api/payments";
export const SITE_LINK = "https://dekutbbit2026.online";

export const SMS_PLANS = {
  week: { label: "1 week", amount: 30, days: 7 },
  two_weeks: { label: "2 weeks", amount: 50, days: 14 },
  month: { label: "1 month", amount: 100, days: 30 },
} as const;
export type SmsPlan = keyof typeof SMS_PLANS;

export function normalizePhone(raw: string): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  let local = "";
  if (digits.startsWith("254") && digits.length === 12) local = digits.slice(3);
  else if (digits.startsWith("0") && digits.length === 10) local = digits.slice(1);
  else if (digits.length === 9) local = digits;
  if (!/^[17]\d{8}$/.test(local)) return null;
  return `254${local}`;
}

export async function sendSms(numbers: string[], message: string) {
  const token = process.env["NENA_SMS_API_TOKEN"];
  if (!token) throw new Error("SMS service is not configured");
  const unique = [...new Set(numbers.filter(Boolean))];
  let accepted = 0;
  let failed = false;
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    try {
      const res = await fetch(SMS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to: batch, message }),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok || json?.data?.status === "failed") {
        failed = true;
        console.error("SMS send failed", res.status, JSON.stringify(json).slice(0, 300));
      } else accepted += json?.data?.accepted?.length ?? batch.length;
    } catch (error) {
      failed = true;
      console.error("SMS send error", error);
    }
  }
  return { accepted, total: unique.length, status: failed ? (accepted ? "partial" : "failed") : "queued" };
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Verified phone numbers of members whose premium is still active. */
export async function premiumRecipients(userIds?: string[]) {
  const db = await admin();
  let q = db
    .from("sms_subscribers")
    .select("user_id, phone")
    .eq("phone_verified", true)
    .gt("premium_until", new Date().toISOString());
  if (userIds?.length) q = q.in("user_id", userIds);
  const { data } = await q;
  return (data ?? []).filter((r) => r.phone) as { user_id: string; phone: string }[];
}

/** Send one message to every active premium member. Never throws; dedupes by key. */
export async function broadcastSms(kind: string, message: string, dedupeKey: string | null, createdBy: string | null, userIds?: string[]) {
  try {
    const db = await admin();
    const recipients = await premiumRecipients(userIds);
    const { data: log, error } = await db
      .from("sms_logs")
      .insert({ kind, message, recipient_count: recipients.length, status: "sending", dedupe_key: dedupeKey, created_by: createdBy })
      .select("id")
      .single();
    if (error) return { accepted: 0, total: 0, status: "duplicate" };
    if (!recipients.length) {
      await db.from("sms_logs").update({ status: "no_recipients" }).eq("id", log.id);
      return { accepted: 0, total: 0, status: "no_recipients" };
    }
    const result = await sendSms(recipients.map((r) => r.phone), message);
    await db.from("sms_logs").update({ status: result.status, accepted_count: result.accepted }).eq("id", log.id);
    return result;
  } catch (error) {
    console.error("broadcastSms failed", kind, error);
    return { accepted: 0, total: 0, status: "failed" };
  }
}

function clip(text: string, max: number) {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export const smsTemplates = {
  announcement: (title: string, body: string) =>
    `DEKUT BBIT 2026: New announcement - ${clip(title, 60)}. ${clip(body, 160)}\nRead more: ${SITE_LINK}/announcements`,
  resource: (title: string, unit: string) =>
    `DEKUT BBIT 2026: New document "${clip(title, 60)}" for ${clip(unit, 50)} is now available. Download it: ${SITE_LINK}/resources`,
  timetable: (count: number) =>
    `DEKUT BBIT 2026: The class timetable has been updated (${count} class${count === 1 ? "" : "es"}). View it: ${SITE_LINK}/timetable`,
};

export async function mpesaStkPush(phone: string, amount: number, reference: string) {
  const key = process.env["MAKAMESCO_MPESA_API_KEY"];
  if (!key) throw new Error("Payments are not configured");
  const res = await fetch(`${MPESA_URL}/stkpush`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": key },
    body: JSON.stringify({ phoneNumber: phone, amount, accountReference: reference, transactionDesc: "BBIT SMS Premium" }),
  });
  const json: any = await res.json().catch(() => ({}));
  const id =
    json?.checkoutRequestId ?? json?.CheckoutRequestID ?? json?.data?.checkoutRequestId ?? json?.data?.CheckoutRequestID;
  if (!res.ok || !id) {
    console.error("STK push failed", res.status, JSON.stringify(json).slice(0, 300));
    throw new Error(json?.message || json?.error || "Could not start M-Pesa payment. Try again.");
  }
  return String(id);
}

export async function mpesaStatus(checkoutRequestId: string) {
  const key = process.env["MAKAMESCO_MPESA_API_KEY"];
  if (!key) throw new Error("Payments are not configured");
  const res = await fetch(`${MPESA_URL}/status/${encodeURIComponent(checkoutRequestId)}`, {
    headers: { "X-API-Key": key },
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("M-Pesa status failed", res.status, JSON.stringify(json).slice(0, 300));
    throw new Error(json?.message || json?.error || "Could not check M-Pesa payment status");
  }
  const d = json?.data ?? json;
  const rawStatus = String(d?.status ?? "pending").toLowerCase();
  const status = ["pending", "completed", "failed", "cancelled"].includes(rawStatus)
    ? rawStatus
    : "pending";
  return {
    status,
    receipt: d?.mpesaReceiptNumber ?? d?.MpesaReceiptNumber ?? null,
  };
}
