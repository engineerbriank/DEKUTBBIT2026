import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/AppShell";
import { listUnits } from "@/lib/catalog.functions";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/units")({
  head: () => ({
    meta: [
      { title: "Units — BBITClassPoint" },
      { name: "description", content: "Browse every BBIT unit and the material published for it." },
      { property: "og:title", content: "Units — BBITClassPoint" },
      { property: "og:description", content: "Every BBIT unit with its published notes and papers." },
    ],
  }),
  component: Units,
});

function Units() {
  const fetchUnits = useServerFn(listUnits);
  const { data, isLoading } = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Units</h1>
      <p className="mt-1 text-sm text-muted-foreground">Open a unit to see its published material.</p>

      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading units…</p> : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((unit) => (
          <Link
            key={unit.id}
            to="/units/$code"
            params={{ code: unit.code }}
            className="surface-card p-5 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-base font-semibold text-primary">{unit.code}</p>
              <Badge variant="secondary">{unit.resourceCount} files</Badge>
            </div>
            <p className="mt-1 text-sm font-medium">{unit.name}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Year {unit.year} · Semester {unit.semester}
              {unit.lecturer ? ` · ${unit.lecturer}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
