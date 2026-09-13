import logoAsset from "@/assets/bbit-logo.png.asset.json";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  FolderClosed,
  Home,
  User,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/catalog.functions";
import { listNotifications } from "@/lib/hub.functions";
import { cn } from "@/lib/utils";

const BOTTOM_NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/resources", label: "Resources", icon: FolderClosed },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
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

/**
 * Mobile-app frame: navy header, rounded white sheet for content and a fixed
 * five-item bottom navigation. `header` replaces the default title row.
 */
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
  return (
    <div className="flex min-h-screen justify-center bg-navy">
      <div className="relative flex w-full max-w-[430px] flex-col bg-navy">
        <div className="navy-gradient px-5 pb-5 pt-6 text-navy-foreground">
          {header ?? (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/12 text-navy-foreground ring-1 ring-white/15">
                  {icon ?? <BookOpen className="size-5" />}
                </span>
                <h1 className="truncate font-display text-xl font-semibold">{title ?? "BBITClassPoint"}</h1>
              </div>
              {action}
            </div>
          )}
        </div>

        <main className="app-sheet min-h-[70vh] flex-1 px-4 pb-28 pt-5 text-foreground">{children}</main>

        <BottomNav />
      </div>
    </div>
  );
}

export function HeaderBellLink() {
  const { data } = useNotifications();
  const unread = data?.unread ?? 0;
  return (
    <Link
      to="/notifications"
      aria-label="Notifications"
      className="relative grid size-10 place-items-center rounded-xl bg-white/12 ring-1 ring-white/15"
    >
      <Bell className="size-5" />
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {unread}
        </span>
      ) : null}
    </Link>
  );
}

export function AppLogo({ className }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="BBITClassPoint logo"
      className={cn("size-10 rounded-xl object-cover", className)}
    />
  );
}

function BottomNav() {
  return (
    <nav className="fixed bottom-0 z-30 w-full max-w-[430px] border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {BOTTOM_NAV.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              {...(item.to === "/resources" ? { search: { q: "", unit: "", category: "" } } : {})}
              preload="intent"
              activeProps={{ className: "text-accent" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold"
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
