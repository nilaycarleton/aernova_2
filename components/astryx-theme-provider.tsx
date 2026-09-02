"use client";

import { useSyncExternalStore } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { aernovaTheme } from "@/lib/astryx/aernova";
import { getThemeServerSnapshot, getThemeSnapshot, subscribeTheme } from "@/lib/theme-store";

/**
 * Bridges Aernova's own light/dark store (lib/theme-store.ts) into Astryx's
 * <Theme mode> prop.
 *
 * This has to be careful: when <Theme> is the outermost (root) instance in
 * the tree, it syncs `data-theme` onto <html> itself via a layout effect —
 * the exact same attribute Aernova's ThemeToggle already owns. Passed
 * mode="system", it would *remove* data-theme on mount, silently wiping out
 * a contractor's explicit light/dark choice the instant this provider
 * hydrates. So `mode` here is never "system" — it's always the fully
 * resolved boolean from the shared store, the same value ThemeToggle reads.
 * Astryx's own sync then just rewrites <html> with the value that's already
 * there: a redundant, same-value write, not a conflicting one.
 */
export function AstryxThemeProvider({ children }: { children: React.ReactNode }) {
  const isDark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);

  return (
    <Theme theme={aernovaTheme} mode={isDark ? "dark" : "light"}>
      {children}
    </Theme>
  );
}
