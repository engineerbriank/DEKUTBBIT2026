import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/AppShell";
import { listAnnouncements } from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — BBITClassPoint" },
      { name: "description", content: "Class announcements published by the BBIT administrator." },
      { property: "og:title", content: "Announcements — BBITClassPoint" },
      { property: "og:description", content: "Stay up to date with class notices and deadlines." },
    ],
  }),
  component: Announcements,
});

function Announcements() {
  const fetchAnnouncements = useServerFn(listAnnouncements);
  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => fetchAnnouncements(),
  });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Announcements</h1>
      <p className="mt-1 text-sm text-muted-foreground">Only published notices appear here.</p>

      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading…</p> : null}
      {!isLoading && !(data ?? []).length ? (
        <p className="mt-6 text-sm text-muted-foreground">No announcements yet.</p>
      ) : null}

      <div className="mt-6 space-y-4">
        {(data ?? []).map((item) => (
          <article key={item.id} className="surface-card p-5">
            <h2 className="text-base font-semibold">{item.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(item.created_at).toLocaleString()}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
