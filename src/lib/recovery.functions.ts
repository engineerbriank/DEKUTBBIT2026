import { createServerFn } from "@tanstack/react-start";

export const SUPPORT_WHATSAPP = "0142324891";

/** Public: reset a password using the personal recovery code issued at signup. */
export const resetPasswordWithCode = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; code: string; newPassword: string }) => {
    const email = (input?.email ?? "").trim().toLowerCase();
    const code = (input?.code ?? "").trim().toUpperCase();
    const newPassword = input?.newPassword ?? "";
    if (!email.includes("@")) throw new Error("Enter the email you signed up with.");
    if (code.length < 4) throw new Error("Enter the recovery code you received.");
    if (newPassword.length < 6) throw new Error("New password must be at least 6 characters.");
    return { email, code, newPassword };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    if (!profile) throw new Error("Email or recovery code is not correct.");

    const { data: row } = await supabaseAdmin
      .from("recovery_codes")
      .select("code")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!row || (row.code ?? "").trim().toUpperCase() !== data.code) {
      throw new Error("Email or recovery code is not correct.");
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: data.newPassword,
    });
    if (updateError) throw new Error(updateError.message);

    // Rotate the code so it cannot be reused.
    const { data: fresh } = await supabaseAdmin.rpc("generate_recovery_code");
    await supabaseAdmin
      .from("recovery_codes")
      .update({ code: (fresh as unknown as string) ?? data.code, updated_at: new Date().toISOString() })
      .eq("user_id", profile.id);

    return { ok: true };
  });
