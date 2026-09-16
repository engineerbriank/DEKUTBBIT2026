import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Crown, Megaphone, MessageCircle, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { deleteGroupAnnouncement, getStudyGroup, postGroupAnnouncement } from "@/lib/hub.functions";

export const Route = createFileRoute("/_authenticated/groups/$groupId")({
  head: () => ({ meta: [
    { title: "Study Group — BBITClassPoint" },
    { name: "description", content: "Registered members, WhatsApp access and announcements for your BBIT study group." },
    { property: "og:title", content: "Study Group — BBITClassPoint" },
    { property: "og:description", content: "Open your approved BBIT study group and member announcements." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: GroupDetail,
});

function GroupDetail() {
  const { groupId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchGroup = useServerFn(getStudyGroup);
  const publish = useServerFn(postGroupAnnouncement);
  const remove = useServerFn(deleteGroupAnnouncement);
  const [body, setBody] = useState("");
  const { data: group, isLoading, error } = useQuery({ queryKey: ["group", groupId], queryFn: () => fetchGroup({ data: { groupId } }) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["group", groupId] });
  const post = useMutation({
    mutationFn: () => publish({ data: { groupId, body } }),
    onSuccess: () => { setBody(""); refresh(); toast.success("Announcement posted"); },
    onError: (failure: Error) => toast.error(failure.message),
  });

  return (
    <AppShell title={group?.name ?? "Study Group"} icon={<Users className="size-5" />}>
      <Button asChild variant="ghost" size="sm"><Link to="/groups"><ArrowLeft className="size-4" /> All groups</Link></Button>
      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading group…</p> : null}
      {error ? <p className="surface-card mt-5 p-4 text-sm text-destructive">{error.message}</p> : null}
      {group ? <>
        <section className="surface-card mt-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-display text-xl font-semibold">{group.name}</h2><p className="mt-1 text-sm text-muted-foreground">{group.description || "No description provided."}</p></div>
            <span className={group.status === "approved" ? "pill bg-success text-success-foreground" : "pill bg-secondary text-secondary-foreground"}>{group.status}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-secondary p-3"><p className="text-xs text-muted-foreground">Approved leader</p><p className="mt-1 flex items-center gap-2 text-sm font-semibold"><Crown className="size-4 text-accent" /> {group.leaderName}</p></div>
            <div className="rounded-xl bg-secondary p-3"><p className="text-xs text-muted-foreground">Registered members</p><p className="mt-1 text-sm font-semibold">{group.members.length}</p></div>
          </div>
          {group.joined && group.whatsapp_url ? <Button asChild className="mt-4 w-full bg-success text-success-foreground hover:bg-success/90"><a href={group.whatsapp_url} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" /> Open WhatsApp group</a></Button> : null}
          {!group.joined ? <p className="mt-4 text-sm text-muted-foreground">Register for this group from the groups page to see members, WhatsApp, and announcements.</p> : null}
        </section>

        {group.joined || group.isAdmin ? <>
          <section className="mt-6"><h2 className="font-display text-base font-semibold">Members</h2><ul className="mt-2 grid gap-2 sm:grid-cols-2">{group.members.map((member) => <li key={member.userId} className="surface-card flex items-center gap-3 p-3"><span className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{member.fullName.charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1 truncate text-sm font-medium">{member.fullName}</span>{member.isLeader ? <Crown className="size-4 text-accent" /> : null}</li>)}</ul></section>
          <section className="mt-6"><h2 className="font-display text-base font-semibold">Group announcements</h2>
            {group.joined && group.status === "approved" ? <form className="surface-card mt-2 p-4" onSubmit={(event) => { event.preventDefault(); post.mutate(); }}><Textarea required maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Share an update with registered members" /><Button className="mt-3" type="submit" disabled={!body.trim() || post.isPending}><Megaphone className="size-4" /> {post.isPending ? "Posting…" : "Post announcement"}</Button></form> : null}
            <ul className="mt-3 space-y-3">{group.announcements.map((announcement) => <li key={announcement.id} className="surface-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm whitespace-pre-wrap">{announcement.body}</p><p className="mt-2 text-xs text-muted-foreground">{announcement.authorName} · {new Date(announcement.createdAt).toLocaleString()}</p></div>{announcement.canDelete ? <Button size="icon" variant="ghost" aria-label="Delete announcement" onClick={async () => { await remove({ data: { id: announcement.id } }); refresh(); toast.success("Announcement removed"); }}><Trash2 className="size-4" /></Button> : null}</div></li>)}</ul>
            {!group.announcements.length ? <p className="mt-3 text-sm text-muted-foreground">No group announcements yet.</p> : null}
          </section>
        </> : null}
      </> : null}
    </AppShell>
  );
}