import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Camera, ChevronRight, Clock3, MessageCircle, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell, useMe } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import {
  createStudyGroup,
  joinStudyGroup,
  leaveStudyGroup,
  listStudyGroups,
} from "@/lib/hub.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/groups/")({
  head: () => ({
    meta: [
      { title: "Study Groups — BBITClassPoint" },
      {
        name: "description",
        content: "Create or join a real BBIT study group and see who is in it.",
      },
      { property: "og:title", content: "Study Groups — BBITClassPoint" },
      {
        property: "og:description",
        content: "Create or join BBIT study groups with a share code.",
      },
    ],
  }),
  component: Groups,
});

function Groups() {
  const fetchGroups = useServerFn(listStudyGroups);
  const create = useServerFn(createStudyGroup);
  const join = useServerFn(joinStudyGroup);
  const leave = useServerFn(leaveStudyGroup);
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const logoInput = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", whatsappUrl: "" });
  const [logo, setLogo] = useState<File | null>(null);
  const [code, setCode] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["groups"], queryFn: () => fetchGroups() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["groups"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      let logoPath = "";
      if (logo) {
        if (!logo.type.startsWith("image/") || logo.size > 5 * 1024 * 1024) {
          throw new Error("Choose an image smaller than 5 MB");
        }
        if (!me?.userId) throw new Error("Your account is still loading. Try again.");
        const safeName = logo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        logoPath = `${me.userId}/groups/${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage.from("user-images").upload(logoPath, logo, {
          contentType: logo.type,
        });
        if (error) throw error;
      }
      return create({ data: { ...form, logoPath } });
    },
    onSuccess: (group) => {
      setForm({ name: "", description: "", whatsappUrl: "" });
      setLogo(null);
      if (logoInput.current) logoInput.current.value = "";
      setShowForm(false);
      refresh();
      toast.success(`Group submitted for administrator approval · Code ${group?.join_code ?? ""}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const joinMutation = useMutation({
    mutationFn: (input: { code?: string; groupId?: string }) => join({ data: input }),
    onSuccess: () => {
      setCode("");
      refresh();
      toast.success("You registered for the group");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const leaveMutation = useMutation({
    mutationFn: (groupId: string) => leave({ data: { groupId } }),
    onSuccess: () => {
      refresh();
      toast.success("You left the group");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell title="Study Groups" icon={<Users className="size-5" />}>
      <div className="surface-card p-3">
        <Button
          className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={() => setShowForm((value) => !value)}
        >
          <Plus className="size-4" /> Create Group
        </Button>

        {showForm ? (
          <form
            className="mt-3 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <Input
              placeholder="Group name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <Textarea
              placeholder="What is this group for?"
              rows={2}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
            <Input
              required
              inputMode="url"
              placeholder="chat.whatsapp.com/… or WhatsApp channel link"
              value={form.whatsappUrl}
              onChange={(event) => setForm({ ...form, whatsappUrl: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              The WhatsApp link is shown only to registered members after approval.
            </p>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-card/60 p-3 text-sm">
              <span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary">
                <Camera className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">Group logo (optional)</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {logo?.name ?? "PNG, JPG or WebP · up to 5 MB"}
                </span>
              </span>
              <input
                ref={logoInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
              />
            </label>
            <Button type="submit" className="w-full rounded-xl" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Save group"}
            </Button>
          </form>
        ) : null}
      </div>

      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading groups…</p> : null}
      {!isLoading && (data ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No groups yet — create the first one above.
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {(data ?? []).map((group) => (
          <li key={group.id} className="surface-card flex items-start gap-3 p-4">
            {group.logoUrl ? (
              <img src={group.logoUrl} alt="" className="size-11 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <Users className="size-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold uppercase">{group.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {group.memberCount} member{group.memberCount === 1 ? "" : "s"} · Code{" "}
                {group.join_code}
              </p>
              <span
                className={
                  group.status === "approved"
                    ? "pill mt-2 inline-flex bg-success text-success-foreground"
                    : "pill mt-2 inline-flex bg-secondary text-secondary-foreground"
                }
              >
                {group.status === "approved" ? (
                  "Approved"
                ) : (
                  <>
                    <Clock3 className="mr-1 size-3" /> Pending approval
                  </>
                )}
              </span>
              {group.description ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {group.description}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              {group.joined ? (
                <Button asChild size="sm" className="rounded-xl">
                  <Link to="/groups/$groupId" params={{ groupId: group.id }}>
                    <MessageCircle className="size-4" /> Open
                  </Link>
                </Button>
              ) : group.status === "approved" ? (
                <Button
                  size="sm"
                  className="rounded-xl"
                  onClick={() => joinMutation.mutate({ groupId: group.id })}
                >
                  Register
                </Button>
              ) : null}
              {group.joined && !group.isOwner ? (
                <Button variant="ghost" size="sm" onClick={() => leaveMutation.mutate(group.id)}>
                  Leave
                </Button>
              ) : null}
              {!group.joined && group.status === "approved" ? (
                <Button asChild variant="ghost" size="icon">
                  <Link
                    to="/groups/$groupId"
                    params={{ groupId: group.id }}
                    aria-label={`View ${group.name}`}
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mt-7 font-display text-base font-semibold">Join a Group</h2>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          joinMutation.mutate({ code });
        }}
      >
        <Input
          placeholder="Enter group code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <Button
          type="submit"
          className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Join
        </Button>
      </form>
    </AppShell>
  );
}
