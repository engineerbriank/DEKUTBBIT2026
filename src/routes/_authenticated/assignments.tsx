import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ClipboardList, FileText } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { listAssignments, setAssignmentState, type AssignmentRow } from "@/lib/hub.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assignments")({
  head: () => ({
    meta: [
      { title: "Assignments — BBITClassPoint" },
      {
        name: "description",
        content: "Every published BBIT assignment with due dates, weighting and your own progress.",
      },
      { property: "og:title", content: "Assignments — BBITClassPoint" },
      {
        property: "og:description",
        content: "Track BBIT assignment due dates and mark your progress.",
      },
    ],
  }),
  component: Assignments,
});

const FILTERS = ["All", "Pending", "Completed"] as const;

function Assignments() {
  const fetchAssignments = useServerFn(listAssignments);
  const saveState = useServerFn(setAssignmentState);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const { data, isLoading } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => fetchAssignments(),
  });

  const mutate = useMutation({
    mutationFn: (input: { id: string; state: AssignmentRow["state"] }) =>
      saveState({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Progress saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = (data ?? []).filter((row) =>
    filter === "All"
      ? true
      : filter === "Pending"
        ? row.state !== "completed"
        : row.state === "completed",
  );

  return (
    <AppShell title="Assignments" icon={<ClipboardList className="size-5" />}>
      <div className="surface-card grid grid-cols-3 gap-1 p-1">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={cn(
              "rounded-xl py-2 text-xs font-semibold transition-colors",
              filter === item ? "bg-accent text-accent-foreground" : "text-muted-foreground",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading assignments…</p>
      ) : null}
      {!isLoading && rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No assignments here yet. They appear as soon as an administrator publishes one.
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="surface-card flex items-start gap-3 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {row.unit ? `${row.unit.code} ` : ""}
                {row.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {row.due_date ? `Due: ${formatDate(row.due_date)}` : "No due date"}
                {row.weight_percent ? ` · ${row.weight_percent}%` : ""}
              </p>
              {row.description ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(["not_started", "pending", "completed"] as const).map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => mutate.mutate({ id: row.id, state })}
                    className={cn(
                      "pill border transition-colors",
                      row.state === state
                        ? state === "completed"
                          ? "border-transparent bg-success text-success-foreground"
                          : state === "pending"
                            ? "border-transparent bg-warning text-warning-foreground"
                            : "border-transparent bg-secondary text-secondary-foreground"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {LABELS[state]}
                  </button>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}

const LABELS = { not_started: "Not Started", pending: "Pending", completed: "Completed" } as const;

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
