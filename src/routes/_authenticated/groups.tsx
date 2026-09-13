import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { createStudyGroup, joinStudyGroup, leaveStudyGroup, listStudyGroups } from "@/lib/hub.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({
    meta: [
      { title: "Study Groups — BBITClassPoint" },
      { name: "description", content: "Create or join a real BBIT study group and see who is in it." },
      { property: "og:title", content: "Study Groups — BBITClassPoint" },
      { property: "og:description", content: "Create or join BBIT study groups with a share code." },
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

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [code, setCode] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["groups"], queryFn: () => fetchGroups() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["groups"] });

  const createMutation = useMutation({
    mutationFn: () => create({ data: form }),
    onSuccess: (group) => {
      setForm({ name: "", description: "" });
      setShowForm(false);
      refresh();
      toast.success(`Group created — share code ${group?.join_code ?? ""}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const joinMutation = useMutation({
    mutationFn: (input: { code?: string; groupId?: string }) => join({ data: input }),
    onSuccess: () => {
      setCode("");
      refresh();
      toast.success("You joined the group");
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
            <Button type="submit" className="w-full rounded-xl" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Save group"}
            </Button>
          </form>
        ) : null}
      </div>

      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading groups…</p> : null}
      {!isLoading && (data ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No groups yet — create the first one above.</p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {(data ?? []).map((group) => (
          <li key={group.id} className="surface-card flex items-start gap-3 p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <Users className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold uppercase">{group.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {group.memberCount} member{group.memberCount === 1 ? "" : "s"} · Code {group.join_code}
              </p>
              {group.description ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{group.description}</p>
              ) : null}
            </div>
            {group.joined ? (
              <Button variant="ghost" size="sm" onClick={() => leaveMutation.mutate(group.id)}>
                Leave
              </Button>
            ) : (
              <Button size="sm" className="rounded-xl" onClick={() => joinMutation.mutate({ groupId: group.id })}>
                Join
              </Button>
            )}
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
        <Input placeholder="Enter group code" value={code} onChange={(event) => setCode(event.target.value)} />
        <Button type="submit" className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
          Join
        </Button>
      </form>
    </AppShell>
  );
}
