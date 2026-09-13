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
  component: CalendarPage;
});

function CalendarPage() {
  return null;
}
