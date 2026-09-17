import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronRight, ExternalLink, LifeBuoy, LogOut, Pencil, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AppShell, useSignOut } from "@/components/AppShell";
import { getProfileOverview, listQuickLinks, updateProfileName } from "@/lib/hub.functions";
import { SUPPORT_WHATSAPP } from "@/lib/recovery.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — BBITClassPoint" },
      { name: "description", content: "Your BBITClassPoint account, study groups and class quick links." },
      { property: "og:title", content: "Profile — BBITClassPoint" },
      { property: "og:description", content: "Manage your account and open your class quick links." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const fetchProfile = useServerFn(getProfileOverview);
  const fetchLinks = useServerFn(listQuickLinks);
  const saveName = useServerFn(updateProfileName);
  const queryClient = useQueryClient();
  const signOut = useSignOut();

  const { data } = useQuery({ queryKey: ["profile-overview"], queryFn: () => fetchProfile() });
  const { data: links } = useQuery({ queryKey: ["quick-links"], queryFn: () => fetchLinks() });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  const rename = useMutation({
    mutationFn: () => saveName({ data: { fullName: name } }),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["profile-overview"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Name updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const displayName = data?.fullName || data?.email || "Student";
  const initial = displayName.trim().charAt(0).toUpperCase() || "S";

  return (
    <AppShell
      header={
        <div className="flex flex-col items-center py-2 text-center text-navy-foreground">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-full bg-white/15 font-display text-2xl font-bold ring-1 ring-white/20">
              {initial}
            </span>
            <div className="text-left">
              <p className="font-display text-xl font-semibold">{displayName}</p>
              <p className="text-xs text-navy-foreground/70">{data?.email}</p>
              <span className="pill mt-1 inline-flex items-center gap-1 bg-accent text-accent-foreground">
                <ShieldCheck className="size-3" />
                {data?.isAdmin ? "Administrator" : "Student"}
              </span>
            </div>
          </div>
          <p className="mt-4 text-sm italic text-navy-foreground/80">
            "Be your voice, no one left behind."
          </p>
          {editing ? (
            <form
              className="mt-3 flex w-full gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                rename.mutate();
              }}
            >
              <Input
                className="bg-card"
                placeholder="Your full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <Button type="submit" size="sm" className="rounded-xl" disabled={rename.isPending}>
                Save
              </Button>
            </form>
          ) : (
            <Button
              size="sm"
              className="mt-3 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => {
                setName(data?.fullName ?? "");
                setEditing(true);
              }}
            >
              <Pencil className="size-3.5" /> Edit Profile
            </Button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="surface-card p-4">
          <p className="font-display text-2xl font-bold text-primary">{data?.groupCount ?? 0}</p>
          <p className="text-xs text-muted-foreground">Study groups joined</p>
        </div>
        <div className="surface-card p-4">
          <p className="font-display text-sm font-bold tracking-widest text-primary">
            {data?.recoveryCode || "—"}
          </p>
          <p className="text-xs text-muted-foreground">Your recovery code</p>
        </div>
      </div>

      <h2 className="mt-6 font-display text-base font-semibold">Quick Links</h2>
      <ul className="mt-2 space-y-2">
        {(links ?? []).map((link) => (
          <li key={link.id}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="surface-card flex items-center gap-3 p-3.5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <ExternalLink className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{link.label}</span>
                {link.subtitle ? (
                  <span className="block truncate text-xs text-muted-foreground">{link.subtitle}</span>
                ) : null}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </a>
          </li>
        ))}
        {(links ?? []).length === 0 ? (
          <li className="text-sm text-muted-foreground">
            No quick links yet — an administrator adds them from the admin panel.
          </li>
        ) : null}
      </ul>

      <div className="surface-card mt-6 divide-y divide-border">
        {data?.isAdmin ? <Link to="/ai" className="flex items-center gap-3 p-3.5 text-sm font-medium">
          <Sparkles className="size-4 text-primary" /> AI study assistant
          <ChevronRight className="ml-auto size-4 text-muted-foreground" />
        </Link> : null}
        {data?.isAdmin ? (
          <Link to="/admin" className="flex items-center gap-3 p-3.5 text-sm font-medium">
            <ShieldCheck className="size-4 text-primary" /> Admin panel
            <ChevronRight className="ml-auto size-4 text-muted-foreground" />
          </Link>
        ) : null}
        <a
          href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3.5 text-sm font-medium"
        >
          <LifeBuoy className="size-4 text-primary" /> Help &amp; Support (class rep)
          <ChevronRight className="ml-auto size-4 text-muted-foreground" />
        </a>
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 p-3.5 text-sm font-medium text-destructive"
        >
          <LogOut className="size-4" /> Logout
        </button>
      </div>
    </AppShell>
  );
}
