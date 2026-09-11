import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, CalendarDays, FileStack, Megaphone } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ResourceCard } from "@/components/ResourceCard";
import { getDashboard } from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — BBITClassPoint" },
      { name: "description", content: "Live counts of published notes, units, classes and announcements." },
      { property: "og:title", content: "Dashboard — BBITClassPoint" },
      { property: "og:description", content: "Your BBIT study hub at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const fetchDashboard = useServerFn(getDashboard);
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDashboard() });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every number below is counted live from published material.
      </p>

      {error ? <p className="mt-6 text-sm text-destructive">{(error as Error).message}</p> : null}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<FileStack className="size-5" />}
          label="Published resources"
          value={isLoading ? "…" : String(data?.totalResources ?? 0)}
          to="/resources"
          search={{ category: "", q: "", unit: "" }}
        />
        <StatCard
          icon={<BookOpen className="size-5" />}
          label="Units"
          value={isLoading ? "…" : String(data?.totalUnits ?? 0)}
          to="/units"
        />
        <StatCard
          icon={<CalendarDays className="size-5" />}
          label="Scheduled classes"
          value={isLoading ? "…" : String(data?.totalClasses ?? 0)}
          to="/timetable"
        />
        <StatCard
          icon={<Megaphone className="size-5" />}
          label="Announcements"
          value={isLoading ? "…" : String(data?.totalAnnouncements ?? 0)}
          to="/announcements"
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold">By category</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(data?.categories ?? []).map((category) => (
          <Link
            key={category.slug}
            to="/resources"
            search={{ category: category.slug, q: "", unit: "" }}
            className="surface-card p-4 transition-shadow hover:shadow-lg"
          >
            <p className="font-display text-2xl font-bold text-primary">{category.count}</p>
            <p className="text-sm text-muted-foreground">{category.name}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Recently published</h2>
      {data?.recent?.length ? (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.recent.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing published yet. An administrator can upload the first resource from the admin panel.
        </p>
      )}
    </AppShell>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="surface-card p-5 transition-transform hover:-translate-y-1">
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-4 font-display text-3xl font-bold text-gradient">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
