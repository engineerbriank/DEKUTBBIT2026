import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — DEKUT BBIT 2026" },
      { name: "description", content: "Securely choose a new password for your DEKUT BBIT 2026 account." },
      { property: "og:title", content: "Choose a new password — DEKUT BBIT 2026" },
      { property: "og:description", content: "Secure password recovery for the DEKUT BBIT 2026 Student Hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const isRecoveryLink = hash.get("type") === "recovery" || new URLSearchParams(window.location.search).has("code");

    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session) && isRecoveryLink);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setFinished(true);
      toast.success("Your password has been changed");
      await supabase.auth.signOut();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change your password");
    } finally {
      setBusy(false);
    }
  };

  if (finished) {
    return <PageCard icon={<CheckCircle2 className="size-7" />} title="Password updated" description="Your new password is ready. Sign in to continue."><Button className="w-full" onClick={() => navigate({ to: "/auth" })}>Sign in</Button></PageCard>;
  }

  if (!ready) {
    return <PageCard icon={<KeyRound className="size-7" />} title="Reset link required" description="Open the latest password reset link sent to your email. Expired or previously used links cannot be reused."><Button asChild variant="outline" className="w-full"><Link to="/auth">Request another link</Link></Button></PageCard>;
  }

  return (
    <PageCard icon={<KeyRound className="size-7" />} title="Choose a new password" description="Use at least six characters and keep it private.">
      <form className="space-y-4" onSubmit={submit}>
        <PasswordField id="new-password" label="New password" value={password} show={showPassword} onChange={setPassword} onToggle={() => setShowPassword((value) => !value)} />
        <PasswordField id="confirm-password" label="Confirm new password" value={confirmPassword} show={showPassword} onChange={setConfirmPassword} />
        <Button type="submit" className="w-full" disabled={busy || password.length < 6 || confirmPassword.length < 6}>{busy ? "Updating…" : "Set new password"}</Button>
      </form>
    </PageCard>
  );
}

function PageCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center px-4 py-10"><section className="surface-card w-full max-w-md p-7"><span className="grid size-14 place-items-center rounded-full bg-secondary text-primary">{icon}</span><h1 className="mt-4 text-2xl font-semibold">{title}</h1><p className="mb-6 mt-2 text-sm text-muted-foreground">{description}</p>{children}</section></main>;
}

function PasswordField({ id, label, value, show, onChange, onToggle }: { id: string; label: string; value: string; show: boolean; onChange: (value: string) => void; onToggle?: () => void }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><div className="relative"><Input id={id} type={show ? "text" : "password"} value={value} minLength={6} required className="pr-11" onChange={(event) => onChange(event.target.value)} />{onToggle ? <Button type="button" variant="ghost" size="icon" aria-label={show ? "Hide password" : "Show password"} onClick={onToggle} className="absolute inset-y-0 right-0 h-full w-11 text-muted-foreground hover:text-primary">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button> : null}</div></div>;
}