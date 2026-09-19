import logoAsset from "@/assets/dekut-bbit-2026-logo.png.asset.json";
import campusAsset from "@/assets/dekut-campus.png.asset.json";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, FileStack, Users } from "lucide-react";

import { getPublicStats } from "@/lib/catalog.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DEKUT BBIT 2026 — Digital Student Platform" },
      {
        name: "description",
        content:
          "One place for BBIT unit notes, assignments, past papers, timetables, announcements and approved study groups.",
      },
      { property: "og:title", content: "DEKUT BBIT 2026 — Digital Student Platform" },
      {
        property: "og:description",
        content:
          "Real BBIT course material, live timetables, assignments and approved study groups.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const fetchStats = useServerFn(getPublicStats);
  const { data } = useQuery({ queryKey: ["public-stats"], queryFn: () => fetchStats() });

  return (
    <div className="min-h-screen bg-background">
      <header className="relative flex min-h-[78vh] overflow-hidden text-primary-foreground">
        <img
          src={campusAsset.url}
          alt="Aerial view of Dedan Kimathi University campus"
          className="absolute inset-0 size-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-navy/70" />
        <div className="absolute inset-x-0 top-0 z-10 mx-auto flex max-w-6xl justify-center px-4 py-5 sm:px-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <img
              src={logoAsset.url}
              alt="DEKUT BBIT 2026 Digital Student Platform logo"
              className="size-16 rounded-full object-cover shadow-lg sm:size-20"
            />
            <span className="font-display text-sm font-semibold leading-tight sm:text-lg">
              DEKUT BBIT 2026 · DIGITAL STUDENT PLATFORM
            </span>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pb-16 pt-40 text-center sm:px-6 sm:pt-44">
          <span className="glass-tint inline-flex rounded-full px-3 py-1 text-xs font-medium">
            Real files · Real timetable · Real AI
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            Every BBIT note, past paper and timetable in one place.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-primary-foreground/85 sm:text-lg">
            Open real class material, follow the live timetable, track assignments and learn with
            approved study groups.
          </p>
          <div className="mt-8 flex w-full max-w-md flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link to="/auth">Create account</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="glass-tint rounded-full border-primary-foreground/40 bg-transparent hover:bg-white/20"
            >
              <Link to="/auth">I have an account</Link>
            </Button>
          </div>
          <Link
            to="/about"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-foreground/85 underline-offset-4 hover:underline"
          >
            About Us · Meet the team behind the platform
          </Link>


          <dl className="mt-12 grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Units on the platform" value={data ? String(data.unitCount) : "—"} />
            <Stat label="Resource categories" value={data ? String(data.categories.length) : "—"} />
            <Stat label="Published units" value={data ? String(data.units.length) : "—"} />
          </dl>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold">What you get</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Feature
            icon={<BookOpen className="size-5" />}
            title="Unit libraries"
            body="Notes, slides, CATs, assignments and past papers organised per unit and topic."
          />
          <Feature
            icon={<FileStack className="size-5" />}
            title="Real files"
            body="Everything you see is an actual stored document you can open in the browser or download."
          />
          <Feature
            icon={<Users className="size-5" />}
            title="Approved study groups"
            body="Register for reviewed groups, open their WhatsApp communities and follow member announcements."
          />
        </div>

        {data?.units?.length ? (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold">Units already set up</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.units.map((unit) => (
                <li key={unit.code} className="surface-card p-4">
                  <p className="font-display text-sm font-semibold text-primary">{unit.code}</p>
                  <p className="text-sm text-muted-foreground">{unit.name}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <Link to="/about" className="font-semibold text-primary hover:underline">
          About Us
        </Link>
        <span className="mx-2">·</span>
        DEKUT BBIT 2026 · DIGITAL STUDENT PLATFORM
      </footer>

    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-tint rounded-2xl p-4">
      <dd className="font-display text-2xl font-bold">{value}</dd>
      <dt className="mt-1 text-xs text-primary-foreground/75">{label}</dt>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="surface-card p-5 transition-transform hover:-translate-y-1">
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
