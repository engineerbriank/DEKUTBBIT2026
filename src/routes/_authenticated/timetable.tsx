import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/AppShell";
import { listTimetable } from "@/lib/catalog.functions";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({
    meta: [
      { title: "Timetable — BBITClassPoint" },
      { name: "description", content: "The published BBIT class timetable, grouped by day." },
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
  const { data, isLoading } = useQuery({ queryKey: ["timetable"], queryFn: () => fetchTimetable() });

  const slots = (data ?? []) as unknown as Slot[];

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Timetable</h1>
      <p className="mt-1 text-sm text-muted-foreground">Class slots published by the administrator.</p>

      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading…</p> : null}
      {!isLoading && slots.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No classes have been scheduled yet.</p>
      ) : null}

      <div className="mt-6 space-y-6">
        {DAYS.map((day, index) => {
          const daySlots = slots.filter((slot) => slot.day_of_week === index);
          if (!daySlots.length) return null;
          return (
            <section key={day}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{day}</h2>
              <ul className="mt-2 space-y-2">
                {daySlots.map((slot) => (
                  <li key={slot.id} className="surface-card flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
                    <span className="font-display text-sm font-semibold text-primary">
                      {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                    </span>
                    <span className="text-sm font-medium">
                      {slot.unit ? `${slot.unit.code} — ${slot.unit.name}` : "Unit"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {slot.venue ? `${slot.venue}` : ""}
                      {slot.lecturer ? ` · ${slot.lecturer}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
