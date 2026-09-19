import { useEffect, useState } from "react";
import { Download, Share, Sparkles, X } from "lucide-react";

import { AppLogo } from "@/components/AppShell";
import { isAndroid, isInAppBrowser, isIosSafari } from "@/lib/pwa";
import {
  dismissInstallPrompt,
  installPromptDismissedRecently,
  usePwaInstall,
} from "@/lib/pwa-install";

type Guide = { title: string; steps: string[] };

/** Step-by-step instructions for whatever device/browser the visitor is using. */
function manualGuide(): Guide {
  if (typeof window === "undefined") return { title: "Install the app", steps: [] };
  if (isInAppBrowser()) {
    return {
      title: "Open in your browser first",
      steps: [
        "Tap the ⋮ or ••• menu in this window",
        "Choose “Open in Chrome” (or Safari on iPhone)",
        "Then use the Install App button again",
      ],
    };
  }
  if (isIosSafari() || /iPad|iPhone|iPod/i.test(window.navigator.userAgent)) {
    return {
      title: "Add to your iPhone home screen",
      steps: [
        "Tap the Share button at the bottom of Safari",
        "Scroll down and tap “Add to Home Screen”",
        "Tap “Add” — the app icon appears on your home screen",
      ],
    };
  }
  if (isAndroid()) {
    return {
      title: "Add to your Android home screen",
      steps: [
        "Tap the ⋮ menu at the top right of Chrome",
        "Tap “Install app” or “Add to Home screen”",
        "Confirm — the app icon appears on your home screen",
      ],
    };
  }
  return {
    title: "Install on this computer",
    steps: [
      "Click the install icon in the browser address bar",
      "Or open the ⋮ menu and choose “Install DEKUT BBIT 2026”",
      "The app then opens in its own window",
    ],
  };
}

function GuideCard({ guide }: { guide: Guide }) {
  return (
    <div className="rounded-2xl bg-secondary px-3 py-3">
      <p className="flex items-center gap-2 text-xs font-bold text-foreground">
        <Share className="size-4 shrink-0 text-primary" /> {guide.title}
      </p>
      <ol className="mt-2 space-y-1.5 text-[11px] font-medium leading-relaxed text-muted-foreground">
        {guide.steps.map((step, index) => (
          <li key={step} className="flex gap-2">
            <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Bottom-sheet install prompt. Uses the browser install prompt when available and
 * otherwise shows device-specific steps, so every visitor gets a way to install.
 * Never shows when the app already runs installed or was dismissed recently.
 */
export function InstallAppPrompt() {
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [guide, setGuide] = useState<Guide | null>(null);

  useEffect(() => {
    if (installed) {
      setVisible(false);
      return;
    }
    if (installPromptDismissedRecently()) return;
    const timer = window.setTimeout(() => setVisible(true), 2500);
    return () => window.clearTimeout(timer);
  }, [installed]);

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

        <div className="mt-4 space-y-3">
          {guide ? <GuideCard guide={guide} /> : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (canInstall) {
                  setBusy(true);
                  const outcome = await promptInstall();
                  setBusy(false);
                  if (outcome === "unavailable") setGuide(manualGuide());
                  else setVisible(false);
                  return;
                }
                setGuide(manualGuide());
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              <Download className="size-4" />
              {busy ? "Installing…" : canInstall ? "Install App" : "Show me how"}
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-xl border border-input px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Not Now
            </button>
          </div>
        </div>
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

/** Inline "Install App" control for menus/pages. Always available unless installed. */
export function InstallAppButton({ className }: { className?: string }) {
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const [guide, setGuide] = useState<Guide | null>(null);

  if (installed) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={async () => {
          if (canInstall) {
            const outcome = await promptInstall();
            if (outcome === "unavailable") setGuide(manualGuide());
            return;
          }
          setGuide((value) => (value ? null : manualGuide()));
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
      {guide ? <GuideCard guide={guide} /> : null}
    </div>
  );
}
