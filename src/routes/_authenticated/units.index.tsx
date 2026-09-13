import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BookMarked, BookOpen, ChevronRight, Search } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { listUnits } from "@/lib/catalog.functions";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/units/")({
  head: () => ({
    meta: [
      { title: "My Units — BBITClassPoint" },
      { name: "description", content: "Browse every BBIT unit and the material published for it." },
      { property: "og:title", content: "My Units — BBITClassPoint" },
      { property: "og:description", content: "Every BBIT unit with its published notes and papers." },
    ],
  }),
  component: Units,
});

function Units() {
  const fetchUnits = useServerFn(listUnits);
  const { data, isLoading } = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const [term, setTerm] = useState("");
  const [tab, setTab] = useState<"current" | "previous">("current");

  const units = data ?? [];
  const maxSemesterKey = Math.max(...units.map((unit) => unit.year * 10 + unit.semester), 0);
  const filtered = units
    .filter((unit) => {
      const key = unit.year * 10 + unit.semester;
      return tab === "current" ? key === maxSemesterKey : key !== maxSemesterKey;
    })
    .filter((unit) =>
      term.trim()
        ? `${unit.code} ${unit.name} ${unit.lecturer}`.toLowerCase().includes(term.trim().toLowerCase())
        : true,
    );

  return (
    <AppShell title="My Units" icon={<BookOpen className="size-5" />}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="rounded-xl bg-card pl-9"
          placeholder="Search units…"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>

      <div className="surface-card mt-3 grid grid-cols-2 gap-1 p-1">
        {(["current", "previous"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "rounded-xl py-2 text-xs font-semibold transition-colors",
              tab === item ? "bg-accent text-accent-foreground" : "text-muted-foreground",
            )}
          >
            {item === "current" ? "Current Semester" : "Previous"}
          </button>
        ))}
      </div>

      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading units…</p> : null}
      {!isLoading && filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No units here yet. An administrator adds them from the admin panel.
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {filtered.map((unit) => (
          <li key={unit.id}>
            <Link
              to="/units/$code"
              params={{ code: unit.code }}
              preload="intent"
              className="surface-card flex items-center gap-3 p-4"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <BookMarked className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm font-bold">{unit.code}</span>
                <span className="block truncate text-xs text-muted-foreground">{unit.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {unit.resourceCount} file{unit.resourceCount === 1 ? "" : "s"}
                  {unit.lecturer ? ` · ${unit.lecturer}` : ""}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
