import logoAsset from "@/assets/dekut-bbit-2026-logo.png.asset.json";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FolderClosed,
  GraduationCap,
  Home,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/catalog.functions";
import { listNotifications } from "@/lib/hub.functions";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const PRIMARY_NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/resources", label: "Resources", icon: FolderClosed },
  { to: "/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/profile", label: "More", icon: Menu },
] as const;

const MORE_NAV = [
  { to: "/units", label: "My Units", icon: BookOpen },
  { to: "/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/groups", label: "Study Groups", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const ADMIN_AI_NAV = [
  { to: "/ai", label: "AI Assistant", icon: Sparkles },
  { to: "/exam", label: "Exam Maker", icon: BookOpen },
] as const;

export function useMe() {
  const fetchMe = useServerFn(getMe);
  return useQuery({ queryKey: ["me"], queryFn: () => fetchMe(), staleTime: 60_000 });
}

export function useNotifications() {
  const fetchNotifications = useServerFn(listNotifications);
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/auth" });
  };
}

export function AppShell({
  children,
  title,
  icon,
  header,
  action,
}: {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  header?: ReactNode;
  action?: ReactNode;
}) {
  const { data: me } = useMe();
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] overflow-hidden bg-background">
        <DesktopSidebar
          isAdmin={Boolean(me?.isAdmin)}
          isClassRep={Boolean(me?.roles?.includes("class_rep"))}
        />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="navy-gradient px-4 pb-5 pt-4 text-navy-foreground sm:px-7 lg:bg-none lg:px-8 lg:pb-4 lg:pt-5 lg:text-foreground">
            {header ?? (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="flex min-w-0 items-center gap-3">
                   <MobileMenu
                    isAdmin={Boolean(me?.isAdmin)}
                    isClassRep={Boolean(me?.roles?.includes("class_rep"))}
                  />
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/12 text-navy-foreground ring-1 ring-white/15 lg:hidden">
                    {icon ?? <BookOpen className="size-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="hidden text-xs font-semibold uppercase text-muted-foreground lg:block">
                      DEKUT BBIT 2026
                    </p>
                    <h1 className="truncate font-display text-xl font-semibold sm:text-2xl">
                      {title ?? "Digital Student Platform"}
                    </h1>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {action ?? <HeaderBellLink />}
                  <Link
                    to="/profile"
                    aria-label="Open profile"
                    className="grid size-10 overflow-hidden rounded-full bg-white/12 ring-1 ring-white/20"
                  >
                    {me?.avatarUrl ? (
                      <img src={me.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <User className="m-auto size-5" />
                    )}
                  </Link>
                </div>
              </div>
            )}
          </header>
          <main className="app-sheet min-h-[70vh] flex-1 px-4 pb-28 pt-4 text-foreground sm:px-7 lg:rounded-none lg:px-8 lg:pb-10 lg:pt-3">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
          <BottomNav />
        </div>
      </div>
    </div>
  );
}

function DesktopSidebar({ isAdmin, isClassRep }: { isAdmin: boolean; isClassRep: boolean }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
      <Link to="/dashboard" className="flex items-center gap-3 px-3">
        <AppLogo className="size-12" />
        <div>
          <p className="font-display text-sm font-bold leading-tight">DEKUT BBIT 2026</p>
          <p className="text-[11px] text-sidebar-foreground/65">Student Hub</p>
        </div>
      </Link>
      <nav className="mt-8 space-y-1">
        {[...PRIMARY_NAV, ...MORE_NAV].map((item) => (
          <NavLink key={item.to} item={item} />
        ))}
        {isAdmin ? ADMIN_AI_NAV.map((item) => <NavLink key={item.to} item={item} />) : null}
        {isAdmin ? (
          <NavLink item={{ to: "/admin", label: "Admin Panel", icon: ShieldCheck }} />
        ) : null}
        {isClassRep && !isAdmin ? (
          <NavLink item={{ to: "/class-rep", label: "Class Rep", icon: Settings }} />
        ) : null}
      </nav>
      <div className="mt-auto space-y-3">
        <button type="button" onClick={() => document.documentElement.classList.toggle("dark")} className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border px-3 py-2.5 text-xs font-semibold text-sidebar-foreground/80 hover:bg-sidebar-accent">
          <Moon className="size-4" /> Dark mode
        </button>
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/35 p-4">
        <p className="text-sm font-semibold italic">“Discipline today,<br />success tomorrow.”</p>
        <p className="mt-3 text-[10px] text-sidebar-foreground/65">
          BBIT 2026
        </p>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item }: { item: { to: string; label: string; icon: typeof Home } }) {
  const Icon = item.icon;
  if (item.to === "/resources") {
    return (
      <Link
        to="/resources"
        search={{ q: "", unit: "", category: "" }}
        activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground" }}
        inactiveProps={{ className: "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" }}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition"
      >
        <Icon className="size-4.5" /> {item.label}
      </Link>
    );
  }
  return (
    <Link
      to={item.to as never}
      activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground" }}
      inactiveProps={{ className: "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" }}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition"
    >
      <Icon className="size-4.5" /> {item.label}
    </Link>
  );
}

function MobileMenu({ isAdmin, isClassRep }: { isAdmin: boolean; isClassRep: boolean }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open navigation"
          className="grid size-10 place-items-center rounded-xl bg-white/12 ring-1 ring-white/15 lg:hidden"
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[86%] border-white/10 bg-navy p-5 text-navy-foreground"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-3 text-white">
              <AppLogo /> DEKUT BBIT 2026
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-7 space-y-1">
          {[...PRIMARY_NAV.slice(0, 4), ...MORE_NAV].map((item) => (
            <NavLink key={item.to} item={item} />
          ))}
          {isAdmin ? ADMIN_AI_NAV.map((item) => <NavLink key={item.to} item={item} />) : null}
          {isAdmin ? (
            <NavLink item={{ to: "/admin", label: "Admin Panel", icon: ShieldCheck }} />
          ) : null}
          {isClassRep && !isAdmin ? (
            <NavLink item={{ to: "/class-rep", label: "Class Rep", icon: Settings }} />
          ) : null}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function HeaderBellLink() {
  const { data } = useNotifications();
  const unread = data?.unread ?? 0;
  return (
    <Link
      to="/notifications"
      aria-label={`${unread} unread notifications`}
      className="relative grid size-10 place-items-center rounded-xl bg-white/12 ring-1 ring-white/15 transition hover:bg-white/20"
    >
      <Bell className="size-5" />
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

export function AppLogo({ className }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="DEKUT BBIT 2026 Digital Student Platform logo"
       className={cn("size-10 rounded-full object-cover", className)}
    />
  );
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(18_49_38/0.08)] backdrop-blur-xl lg:hidden">
      <ul className="mx-auto grid max-w-[560px] grid-cols-5">
        {PRIMARY_NAV.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              {...(item.to === "/resources" ? { search: { q: "", unit: "", category: "" } } : {})}
              preload="intent"
              activeProps={{ className: "text-accent" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="relative flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold"
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
