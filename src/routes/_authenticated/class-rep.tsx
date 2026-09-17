import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, ClipboardList, ShieldCheck, Users } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { getClassRepOverview } from "@/lib/hub.functions";

export const Route = createFileRoute("/_authenticated/class-rep")({
  head: () => ({
    meta: [
      { title: "Class Representative — BBITClassPoint" },
      {
        name: "description",
        content: "Live BBIT class membership and study activity for the class representative.",
      },
      { property: "og:title", content: "Class Representative — BBITClassPoint" },
      { property: "og:description", content: "Live class membership and academic activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClassRepPage,
});

function ClassRepPage() {
  const fetchOverview = useServerFn(getClassRepOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["class-rep-overview"],
    queryFn: () => fetchOverview(),
  });

  return (
    <AppShell title="Class Representative" icon={<ShieldCheck className="size-5" />}>
      {isLoading ? <div className="surface-card h-28 animate-pulse" /> : null}
      {error ? (
        <div className="surface-card border-destructive/40 p-4 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}
      {data ? (
        <>
          <section className="grid grid-cols-3 gap-2">
            <LiveStat icon={Users} value={data.members.length} label="Members" />
            <LiveStat icon={ClipboardList} value={data.assignmentCount} label="Assignments" />
            <LiveStat icon={BookOpen} value={data.resourceCount} label="Resources" />
          </section>
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Class members</h2>
              <span className="text-xs text-muted-foreground">{data.groupCount} study groups</span>
            </div>
            <div className="space-y-2">
              {data.members.map((member) => (
                <article key={member.id} className="surface-card flex items-center gap-3 p-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary font-semibold text-primary">
                    {(member.full_name || member.email || "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {member.full_name || "Unnamed member"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                    {member.roles.includes("admin")
                      ? "Admin"
                      : member.roles.includes("class_rep")
                        ? "Class rep"
                        : "Student"}
                  </span>
                </article>
              ))}
              {!data.members.length ? (
                <div className="empty-state">No members have joined yet.</div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}

function LiveStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: number;
  label: string;
}) {
  return (
    <div className="surface-card min-w-0 p-3 text-center">
      <Icon className="mx-auto size-5 text-primary" />
      <p className="mt-2 font-display text-xl font-bold">{value}</p>
      <p className="truncate text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
