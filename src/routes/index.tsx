import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, FileStack, GraduationCap, Sparkles } from "lucide-react";

import { getPublicStats } from "@/lib/catalog.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BBITClassPoint — Notes, Past Papers & AI Study Help" },
      {
        name: "description",
        content:
          "One place for BBIT unit notes, assignments, past papers, timetables, announcements and an AI assistant that reads your own study material.",
      },
      { property: "og:title", content: "BBITClassPoint — Notes, Past Papers & AI Study Help" },
      {
        property: "og:description",
        content: "Real course material for every BBIT unit, plus an AI assistant and exam generator.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const fetchStats = useServerFn(getPublicStats);
  const { data } = useQuery({ queryKey: ["public-stats"], queryFn: () => fetchStats() });

  return (
    <div className="min-h-screen">
      <header className="hero-gradient relative overflow-hidden text-primary-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full bg-white/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 right-0 size-[26rem] rounded-full bg-accent/30 blur-3xl"
        />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="glass-tint flex size-10 items-center justify-center rounded-xl">
              <GraduationCap className="size-5" />
            </div>
            <span className="font-display text-lg font-semibold">BBITClassPoint</span>
          </div>
          <Button asChild variant="secondary" size="sm" className="rounded-full">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pb-28">
          <span className="glass-tint inline-flex rounded-full px-3 py-1 text-xs font-medium">
            Real files · Real timetable · Real AI
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Every BBIT note, past paper and timetable in one place.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-primary-foreground/85 sm:text-lg">
            Lecturers and class reps publish real course material. Students open it, download it, and study
            it with an AI assistant that reads their own notes and writes practice exams.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/auth">Create your account</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="glass-tint rounded-full border-primary-foreground/40 bg-transparent hover:bg-white/20"
            >
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>

          <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Units on the platform" value={data ? String(data.unitCount) : "—"} />
            <Stat label="Resource categories" value={data ? String(data.categories.length) : "—"} />
            <Stat label="Free for classmates" value="100%" />
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
            icon={<Sparkles className="size-5" />}
            title="AI that reads your notes"
            body="Upload a PDF, DOCX or PPTX and ask questions answered from that exact document."
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
        BBITClassPoint — built for BBIT students.
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-primary-foreground/10 p-4">
      <dd className="font-display text-2xl font-bold">{value}</dd>
      <dt className="mt-1 text-xs text-primary-foreground/75">{label}</dt>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="surface-card p-5">
      <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
