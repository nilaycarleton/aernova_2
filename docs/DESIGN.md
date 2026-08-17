---
name: Aernova
description: Design system for Aernova, a multi-trade project workflow platform for small construction and trades businesses; roofing (measurement, inspection, proposal) is one specialized module. Precision Workshop direction, current through Premium UI Redesign Phase 8 (final).
colors:
  ground: "oklch(14% 0.014 264)"
  surface-raised: "rgb(224 226 230 / 0.07)"
  surface-lifted: "rgb(224 226 230 / 0.13)"
  hairline: "rgb(224 226 230 / 0.14)"
  surface-sidebar: "oklch(17% 0.013 264)"
  ink-primary: "oklch(97% 0.004 75)"
  ink-strong: "oklch(91% 0.006 70)"
  ink-secondary: "oklch(86% 0.01 260)"
  ink-muted: "oklch(69% 0.014 258)"
  on-accent: "oklch(14% 0.014 264)"
  action: "oklch(97% 0.004 75)"
  on-action: "oklch(14% 0.014 264)"
  action-hover: "oklch(91% 0.006 70)"
  action-active: "oklch(86% 0.01 260)"
  instrument: "oklch(78.9% 0.154 211.53)"
  instrument-bright: "oklch(86.5% 0.127 207.078)"
  instrument-deep: "oklch(71.5% 0.143 215.221)"
  instrument-fg: "oklch(89% 0.09 205)"
  signal-blue: "oklch(62.3% 0.214 259.815)"
  signal-blue-deep: "oklch(54.6% 0.245 262.881)"
  sky-accent: "oklch(74.6% 0.16 232.661)"
  confirm: "oklch(69.6% 0.17 162.48)"
  confirm-fg: "oklch(90% 0.11 165)"
  caution: "oklch(80% 0.15 78)"
  caution-fg: "oklch(90% 0.08 88)"
  danger: "oklch(63.7% 0.234 25.3)"
  danger-fg: "oklch(87% 0.06 15)"
  info: "oklch(68.5% 0.169 237)"
  info-fg: "oklch(88% 0.07 232)"
  paper-document: "#ffffff"
  paper: "oklch(96.8% 0.007 247.896)"
  paper-inset: "oklch(98.4% 0.003 247.858)"
  paper-ink: "oklch(20.8% 0.042 265.755)"
  paper-ink-strong: "oklch(27.9% 0.041 260.031)"
  paper-ink-body: "oklch(37.2% 0.044 257.287)"
  paper-ink-muted: "oklch(44.6% 0.043 257.281)"
  paper-ink-faint: "oklch(55.4% 0.046 257.417)"
  paper-rule: "oklch(92.9% 0.013 255.508)"
  paper-rule-strong: "oklch(86.9% 0.022 252.894)"
typography:
  display:
    fontFamily: 'var(--font-plex), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 2rem
    letterSpacing: "normal"
  heading:
    fontFamily: 'var(--font-plex), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.75rem
    letterSpacing: "normal"
  subheading:
    fontFamily: 'var(--font-plex), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5rem
    letterSpacing: "normal"
  title:
    fontFamily: 'var(--font-plex), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25rem
    letterSpacing: "normal"
  body:
    fontFamily: 'var(--font-plex), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.25rem
    letterSpacing: "normal"
  small:
    fontFamily: 'var(--font-plex), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1rem
    letterSpacing: "normal"
  label:
    fontFamily: 'var(--font-plex), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1rem
    letterSpacing: "0.025em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.on-action}"
  button-primary-active:
    backgroundColor: "{colors.action-active}"
    textColor: "{colors.on-action}"
  button-quiet:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.title}"
  panel:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  panel-lifted:
    backgroundColor: "{colors.surface-lifted}"
    rounded: "{rounded.lg}"
    padding: "24px"
  chip:
    backgroundColor: "#00b7d71a"
    textColor: "{colors.instrument-fg}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    typography: "{typography.body}"
---

# Design System: Aernova

## 1. Overview

**Creative North Star: "Precision Workshop"**

A workshop is where skilled trade work actually happens: a clean bench, the right tool in reach, nothing decorative competing for attention with the work itself. Aernova's interface answers to that standard — approximately **85% calm precision** (hierarchy, typography, responsiveness, correctness, complete states) and **15% sophisticated material character** (restrained depth, one deliberate accent, controlled motion). Premium comes from clarity and coherence, not decoration.

The system is flat by default and layers by tone, not shadow — the Two-Layer Rule. Its home base is a **neutral graphite** dark ground, not a saturated brand color; light is a **porcelain/mineral canvas**, genuinely designed alongside dark rather than mechanically inverted from it. Both themes carry one constant: **Instrument Cyan**, the readout colour, identical in both themes so a number a contractor acts on always looks the same. Around it, amber remains the one deliberate warm note, held in strict reserve for attention and caution.

**Precision Workshop is a course correction from the prior "Field Notebook" system, not a rename of it.** The prior system's biggest problem was not its palette — it was a saturated navy ground competing with the hero cyan, an unwritten "cyan is the primary action color" assumption that a shipped comment elsewhere in the codebase already contradicted, and equal-weight rounded panels with almost no interaction feedback. Phase 1 of the Premium UI Redesign (`docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_REDESIGN_PLAN.md`) exists specifically to resolve those, at the foundation level, before any route gets visually migrated.

What this system still rejects, in `docs/PRODUCT.md`'s words, is **CAD and engineering complexity**: exposed technical controls, dense parameter panels, and the vocabulary of the photogrammetry pipeline surfaced into the UI. That constraint didn't change; only the visual language expressing it did.

**Key characteristics:**
- Flat by default — depth from tonal layering; shadow restored for exactly one case (floating/overlay content), not panels in normal flow
- Two themes, one hero: Instrument Cyan is constant; ground, ink, and surfaces are each authored per theme, not inverted
- One hairline rule does all structural separation
- IBM Plex Sans Variable, self-hosted — one UI family, weight/spacing carry hierarchy before size does
- Cyan for measurement truth only; amber in reserve for attention only; the application's own primary action is an ink/ground inversion, never cyan
- Compact radii (4–8px) — moved down from the old 8–24px large-card scale

## 2. Colors

A neutral graphite field (or its porcelain daylight twin), one accent that means "this is a reading," an ink/ground inversion that means "click this," and one warm note held in reserve.

### Application action (not measurement)

- **Action** (`--color-action`, an ink/ground inversion): the application's own primary-action colour. `bg-action text-on-action`, with `action-hover`/`action-active` one and two steps down the ink hierarchy. This was previously an unwritten convention — every button hardcoded `bg-ink-primary text-ground` directly — that a stale line in this very document nonetheless still described as a cyan fill. Phase 1 makes the convention an explicit, authoritative token so that contradiction cannot recur.
- **Action, quiet/secondary** (`--color-action-quiet-*`): a hairline outline on Surface Raised with Ink Secondary text. Replaces the old cyan-tinted "Quiet" button spec, which never should have existed — see The Readout Rule below.

### Measurement (Instrument Cyan)

- **Instrument Cyan** (`oklch(78.9% 0.154 211.53)`, `#00d3f2`): the readout colour. Reserved for measurement truth — confirmed values, active progress, live geometry. **It does not change between light and dark, and it is never an application action.** It is the colour of a number you can act on, nothing else.
- **Instrument Cyan Bright** (`oklch(86.5% 0.127 207.078)`): hover/active states on cyan surfaces; in-progress fill on determinate progress bars.
- **Instrument Cyan Deep** (`oklch(71.5% 0.143 215.221)`): tinted backgrounds only (~10% alpha, as in chips).
- **Instrument Foreground** (`instrument-fg`): readable cyan *text* on a cyan tint — pale cyan in dark, deep cyan in light.

### Secondary / structural

- **Sky Accent** (`oklch(74.6% 0.16 232.661)`) / **Signal Blue** (`oklch(62.3% 0.214 259.815)`): structural emphasis in the 3D viewer — selected edges, facet outlines, measurement overlays — and the input-focus border. Not an action colour either; it marks selection/focus/structure, not "click me." Signal Blue Deep (`oklch(54.6% 0.245 262.881)`) carries white text on a solid fill.

### Status quartet

Each status keeps one saturated **base** (for `bg-x/10` tints and `border-x/25` rules, composited correctly on either ground) plus a **`-fg`** text colour that flips per theme.

- **Confirm Green** (`oklch(69.6% 0.17 162.48)`): terminal success only. Never a progress colour.
- **Amber / Caution** (`oklch(80% 0.15 78)`, `#ffb020`): the one warm signal. Attention and caution. **Never a measurement, never an error, never decoration.**
- **Danger** (`oklch(63.7% 0.234 25.3)`): errors and destructive actions.
- **Info** (`oklch(68.5% 0.169 237)`): neutral informational states and non-measurement status badges.

**Astryx's own success/error components need the on-accent override named explicitly.** `defineTheme` in `lib/astryx/theme.ts` sets `--color-success`/`--color-error` to Confirm Green/Danger, but Astryx's *own* `--color-on-success`/`--color-on-error` default to white — a real WCAG AA failure (2.47:1 and 3.82:1) a Phase 8 axe-core scan caught on a solid-fill `Badge variant="success"`. Both are now explicitly mapped to the same constant dark ink as `--color-on-accent` (8.05:1 / 5.21:1). If a new Astryx component ships its own bright solid-fill status variant, check its contrast against white text before assuming Astryx's default is safe — it wasn't here.

### Neutral

- **Ground** (`oklch(14% 0.014 264)` dark / `oklch(97.5% 0.004 260)` light): the page. Neutral graphite at home; a porcelain/mineral canvas in daylight. Deliberately low-chroma (0.01–0.02) — a saturated navy or beige field competes with the one hero cyan for attention.
- **Surface Raised** (7% neutral-tinted white on dark / opaque white on light): the default panel fill.
- **Surface Lifted** (13% on dark / faint cool-grey wash on light): one step up — nested panels, hovered rows, active list items. The only elevation move the tonal system has.
- **Surface Sidebar**: the sidebar's second neutral layer.
- **Hairline** (neutral-white at 14% on dark / near-black at 12% on light): every border in the product. One rule, one weight, inverting with the theme.
- **Ink Primary / Strong / Secondary / Muted**: headings → body → metadata. Ink Primary carries a deliberate, barely-there warm tint in dark mode (chroma 0.004 toward hue 75) rather than pure white — "warm/off-white," not a cream. **Ink Muted is the contrast floor**; nothing dimmer carries text.
- **On-Accent** (constant, matches the ground tone): the dark ink that rides on bright accents — cyan, amber, confirm-green fills. Never flips; a bright cyan button wants dark text in both themes. **Distinct from `on-action`**, which does flip (see the naming note in `lib/astryx/theme.ts` — Astryx's own "accent" vocabulary means Aernova's "action," not Aernova's "accent").

### Print

- **Paper** / **Paper Ink** / **Paper Rule** (the `paper-*` family): the `(report)` route and every public document are a deliberate light surface, pinned to light regardless of app theme. Untouched by Phase 1 — this foundation already existed and already satisfies the requirement; Phase 6 migrates the actual routes onto Precision Workshop's document mode, not this token set.
- **Three rule weights, because a document is not a screen.** `paper` between table rows, `paper-rule` at section edges, `paper-rule-strong` in one place only — the line above a total.
- **Company branding on every paper surface, one fixed branding box**, top-left, `Company.logoUrl` when set, the company name otherwise. See `docs/PRODUCT.md` for the full rule; unchanged by this redesign.

### Named Rules

**The Readout Rule.** Instrument Cyan means **"this is a reading"** — a number, or the direct visual encoding of one. Nothing else. It is never a brand flourish, a link colour, a decorative highlight, or an application action — and it is identical in both themes. The prior "cyan quiet-button" spec violated this rule the moment it was written; it is gone, replaced by the neutral `action-quiet` treatment above.

**The Action/Measurement Distinction.** Every legible colour in the app answers exactly one of two questions: "is this a reading?" (cyan, always) or "is this something I can do?" (the ink/ground `action` inversion, never cyan). A colour answering both at once is a bug, not a style choice.

**One cyan figure per surface.** If two cyan numbers are visible at once, one of them is losing — decide which is the reading the contractor acts on, and neutralise the other.

**The One Warm Note Rule.** Amber is the system's only warm colour, and it means *attention/caution* and nothing else.

**The Constant-On-Accent Rule.** Text on a bright, theme-constant accent (cyan/amber/confirm fills) uses `on-accent` (constant dark), never `ground`. Action fills are different — they use `on-action`, which flips with `action` because the two are an inversion pair, not a constant-on-bright pairing.

**The Ink Floor Rule.** Ink Muted is the dimmest colour permitted to carry text, measured against whichever ground is active. Verified in the Phase 1 contrast pass at ~7.2:1 dark / ~6.9:1 light — both comfortably above the 4.5:1 AA floor, with headroom.

**The One Rule Rule.** All structural separation uses the hairline at one weight. No 2px borders, no colored stripes, no left-border accent bars — a colored left-border stripe was specifically flagged (both by the Impeccable design hook and this rule) during Phase 0 and rejected; see `docs/phase-0/04-decision-record.md`.

## 3. Typography

**UI font:** IBM Plex Sans Variable, self-hosted via `next/font` (`app/layout.tsx`). Selected in the Phase 0 typography comparison (`docs/phase-0/02-typography-comparison.md`) on compact-table width, small-label clarity, and light-mode stroke weight — not fashion.
**Body font:** same family.
**Label/Mono font:** none distinct; code/mono contexts (rare in this app) fall back to the platform monospace stack.

**Character:** the variable file loads only its `wght` axis (Next's own default for a Google variable font unless `axes` is explicitly requested) — IBM Plex Sans's `wdth` axis is never invoked. The app only ever writes `font-weight: 400/500/600` in CSS; nothing reaches for the 100/700 extremes the file technically supports. Self-hosted, `display: swap`, metrics-matched fallback — no layout shift, no external request, no manual `@import`.

### Hierarchy

- **Display** (600, 24px / 2rem line-height): page and workspace titles. One per screen.
- **Heading** (600, 18px / 1.75rem): section headings inside a panel.
- **Subheading** (600, 16px / 1.5rem): dialog and card titles — a secondary hierarchy moment between Heading and Title. New in Phase 1; the prior system's two-size doctrine needed exactly one more step, not a scale.
- **Title** (600, 14px / 1.25rem): panel headers, control labels, table column heads. Same size as Body, separated by weight alone.
- **Body** (400, 14px / 1.25rem): the workhorse and default for essentially all reading. Cap measured prose at 65–75ch.
- **Small** (400, 12px / 1rem): compact secondary text — captions, helper text, non-badge metadata that isn't a Label.
- **Label** (500, 12px, 0.025em, often uppercase): metadata, units, badges, timestamps. Uppercase is permitted here and nowhere else.
- **Readout** (not a fixed size — a composition, not a new role): the one sanctioned oversized-and-coloured exception — a hero quote total, a roof area — sized up (typically Display or larger), set in Instrument Cyan, tabular. Compose it from existing roles; it isn't a new frontmatter entry.

### Numeric rule

Tabular numerals (`tabular-nums`) are first-class, not decorative, for **money, measurements, percentages, counts, and any date/time where columns must align** — table numeric columns, quote/invoice totals, roof measurements. Not forced onto prose generally; a sentence containing one number doesn't need it.

### Named Rules

**The Weight-Not-Size Rule.** Hierarchy between a label and its value is carried by weight and colour, not by size. Reaching for a new size to make something stand out is a failure of grouping, not a shortage of scale. The one sanctioned exception is the Readout composition above.

**The Uppercase Confinement Rule.** Uppercase is a Label treatment only, at 12px with tracking. A measurement, a heading, or a sentence is never uppercased.

## 4. Elevation

**The Two-Layer Rule still governs the page.** Depth on content in normal page flow is tonal only: ground → raised → lifted, one hairline separating each. There is no third tonal layer in either theme.

**Shadow is restored for exactly one case, as of Phase 1: genuinely floating content.** A popover, dropdown menu, dialog, or sheet sits above arbitrary content it did not compose with; a tonal step alone doesn't separate it from that content the way it separates two panels sharing a layout. Three restrained steps — `--shadow-low` (tooltip, small popover), `--shadow-med` (menu, popover), `--shadow-high` (modal, dialog, sheet) — back exactly Astryx's own `--shadow-low/med/high` tokens (see `lib/astryx/theme.ts`) and a matching `app/globals.css` set, so a swizzled Astryx overlay and a bespoke Tailwind one read identically. **Never apply these to a `surface-raised`/`surface-lifted` panel sitting in normal page flow** — that panel still separates by tone and a hairline, exactly as before. This is a deliberate, documented reversal of the prior "no shadows, ever" doctrine for the floating-element case only; it is not a return to a soft-shadow card UI.

The opaque paper document (public quotes/invoices/reports) keeps its own separate, pre-existing shadow treatment where used — that was always the other sanctioned exception, and Phase 1 doesn't touch it.

### Named Rules

**The Two-Layer Rule.** Ground → raised → lifted, for content in normal page flow. If a design needs a third layer there, the layout is too nested; flatten it instead of inventing tone.

**The Floating-Element Exception.** Popover, menu, dialog, sheet: shadow is allowed, restrained, and theme-tuned (heavier on dark, lighter on light so it doesn't read as muddy on a porcelain ground). Nothing else gets one.

**The Dark-Instrument Rule.** The live 3D surfaces — the measure viewer and the model viewer — stay **dark in both themes** via a scoped `.surface-dark` block. Unchanged by Phase 1; the roof viewer itself is untouched.

**The Scrim Rule.** Blur is permitted only where unpredictable content sits underneath, and only paired with an opaque scrim doing the real contrast work. `--blur-scrim` and `--overlay-scrim-opacity` (`app/globals.css`) are the forward-looking tokens future overlay components should read; the 14 existing hardcoded `backdrop-blur-*` usages haven't been retrofitted onto them yet — see the Phase 1 legacy migration inventory.

## 5. Components

### Buttons

- **Shape:** softly squared — 6px radius (`{rounded.md}`), tighter than panels.
- **Primary:** `action` fill (an ink/ground inversion) with `on-action` text, one per surface. **Never Instrument Cyan.** Hover lifts to `action-hover`, active/pressed to `action-active` — both reuse the existing ink hierarchy (Ink Strong, Ink Secondary) rather than inventing new literal colours.
- **Quiet / Secondary:** a hairline outline on Surface Raised with Ink Secondary text — `action-quiet-*`. Present but recessive, and **not cyan-tinted** (the prior spec here was wrong — see The Readout Rule).
- **Focus:** a visible ring is required — `outline-instrument` remains the sanctioned exception for hand-built components' focus rings (invisible at rest, never simultaneously visible with an actual reading, and changing it across ~479 existing components is out of Phase 1's foundation scope — see the legacy migration inventory). Swizzled Astryx components read Astryx's own `--color-accent` for their focus outline instead, which now resolves to the `action` ink tone, not cyan — still fully AA-visible in both themes, just not brand-matched; see `lib/astryx/theme.ts`'s note.
- **Disabled:** 40–60% opacity, no colour shift.

### Theme Toggle

Unchanged mechanism: a single icon button, `data-theme` on `<html>`, persisted to `localStorage`, replayed by an inline script before first paint so there is no flash. No stored choice → follows `prefers-color-scheme`. The `(report)` route ignores all of this and stays on paper.

### Chips

- **Style:** Instrument Cyan Deep at 10% fill, `instrument-fg` text, fully rounded, 12px Label type. Chips remain a legitimate, narrow cyan-tint use because they mark a *reading* (a measurement value, a technical tag), not a generic action.
- **Status chips:** the status quartet — `bg-{confirm|caution|danger|info}/10`, a `/25` border, matching `-fg` text.

### Cards / Containers

- **Corner style:** 8px (`{rounded.lg}`) maximum for framed panels — down from the prior 16–24px large-card scale. Compact controls use 4px; standard controls 6px.
- **Background:** Surface Raised. Nested content may go to Surface Lifted.
- **Shadow strategy:** none, unless the container is genuinely floating (see Elevation).
- **Border:** the hairline, 1px, always.
- **Internal padding:** 24px standard, 16px for dense/nested panels.
- **Containment discipline:** cards are for repeated independent objects or genuinely framed tools — not the default wrapper for every page section. A page section separates by spacing and a section rule before it reaches for a card.

### Inputs / Fields

- **Style:** Surface Raised fill, hairline border, 6px radius, 12px/16px padding, Ink Primary text.
- **Focus:** border shifts to Signal Blue — a clearly visible indicator on its own (measured contrast: 5.29:1 against the dark ground, 3.50:1 against the light ground, both above the 3:1 WCAG 2.2 AA non-text-contrast floor for UI-component state), so no separate outline ring is required for this indicator to be visible. `outline-none focus:border-signal-blue` (~46 hand-built inputs, verified as of the Premium UI Redesign final audit) is the correct, sufficient implementation of this rule — not a gap. Never a glow, never Instrument Cyan — an input's resting border reading as cyan would claim the field is a measurement.
- **Error:** border shifts to `danger` with a `danger-fg` message below — never colour-only.

### Navigation

Unchanged in Phase 1 — the production sidebar (`components/dashboard/app-sidebar.tsx`) is untouched; Phase 2 owns shell/navigation migration. Persistent left sidebar on `surface-sidebar`, active row marked by a Surface Lifted fill and `aria-current`, never a colour accent stripe.

### Severity rows

**The severity-dot pattern**, validated in the Phase 0 prototype after a colored border-stripe was tried and rejected (flagged by both the Impeccable design hook and The One Rule Rule): a small tonal dot (`confirm`/`caution`/`danger`/`info`, ~6px) plus text, never a border accent. This is the default treatment for an "action row" — a dashboard action-center item, an inline alert row — and should be the Phase 3 primitive's starting point, not re-litigated per component.

### The Model Viewer

The Three.js roof viewer is the product's signature surface. It follows the same doctrine: measurements in Signal Blue on the model, confirmed values in Instrument Cyan, dark instrument panel in both themes (The Dark-Instrument Rule). The model is evidence for the number, not the other way round.

**Tool-rail color rule** (Phase 7/8). An ordinary tool — Move, Auto-detect, Edit points, Split, Find roof edges — is not permanently colored to give it identity; every tool button shares one neutral resting style (hairline border, `bg-ground/50`) and one shared active/selected style, the same `bg-action text-on-action` ink/ground inversion every other primary action in the app uses. `aria-pressed` (never color alone) is what actually communicates which tool is active. Instrument Cyan stays reserved for readings; it is never a tool's resting or active color. Sky Accent/Signal Blue mark structural selection *on the model itself* (an edge, a facet outline), not a DOM tool button. Danger (`danger`/`danger-fg`) is for destructive/error only — a delete control or an error message, never a tool's identity. This closes a real Phase 7 finding: the viewer originally gave Auto-detect a permanent yellow and Edit points a permanent violet, both raw (non-token) Tailwind hues competing with the app's one reserved warm note (amber) and its one hero accent (cyan).

## 6. Motion

**Ownership.** CSS owns simple hover/focus/pressed-color feedback and short non-layout transitions. Motion (`motion/react`, see `lib/motion.ts` and `components/motion-provider.tsx`) owns React presence, layout continuity, overlays, and gestures. Anime.js is **not installed** and is reserved for the roof-viewer phase (Phase 7) only — nothing before then should add it.

**Presets, not raw durations.** `lib/motion.ts` exports named transitions (`instant`, `feedback`, `enter`, `exit`, `sheet`, `popover`, `layout`, `valueChange`) built from the approved timing reference: Instant 100ms, Fast 160ms, Standard 220ms, Deliberate 360ms, Focal 500–700ms (reserved for the viewer). Springs are critically damped (`bounce: 0`), timed by `visualDuration` rather than hand-tuned stiffness — 0.3s for controls, 0.4s for panels. No decorative bounce.

**Reduced motion.** `MotionProvider` wraps the app in `MotionConfig reducedMotion="user"`, Motion's own documented mechanism: disables transform/layout animation while keeping opacity/color transitions when the OS preference is set — in practice, an instant state change or a short crossfade, not merely a slower version of the same animation. CSS transitions carry their own `motion-reduce:` fallback independently (Tailwind's built-in variant), so both motion systems honor the preference without depending on each other.

**Bundle discipline.** `LazyMotion` with the `domAnimation` feature bundle and `strict` mode means a bare `motion.div` is a build-time warning, not a silent bundle-size regression — every consumer reaches for `m.div`. `domMax` (gestures, drag) is not loaded anywhere; nothing in the app drags yet outside the untouched roof viewer.

## 7. Preferences and Accessibility

- **WCAG 2.2 AA** is the stated target, verified for documented token pairs in the Phase 1 contrast pass (see `docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_PHASE_1_IMPLEMENTATION.md`).
- **Increased contrast** (`prefers-contrast: more`): strengthens the hairline, retires Ink Muted in favor of Ink Secondary for any text use, removes blur/scrim translucency. Application-controlled — there's no browser-automatic equivalent for custom colours.
- **Reduced transparency** (`prefers-reduced-transparency: reduce`): a real, Baseline-available platform query. `--blur-scrim` collapses to 0 and `--overlay-scrim-opacity` rises toward opaque. Foundation only — see the legacy migration inventory for the 14 hardcoded `backdrop-blur-*` usages not yet wired onto these tokens.
- **Forced colors** (Windows High Contrast Mode): deliberately minimal — the platform already remaps custom colours to system ones, and Aernova's border-based separation (The One Rule Rule) survives that remapping natively. The one addition is a `Highlight`-colored `:focus-visible` reinforcement, since a custom `outline-instrument` value isn't itself remapped. `forced-color-adjust` is never disabled.
- **Touch targets:** minimum 44×44 CSS px for mobile/field actions where practical.
- **Zoom:** typography is fixed-`rem`, never viewport-scaled, specifically so 200% browser zoom remains valid without special-casing.

## 8. Do's and Don'ts

### Do:
- **Do** use Instrument Cyan only for readings — The Readout Rule — identical in both themes, never an application action.
- **Do** use `action`/`on-action` (the ink/ground inversion) for every application primary button. **Don't** reach for `bg-ink-primary text-ground` directly in new code — use the semantic `action`/`on-action` utilities so the convention stays named, not implied.
- **Do** reserve Amber for attention and caution alone.
- **Do** label bright, theme-constant accent fills (cyan/amber/confirm) with `on-accent`; label `action` fills with `on-action` — they are not interchangeable (see the Named Rules in §2).
- **Do** route every colour through a semantic token so a palette change needs one edit, not forty.
- **Do** express structural separation as the 1px hairline at one weight.
- **Do** build page-flow depth from the two-layer tonal scale; reach for shadow only on genuinely floating content.
- **Do** use the severity-dot pattern for status/attention rows.
- **Do** keep the live 3D viewers on `.surface-dark`.
- **Do** keep the `(report)` route and public documents on their light paper tokens, untouched until Phase 6.
- **Do** render a visible focus ring on every interactive element.
- **Do** reach for `m` (not bare `motion`) under `MotionProvider`, and a named preset from `lib/motion.ts` (not a raw duration).

### Don't:
- **Don't** surface CAD/engineering complexity — PRODUCT.md's named anti-reference.
- **Don't** put pipeline vocabulary on screen: facet, normal, mesh, RANSAC, tolerance, reconstruction.
- **Don't** let cyan mean "primary action," "quiet button," or "link" anywhere — new or old code. If you find one, it's a legacy usage; see the migration inventory, don't add another.
- **Don't** let Amber mean anything but caution.
- **Don't** put `text-ground` on a bright accent fill; use `on-accent`. Don't put `on-accent` on an `action` fill; use `on-action`.
- **Don't** hardcode a raw palette utility on an app surface — tokens only (the 3D viewers and the paper report remain the two sanctioned exceptions).
- **Don't** add a shadow to a panel sitting in normal page flow. Floating content only.
- **Don't** use `backdrop-blur` on the ground without an opaque scrim doing the real contrast work.
- **Don't** signal an error, warning, or state with colour alone.
- **Don't** uppercase anything larger than a 12px Label.
- **Don't** use a colored border stripe (left or otherwise) to emphasize anything — tried once in Phase 0, rejected, don't reintroduce it.
- **Don't** let Confirm Green mean "in progress." It means done, and only done.
- **Don't** add a webfont beyond IBM Plex Sans without a deliberate, documented reason.
- **Don't** add Anime.js before the roof-viewer phase, or Motion gesture/drag features (`domMax`) before something actually drags.
- **Don't** manually redesign a production route because a token changed underneath it — fix the token mapping first; component-by-component migration is Phase 2 onward.

## 9. Shared operational primitives (Phase 3)

The canonical primitive set lives in `components/ui/` (not `components/dashboard/`) —
`Status`, `NumericReadout`, `PageHeader`, `ActionToolbar`, `FilterToolbar`, `DataRow`,
`EmptyState`, `Skeleton{Row,Readout,List}`, `SplitInspector`, and the `Document*` set. Session
details, the Astryx reuse audit, and the full state-matrix results live in
`docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_PHASE_3_IMPLEMENTATION.md` — this section is the durable rule set future work
should follow, not that log.

**Status.** One component, two variants: `variant="dot"` (severity-dot, §5's default for any
attention row) and `variant="solid"` (a filled pill for table cells). Both take a `tone` —
`neutral`/`info`/`success`/`caution`/`danger` — never a domain enum. A `*_STATUS_META` table maps
its enum to a tone; `Status` never imports `JobStatus`/`QuoteStatus`/etc. itself.

**NumericReadout.** Presentation only — no money/margin/tax/progress math lives here. `tone=
"measurement"` is the only way a `NumericReadout` may render Instrument Cyan, and it's reserved
for genuine readings (roof area, pitch), never money, counts, or status totals. Null/undefined
render a muted em dash, not zero and not a styled error.

**DataRow.** Four slots — `leading`, `primary`, `meta`, `trailing` — wrapping Astryx `Item`, not a
generic children prop. Missing `meta` gets an explicit placeholder ("No address on file"), never a
silently dropped line — two demo call sites disagreeing on this was the Phase 3 Impeccable
critique's own P2 finding.

**EmptyState.** Four kinds — `first-use`, `filtered`, `clear`, `error` — each with a sensible
default; an action renders only when one genuinely exists.

**SplitInspector.** The desktop/mobile split breakpoint is **1280px**, not the shell's own 1024px
sidebar breakpoint — splitting at the same width the sidebar also opens at starves the main pane.
Below 1280px the inspector is a bottom-anchored Dialog sheet, not a cramped second column.

**Table vs. DataRow.** `Table` (Astryx, already used for quotes/invoices) where column-to-column
comparison is the point; `DataRow`/`List` where a single row is the unit of attention (jobs,
requests). No universal DataTable framework.

**Form fields.** Astryx `TextInput`/`TextArea`/`Selector`/`CheckboxInput`/`RadioList` directly —
no Aernova field-wrapper exists or should be added without a documented gap. The one exception,
`CounterTextArea` (`components/ui/form-field.tsx`), adds a min/max character-counter status message
using the two-state doctrine in `lib/char-counter.ts` (count up toward a minimum, then down toward
a ceiling — proven first by `lib/invoice/addon-override.ts`'s OWNER_OVERRIDE field). Astryx's
`FieldStatus` has a known, non-blocking SSR/CSR hydration warning in `@astryxdesign/core@0.3.0` —
documented, not swizzled around.

**Overlays.** Astryx `Dialog` (general content), `AlertDialog` (destructive confirmations),
`DropdownMenu` (More menus), `Popover`/`MobileNav` (already in production) — directly, no new
wrapper. `ConfirmSubmit` stays for server-action forms with no client state to hang an
`AlertDialog` off; the two patterns are complementary, not competing.

**No generic Panel.** `components/ui/` will not grow a catch-all `Panel`/`Card`/`SurfaceBox`. Use
spacing, section rules, row separators, and typography before reaching for a new container — the
raw `rounded-{xl,2xl,3xl}` panel/button pattern the Phase 3 audit first flagged (114 occurrences)
is still open at Phase 8 close: a fresh count found 536 combined occurrences of `rounded-{xl,2xl,3xl}`
across the app, meaning the reduction never actually landed at scale and the gap widened as new
routes shipped. Phase 8 deliberately did not attempt a bulk fix — radius carries real per-surface
context (a dialog, a chip, and an ordinary panel don't necessarily converge on one value without
review) and a blind global find-and-replace was explicitly out of scope. This remains a real,
quantified, open reduction target for whoever picks it up next — reviewed file by file against
this doc's radius scale (§Cards/Containers), not mechanically.
