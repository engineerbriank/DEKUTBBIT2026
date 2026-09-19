import { useCallback, useSyncExternalStore } from "react";

import { isIosSafari, isStandalone } from "./pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "bbit-install-dismissed-at";
const COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7; // one week

type State = {
  canInstall: boolean;
  installed: boolean;
  iosInstructable: boolean;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let state: State = { canInstall: false, installed: false, iosInstructable: false };
const listeners = new Set<() => void>();
let started = false;

function setState(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  const standalone = isStandalone();
  setState({ installed: standalone, iosInstructable: !standalone && isIosSafari() });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    setState({ canInstall: !isStandalone() });
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    setState({ canInstall: false, installed: true, iosInstructable: false });
  });

  window
    .matchMedia("(display-mode: standalone)")
    .addEventListener("change", (event) =>
      setState({
        installed: event.matches,
        canInstall: event.matches ? false : state.canInstall,
        iosInstructable: event.matches ? false : state.iosInstructable,
      }),
    );
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Start listening as soon as this module loads so an early
// "beforeinstallprompt" event is never missed before React mounts.
start();

const serverSnapshot: State = { canInstall: false, installed: false, iosInstructable: false };

export function dismissInstallPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* private mode — just skip persistence */
  }
}

export function installPromptDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function usePwaInstall() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => serverSnapshot,
  );

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable" as const;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setState({ canInstall: false });
    if (outcome === "dismissed") dismissInstallPrompt();
    return outcome;
  }, []);

  return { ...snapshot, promptInstall };
}
