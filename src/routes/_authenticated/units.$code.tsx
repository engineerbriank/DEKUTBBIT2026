import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ResourceCard } from "@/components/ResourceCard";
import { getUnit } from "@/lib/catalog.functions";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const Route = createFileRoute("/_authenticated/units/$code")({
  head: () => ({
    meta: [
      { title: "Unit material — BBITClassPoint" },
      { name: "description", content: "All published notes, slides and papers for this BBIT unit." },
      { property: "og:title", content: "Unit material — BBITClassPoint" },
      { property: "og:description", content: "Open and download real course files for this unit." },
    ],
  }),
  component: UnitPage,
});

function UnitPage() {
  const { code } = Route.useParams();
  const fetchUnit = useServerFn(getUnit);
  const { data, isLoading, error } = useQuery({
    queryKey: ["unit", code],
    queryFn: () => fetchUnit({ data: { code } }),
  });

  return (
    <AppShell>
      <Link to="/units" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All units
      </Link>

      {error ? <p className="mt-4 text-sm text-destructive">{(error as Error).message}</p> : null}
      {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading…</p> : null}

      {data ? (
        <>
          <h1 className="mt-3 text-2xl font-semibold">
            {data.unit.code} — {data.unit.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Year {data.unit.year} · Semester {data.unit.semester}
            {data.unit.lecturer ? ` · ${data.unit.lecturer}` : ""}
          </p>
          {data.unit.description ? (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{data.unit.description}</p>
          ) : null}

          {data.classes.length ? (
            <div className="surface-card mt-6 p-4">
              <h2 className="text-sm font-semibold">Class schedule</h2>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {data.classes.map((slot) => (
                  <li key={slot.id}>
                    {DAYS[slot.day_of_week]} · {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                    {slot.venue ? ` · ${slot.venue}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <h2 className="mt-8 text-lg font-semibold">Published material ({data.resources.length})</h2>
          {data.resources.length ? (
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {data.resources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No material published for this unit yet.</p>
          )}
        </>
      ) : null}
    </AppShell>
  );
}
