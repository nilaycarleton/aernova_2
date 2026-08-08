"use client";

import { useSyncExternalStore } from "react";
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
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
