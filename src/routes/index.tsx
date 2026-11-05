import logoAsset from "@/assets/studylyn-logo.png";
import campusAsset from "@/assets/dekut-campus.png";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  FolderClosed,
  Sparkles,
  Users,
} from "lucide-react";

import { getPublicStats } from "@/lib/catalog.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyLyn — Learn · Plan · Achieve" },
      {
        name: "description",
        content:
          "StudyLyn is the study home for the DEKUT BBIT class of 2026: notes, past papers, live timetable, assignments, announcements and approved study groups.",
      },
      { property: "og:title", content: "StudyLyn — Learn · Plan · Achieve" },
      {
        property: "og:description",
        content:
          "Your class work in one place — real notes, the live timetable, deadlines and approved study groups for BBIT 2026.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://real-class-link.lovable.app/social-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://real-class-link.lovable.app/social-image.png" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const fetchStats = useServerFn(getPublicStats);
  const { data } = useQuery({ queryKey: ["public-stats"], queryFn: () => fetchStats() });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src={logoAsset} alt="StudyLyn logo" className="h-9 w-auto" />
            <div className="leading-tight">
              <p className="font-display text-sm font-bold">StudyLyn</p>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                DEKUT BBIT 2026 Hub
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="navy-gradient relative overflow-hidden text-primary-foreground">
        <img
          src={campusAsset}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover opacity-15"
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-14 text-center sm:px-6 sm:py-20">
          <span className="pill bg-primary-foreground/15 text-primary-foreground">
            DEKUT BBIT 2026 · Class of 2026
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">
            Learn. Plan. Achieve.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-primary-foreground/85 sm:text-base">
            StudyLyn keeps every note, past paper, class, deadline and study group for BBIT 2026 in
            one small, fast app — so you spend less time searching and more time studying.
          </p>
          <div className="mt-7 flex w-full max-w-sm flex-col justify-center gap-2.5 sm:flex-row">
            <Button
              asChild
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link to="/auth">Create free account</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="glass-tint rounded-full border-primary-foreground/40 bg-transparent hover:bg-white/20"
            >
              <Link to="/auth">I have an account</Link>
            </Button>
          </div>
          <Link
            to="/about"
            className="mt-4 text-xs font-semibold text-primary-foreground/80 underline-offset-4 hover:underline"
          >
            About Us · Meet the team behind StudyLyn
          </Link>

          <dl className="mt-10 grid w-full max-w-lg grid-cols-3 gap-3">
            <Stat label="Units ready" value={data ? String(data.unitCount) : "—"} />
            <Stat label="Categories" value={data ? String(data.categories.length) : "—"} />
            <Stat label="Published units" value={data ? String(data.units.length) : "—"} />
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h2 className="text-center font-display text-xl font-semibold sm:text-2xl">
          Everything your class needs, in one place
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon={<FolderClosed className="size-4" />}
            title="Notes & past papers"
            body="Real files for every unit and topic — open in the browser or download."
          />
          <Feature
            icon={<CalendarDays className="size-4" />}
            title="Live timetable"
            body="Know where your next class is, with tomorrow's classes sent by SMS."
          />
          <Feature
            icon={<ClipboardList className="size-4" />}
            title="Assignment tracker"
            body="Deadlines, weights and progress so nothing catches you by surprise."
          />
          <Feature
            icon={<Bell className="size-4" />}
            title="Instant announcements"
            body="Class reps and admin post updates; you get a bell alert and an SMS."
          />
          <Feature
            icon={<Users className="size-4" />}
            title="Approved study groups"
            body="Admin-reviewed groups with private chats and WhatsApp communities."
          />
          <Feature
            icon={<Sparkles className="size-4" />}
            title="AI study assistant"
            body="Upload your notes and exam papers — the assistant reads them with you."
          />
        </div>

        {data?.units?.length ? (
          <div className="mt-10">
            <h2 className="text-center font-display text-xl font-semibold sm:text-2xl">
              Units already on StudyLyn
            </h2>
            <ul className="mx-auto mt-4 grid max-w-3xl gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.units.map((unit) => (
                <li key={unit.code} className="surface-card px-4 py-3">
                  <p className="font-display text-xs font-bold text-primary">{unit.code}</p>
                  <p className="text-xs text-muted-foreground">{unit.name}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <Link to="/about" className="font-semibold text-primary hover:underline">
          About Us
        </Link>
        <span className="mx-2">·</span>
        StudyLyn — DEKUT BBIT 2026 Hub · Learn · Plan · Achieve
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-tint rounded-xl px-3 py-3">
      <dd className="font-display text-xl font-bold">{value}</dd>
      <dt className="mt-0.5 text-[12px] text-primary-foreground/75">{label}</dt>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="surface-card p-4 transition-transform hover:-translate-y-1">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
