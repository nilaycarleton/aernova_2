---
name: Aernova
description: Roof measurement, inspection, and proposal platform for roofing contractors.
colors:
  ground: "oklch(12.5% 0.05 264)"
  surface-raised: "rgb(216 227 255 / 0.07)"
  surface-lifted: "rgb(216 227 255 / 0.13)"
  hairline: "rgb(216 227 255 / 0.14)"
  surface-sidebar: "oklch(15.5% 0.05 264)"
  ink-primary: "#ffffff"
  ink-strong: "oklch(93% 0.02 258)"
  ink-secondary: "oklch(87% 0.028 262)"
  ink-muted: "oklch(70.4% 0.045 258)"
  on-accent: "oklch(13% 0.05 264)"
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
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 2rem
    letterSpacing: "normal"
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.75rem
    letterSpacing: "normal"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25rem
    letterSpacing: "normal"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.25rem
    letterSpacing: "normal"
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1rem
    letterSpacing: "0.025em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
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
    backgroundColor: "{colors.instrument}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.instrument-bright}"
    textColor: "{colors.on-accent}"
  button-quiet:
    backgroundColor: "#00d2ef1a"
    textColor: "{colors.instrument-fg}"
    rounded: "{rounded.sm}"
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

**Creative North Star: "The Field Notebook"**

A field notebook is the least precious object on a job site and the most trusted. It is plain, durable, and legible in any light. Nobody admires it; everybody relies on it. Its virtue is that a measurement written in it can be read back six months later without ambiguity. Aernova's interface answers to that standard: the numbers are the content, and everything around them is there to keep them readable.

The system is flat and layers by tone, never by shadow. Its home base is a deep **Ink Navy** ground (`oklch(12.5% 0.05 264)`) carrying navy-tinted translucent panels; separation comes from a single hairline rule and from tone. But "legible in any light" is now literal: the notebook has a **daylight page too.** A light theme — cool paper-grey ground, white panels, dark ink — is a first-class mode, because a contractor reads this on a bright roof as often as at a desk. Dark is the identity and the default; light is the same notebook held up to the sun. The one thing that never moves between them is **Instrument Cyan**: the readout colour is identical in both themes, so the number a roofer acts on always looks the same.

Around that fixed cyan, the palette carries one deliberate warm note — **Amber** — held in strict reserve for *attention and caution*, never for a measurement and never for an error. Cyan means "a reading"; amber means "look here"; green means "done"; red means "wrong." Four meanings, four colours, no decoration.

What this system rejects, in PRODUCT.md's words, is **CAD and engineering complexity**: exposed technical controls, dense parameter panels, and the vocabulary of the pipeline surfaced into the UI. Aernova performs photogrammetry and shows a roofer a number. The interface's job is to make that number plain, never to advertise the machinery that produced it.

The notebook metaphor carries one non-negotiable consequence: **legibility is not a preference here, it is the whole premise.** A notebook you cannot read is not a calm notebook, it is a broken one — in either theme. Any contrast decision that trades readability for atmosphere has failed this North Star on its own terms.

**Key Characteristics:**
- Flat by doctrine — depth from tonal layering, never shadow
- Two themes, one hero: Instrument Cyan is constant; the ground, ink, and surfaces flip
- One hairline rule does all structural separation (white-alpha in dark, ink-alpha in light)
- Small, dense, workmanlike type (14px body) — but never at the cost of contrast
- Cyan for measurement truth; Amber, in reserve, for attention only
- Soft radii (12–16px) to keep a technical product feeling unhurried

## 2. Colors

A deep Ink Navy field (or its daylight paper-grey twin), translucent structure, exactly one accent that means "this is a reading," and one warm note held in reserve.

### Primary
- **Instrument Cyan** (`oklch(78.9% 0.154 211.53)`, `#00d3f2`): The readout colour. Reserved for measurement truth — confirmed values, active progress, live geometry, and the single primary action that advances the pipeline. **It does not change between light and dark.** It is the colour of a number you can act on.
- **Instrument Cyan Bright** (`oklch(86.5% 0.127 207.078)`): Hover and active states on cyan surfaces; in-progress fill on determinate progress bars.
- **Instrument Cyan Deep** (`oklch(71.5% 0.143 215.221)`): Tinted backgrounds only (at ~10% alpha, as in chips).
- **Instrument Foreground** (`instrument-fg`): Readable cyan *text* on a cyan tint — pale cyan in dark, deep cyan in light. This is the token that flips so a "10% cyan tint + cyan label" pairing stays legible in both themes.

### Secondary
- **Sky Accent** (`oklch(74.6% 0.16 232.661)`) / **Signal Blue** (`oklch(62.3% 0.214 259.815)`): Structural emphasis in the 3D viewer — selected edges, facet outlines, measurement overlays drawn on the model — and the input-focus border. Both read on either ground, so they do not flip. Signal Blue Deep (`oklch(54.6% 0.245 262.881)`) carries white text on a solid fill.

### Tertiary — the status quartet
Each status keeps one saturated **base** (for `bg-x/10` tints and `border-x/25` rules, which composite correctly on either ground) plus a **`-fg`** text colour that flips per theme (pale in dark, deep in light).
- **Confirm Green** (`oklch(69.6% 0.17 162.48)`): Terminal success only — a completed job, a saved measurement, a delivered proposal. Never a progress colour.
- **Amber / Caution** (`oklch(80% 0.15 78)`, `#ffb020`): The one warm signal. Attention and caution — "more overlapping photos would help," "processor not reachable," "needs another look." **Never a measurement, never an error, never decoration.**
- **Danger** (`oklch(63.7% 0.234 25.3)`): Errors and destructive actions — a failed save, a field that won't validate, a delete.
- **Info** (`oklch(68.5% 0.169 237)`): Neutral informational states and non-measurement status badges.

### Neutral
- **Ground** (`oklch(12.5% 0.05 264)` dark / `oklch(95.5% 0.01 255)` light): The page. Deep Ink Navy at home; a cool paper-grey in daylight.
- **Surface Raised** (7% navy-tinted white on dark / opaque white on light): The default panel. The workhorse container fill. On dark it is a translucent film; on light it is a white card that lifts off the grey ground.
- **Surface Lifted** (13% on dark / faint cool-grey on light): One step up — nested panels, hovered rows, active list items. The only elevation move the system has.
- **Surface Sidebar**: The sidebar's second neutral layer — a touch deeper than the ground on dark, a touch cooler than content on light.
- **Hairline** (white at 14% on dark / Ink Navy at 12% on light): Every border in the product. One rule, one weight, and it inverts with the theme so it is always the fainter-than-ink, stronger-than-nothing line.
- **Ink Primary / Strong / Secondary / Muted**: Headings → body → metadata, flipping from near-white on dark to deep Ink Navy on light. **Ink Muted is the contrast floor** (~7.6:1 on the dark ground, ~4.7:1 on the light ground); nothing dimmer carries text.
- **On-Accent** (`oklch(13% 0.05 264)`): The constant dark ink that rides on bright accents (cyan / amber / emerald / solid buttons). It never flips — a bright cyan button wants dark text in *both* themes.

### Print
- **Paper** / **Paper Ink** / **Paper Rule** (the `paper-*` family): The `(report)` route is a deliberate light surface with its own `<html>` root, pinned to light regardless of app theme. A proposal gets printed and handed to a homeowner; it is a document, not a screen. The `paper-*` tokens **never flip** and the dark/light app tokens never cross into it.

### Named Rules

**The Readout Rule.** Instrument Cyan means "this is a measurement or the action that produces one." It is never a brand flourish, never a link colour, never a decorative highlight — and it is identical in both themes. If cyan appears next to something a contractor cannot read a number off of or click to advance the job, it is misused.

**The One Warm Note Rule.** Amber is the system's only warm colour, and it means *attention/caution* and nothing else. It is never a measurement (that is cyan), never an error (that is danger/red), never a success (that is confirm/green), and never decoration. One warm note, used sparingly, is why it reads as a signal.

**The Constant-On-Accent Rule.** Text on a bright accent uses `on-accent` (constant dark), never `ground`. `ground` flips to near-white in light mode; a button labelled in `ground` would turn invisible on its own cyan. Bright accent → dark ink, in both themes.

**The Ink Floor Rule.** Ink Muted is the dimmest colour permitted to carry text — measured against whichever ground is active. This rule was historically violated by `text-slate-500`; the codebase is now clean, and it stays clean by routing every text colour through the `ink-*` tokens rather than a raw palette utility. The Field Notebook is legible or it is nothing — in any light.

**The One Rule Rule.** All structural separation uses the hairline at one weight. No 2px borders, no colored stripes, no left-border accent bars. If a boundary needs more emphasis than a hairline, the answer is spacing or tone, not a heavier line.

## 3. Typography

**Display Font:** system sans (`ui-sans-serif, system-ui, sans-serif`)
**Body Font:** system sans (same stack)
**Label/Mono Font:** none distinct

**Character:** Aernova ships no webfont, and this is correct for the North Star rather than an oversight. A field notebook is not typeset — it is written in whatever is legible and to hand. The system stack is fast, familiar, renders natively on every contractor's phone and desk machine, and never blocks a paint on a slow site connection. It also refuses the one thing the anti-reference warns against: type as a signal of technical sophistication.

### Hierarchy
- **Display** (600, 24px / 2rem line-height): Page and workspace titles. One per screen.
- **Headline** (600, 18px / 1.75rem): Section headings inside a panel.
- **Title** (600, 14px / 1.25rem): Panel headers, control labels, table column heads. Same size as body, separated by weight alone.
- **Body** (400, 14px / 1.25rem): The workhorse and the default for essentially all reading. Cap measured prose at 65–75ch.
- **Label** (500, 12px, 0.025em, often uppercase): Metadata, units, badges, timestamps. Uppercase is permitted here and nowhere else.

### Named Rules

**The Weight-Not-Size Rule.** Hierarchy between a label and its value is carried by weight and colour, not by size. The system runs on two real sizes (14px and 12px); reaching for a third size to make something stand out is a failure of grouping, not a shortage of scale. (The one sanctioned exception is a single hero number — a quote total, a roof area — which may size up in cyan to lead its panel.)

**The Uppercase Confinement Rule.** Uppercase is a label treatment only, at 12px with tracking. A measurement, a heading, or a sentence is never uppercased — it costs legibility, and legibility is the premise.

## 4. Elevation

**This system has no shadows.** That is doctrine, not an omission. Depth is expressed entirely through tonal layering: the ground receives a raised panel, which may receive a lifted panel, and each is separated by a hairline. There are exactly two levels, and there is no third — in either theme.

Shadow is prohibited on the translucent dark surface: a shadow under a translucent panel on a near-black ground produces smudge, not depth — the glassmorphism the product has no business borrowing. On the light theme, panels earn separation by being *lighter* than the grey ground plus the hairline, not by a drop shadow.

The exception is an **opaque paper surface**: the client-ready proposal preview renders a white document, and a shadow there is the paper-on-a-desk read the Field Notebook is named for. The test is opacity, not colour — a translucent panel never earns a shadow; an opaque document does.

### Named Rules

**The Two-Layer Rule.** Ground → raised → lifted. That is the entire elevation vocabulary. If a design needs a third layer, the layout is too nested; flatten it instead of inventing tone.

**The Dark-Instrument Rule.** The live 3D surfaces — the measure viewer and the model viewer — stay **dark in both themes** via a scoped `.surface-dark` block that re-forces the dark tokens on that subtree. The model renders on a dark canvas and its overlays sit on that canvas; a light control bar over a dark 3D model would strand its own tool colours. In light mode these read as a dark instrument panel embedded in the page, the way a map or media surface does. It is the one place the theme deliberately does not flip.

**The Scrim Rule.** Blur is permitted only where unpredictable content sits underneath — the viewer canvas, a sticky bar over scrolling content. It must always pair with an opaque scrim doing the real contrast work; blur alone is never the mechanism. On the ground, blur is prohibited.

**The Anti-Pattern Test.** If a panel appears to float above the page rather than sit on it, the treatment is wrong. Surfaces in this system rest; they do not hover.

## 5. Components

### Buttons
- **Shape:** Softly squared (8px radius) — tighter than panels, so controls read as controls.
- **Primary (Hero):** Instrument Cyan fill with **On-Accent** dark text, one per surface. Dark-on-bright is deliberate and constant across themes: the primary action is the brightest object on the screen and the only one that inverts.
- **Quiet / Secondary:** Cyan at ~10% fill with a 30% cyan-bright border and `instrument-fg` text. Present but recessive — the tinted secondary is ~90% ground, so the solid hero stays the brightest object.
- **Hover / Focus:** Primary lifts to Instrument Cyan Bright. Focus must render a visible ring (`outline-instrument`) — the AA target does not permit relying on browser defaults.
- **Disabled:** 40–60% opacity, no colour shift.

### Theme Toggle
A single icon button in the dashboard header (sun in dark → click for light; moon in light → click for dark). It writes `data-theme` to `<html>` and persists the choice to `localStorage`; an inline script in the root layout replays that choice before first paint, so there is no flash. With no stored choice, the app follows the OS via `prefers-color-scheme`. The `(report)` route ignores all of this and stays on paper.

### Chips
- **Style:** Instrument Cyan Deep at 10% fill, `instrument-fg` text, fully rounded, 12px label type.
- **Status chips:** Use the status quartet — `bg-{confirm|caution|danger|info}/10`, a `/25` border, and the matching `-fg` text. Read-only carriers; a chip that needs a click is a ghost button wearing the wrong clothes.

### Cards / Containers
- **Corner Style:** 16px (`rounded-2xl`) for panels; 24px for the outermost workspace shells.
- **Background:** Surface Raised. Nested content may go to Surface Lifted.
- **Shadow Strategy:** None. See Elevation.
- **Border:** The hairline, 1px, always.
- **Internal Padding:** 24px standard, 16px for dense or nested panels.

### Inputs / Fields
- **Style:** Surface Raised fill, hairline border, 12px radius, 12px/16px padding, ink-primary text.
- **Focus:** Border shifts to Signal Blue with a visible ring. Never a glow.
- **Error:** Border shifts to `danger` with a `danger-fg` message below — never a colour-only signal, which fails colorblind users and the AA target alike.

### Navigation
- **Style:** Persistent left sidebar on `surface-sidebar`, its own second neutral layer. Items are 14px, Ink Secondary at rest, Ink Primary when active, with a Surface Lifted fill marking the active row. No accent stripe — see The One Rule Rule.

### The Model Viewer
The Three.js roof viewer is the product's signature surface and the one place technical rendering is legitimately on screen. It follows the same doctrine — measurements in Signal Blue on the model, confirmed values in Instrument Cyan — and it is a **dark instrument in both themes** (The Dark-Instrument Rule). The model is evidence for the number, not the other way round.

## 6. Do's and Don'ts

### Do:
- **Do** use Instrument Cyan only for measurement truth and the primary action that advances the job — The Readout Rule — and keep it identical in both themes.
- **Do** reserve Amber for attention and caution alone — The One Warm Note Rule.
- **Do** label bright-accent buttons with `on-accent`, never `ground` — The Constant-On-Accent Rule.
- **Do** route every colour through a semantic token (`ink-*`, `surface-*`, `danger`, `caution`, `confirm`, `info`) so a theme swap needs no per-component work.
- **Do** express every border as the 1px hairline at one weight.
- **Do** build depth from the two-layer tonal scale and nothing else.
- **Do** keep body copy at 14px / Ink Secondary and treat Ink Muted as the absolute dimmest text on screen — in either theme.
- **Do** keep the live 3D viewers on `.surface-dark` so their tool colours stay legible.
- **Do** keep the `(report)` route on its light paper tokens. It is a printed document handed to a homeowner.
- **Do** render a visible focus ring on every interactive element. WCAG 2.2 AA is the stated target.

### Don't:
- **Don't** surface **CAD and engineering complexity** — PRODUCT.md's named anti-reference. No exposed parameter panels, no tolerance sliders, no dense technical control clusters in front of a contractor.
- **Don't** put pipeline vocabulary on screen: *facet, normal, mesh, RANSAC, tolerance, reconstruction*. If it wouldn't be said on a roof, it isn't a label.
- **Don't** let Amber mean anything but caution — not a measurement (cyan), not an error (danger), not success (confirm), not decoration.
- **Don't** put `text-ground` on a bright accent; it disappears in light mode. Use `on-accent`.
- **Don't** hardcode a raw palette utility (`text-rose-200`, `bg-slate-900`, `border-white/15`) on an app surface — it won't flip. Tokens only. (The 3D viewers and the paper report are the two sanctioned exceptions.)
- **Don't** add a shadow to anything on the translucent ground. If it looks like it's floating, the treatment is wrong.
- **Don't** use `backdrop-blur` on the ground. It is permitted only over the viewer canvas or a sticky bar, and only alongside an opaque scrim — see The Scrim Rule.
- **Don't** signal an error, a warning, or a state with colour alone. Always pair with text or an icon.
- **Don't** uppercase anything larger than a 12px label.
- **Don't** use a colored left-border stripe or a border heavier than 1px to emphasize a panel. Use spacing or tone.
- **Don't** let Confirm Green mean "in progress." It means done, and only done.
- **Don't** introduce a webfont without a deliberate reason. The system stack is a considered choice, not a gap to fill.
