import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { getCalendar } from "@/lib/hub.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — BBITClassPoint" },
      { name: "description", content: "Month view of published BBIT classes and assignment due dates." },
      { property: "og:title", content: "Calendar — BBITClassPoint" },
      { property: "og:description", content: "See classes and assignment deadlines by month." },
    ],
  }),
  component: CalendarPage,
});

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Slot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  venue: string;
  unit: { code: string; name: string } | null;
};

type Due = { id: string; title: string; due_date: string; unit: { code: string; name: string } | null };

function CalendarPage() {
  const fetchCalendar = useServerFn(getCalendar);
  const { data } = useQuery({ queryKey: ["calendar"], queryFn: () => fetchCalendar() });

  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  const slots = (data?.slots ?? []) as unknown as Slot[];
  const dues = (data?.assignments ?? []) as unknown as Due[];

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (firstDay.getDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const dueDays = new Set(
    dues
      .filter((due) => {
        const date = new Date(due.due_date);
        return date.getFullYear() === year && date.getMonth() === month;
      })
      .map((due) => new Date(due.due_date).getDate()),
  );

  const selectedSlots = slots
    .filter((slot) => slot.day_of_week === selected.getDay())
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const selectedDues = dues.filter((due) => sameDay(new Date(due.due_date), selected));

  return (
    <AppShell title="Calendar" icon={<CalendarDays className="size-5" />}>
      <div className="surface-card p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="font-display text-sm font-semibold">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-sm">
          {cells.map((day, index) => {
            if (day === null) return <span key={`empty-${index}`} />;
            const date = new Date(year, month, day);
            const isSelected = sameDay(date, selected);
            const isToday = sameDay(date, today);
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(date)}
                className={cn(
                  "relative mx-auto grid size-8 place-items-center rounded-full",
                  isSelected
                    ? "bg-primary font-semibold text-primary-foreground"
                    : isToday
                      ? "font-semibold text-primary"
                      : "text-foreground",
                )}
              >
                {day}
                {dueDays.has(day) && !isSelected ? (
                  <span className="absolute bottom-0.5 size-1 rounded-full bg-destructive" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <h2 className="mt-6 font-display text-base font-semibold">
        {sameDay(selected, today)
          ? "Today's Events"
          : selected.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
      </h2>

      {selectedSlots.length === 0 && selectedDues.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing scheduled for this day.</p>
      ) : null}

      <ul className="mt-2 space-y-2">
        {selectedSlots.map((slot) => (
          <li key={slot.id} className="surface-card flex items-center gap-3 border-l-4 border-l-primary p-3.5">
            <span className="w-12 shrink-0 font-display text-xs font-bold text-primary">
              {slot.start_time.slice(0, 5)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{slot.unit?.code ?? "Class"}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {slot.venue || slot.unit?.name}
              </span>
            </span>
          </li>
        ))}
        {selectedDues.map((due) => (
          <li key={due.id} className="surface-card flex items-center gap-3 border-l-4 border-l-destructive p-3.5">
            <span className="w-12 shrink-0 font-display text-xs font-bold text-destructive">Due</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{due.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{due.unit?.code}</span>
            </span>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}
