import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { ArrowLeft, Bell, BookOpen, CalendarClock, FileText, Megaphone, Users } from "lucide-react";

import { AppShell, useNotifications } from "@/components/AppShell";
import { markNotificationRead } from "@/lib/hub.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — BBITClassPoint" },
      { name: "description", content: "New notes, classes, assignments and announcements as they are published." },
      { property: "og:title", content: "Notifications — BBITClassPoint" },
      { property: "og:description", content: "Everything newly published for your BBIT class." },
    ],
  }),
  component: Notifications,
});

const ICONS: Record<string, typeof Bell> = {
  resource: BookOpen,
  assignment: FileText,
  timetable: CalendarClock,
  announcement: Megaphone,
  group: Users,
  system: Bell,
};

function Notifications() {
  const { data, isLoading } = useNotifications();
  const markRead = useServerFn(markNotificationRead);
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();

  const mark = useMutation({
    mutationFn: (id: string) => markRead({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <AppShell
      title="Notifications"
      icon={
        <button type="button" aria-label="Go back" onClick={() => router.history.back()}>
          <ArrowLeft className="size-5" />
        </button>
      }
    >
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {!isLoading && (data?.items ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet. New uploads and announcements show up here.</p>
      ) : null}

      <ul className="space-y-3">
        {(data?.items ?? []).map((item) => {
          const Icon = ICONS[item.kind] ?? Bell;
          return (
            <li
              key={item.id}
              className={cn("surface-card flex cursor-pointer items-start gap-3 p-4", !item.read && "border-accent/40")}
              onClick={() => {
                if (!item.read) mark.mutate(item.id);
                if (item.link?.startsWith("/")) navigate({ to: item.link as never });
              }}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(item.created_at)}</span>
                </div>
                {item.body ? <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
