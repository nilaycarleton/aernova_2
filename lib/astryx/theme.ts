import { defineTheme } from "@astryxdesign/core/theme";

/**
 * Maps DESIGN.md's Field Notebook tokens onto Astryx's token schema. Astryx
 * expresses light/dark as [light, dark] tuples on one CSS custom property
 * (compiled to `light-dark()`); Aernova expresses the same flip as a `@theme`
 * dark home base plus a `[data-theme="light"]` override block in globals.css.
 * The values below are copied from those two sources, not re-derived, so a
 * palette change to DESIGN.md needs the same edit made here.
 *
 * Deliberately partial: only tokens with a confident, doctrine-backed mapping
 * are overridden (per defineTheme's own philosophy — omitted tokens keep
 * Astryx's defaults). Astryx's decorative hue palette (blue/gray/green/
 * orange/pink/purple/red/teal/yellow backgrounds, `--color-overlay-*`,
 * `--color-skeleton`, `--color-track`) has no Aernova equivalent and is left
 * alone until a swizzled component actually needs it (Phase 3).
 *
 * `--color-accent` is mapped to the ink-primary/ground inversion — the
 * *actual* primary-button pattern verified in components/dashboard/
 * quick-create-menu.tsx (`bg-ink-primary text-ground`) — not the "Instrument
 * Cyan fill" line in DESIGN.md's Components section, which contradicts the
 * doc's own Readout Rule ("actions are never cyan") and is stale.
 */
export const aernovaTheme = defineTheme({
  name: "aernova",

  typography: {
    body: {
      family: "ui-sans-serif, system-ui, sans-serif",
    },
    heading: {
      family: "ui-sans-serif, system-ui, sans-serif",
    },
  },

  tokens: {
    // --- Primary action: the ink-primary/ground inversion, not cyan. ---
    "--color-accent": ["oklch(21% 0.04 265)", "#ffffff"],
    "--color-on-accent": ["oklch(95.5% 0.01 255)", "oklch(12.5% 0.05 264)"],

    // --- Surfaces. Two-Layer Rule: ground -> raised -> lifted, nothing more. ---
    "--color-background-body": ["oklch(95.5% 0.01 255)", "oklch(12.5% 0.05 264)"],
    "--color-background-surface": ["oklch(100% 0 0)", "rgb(216 227 255 / 0.07)"],
    "--color-background-card": ["oklch(100% 0 0)", "rgb(216 227 255 / 0.07)"],
    "--color-background-popover": ["oklch(96.5% 0.012 256)", "rgb(216 227 255 / 0.13)"],
    "--color-background-muted": ["oklch(96.5% 0.012 256)", "rgb(216 227 255 / 0.13)"],

    // --- Text / icon. Ink Muted is the contrast floor — see The Ink Floor Rule. ---
    "--color-text-primary": ["oklch(21% 0.04 265)", "#ffffff"],
    "--color-text-secondary": ["oklch(37% 0.044 257)", "oklch(87% 0.028 262)"],
    "--color-text-disabled": ["oklch(45% 0.043 257)", "oklch(70.4% 0.045 258)"],
    "--color-text-accent": ["oklch(44% 0.125 224)", "oklch(89% 0.09 205)"],
    "--color-icon-primary": ["oklch(21% 0.04 265)", "#ffffff"],
    "--color-icon-secondary": ["oklch(37% 0.044 257)", "oklch(87% 0.028 262)"],
    "--color-icon-disabled": ["oklch(45% 0.043 257)", "oklch(70.4% 0.045 258)"],
    "--color-icon-accent": ["oklch(44% 0.125 224)", "oklch(89% 0.09 205)"],

    // --- The one hairline rule. No "emphasized" tier — see The One Rule Rule. ---
    "--color-border": ["rgb(15 23 43 / 0.12)", "rgb(216 227 255 / 0.14)"],
    "--color-border-emphasized": ["rgb(15 23 43 / 0.12)", "rgb(216 227 255 / 0.14)"],

    // --- Status quartet. Astryx's --color-success/error/warning are the
    // SOLID FILL role (a destructive button's background, a filled badge) —
    // they need to read as a strong, legible color in both themes, the same
    // job Aernova's saturated `confirm`/`danger`/`caution` BASE tokens do
    // ("one saturated base... composites fine on either ground" — DESIGN.md).
    // Aernova's `-fg` tokens are a different role (readable *text on a 10%
    // tint*, deliberately pale in dark mode) and would wash out a solid fill
    // — that was the bug the live check caught: a destructive button going
    // pale pink in dark mode. --color-on-warning stays dark ink in both
    // modes (Astryx's own default) since amber is light enough that white
    // text on it would fail contrast; on-success/on-error keep Astryx's
    // white-on-both defaults, which already match Aernova's own pattern.
    "--color-success": ["oklch(69.6% 0.17 162.48)", "oklch(69.6% 0.17 162.48)"],
    "--color-error": ["oklch(63.7% 0.234 25.3)", "oklch(63.7% 0.234 25.3)"],
    "--color-warning": ["oklch(80% 0.15 78)", "oklch(80% 0.15 78)"],
    // Aernova's "info" is Signal Blue / Sky Accent — deliberately not cyan,
    // so an informational badge is never mistaken for a reading.
    "--color-border-blue": ["oklch(62.3% 0.214 259.815)", "oklch(74.6% 0.16 232.661)"],
    "--color-icon-blue": ["oklch(62.3% 0.214 259.815)", "oklch(74.6% 0.16 232.661)"],
    "--color-text-blue": ["oklch(47% 0.13 235)", "oklch(88% 0.07 232)"],

    // --- No shadows. Doctrine, not an omission — see Elevation in DESIGN.md.
    // The one exception (the opaque paper report) never mounts an Astryx
    // Theme, so it never sees these tokens. ---
    "--shadow-low": "none",
    "--shadow-med": "none",
    "--shadow-high": "none",
  },
});
