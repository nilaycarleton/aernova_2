import { defineTheme } from "@astryxdesign/core/theme";

/**
 * Maps app/globals.css's Precision Workshop semantic tokens onto Astryx's
 * token schema (Premium UI Redesign Phase 1 — see docs/DESIGN.md and
 * docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_REDESIGN_PLAN.md). Astryx expresses light/dark as
 * [light, dark] tuples on one CSS custom property (compiled to
 * `light-dark()`); Aernova expresses the same flip as a `@theme` dark home
 * base plus a `[data-theme="light"]` override block in globals.css. The
 * values below are copied from those two sources, not re-derived, so a
 * palette change to globals.css needs the same edit made here.
 *
 * Deliberately literal tuples, not `var(--color-*)` indirection, even though
 * indirection would resolve correctly for the one root-level `<Theme>`
 * instance this app currently mounts (astryx-theme-provider.tsx). Astryx's
 * `light-dark()` mechanism reads the NEAREST ancestor's `color-scheme` —
 * which is what lets a future nested `<Theme mode="light">` (e.g. a light
 * popover embedded in an otherwise-dark page, via `onDark`/`onLight`)
 * resolve correctly on its own. A `var(--color-action)` reference would
 * ignore that local override and just inherit whatever the ambient DOM
 * value is. Not used yet, but the correct default for a component-primitive
 * library that supports it.
 *
 * Deliberately partial: only tokens with a confident, doctrine-backed
 * mapping are overridden (per defineTheme's own philosophy — omitted tokens
 * keep Astryx's defaults). Astryx's decorative hue palette (blue/gray/green/
 * orange/pink/purple/red/teal/yellow backgrounds, `--color-overlay-*`,
 * `--color-skeleton`, `--color-track`) has no Aernova equivalent and is left
 * alone until a swizzled component actually needs it (Phase 3).
 *
 * NAMING COLLISION, worth flagging once here rather than re-discovering it
 * per edit: Astryx's own vocabulary calls its primary-button token
 * `--color-accent`/`--color-on-accent`. That name collides with, but does
 * NOT mean the same thing as, Aernova's own `--color-on-accent` (constant
 * dark ink for bright cyan/amber/emerald fills — see globals.css). Astryx's
 * "accent" is Aernova's "action" (the ink/ground inversion, which DOES flip
 * per theme) — mapped below to `--color-action`/`--color-on-action`, never
 * to Aernova's own `on-accent` or to Instrument Cyan. This is exactly the
 * distinction Phase 1 exists to make unambiguous: cyan is never a generic
 * accent/action colour, in either vocabulary.
 */
export const aernovaTheme = defineTheme({
  name: "aernova",

  typography: {
    body: {
      family:
        'var(--font-plex), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    heading: {
      family:
        'var(--font-plex), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
  },

  /**
   * Astryx's own three-tier duration scale (fast/medium/slow, each with
   * generated min/max) mapped onto Aernova's approved timing reference
   * (docs/AERNOVA_DESIGN_REFERENCE.md §11.4): fast=Fast(160ms),
   * medium=Standard(220ms), slow=Deliberate(360ms). Aernova's own five-step
   * scale (instant/fast/standard/deliberate/focal, see lib/motion.ts) is
   * finer-grained than Astryx's three tiers need — Instant and Focal have no
   * Astryx equivalent and stay Aernova-only concepts.
   */
  motion: { fast: 160, medium: 220, slow: 360, ratio: 0.75 },

  tokens: {
    // --- Primary action: the ink-primary/ground inversion, not cyan. See
    // the naming-collision note above. Astryx's own focus-visible outline
    // reads `--color-accent` too (astryx.css: `outline: 2px solid
    // var(--color-accent)`, no separate focus-ring token) — so a swizzled
    // Astryx component's focus ring is action-ink-colored, not
    // Instrument Cyan. Aernova's own hand-built components keep the
    // sanctioned `outline-instrument` exception (see docs/DESIGN.md);
    // Astryx's simpler one-token model can't express that decoupling. Still
    // fully AA-visible in both themes (verified in the Phase 1 contrast
    // pass) — just not brand-matched. Revisit only if swizzled components
    // needing it accumulate (still just recent-activity.tsx today).
    "--color-accent": ["oklch(20% 0.012 264)", "oklch(97% 0.004 75)"],
    "--color-on-accent": ["oklch(97.5% 0.004 260)", "oklch(14% 0.014 264)"],

    // --- Surfaces. Two-Layer Rule: ground -> raised -> lifted, nothing more. ---
    "--color-background-body": ["oklch(97.5% 0.004 260)", "oklch(14% 0.014 264)"],
    "--color-background-surface": ["oklch(100% 0 0)", "rgb(224 226 230 / 0.07)"],
    "--color-background-card": ["oklch(100% 0 0)", "rgb(224 226 230 / 0.07)"],
    "--color-background-popover": ["oklch(97% 0.006 260)", "rgb(224 226 230 / 0.13)"],
    "--color-background-muted": ["oklch(97% 0.006 260)", "rgb(224 226 230 / 0.13)"],

    // --- Text / icon. Ink Muted is the contrast floor — see The Ink Floor Rule. ---
    "--color-text-primary": ["oklch(20% 0.012 264)", "oklch(97% 0.004 75)"],
    "--color-text-secondary": ["oklch(36% 0.014 258)", "oklch(86% 0.01 260)"],
    "--color-text-disabled": ["oklch(45% 0.014 258)", "oklch(69% 0.014 258)"],
    "--color-text-accent": ["oklch(44% 0.125 224)", "oklch(89% 0.09 205)"],
    "--color-icon-primary": ["oklch(20% 0.012 264)", "oklch(97% 0.004 75)"],
    "--color-icon-secondary": ["oklch(36% 0.014 258)", "oklch(86% 0.01 260)"],
    "--color-icon-disabled": ["oklch(45% 0.014 258)", "oklch(69% 0.014 258)"],
    "--color-icon-accent": ["oklch(44% 0.125 224)", "oklch(89% 0.09 205)"],

    // --- The one hairline rule. No "emphasized" tier — see The One Rule Rule. ---
    "--color-border": ["rgb(22 24 28 / 0.12)", "rgb(224 226 230 / 0.14)"],
    "--color-border-emphasized": ["rgb(22 24 28 / 0.12)", "rgb(224 226 230 / 0.14)"],

    // --- Status quartet. Astryx's --color-success/error/warning are the
    // SOLID FILL role (a destructive button's background, a filled badge) —
    // they need to read as a strong, legible color in both themes, the same
    // job Aernova's saturated `confirm`/`danger`/`caution` BASE tokens do.
    // Aernova's `-fg` tokens are a different role (readable text on a 10%
    // tint) and would wash out a solid fill. --color-on-warning stays dark
    // ink in both modes (Astryx's own default) since amber is light enough
    // that white text on it would fail contrast.
    //
    // on-success/on-error do NOT keep Astryx's white-on-both defaults — a
    // Phase 8 axe-core scan caught a real WCAG AA failure this comment used
    // to claim didn't exist: white text on Confirm Green measures 2.47:1,
    // on Danger measures 3.82:1, both below the 4.5:1 floor (verified via
    // the same relative-luminance math Astryx's own theme/contrast.ts uses).
    // Both pass comfortably with the constant dark ink already defined as
    // --color-on-accent below (8.05:1 on Confirm Green, 5.21:1 on Danger) —
    // the same Constant-On-Accent Rule DESIGN.md already applies to cyan and
    // amber fills, just never wired through for Astryx's own success/error
    // badge and button variants until this fix.
    "--color-success": ["oklch(69.6% 0.17 162.48)", "oklch(69.6% 0.17 162.48)"],
    "--color-on-success": ["oklch(14% 0.014 264)", "oklch(14% 0.014 264)"],
    "--color-error": ["oklch(63.7% 0.234 25.3)", "oklch(63.7% 0.234 25.3)"],
    "--color-on-error": ["oklch(14% 0.014 264)", "oklch(14% 0.014 264)"],
    "--color-warning": ["oklch(80% 0.15 78)", "oklch(80% 0.15 78)"],
    // Aernova's "info" is Signal Blue / Sky Accent — deliberately not cyan,
    // so an informational badge is never mistaken for a reading.
    "--color-border-blue": ["oklch(62.3% 0.214 259.815)", "oklch(74.6% 0.16 232.661)"],
    "--color-icon-blue": ["oklch(62.3% 0.214 259.815)", "oklch(74.6% 0.16 232.661)"],
    "--color-text-blue": ["oklch(47% 0.13 235)", "oklch(88% 0.07 232)"],

    // --- Shadow: restored for the floating/overlay case only (popover,
    // menu, dialog — exactly what these three Astryx tokens back), never for
    // panels in normal page flow. Same three values as globals.css's own
    // --shadow-low/med/high, so a swizzled Astryx overlay and a bespoke
    // Tailwind overlay read identically. See docs/DESIGN.md's Elevation
    // section for the exact rule; this is a Phase 1 change from the prior
    // "no shadows, ever" doctrine, not an oversight.
    // Two-layer shadow, so it can't be a [light, dark] tuple — defineTheme's
    // resolveTokenValue joins a tuple with a single top-level `light-dark()`
    // wrapper (`light-dark(${light}, ${dark})`), which would silently
    // mis-parse into a 4-argument light-dark() call if each element itself
    // contains a comma (two shadow layers = one comma). Written as one
    // string with `light-dark()` wrapping just each layer's color instead —
    // valid CSS, and confirmed correct in the built output.
    "--shadow-low":
      "0px 1px 2px light-dark(rgb(10 15 20 / 0.10), rgb(10 15 20 / 0.35)), 0px 1px 1px light-dark(rgb(10 15 20 / 0.06), rgb(10 15 20 / 0.25))",
    "--shadow-med": ["0px 4px 16px rgb(10 15 20 / 0.12)", "0px 4px 16px rgb(10 15 20 / 0.45)"],
    "--shadow-high": ["0px 16px 40px rgb(10 15 20 / 0.18)", "0px 16px 40px rgb(10 15 20 / 0.55)"],

    // --- Radius. Precision Workshop moves away from the old large-card
    // scale (was inner=4/element=8/container=12) toward compact/standard/
    // framed-tool: inner=4px (unchanged — already the compact step),
    // element=6px (standard control radius, was 8), container=8px (framed-
    // tool/panel radius, capped per docs/DESIGN.md, was 12). Pinned
    // explicitly rather than left on Astryx's multiplier-based generator so
    // a future Astryx version bump can't silently drift these.
    "--radius-inner": "4px",
    "--radius-element": "6px",
    "--radius-container": "8px",

    // --- Spacing: no override. Astryx's --spacing-N scale (4px base,
    // multiplied) and Aernova's own 4/8/12/16/24/32px scale are the same
    // 4px base unit — spacing-1/2/3/4/6/8 line up exactly. Checked, not
    // skipped by oversight.
  },
});

/**
 * Deliberately NOT importing @astryxdesign/core/tailwind-theme.css.
 *
 * That bridge remaps Tailwind's OWN core scale names — --radius-sm/md/lg/xl,
 * --text-xs through --text-5xl, --spacing — to Astryx's token values via
 * `@theme inline`, globally, for the whole app. Aernova's hand-built
 * components use those exact Tailwind classes (`rounded-lg`, `text-sm`,
 * `p-4`, ...) throughout, on the assumption they mean Tailwind's stock
 * values — which, as of Phase 1, are also Precision Workshop's own target
 * radius scale (Tailwind v4's rounded-sm/md/lg already equal 4/6/8px; see
 * docs/DESIGN.md's Radius section). Importing the bridge would still
 * silently resize typography (Astryx's --font-size-sm is 12px where
 * Tailwind's text-sm is 14px, --font-size-base is 14px where Tailwind's
 * text-base is 16px) app-wide. Confirmed by reading the bridge's source, not
 * assumed.
 *
 * When Phase 3 swizzles a real Astryx primitive, style it against Astryx's
 * own CSS variables directly (`var(--color-background-surface)`) or via
 * defineTheme's `components:` field — never by reaching for a Tailwind
 * utility this bridge would have renamed.
 */
