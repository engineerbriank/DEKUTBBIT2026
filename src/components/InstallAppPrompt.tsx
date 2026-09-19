import { useEffect, useState } from "react";
import { Download, Share, Sparkles, X } from "lucide-react";

import { AppLogo } from "@/components/AppShell";
import {
  dismissInstallPrompt,
  installPromptDismissedRecently,
  usePwaInstall,
} from "@/lib/pwa-install";

/**
 * Bottom-sheet style install prompt. Appears only when installation is actually
 * available (Chromium beforeinstallprompt) or on iOS Safari, and never when the
 * app already runs installed or the user dismissed it recently.
 */
export function InstallAppPrompt() {
  const { canInstall, installed, iosInstructable, promptInstall } = usePwaInstall();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (installed) {
      setVisible(false);
      return;
    }
    if (!canInstall && !iosInstructable) return;
    if (installPromptDismissedRecently()) return;
    const timer = window.setTimeout(() => setVisible(true), 2500);
    return () => window.clearTimeout(timer);
  }, [canInstall, iosInstructable, installed]);

  if (!visible || installed) return null;

  const close = () => {
    dismissInstallPrompt();
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:bottom-4 sm:left-auto sm:right-4 sm:w-[24rem] sm:px-0">
      <div className="relative rounded-3xl border border-border bg-card/95 p-5 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={close}
          aria-label="Close install prompt"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-3">
          <AppLogo className="size-12 shrink-0" />
          <div className="min-w-0 pr-6">
            <p className="font-display text-base font-bold leading-tight">
              Install DEKUT BBIT 2026
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Get faster access by installing the app on your device — notes, timetable and groups
              one tap away.
            </p>
          </div>
        </div>

        {canInstall ? (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await promptInstall();
                setBusy(false);
                setVisible(false);
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              <Download className="size-4" /> {busy ? "Installing…" : "Install App"}
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-xl border border-input px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Not Now
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-xs font-semibold text-foreground">
              <Share className="size-4 shrink-0 text-primary" />
              Tap <span className="font-bold">Share</span> →{" "}
              <span className="font-bold">Add to Home Screen</span>
            </p>
            <button
              type="button"
              onClick={close}
              className="w-full rounded-xl border border-input px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Install status for display: "installed", "installable", "ios", or "unavailable". */
export function usePwaInstallStatus() {
  const { canInstall, installed, iosInstructable } = usePwaInstall();
  if (installed) return "installed" as const;
  if (canInstall) return "installable" as const;
  if (iosInstructable) return "ios" as const;
  return "unavailable" as const;
}

/** Inline "Install App" control for menus/pages. Renders nothing when unavailable. */
export function InstallAppButton({ className }: { className?: string }) {
  const { canInstall, installed, iosInstructable, promptInstall } = usePwaInstall();
  const [showIosHint, setShowIosHint] = useState(false);

  if (installed || (!canInstall && !iosInstructable)) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          if (canInstall) void promptInstall();
          else setShowIosHint((value) => !value);
        }}
        className={
          className ??
          "flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold transition hover:bg-muted"
        }
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
          <Sparkles className="size-4" />
        </span>
        <span className="min-w-0">
          Install App
          <span className="block text-[11px] font-medium text-muted-foreground">
            Add DEKUT BBIT 2026 to your device
          </span>
        </span>
      </button>
      {showIosHint && !canInstall ? (
        <p className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold">
          <Share className="size-4 shrink-0 text-primary" /> Tap Share → Add to Home Screen
        </p>
      ) : null}
    </div>
  );
}
