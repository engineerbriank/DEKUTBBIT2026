import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ResourceCard } from "@/components/ResourceCard";
import { listCategories, listResources, listUnits } from "@/lib/catalog.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ResourceSearch = { q: string; unit: string; category: string };

export const Route = createFileRoute("/_authenticated/resources")({
  validateSearch: (search: Record<string, unknown>): ResourceSearch => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
    unit: typeof search["unit"] === "string" ? search["unit"] : "",
    category: typeof search["category"] === "string" ? search["category"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Resources — BBITClassPoint" },
      { name: "description", content: "Search every published BBIT note, past paper, CAT and assignment." },
      { property: "og:title", content: "Resources — BBITClassPoint" },
      { property: "og:description", content: "Search real course files across all BBIT units." },
    ],
  }),
  component: Resources,
});

function Resources() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/resources" });
  const [term, setTerm] = useState(search.q);

  const fetchResources = useServerFn(listResources);
  const fetchUnits = useServerFn(listUnits);
  const fetchCategories = useServerFn(listCategories);

  const { data: units } = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => fetchCategories() });
  const { data, isFetching } = useQuery({
    queryKey: ["resources", search.q, search.unit, search.category],
    queryFn: () =>
      fetchResources({
        data: {
          ...(search.q ? { search: search.q } : {}),
          ...(search.unit ? { unitCode: search.unit } : {}),
          ...(search.category ? { categorySlug: search.category } : {}),
        },
      }),
  });

  const setSearch = (patch: Partial<ResourceSearch>) => {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Resources</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Search runs against the database — titles, topics, descriptions, lecturers and file names.
      </p>

      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch({ q: term });
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search notes, topics, lecturers…"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          value={search.unit}
          onChange={(event) => setSearch({ unit: event.target.value })}
        >
          <option value="">All units</option>
          {(units ?? []).map((unit) => (
            <option key={unit.id} value={unit.code}>
              {unit.code}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          value={search.category}
          onChange={(event) => setSearch({ category: event.target.value })}
        >
          <option value="">All categories</option>
          {(categories ?? []).map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
        {search.q || search.unit || search.category ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTerm("");
              setSearch({ q: "", unit: "", category: "" });
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {isFetching ? "Searching…" : `${data?.length ?? 0} result${data?.length === 1 ? "" : "s"}`}
      </p>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {(data ?? []).map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </AppShell>
  );
}
