import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  FileStack,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/catalog.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/units", label: "Units", icon: BookOpen },
  { to: "/resources", label: "Resources", icon: FileStack },
  { to: "/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/announcements", label: "Announcements", icon: Megaphone },
  { to: "/ai", label: "AI Assistant", icon: Sparkles },
  { to: "/exam", label: "Exam Generator", icon: GraduationCap },
] as const;

export function useMe() {
  const fetchMe = useServerFn(getMe);
  return useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/auth" });
  };

  const links = [...NAV, ...(me?.isAdmin ? [{ to: "/admin", label: "Admin", icon: ShieldCheck } as const] : [])];

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0",
          open ? "block" : "hidden lg:block",
        )}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold leading-tight">BBITClassPoint</p>
            <p className="text-xs text-sidebar-foreground/70">BBIT study hub</p>
          </div>
        </div>
        <nav className="space-y-1 px-3 pb-6">
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation"
          >
            <Menu className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{me?.fullName || me?.email}</p>
            <p className="text-xs text-muted-foreground">
              {me?.isAdmin ? "Administrator" : "Student"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
