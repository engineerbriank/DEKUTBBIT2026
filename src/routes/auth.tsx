import logoAsset from "@/assets/dekut-bbit-2026-logo.png.asset.json";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Eye, EyeOff, Mail } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — DEKUT BBIT 2026 Student Hub" },
      { name: "description", content: "Sign in or create your DEKUT BBIT 2026 student account." },
      { property: "og:title", content: "Sign in — DEKUT BBIT 2026 Student Hub" },
      {
        property: "og:description",
        content: "Access BBIT notes, past papers and the AI study assistant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setConfirmationEmail(email);
          toast.success("Check your email to confirm your account");
          return;
        }
        toast.success("Account confirmed. Welcome to DEKUT BBIT 2026!");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setConfirmationEmail(email);
        toast.success("Password reset link sent");
        return;
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

  if (confirmationEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="surface-card w-full max-w-md p-7 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-primary">
            <CheckCircle2 className="size-7" />
          </span>
          <h1 className="mt-4 text-xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a secure {mode === "signup" ? "confirmation" : "password reset"} link to <strong className="text-foreground">{confirmationEmail}</strong>.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Open the link in that email to continue.</p>
          <Button className="mt-6 w-full" variant="outline" onClick={() => { setConfirmationEmail(null); setMode("signin"); }}>
            Return to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <img
            src={logoAsset.url}
            alt="DEKUT BBIT 2026 Digital Student Platform logo"
            className="size-14 rounded-full object-cover shadow-lg"
          />
          <span className="max-w-64 text-center font-display text-base font-semibold leading-tight">
            DEKUT BBIT 2026 · STUDENT HUB
          </span>
        </Link>

        <div className="surface-card border-primary/10 p-6">
          <h1 className="text-xl font-semibold">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "reset"
              ? "Enter your email and we’ll send a secure link to choose a new password."
              : "Use your student email to reach your class material."}
          </p>

          {mode === "reset" ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2.5 text-sm text-secondary-foreground">
              <Mail className="size-4 shrink-0" /> The link can only be used by its recipient.
            </div>
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
            {mode !== "reset" ? <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pr-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 h-full w-11 text-muted-foreground hover:text-primary"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
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
            {mode === "signup"
              ? "Already registered?"
              : mode === "reset"
                ? "Remembered it?"
                : "New here?"}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() =>
                setMode(mode === "signup" ? "signin" : mode === "reset" ? "signin" : "signup")
              }
            >
              {mode === "signup" || mode === "reset" ? "Sign in instead" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
