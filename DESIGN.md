---
name: Aernova
description: Roof measurement, inspection, and proposal platform for roofing contractors.
colors:
  ground: "#020618"
  surface-raised: "#ffffff0d"
  surface-lifted: "#ffffff1a"
  hairline: "#ffffff1a"
  ink-primary: "#ffffff"
  ink-strong: "#e2e8f0"
  ink-secondary: "#cad5e2"
  ink-muted: "#90a1b9"
  instrument: "#00d2ef"
  instrument-bright: "#53eafd"
  instrument-deep: "#00b7d7"
  signal-blue: "#3080ff"
  sky-accent: "#00bcfe"
  confirm: "#00bb7f"
  paper-document: "#ffffff"
  paper: "#f1f5f9"
  paper-inset: "#f8fafc"
  paper-ink: "#0f172b"
  paper-ink-strong: "#1d293d"
  paper-ink-body: "#314158"
  paper-ink-muted: "#45556c"
  paper-ink-faint: "#62748e"
  paper-rule: "#e2e8f0"
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
    textColor: "{colors.ground}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.instrument-bright}"
    textColor: "{colors.ground}"
  button-ghost:
    backgroundColor: "#00bcfe1a"
    textColor: "#e0f2fe"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
    typography: "{typography.title}"
  button-ghost-hover:
    backgroundColor: "#00bcfe33"
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
    textColor: "{colors.instrument-bright}"
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

The system is dark and flat. A near-black navy ground (`#020618`) carries translucent white panels that layer without ever casting a shadow. Separation comes from a single hairline rule (`#ffffff1a`) and from tone — not from depth effects, gradients, or glow. This is the notebook's discipline expressed in a dark surface: ruled lines and plain paper, nothing embossed. Corners are generously soft (12–16px) so the system reads as unhurried rather than engineered.

What this system rejects, in PRODUCT.md's words, is **CAD and engineering complexity**: exposed technical controls, dense parameter panels, and the vocabulary of the pipeline surfaced into the UI. Aernova performs photogrammetry and shows a roofer a number. The interface's job is to make that number plain, never to advertise the machinery that produced it.

The notebook metaphor carries one non-negotiable consequence: **legibility is not a preference here, it is the whole premise.** A notebook you cannot read is not a calm notebook, it is a broken one. Any contrast decision that trades readability for atmosphere has failed this North Star on its own terms.

**Key Characteristics:**
- Flat by doctrine — depth from tonal layering, never shadow
- One hairline rule (`#ffffff1a`) does all structural separation
- Small, dense, workmanlike type (14px body) — but never at the cost of contrast
- Cyan reserved for measurement truth, not decoration
- Soft radii (12–16px) to keep a technical product feeling unhurried

## 2. Colors

A near-black navy ground, translucent white for structure, and exactly one accent that means "this is a reading."

### Primary
- **Instrument Cyan** (`#00d2ef`): The readout color. Reserved for measurement truth — confirmed values, active progress, live geometry, and the single primary action that advances the pipeline. It is the color of a number you can act on.
- **Instrument Cyan Bright** (`#53eafd`): Hover and active states on cyan surfaces; in-progress fill on determinate progress bars.
- **Instrument Cyan Deep** (`#00b7d7`): Tinted backgrounds only (at ~10% alpha, as in chips). Never used as a text color on the dark ground.

### Secondary
- **Sky Accent** (`#00bcfe`): Ghost and secondary controls, as a 10% tinted fill with a 30% border. The quieter sibling to cyan; used where an action exists but should not compete with the primary one.
- **Signal Blue** (`#3080ff`): Structural emphasis in the 3D viewer — selected edges, facet outlines, measurement overlays drawn on the model itself.

### Tertiary
- **Confirm Green** (`#00bb7f`): Terminal success only. A completed job, a saved measurement, a delivered proposal. Never a decorative "good" state and never a progress color.

### Neutral
- **Ground** (`#020618`): The page. Every dashboard surface starts here.
- **Surface Raised** (`#ffffff0d` (white at 5%)): The default panel. This is the workhorse container fill.
- **Surface Lifted** (`#ffffff1a`, white at 10%): One step up — nested panels, hovered rows, active list items. The only elevation move the system has.
- **Hairline** (`#ffffff1a`, white at 10%): Every border in the product. One rule, one weight, no exceptions.
- **Ink Primary** (`#ffffff`): Headings and any number a contractor will act on.
- **Ink Secondary** (`#cad5e2`): Body copy. The default reading color.
- **Ink Muted** (`#90a1b9`): Labels, metadata, timestamps, units. The floor — nothing dimmer than this carries text.

### Print
- **Paper** (`#f1f5f9`) / **Paper Ink** (`#0f172b`) / **Paper Rule** (`#e2e8f0`): The `(report)` route is a deliberate light surface with its own `<html>` root. A proposal gets printed and handed to a homeowner; it is a document, not a screen. Dark-surface tokens never cross into it.

### Named Rules

**The Readout Rule.** Instrument Cyan means "this is a measurement or the action that produces one." It is never a brand flourish, never a link color, never a decorative highlight. If cyan appears next to something a contractor cannot read a number off of or click to advance the job, it is misused.

**The Ink Floor Rule.** `#90a1b9` (Ink Muted, measured **7.66:1** on the ground) is the dimmest color permitted to carry text. Anything below it is prohibited outright. **This rule is currently violated in ~102 places by `text-slate-500` (`#62748e`), which measures 4.23:1 on the ground and 3.90:1 on a raised panel — below the 4.5:1 AA needs for body text.** It clears the 3:1 large-text bar, so the failure is confined to the 14px body and 12px label sizes where it is mostly used. The margin is small; the fix is a find-and-replace to Ink Muted, not a redesign. The Field Notebook is legible or it is nothing.

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
- **Body** (400, 14px / 1.25rem): The workhorse — 235 usages and the default for essentially all reading. Cap measured prose at 65–75ch.
- **Label** (500, 12px, 0.025em, often uppercase): Metadata, units, badges, timestamps. Uppercase is permitted here and nowhere else.

### Named Rules

**The Weight-Not-Size Rule.** Hierarchy between a label and its value is carried by weight and color, not by size. The system runs on two real sizes (14px and 12px); reaching for a third size to make something stand out is a failure of grouping, not a shortage of scale.

**The Uppercase Confinement Rule.** Uppercase is a label treatment only, at 12px with tracking. A measurement, a heading, or a sentence is never uppercased — it costs legibility, and legibility is the premise.

## 4. Elevation

**This system has no shadows.** That is doctrine, not an omission. Depth is expressed entirely through tonal layering: the ground (`#020618`) receives a 5% white panel, which may receive a 10% white panel, and each is separated by a hairline. There are exactly two levels, and there is no third.

Shadow is prohibited on the dark surface. A shadow under a *translucent* panel on a near-black ground produces smudge, not depth — it reads as the glassmorphism the product has no business borrowing.

The exception is an **opaque paper surface**: the client-ready proposal preview renders a white document on the dark section, and a shadow there is the paper-on-a-desk read the Field Notebook is named for. The test is opacity, not color — a translucent panel never earns a shadow; an opaque document does.

**The one exception is content the system does not control.** An overlay sitting on the 3D viewer canvas is not on the ground — it is on a live render of a roof, which can be any color or brightness. There, an opaque scrim (`bg-slate-950/80–85`) plus `backdrop-blur` is a legibility mechanism, not a decorative one, and it is correct. The same applies to a sticky control bar that scrolls over arbitrary content. Blur is earned when it protects a reading; it is forbidden when it is atmosphere.

### Named Rules

**The Two-Layer Rule.** Ground → raised (5%) → lifted (10%). That is the entire elevation vocabulary. If a design needs a third layer, the layout is too nested; flatten it instead of inventing tone.

**The Scrim Rule.** Blur is permitted only where unpredictable content sits underneath — the viewer canvas, a sticky bar over scrolling content. It must always pair with an opaque scrim doing the real contrast work; blur alone is never the mechanism. On the ground, blur is prohibited.

**The Anti-Pattern Test.** If a panel appears to float above the page rather than sit on it, the treatment is wrong. Surfaces in this system rest; they do not hover.

## 5. Components

### Buttons
- **Shape:** Softly squared (8px radius) — tighter than panels, so controls read as controls.
- **Primary:** Instrument Cyan fill (`#00d2ef`) with ground-colored text (`#020618`), 8px/12px padding. Dark-on-bright is deliberate: the primary action is the brightest object on the screen and the only one that inverts.
- **Hover / Focus:** Lifts to Instrument Cyan Bright (`#53eafd`). Focus must render a visible ring — the current codebase relies on browser defaults, which the AA target does not permit.
- **Ghost / Secondary:** Sky at 10% fill with a 30% sky border and pale sky text, 6px/12px padding. Present but recessive.
- **Disabled:** 40% opacity, no color shift.

### Chips
- **Style:** Instrument Cyan Deep at 10% fill, Cyan Bright text, fully rounded, 12px label type.
- **State:** Read-only status carriers (job phase, measurement state). Not interactive; if a chip needs a click target, it is a ghost button wearing the wrong clothes.

### Cards / Containers
- **Corner Style:** 16px (`rounded-2xl`) for panels; 24px for the outermost workspace shells.
- **Background:** Surface Raised (5% white). Nested content may go to Surface Lifted (10%).
- **Shadow Strategy:** None. See Elevation.
- **Border:** The hairline (`#ffffff1a`), 1px, always.
- **Internal Padding:** 24px standard, 16px for dense or nested panels.

### Inputs / Fields
- **Style:** Surface Raised fill, hairline border, 12px radius, 12px/16px padding, white text.
- **Focus:** Border shifts to Instrument Cyan with a visible ring. Never a glow.
- **Error:** Hairline shifts to a red stroke with a text message below — never a color-only signal, which fails colorblind users and the AA target alike.

### Navigation
- **Style:** Persistent left sidebar (`app-sidebar.tsx`) on the dark ground. Items are 14px, Ink Secondary at rest, Ink Primary when active, with a Surface Lifted fill marking the active row. No accent stripe — see The One Rule Rule.

### The Model Viewer
The Three.js roof viewer is the product's signature surface and the one place technical rendering is legitimately on screen. It follows the same doctrine: measurements drawn in Signal Blue on the model, confirmed values in Instrument Cyan, and no interface chrome floating over the canvas that a contractor did not ask for. The model is evidence for the number — not the other way round.

## 6. Do's and Don'ts

### Do:
- **Do** use Instrument Cyan (`#00d2ef`) only for measurement truth and the primary action that advances the job — The Readout Rule.
- **Do** express every border as the 1px hairline (`#ffffff1a`) at one weight.
- **Do** build depth from the two-layer tonal scale (5% → 10% white) and nothing else.
- **Do** keep body copy at 14px / Ink Secondary (`#cad5e2`) and treat `#90a1b9` as the absolute dimmest text on screen.
- **Do** separate a label from its value with weight and color, never a third font size.
- **Do** state units and confidence plainly next to any measurement — PRODUCT.md: *"a number presented with false precision is a liability the contractor absorbs, not us."*
- **Do** keep the `(report)` route on its light paper tokens. It is a printed document handed to a homeowner.
- **Do** render a visible focus ring on every interactive element. WCAG 2.2 AA is the stated target.

### Don't:
- **Don't** surface **CAD and engineering complexity** — PRODUCT.md's named anti-reference. No exposed parameter panels, no tolerance sliders, no dense technical control clusters in front of a contractor.
- **Don't** put pipeline vocabulary on screen: *facet, normal, mesh, RANSAC, tolerance, reconstruction*. If it wouldn't be said on a roof, it isn't a label.
- **Don't** add a shadow to anything on the dark ground. If it looks like it's floating, the treatment is wrong.
- **Don't** use `backdrop-blur` on the ground. It is permitted only over the viewer canvas or a sticky bar, and only alongside an opaque scrim — see The Scrim Rule.
- **Don't** use `text-slate-500` (`#62748e`) for body or label text on the dark ground. At 4.23:1 it misses AA's 4.5:1, and it breaks the North Star — a notebook you can't read is a broken notebook. Use Ink Muted (`#90a1b9`, 7.66:1) instead.
- **Don't** signal an error, a warning, or a state with color alone. Always pair with text or an icon.
- **Don't** uppercase anything larger than a 12px label.
- **Don't** use a colored left-border stripe or a border heavier than 1px to emphasize a panel. Use spacing or tone.
- **Don't** let Confirm Green (`#00bb7f`) mean "in progress." It means done, and only done.
- **Don't** introduce a webfont without a deliberate reason. The system stack is a considered choice, not a gap to fill.
