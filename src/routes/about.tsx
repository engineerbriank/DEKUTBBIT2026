import logoAsset from "@/assets/dekut-bbit-2026-logo.png.asset.json";
import brianAsset from "@/assets/brian-macharia.png.asset.json";
import linusAsset from "@/assets/linus-ezra.png.asset.json";
import calebAsset from "@/assets/caleb-ajiambo.png.asset.json";
import samuelAsset from "@/assets/samuel-murira.png.asset.json";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Code2,
  FlaskConical,
  Lightbulb,
  Quote,
  Rocket,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — DEKUT BBIT 2026 Digital Student Platform" },
      {
        name: "description",
        content:
          "Built by students, for students. Meet Brian Macharia Kariuki and the team behind the DEKUT BBIT Student Platform.",
      },
      { property: "og:title", content: "About Us — DEKUT BBIT 2026 Digital Student Platform" },
      {
        property: "og:description",
        content:
          "An idea. A student. A team. A platform. Meet the students who built and tested the DEKUT BBIT Student Platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="hero-gradient relative overflow-hidden text-primary-foreground">
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pb-14 pt-12 text-center sm:px-6">
          <img
            src={logoAsset.url}
            alt="DEKUT BBIT 2026 Digital Student Platform logo"
            className="size-16 rounded-full object-cover shadow-lg sm:size-20"
          />
          <span className="glass-tint mt-4 inline-flex rounded-full px-3 py-1 text-xs font-medium">
            DEKUT BBIT 2026 · DIGITAL STUDENT PLATFORM
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">About Us</h1>
          <p className="mt-3 text-base font-medium text-primary-foreground/90 sm:text-lg">
            Built by students. For students.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <section className="surface-card mt-6 p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold text-primary">Our Story</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            An idea. A student. A team. A platform.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-foreground/90 sm:text-base">
            The DEKUT BBIT Student Platform started from a simple idea: create a smarter and more
            organized digital space where BBIT students can easily access important class
            information, resources, updates and communication.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90 sm:text-base">
            What began as an idea became a working platform through planning, development, testing
            and continuous improvement.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-primary">The Team</h2>

          <article className="glass-panel mt-4 overflow-hidden">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
              <img
                src={brianAsset.url}
                alt="Brian Macharia Kariuki"
                className="size-36 shrink-0 self-center rounded-2xl object-cover shadow-lg ring-2 ring-white/40 sm:self-start"
              />
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold">Brian Macharia Kariuki</h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-primary">
                  <Code2 className="size-3.5" /> Founder · Lead Developer · Builder
                </p>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  Brian is the student behind the idea and development of the DEKUT BBIT Student
                  Platform. As a BBIT student at Dedan Kimathi University of Technology, he saw an
                  opportunity to make class management and student communication more organized
                  through technology. He came up with the concept, planned the platform, designed
                  its structure, developed the system and personally invested in bringing the
                  project to life.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  His interest goes beyond simply learning technology — he enjoys building
                  practical systems, working smart and turning ideas into usable products.
                </p>
                <blockquote className="mt-4 flex gap-2 rounded-xl bg-secondary p-3 text-sm italic text-secondary-foreground">
                  <Quote className="size-4 shrink-0 text-accent" />
                  <span>
                    “I didn’t want to just talk about an idea. I wanted to build it and let
                    students actually use it.”
                  </span>
                </blockquote>
              </div>
            </div>
          </article>

          <article className="glass-panel mt-4 overflow-hidden">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
              <img
                src={linusAsset.url}
                alt="Linus Ezra"
                className="size-36 shrink-0 self-center rounded-2xl object-cover shadow-lg ring-2 ring-white/40 sm:self-start"
              />
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold">Linus Ezra</h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-primary">
                  <FlaskConical className="size-3.5" /> Contributor · Tester · Developer in Progress
                </p>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  Linus is a fellow DEKUT BBIT student with an interest in software development and
                  data analytics. During the development of the platform, Linus helped by testing
                  different parts of the system, sharing ideas and giving feedback on how the
                  platform could be improved from a student’s perspective.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  His contribution represents an important part of the project: building, testing,
                  learning and improving together.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-primary">Behind the Build</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Real users who challenged the platform and made it better.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ContributorCard
              name="Caleb Ajiambo"
              role="Reviewer · Tester · Feedback Contributor"
              photo={calebAsset.url}
              body="Caleb helped examine how the platform worked from a student’s point of view — testing features, identifying areas that could be improved and providing honest feedback. A platform becomes better when real users challenge it, test it and give honest feedback."
            />
            <ContributorCard
              name="Samuel Murira"
              role="Reviewer · Tester"
              photo={samuelAsset.url}
              body="Samuel contributed through testing and reviewing. His feedback provided another student perspective during development, helping identify things that could be made clearer, simpler and more useful for BBIT students."
            />
          </div>
        </section>

        <section className="surface-card mt-8 p-6 text-center sm:p-8">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
            <Rocket className="size-6" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold text-primary">
            More Than a Class Platform
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90 sm:text-base">
            This project is more than a website. It is an example of what students can build when
            technology is used to solve real problems around them.
          </p>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Lightbulb className="size-3.5" />
            Designed, developed and continuously improved by DEKUT BBIT students
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link to="/auth">Join the platform</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        DEKUT BBIT 2026 · DIGITAL STUDENT PLATFORM
      </footer>
    </div>
  );
}

function ContributorCard({
  name,
  role,
  photo,
  body,
}: {
  name: string;
  role: string;
  photo: string;
  body: string;
}) {
  return (
    <div className="surface-card p-5 transition-transform hover:-translate-y-1">
      <div className="flex items-center gap-3">
        <img
          src={photo}
          alt={name}
          className="size-10 shrink-0 rounded-full object-cover shadow ring-2 ring-white/40"
        />
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold">{name}</h3>
          <p className="mt-0.5 text-xs font-semibold text-primary">{role}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
