import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarDays, CalendarRange } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { listTimetable } from "@/lib/catalog.functions";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({
    meta: [
      { title: "Timetable — BBITClassPoint" },
      { name: "description", content: "The published BBIT class timetable, day by day." },
      { property: "og:title", content: "Timetable — BBITClassPoint" },
      { property: "og:description", content: "See when and where each BBIT unit meets." },
    ],
  }),
  component: Timetable,
});

type Slot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  venue: string;
  lecturer: string;
  unit: { id: string; code: string; name: string } | null;
};

function Timetable() {
  const fetchTimetable = useServerFn(listTimetable);
  const { data, isLoading } = useQuery({
    queryKey: ["timetable"],
    queryFn: () => fetchTimetable(),
  });

  const today = new Date();
  const [view, setView] = useState<"week" | "month">("week");
  const [day, setDay] = useState(today.getDay());

  const slots = (data ?? []) as unknown as Slot[];
  const weekDates = weekStrip(today);
  const daySlots = slots
    .filter((slot) => slot.day_of_week === day)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <AppShell
      title="Timetable"
      icon={<CalendarDays className="size-5" />}
      action={
        <Link
          to="/calendar"
          aria-label="Open calendar"
          className="grid size-10 place-items-center rounded-xl bg-white/12 ring-1 ring-white/15"
        >
          <CalendarRange className="size-5" />
        </Link>
      }
    >
      <div className="surface-card grid grid-cols-2 gap-1 p-1">
        {(["week", "month"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setView(item)}
            className={cn(
              "rounded-xl py-2 text-xs font-semibold capitalize transition-colors",
              view === item ? "bg-accent text-accent-foreground" : "text-muted-foreground",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {view === "week" ? (
        <>
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {weekDates.map((date) => {
              const active = date.getDay() === day;
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => setDay(date.getDay())}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "surface-card text-muted-foreground",
                  )}
                >
                  <span>{DAY_LABELS[date.getDay()]}</span>
                  <span className="font-display text-sm">{date.getDate()}</span>
                  <span className="text-[10px]">
                    {date.toLocaleDateString(undefined, { month: "short" })}
                  </span>
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading timetable…</p>
          ) : null}
          {!isLoading && daySlots.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No classes published for {DAY_NAMES[day]}.
            </p>
          ) : null}

          <ul className="mt-4 space-y-3">
            {daySlots.map((slot) => (
              <li key={slot.id} className="surface-card border-l-4 border-l-primary p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                    </p>
                    <p className="mt-1 font-display text-sm font-bold">
                      {slot.unit?.code ?? "Class"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {slot.venue || slot.unit?.name}
                      {slot.lecturer ? ` · ${slot.lecturer}` : ""}
                    </p>
                  </div>
                  <span className="pill shrink-0 bg-secondary text-secondary-foreground">
                    {day === today.getDay() ? liveState(slot, today) : "Scheduled"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-4 space-y-5">
          {DAY_NAMES.map((name, index) => {
            const rows = slots
              .filter((slot) => slot.day_of_week === index)
              .sort((a, b) => a.start_time.localeCompare(b.start_time));
            if (!rows.length) return null;
            return (
              <section key={name}>
                <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {name}
                </h2>
                <ul className="mt-2 space-y-2">
                  {rows.map((slot) => (
                    <li
                      key={slot.id}
                      className="surface-card flex items-center gap-3 border-l-4 border-l-navy-soft p-3.5"
                    >
                      <span className="w-24 shrink-0 text-xs font-semibold text-primary">
                        {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {slot.unit?.code ?? "Class"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {slot.venue || slot.unit?.name}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function weekStrip(today: Date) {
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function liveState(slot: Slot, now: Date) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = slot.start_time.split(":").map(Number);
  const [eh, em] = slot.end_time.split(":").map(Number);
  const start = (sh ?? 0) * 60 + (sm ?? 0);
  const end = (eh ?? 0) * 60 + (em ?? 0);
  if (minutes >= start && minutes <= end) return "Live";
  if (minutes < start) return "Upcoming";
  return "Done";
}
