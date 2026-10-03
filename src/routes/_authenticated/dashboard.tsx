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
  ArrowRight,
  Clock3,
  FileText,
} from "lucide-react";

import { AppLogo, AppShell, HeaderBellLink, useMe } from "@/components/AppShell";
import { ResourceCard } from "@/components/ResourceCard";
import { getDashboard, listTimetable } from "@/lib/catalog.functions";
import { listAnnouncements } from "@/lib/catalog.functions";
import { listAssignments } from "@/lib/hub.functions";
import { cn } from "@/lib/utils";
import campusAsset from "@/assets/dekut-campus.png.asset.json";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Home — DEKUT BBIT 2026 Digital Student Platform" },
      {
        name: "description",
        content: "Today's BBIT classes, live counts and the newest published notes.",
      },
      { property: "og:title", content: "Home — DEKUT BBIT 2026 Digital Student Platform" },
      { property: "og:description", content: "Your BBIT study hub at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  {
    to: "/resources",
    label: "Resources",
    icon: FolderClosed,
    search: { q: "", unit: "", category: "" },
  },
  { to: "/groups", label: "Study Groups", icon: Users },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/announcements", label: "Announcements", icon: Megaphone },
] as const;

const ADMIN_TILES = [
  { to: "/ai", label: "AI Assistant", icon: Sparkles },
  { to: "/exam", label: "Exam Maker", icon: GraduationCap },
] as const;

function Dashboard() {
  const { data: me } = useMe();
  const fetchDashboard = useServerFn(getDashboard);
  const fetchTimetable = useServerFn(listTimetable);
  const fetchAnnouncements = useServerFn(listAnnouncements);
  const fetchAssignments = useServerFn(listAssignments);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboard(),
  });
  const { data: timetable } = useQuery({
    queryKey: ["timetable"],
    queryFn: () => fetchTimetable(),
  });
  const { data: announcements } = useQuery({ queryKey: ["announcements"], queryFn: () => fetchAnnouncements() });
  const { data: assignments } = useQuery({ queryKey: ["assignments"], queryFn: () => fetchAssignments() });

  const firstName = (me?.fullName || me?.email || "there").split(/[\s@]/)[0] ?? "there";
  const today = new Date();
  const todaySlots = ((timetable ?? []) as unknown as Slot[])
    .filter((slot) => slot.day_of_week === today.getDay())
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const nextClass = todaySlots.find((slot) => slotState(slot, today) !== "Done");
  const pendingAssignments = (assignments ?? []).filter((item) => item.state !== "completed");

  return (
    <AppShell
      header={
        <div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <AppLogo />
              <div className="min-w-0">
                 <p className="font-display text-base font-semibold leading-tight sm:text-lg">
                   DEKUT BBIT 2026
                </p>
                <p className="truncate text-xs text-navy-foreground/70">
                   Student Hub
                </p>
              </div>
            </div>
            <HeaderBellLink />
          </div>
        </div>
      }
    >
      <div className="hero-gradient relative min-h-40 overflow-hidden rounded-xl p-5 text-primary-foreground sm:p-7">
        <img src={campusAsset.url} alt="Dedan Kimathi University campus" className="absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover opacity-75 sm:block" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary via-primary/85 to-transparent" />
        <div className="relative max-w-lg">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{greeting()}, {firstName} 👋</h1>
          <p className="mt-1 text-sm text-primary-foreground/80">Keep pushing. Great things take consistency.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="rounded-full bg-primary-foreground/15 px-3 py-1.5">BBIT 2026</span>
            <span className="rounded-full bg-primary-foreground/15 px-3 py-1.5">DEKUT Student Hub</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <OverviewStat icon={CalendarDays} label="Next Class" value={nextClass?.unit?.code ?? "None"} detail={nextClass ? `${nextClass.start_time.slice(0,5)} · ${nextClass.venue}` : "No class remaining"} to="/timetable" />
        <OverviewStat icon={Clock3} label="Today's Classes" value={String(todaySlots.length)} detail="View timetable" to="/timetable" />
        <OverviewStat icon={ClipboardList} label="Pending Assignments" value={String(pendingAssignments.length)} detail="View assignments" to="/assignments" />
        <OverviewStat icon={Megaphone} label="New Announcements" value={String(announcements?.length ?? 0)} detail="View all" to="/announcements" />
      </div>

      <div className="mt-5 flex items-center justify-between">
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
              <li
                key={slot.id}
                className="surface-card flex items-center gap-3 border-l-4 border-l-primary p-3.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {slot.unit?.code ?? "Class"}
                  </span>
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

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <section>
          <div className="flex items-center justify-between"><h2 className="font-display text-base font-semibold">Recent Announcements</h2><Link to="/announcements" className="text-xs font-semibold text-primary">View All</Link></div>
          <div className="mt-2 space-y-2">
            {(announcements ?? []).slice(0,3).map((item) => <article key={item.id} className="surface-card flex gap-3 p-3.5"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Megaphone className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title}</p><p className="line-clamp-1 text-xs text-muted-foreground">{item.body}</p></div></article>)}
            {!announcements?.length ? <p className="empty-state">No announcements yet.</p> : null}
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between"><h2 className="font-display text-base font-semibold">Upcoming Assignments</h2><Link to="/assignments" className="text-xs font-semibold text-primary">View All</Link></div>
          <div className="mt-2 space-y-2">
            {pendingAssignments.slice(0,3).map((item) => <article key={item.id} className="surface-card flex gap-3 p-3.5"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><FileText className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{item.unit?.code ?? "Class"}{item.due_date ? ` · Due ${new Date(item.due_date).toLocaleDateString()}` : ""}</p></div></article>)}
            {!pendingAssignments.length ? <p className="empty-state">No pending assignments.</p> : null}
          </div>
        </section>
      </div>

      <h2 className="mt-5 font-display text-base font-semibold">Quick Actions</h2>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {[...TILES.slice(0,5), ...(me?.isAdmin ? ADMIN_TILES.slice(0,1) : [])].slice(0,4).map((tile) => <Link key={tile.to} to={tile.to} {...("search" in tile ? { search: tile.search } : {})} className="surface-card flex min-h-24 flex-col items-center justify-center gap-2 p-2 text-center"><span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><tile.icon className="size-4" /></span><span className="text-[10px] font-semibold leading-tight">{tile.label}</span></Link>)}
      </div>

      <h2 className="mt-5 font-display text-base font-semibold">Recent Resources</h2>
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

function OverviewStat({ icon: Icon, label, value, detail, to }: { icon: typeof CalendarDays; label: string; value: string; detail: string; to: string }) {
  return <Link to={to as never} className="surface-card min-w-0 p-3.5"><div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon className="size-4" /></span><p className="truncate text-[10px] font-semibold text-muted-foreground">{label}</p></div><p className="mt-2 truncate font-display text-xl font-bold text-foreground">{value}</p><p className="mt-1 flex items-center gap-1 truncate text-[10px] font-semibold text-primary">{detail}<ArrowRight className="size-3" /></p></Link>;
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
