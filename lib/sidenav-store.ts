"use client";

/**
 * Desktop SideNav collapse preference — same `useSyncExternalStore` +
 * localStorage pattern as `lib/theme-store.ts`, deliberately, so there is
 * one proven approach to "a preference that must survive reload without a
 * server round-trip" in this codebase rather than two. No database schema:
 * this is chrome preference, not company data (Phase 2 Step 9 — no schema
 * for a sidebar preference).
 *
 * Defaults to expanded (not collapsed) on both server and first client
 * render, exactly like theme-store's dark default — the SSR snapshot and the
 * client's first-paint snapshot must agree or React logs a hydration
 * mismatch. A collapsed returning visitor sees one quick re-render to the
 * narrow state right after mount, not a full-shell flash — an accepted,
 * documented tradeoff (see docs/PREMIUM_UI_PHASE_2_IMPLEMENTATION.md),
 * consistent with how the theme store already handles the same class of
 * problem for color scheme.
 */

const STORAGE_KEY = "aernova-sidenav-collapsed";

const listeners = new Set<() => void>();

export function setSideNavCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Private browsing / storage disabled: the preference just doesn't persist this session.
  }
  listeners.forEach((listener) => listener());
}

export function getSideNavCollapsedSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function getSideNavCollapsedServerSnapshot(): boolean {
  return false;
}

export function subscribeSideNavCollapsed(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
