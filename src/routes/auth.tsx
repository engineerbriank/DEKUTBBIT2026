import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { GraduationCap, MessageCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { resetPasswordWithCode, SUPPORT_WHATSAPP } from "@/lib/recovery.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — BBITClassPoint" },
      { name: "description", content: "Sign in or create your BBITClassPoint student account." },
      { property: "og:title", content: "Sign in — BBITClassPoint" },
      { property: "og:description", content: "Access BBIT notes, past papers and the AI study assistant." },
    ],
  }),
  component: AuthPage,
});

const WHATSAPP_LINK = `https://wa.me/254${SUPPORT_WHATSAPP.replace(/^0/, "")}`;

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const resetPassword = useServerFn(resetPasswordWithCode);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to BBITClassPoint!");
      } else if (mode === "reset") {
        await resetPassword({ data: { email, code, newPassword: password } });
        toast.success("Password changed. Signing you in…");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setMode("signin");
          setBusy(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const heading =
    mode === "signin"
      ? "Sign in to your account"
      : mode === "signup"
        ? "Create your student account"
        : "Reset your password";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="size-5" />
          </div>
          <span className="font-display text-lg font-semibold">BBITClassPoint</span>
        </Link>

        <div className="glass-panel p-6">
          <h1 className="text-xl font-semibold">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "reset"
              ? `Message ${SUPPORT_WHATSAPP} on WhatsApp to get your recovery code, then set a new password below.`
              : "Use your student email to reach your class material."}
          </p>

          {mode === "reset" ? (
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/60 px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-card"
            >
              <MessageCircle className="size-4" /> Request my code on WhatsApp · {SUPPORT_WHATSAPP}
            </a>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {mode === "signup" ? (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Jane Wanjiku"
                  required
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@student.ac.ke"
                required
              />
            </div>
            {mode === "reset" ? (
              <div className="space-y-1.5">
                <Label htmlFor="code">Recovery code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="ABCD2345"
                  required
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="password">{mode === "reset" ? "New password" : "Password"}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Set new password"}
            </Button>
          </form>

          {mode === "signin" ? (
            <button
              type="button"
              className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
              onClick={() => setMode("reset")}
            >
              Forgot your password?
            </button>
          ) : null}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already registered?" : mode === "reset" ? "Remembered it?" : "New here?"}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signup" ? "signin" : mode === "reset" ? "signin" : "signup")}
            >
              {mode === "signup" || mode === "reset" ? "Sign in instead" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
