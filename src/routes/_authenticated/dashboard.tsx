import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  ClipboardList,
  FolderClosed,
  GraduationCap,
  LayoutGrid,
  Megaphone,
  Sparkles,
  Users,
} from "lucide-react";

import { AppLogo, AppShell, HeaderBellLink, useMe } from "@/components/AppShell";
import { ResourceCard } from "@/components/ResourceCard";
import { getDashboard, listTimetable } from "@/lib/catalog.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Home — BBITClassPoint" },
      { name: "description", content: "Today's BBIT classes, live counts and the newest published notes." },
      { property: "og:title", content: "Home — BBITClassPoint" },
      { property: "og:description", content: "Your BBIT study hub at a glance." },
    ],
  }),
  component: Dashboard,
});

type Slot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  venue: string;
  unit: { code: string; name: string } | null;
};

const TILES = [
  { to: "/timetable", label: "My Timetable", icon: CalendarDays },
  { to: "/units", label: "Units", icon: LayoutGrid },
  { to: "/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/resources", label: "Resources", icon: FolderClosed, search: { q: "", unit: "", category: "" } },
  { to: "/groups", label: "Study Groups", icon: Users },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/announcements", label: "Announcements", icon: Megaphone },
  { to: "/ai", label: "AI Assistant", icon: Sparkles },
  { to: "/exam", label: "Exam Maker", icon: GraduationCap },
] as const;

function Dashboard() {
  const { data: me } = useMe();
  const fetchDashboard = useServerFn(getDashboard);
  const fetchTimetable = useServerFn(listTimetable);

  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDashboard() });
  const { data: timetable } = useQuery({ queryKey: ["timetable"], queryFn: () => fetchTimetable() });

  const firstName = (me?.fullName || me?.email || "there").split(/[\s@]/)[0] ?? "there";
  const today = new Date();
  const todaySlots = ((timetable ?? []) as unknown as Slot[])
    .filter((slot) => slot.day_of_week === today.getDay())
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <AppShell
      header={
        <div className="space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <AppLogo />
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold">BBITClassPoint</p>
                <p className="truncate text-xs text-navy-foreground/70">
                  BBIT 1.1 · Dedan Kimathi University
                </p>
              </div>
            </div>
            <HeaderBellLink />
          </div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-display text-base font-bold text-accent-foreground">
              {firstName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{greeting()}, {firstName} 👋</p>
              <p className="truncate text-xs text-navy-foreground/70">
                Keep pushing. Great things take time!
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="hero-gradient relative overflow-hidden rounded-2xl p-5 text-primary-foreground">
        <p className="font-display text-lg font-semibold leading-tight">
          Together We Learn
          <br />
          Together We Grow
        </p>
        <p className="mt-2 text-xs text-primary-foreground/80">DEKUT · BBIT 2026</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {TILES.map((tile) => (
          <Link
            key={tile.to}
            to={tile.to}
            {...("search" in tile ? { search: tile.search } : {})}
            preload="intent"
            className="surface-card flex flex-col items-center gap-2 p-3 text-center"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
              <tile.icon className="size-5" />
            </span>
            <span className="text-[11px] font-semibold leading-tight">{tile.label}</span>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Today's Classes</h2>
        <Link to="/timetable" className="text-xs font-semibold text-accent">
          View All
        </Link>
      </div>

      {todaySlots.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No classes scheduled for today.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {todaySlots.map((slot) => {
            const state = slotState(slot, today);
            return (
              <li key={slot.id} className="surface-card flex items-center gap-3 border-l-4 border-l-primary p-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{slot.unit?.code ?? "Class"}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {slot.venue || slot.unit?.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                  </span>
                </span>
                <span
                  className={cn(
                    "pill shrink-0",
                    state === "Live"
                      ? "bg-success text-success-foreground"
                      : state === "Upcoming"
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {state}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-6 font-display text-base font-semibold">This class at a glance</h2>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Stat label="Published files" value={isLoading ? "…" : String(data?.totalResources ?? 0)} to="/resources" />
        <Stat label="Units" value={isLoading ? "…" : String(data?.totalUnits ?? 0)} to="/units" />
        <Stat label="Classes" value={isLoading ? "…" : String(data?.totalClasses ?? 0)} to="/timetable" />
        <Stat
          label="Announcements"
          value={isLoading ? "…" : String(data?.totalAnnouncements ?? 0)}
          to="/announcements"
        />
      </div>

      <h2 className="mt-6 font-display text-base font-semibold">Recently published</h2>
      {data?.recent?.length ? (
        <div className="mt-2 space-y-3">
          {data.recent.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing published yet. An administrator can upload the first file from the admin panel.
        </p>
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  to,
}: {
  label: string;
  value: string;
  to: "/resources" | "/units" | "/timetable" | "/announcements";
}) {
  return (
    <Link
      to={to}
      {...(to === "/resources" ? { search: { q: "", unit: "", category: "" } } : {})}
      preload="intent"
      className="surface-card p-4"
    >
      <p className="font-display text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Link>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function slotState(slot: Slot, now: Date) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMinute] = slot.start_time.split(":").map(Number);
  const [endHour, endMinute] = slot.end_time.split(":").map(Number);
  const start = (startHour ?? 0) * 60 + (startMinute ?? 0);
  const end = (endHour ?? 0) * 60 + (endMinute ?? 0);
  if (minutes >= start && minutes <= end) return "Live";
  if (minutes < start) return "Upcoming";
  return "Done";
}
