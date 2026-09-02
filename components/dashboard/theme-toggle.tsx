"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import {
  applyTheme,
  getThemeServerSnapshot,
  getThemeSnapshot,
  subscribeTheme,
} from "@/lib/theme-store";

/**
 * Light / dark switch. Dark is the home base; on first visit the app follows the
 * visitor's OS setting (handled in globals.css via prefers-color-scheme). Once a
 * contractor picks a side here, that choice is written to `data-theme` on <html>
 * and remembered in localStorage — the inline script in the root layout replays
 * it before first paint so there is no flash. Clearing back to "system" hands
 * control back to the OS.
 *
 * `isDark` is read through `useSyncExternalStore` rather than mirrored into
 * `useState` from an effect — this is exactly the case the hook exists for
 * (subscribing to state that lives outside React: localStorage, matchMedia).
 * It gets the SSR/hydration safety the old `mounted` flag was hand-rolling
 * for free (React calls `getServerSnapshot` for both the server render *and*
 * the client's first hydration pass, so they always agree — no flash, no
 * mismatch — then switches to the live value right after), and it does not
 * need a `choice` state at all: the button only ever renders and reasons
 * about the resolved boolean, never the underlying "system" label.
 *
 * The store itself lives in lib/theme-store.ts, shared with
 * AstryxThemeProvider — see that file for why.
 */

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);

  function toggle() {
    applyTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-surface-raised text-ink-secondary transition hover:bg-surface-lifted hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
    >
      {/* Sun when we're in dark (click to go light); moon when we're in light. */}
      {isDark ? (
        <Sun size={18} strokeWidth={1.8} aria-hidden="true" />
      ) : (
        <Moon size={18} strokeWidth={1.8} aria-hidden="true" />
      )}
    </button>
  );
}
