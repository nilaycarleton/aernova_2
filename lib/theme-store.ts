"use client";

/**
 * The one source of truth for Aernova's light/dark choice, read through
 * `useSyncExternalStore` — the case the hook exists for: state that lives
 * outside React (localStorage, matchMedia, `data-theme` on <html>). Dark is
 * the home base; on first visit the app follows the OS (prefers-color-scheme,
 * handled in globals.css). Once a contractor picks a side, that choice is
 * written to `data-theme` on <html> and remembered in localStorage — the
 * inline script in the root layout replays it before first paint so there is
 * no flash.
 *
 * Shared by ThemeToggle (the UI control) and AstryxThemeProvider (which
 * mirrors the same resolved boolean into Astryx's `<Theme mode>` prop) so
 * there is exactly one piece of code that reads/writes `data-theme` — two
 * independent copies of this logic is how the two systems would end up
 * fighting over the same attribute.
 */

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "aernova-theme";

/** Same-tab subscribers — a `storage` event only fires in *other* tabs, never the one that called `apply`. */
const listeners = new Set<() => void>();

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") {
    root.removeAttribute("data-theme");
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } else {
    root.setAttribute("data-theme", choice);
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  }
  listeners.forEach((listener) => listener());
}

/** Resolved boolean — collapses "system" into whatever it currently means, same as the rest of the app reasons about theme. */
export function getThemeSnapshot(): boolean {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light") return false;
  if (stored === "dark") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Matches the pre-hydration fallback the root layout's inline script assumes. */
export function getThemeServerSnapshot(): boolean {
  return true;
}

/** OS preference changing, another tab's toggle, or this tab's own `apply` — all three need a re-render. */
export function subscribeTheme(callback: () => void) {
  listeners.add(callback);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    mq.removeEventListener("change", callback);
    window.removeEventListener("storage", onStorage);
  };
}
