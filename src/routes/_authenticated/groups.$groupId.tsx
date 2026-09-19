import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Crown,
  Megaphone,
  MessageCircle,
  Send,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteGroupAnnouncement,
  deleteGroupMessage,
  getStudyGroup,
  listGroupMessages,
  postGroupAnnouncement,
  sendGroupMessage,
  updateGroupSettings,
} from "@/lib/hub.functions";

export const Route = createFileRoute("/_authenticated/groups/$groupId")({
  head: () => ({
    meta: [
      { title: "Study Group Chat — DEKUT BBIT 2026" },
      {
        name: "description",
        content:
          "Chat with your study group, read announcements and manage group settings inside the DEKUT BBIT student platform.",
      },
      { property: "og:title", content: "Study Group Chat — DEKUT BBIT 2026" },
      {
        property: "og:description",
        content: "Group chat, members, announcements and leader tools for your BBIT study group.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GroupDetail,
});

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function GroupDetail() {
  const { groupId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchGroup = useServerFn(getStudyGroup);
  const publish = useServerFn(postGroupAnnouncement);
  const remove = useServerFn(deleteGroupAnnouncement);
  const [body, setBody] = useState("");

  const {
    data: group,
    isLoading,
    error,
  } = useQuery({ queryKey: ["group", groupId], queryFn: () => fetchGroup({ data: { groupId } }) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["group", groupId] });
  const post = useMutation({
    mutationFn: () => publish({ data: { groupId, body } }),
    onSuccess: () => {
      setBody("");
      refresh();
      toast.success("Announcement posted");
    },
    onError: (failure: Error) => toast.error(failure.message),
  });

  const canManage = Boolean(group?.isLeader || group?.isAdmin);
  const canParticipate = Boolean(group?.joined && group?.status === "approved");

  return (
    <AppShell title={group?.name ?? "Study Group"} icon={<Users className="size-5" />}>
      <Button asChild variant="ghost" size="sm">
        <Link to="/groups">
          <ArrowLeft className="size-4" /> All groups
        </Link>
      </Button>
      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading group…</p> : null}
      {error ? (
        <p className="surface-card mt-5 p-4 text-sm text-destructive">{error.message}</p>
      ) : null}
      {group ? (
        <>
          <section className="surface-card mt-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {group.logoUrl ? (
                  <img src={group.logoUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                    <Users className="size-6" />
                  </span>
                )}
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl font-semibold">{group.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {group.description || "No description provided."}
                  </p>
                </div>
              </div>
              <span
                className={
                  group.status === "approved"
                    ? "pill bg-success text-success-foreground"
                    : "pill bg-secondary text-secondary-foreground"
                }
              >
                {group.status}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Approved leader</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                  <Crown className="size-4 text-accent" /> {group.leaderName}
                </p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Registered members</p>
                <p className="mt-1 text-sm font-semibold">{group.members.length}</p>
              </div>
            </div>
            {group.joined && group.whatsapp_url ? (
              <Button
                asChild
                className="mt-4 w-full bg-success text-success-foreground hover:bg-success/90"
              >
                <a href={group.whatsapp_url} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" /> Open WhatsApp group
                </a>
              </Button>
            ) : null}
            {!group.joined ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Register for this group from the groups page to see members, chat, and announcements.
              </p>
            ) : null}
          </section>

          {group.joined || group.isAdmin ? (
            <Tabs defaultValue="chat" className="mt-6">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="announcements">Announcements</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                {canManage ? <TabsTrigger value="manage">Manage</TabsTrigger> : null}
              </TabsList>

              <TabsContent value="chat" className="mt-4">
                <GroupChat groupId={groupId} canSend={canParticipate} />
              </TabsContent>

              <TabsContent value="announcements" className="mt-4">
                {canParticipate ? (
                  <form
                    className="surface-card p-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      post.mutate();
                    }}
                  >
                    <Textarea
                      required
                      maxLength={2000}
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      placeholder="Share an update with registered members"
                    />
                    <Button className="mt-3" type="submit" disabled={!body.trim() || post.isPending}>
                      <Megaphone className="size-4" />{" "}
                      {post.isPending ? "Posting…" : "Post announcement"}
                    </Button>
                  </form>
                ) : null}
                <ul className="mt-3 space-y-3">
                  {group.announcements.map((announcement) => (
                    <li key={announcement.id} className="surface-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm whitespace-pre-wrap">{announcement.body}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {announcement.authorName} ·{" "}
                            {new Date(announcement.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {announcement.canDelete ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Delete announcement"
                            onClick={async () => {
                              await remove({ data: { id: announcement.id } });
                              refresh();
                              toast.success("Announcement removed");
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
                {!group.announcements.length ? (
                  <p className="mt-3 text-sm text-muted-foreground">No group announcements yet.</p>
                ) : null}
              </TabsContent>

              <TabsContent value="members" className="mt-4">
                <ul className="grid gap-2 sm:grid-cols-2">
                  {group.members.map((member) => (
                    <li key={member.userId} className="surface-card flex items-center gap-3 p-3">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
                      ) : (
                        <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {member.fullName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {member.fullName}
                      </span>
                      {member.isLeader ? <Crown className="size-4 text-accent" /> : null}
                    </li>
                  ))}
                </ul>
              </TabsContent>

              {canManage ? (
                <TabsContent value="manage" className="mt-4">
                  <GroupManagePanel
                    groupId={groupId}
                    whatsappUrl={group.whatsapp_url ?? ""}
                    description={group.description ?? ""}
                    joinCode={group.join_code}
                    onSaved={refresh}
                  />
                </TabsContent>
              ) : null}
            </Tabs>
          ) : null}
        </>
      ) : null}
    </AppShell>
  );
}

function GroupChat({ groupId, canSend }: { groupId: string; canSend: boolean }) {
  const queryClient = useQueryClient();
  const fetchMessages = useServerFn(listGroupMessages);
  const send = useServerFn(sendGroupMessage);
  const removeMessage = useServerFn(deleteGroupMessage);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["group-chat", groupId],
    queryFn: () => fetchMessages({ data: { groupId } }),
    refetchInterval: 4000,
    refetchIntervalInBackground: false,
  });
  const reload = () => queryClient.invalidateQueries({ queryKey: ["group-chat", groupId] });

  const mutation = useMutation({
    mutationFn: (value: string) => send({ data: { groupId, body: value } }),
    onSuccess: () => {
      setText("");
      reload();
    },
    onError: (failure: Error) => toast.error(failure.message),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  return (
    <section className="surface-card flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <MessageCircle className="size-4 text-primary" />
        <p className="text-sm font-semibold">Group chat</p>
        <span className="ml-auto text-xs text-muted-foreground">
          {messages?.length ?? 0} message{(messages?.length ?? 0) === 1 ? "" : "s"}
        </span>
      </div>
      <div className="max-h-[60vh] min-h-[16rem] space-y-3 overflow-y-auto px-4 py-4">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading chat…</p> : null}
        {!isLoading && !messages?.length ? (
          <p className="text-sm text-muted-foreground">
            No messages yet. Start the conversation with your group.
          </p>
        ) : null}
        {(messages ?? []).map((message) => (
          <div
            key={message.id}
            className={`group flex items-end gap-2 ${message.isMine ? "flex-row-reverse" : ""}`}
          >
            {message.avatarUrl ? (
              <img src={message.avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {message.authorName.charAt(0).toUpperCase()}
              </span>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                message.isMine
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md bg-secondary text-secondary-foreground"
              }`}
            >
              {!message.isMine ? (
                <p className="text-xs font-semibold opacity-80">{message.authorName}</p>
              ) : null}
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              <p className="mt-1 text-[10px] opacity-70">{timeLabel(message.createdAt)}</p>
            </div>
            {message.canDelete ? (
              <button
                type="button"
                aria-label="Delete message"
                className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                onClick={async () => {
                  try {
                    await removeMessage({ data: { id: message.id } });
                    reload();
                  } catch (failure) {
                    toast.error((failure as Error).message);
                  }
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {canSend ? (
        <form
          className="flex items-center gap-2 border-t border-border/60 px-3 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim()) mutation.mutate(text.trim());
          }}
        >
          <Input
            value={text}
            maxLength={2000}
            onChange={(event) => setText(event.target.value)}
            placeholder="Write a message…"
            aria-label="Message"
          />
          <Button type="submit" size="icon" disabled={!text.trim() || mutation.isPending}>
            <Send className="size-4" />
          </Button>
        </form>
      ) : (
        <p className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
          Only registered members of an approved group can send messages.
        </p>
      )}
    </section>
  );
}

function GroupManagePanel({
  groupId,
  whatsappUrl,
  description,
  joinCode,
  onSaved,
}: {
  groupId: string;
  whatsappUrl: string;
  description: string;
  joinCode: string;
  onSaved: () => void;
}) {
  const save = useServerFn(updateGroupSettings);
  const [link, setLink] = useState(whatsappUrl);
  const [about, setAbout] = useState(description);

  useEffect(() => {
    setLink(whatsappUrl);
    setAbout(description);
  }, [whatsappUrl, description]);

  const mutation = useMutation({
    mutationFn: () => save({ data: { groupId, whatsappUrl: link, description: about } }),
    onSuccess: () => {
      onSaved();
      toast.success("Group settings updated");
    },
    onError: (failure: Error) => toast.error(failure.message),
  });

  return (
    <form
      className="surface-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="flex items-center gap-2">
        <Settings className="size-4 text-primary" />
        <h2 className="font-display text-base font-semibold">Leader panel</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Update the group WhatsApp link and description. Members see changes immediately.
      </p>
      <label className="mt-4 block text-sm font-medium" htmlFor="group-whatsapp">
        WhatsApp group link
      </label>
      <Input
        id="group-whatsapp"
        className="mt-1"
        value={link}
        onChange={(event) => setLink(event.target.value)}
        placeholder="https://chat.whatsapp.com/…"
      />
      <label className="mt-4 block text-sm font-medium" htmlFor="group-about">
        Group description
      </label>
      <Textarea
        id="group-about"
        className="mt-1"
        maxLength={500}
        value={about}
        onChange={(event) => setAbout(event.target.value)}
        placeholder="What does this group focus on?"
      />
      <div className="mt-4 rounded-xl bg-secondary p-3">
        <p className="text-xs text-muted-foreground">Join code to share with classmates</p>
        <p className="mt-1 font-display text-lg font-semibold tracking-widest">{joinCode}</p>
      </div>
      <Button className="mt-4" type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
