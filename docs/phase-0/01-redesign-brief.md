# Phase 0 Redesign Brief — Precision Workshop

One-page brief per Impeccable's shape workflow. Durable decisions belong in `docs/AERNOVA_DESIGN_REFERENCE.md`; sequencing belongs in `docs/PREMIUM_UI_REDESIGN_PLAN.md`. This page exists to keep the concept seeds and prototype (Steps 9–10) pointed at the same target without re-deriving it from the full plan each time.

## Product context

Aernova is a multi-trade workflow platform for small construction and trades businesses (roofing, plumbing, lawn care, general contracting). It carries a job from first contact to paid invoice: request → quote → schedule → production → invoice → paid. Roofing's drone/photogrammetry pipeline is one gated module, not the model for the rest of the product. Users are non-technical; the product's job is to turn work into review-and-confirm steps, never new forms or new vocabulary to learn.

## Users

- **Owner/Admin** — runs the business, wants the day's exceptions surfaced, not busywork.
- **Office/Estimator** — schedules, quotes, documents; needs detail and precision on desktop.
- **Sales** — requests, pipeline, quote follow-up; needs status at a glance.
- **Crew** — one-handed, outdoors, mobile only; needs the next task and nothing else.
- **Customer** — opens a contractor-branded document once; never sees Aernova chrome.

## Primary tasks

Review what Aernova already prepared and confirm it. Find the one job/quote/invoice that needs a decision today. Move a job to its next status. Complete a field task from a phone in daylight.

## Current problems (see `docs/phase-0/00-baseline-report.md` for the measured version)

Equal-weight rounded panels everywhere (293 `rounded-xl`, 131 `rounded-2xl`, 479 `border-hairline` occurrences) with no hierarchy between primary work and supporting information. Near-zero interaction feedback (5 files use `transition-*`, 2 use `animate-*`). Custom hand-built shell/sidebar/forms duplicate what Astryx already provides. An action-color rule (cyan-as-primary) is on record in `DESIGN.md` but already contradicted by the shipped Astryx theme mapping — one authoritative model is overdue.

## Approved direction: Precision Workshop

~85% calm precision, ~15% sophisticated material character. Premium comes from hierarchy, typography, responsiveness, interaction quality, and restrained material depth — not decoration. Concretely: fewer, stronger containers in place of nested cards; structured rows/tables/split panes over card grids; precise numeric alignment with tabular figures; complete states (loading/empty/error/permission) treated as first-class design surface, not an afterthought; motion that explains a state change and nothing else.

**What "premium" is not here:** gradients, decorative blur/glass, oversized hero cards, floating color shapes, page-load choreography, CAD/engineering exposure, Apple chrome imitation.

## Visual anti-patterns (binding — see `docs/AERNOVA_DESIGN_REFERENCE.md` §4.2)

Nested cards, a card around every section, excessive rounded rectangles, cyan as a generic action color, marketing-dashboard tiles, type that scales with viewport width, uppercase beyond a 12px label, a colored left-border stripe, decorative page-load sequences.

## Content hierarchy principles

Weight, size, and spacing establish hierarchy before color does. One hero number per surface may size up and use the measurement color; everything else separates by tone. Task-first ordering: what needs a decision now, then what's happening today, then supporting context — never marketing-style equal-weight tiles.

## Material / containment principles

Two-layer tonal system only (ground → raised → lifted); no shadows on translucent surfaces; cards reserved for repeated independent objects or genuinely framed tools (the roof viewer), not every page section. Borders separate; they do not outline.

## Theme strategy

Dark is the authored home base and default. Light is designed simultaneously as an outdoor-capable working surface, not a mechanical inversion — reviewed side-by-side at every step, not bolted on after dark ships. Cyan (Instrument) is the one constant across both themes; everything around it flips.

## Motion philosophy

CSS owns hover/focus/pressed-color feedback. Motion (React) would own presence, layout continuity, and overlays in later phases — Phase 0's prototype simulates this with CSS transitions and native React state only, since Motion is not yet an approved runtime dependency (Phase 1 decision). Anime.js is out of scope entirely (viewer-only, Phase 7). Springs are critically damped; no bounce. Every transition has a `prefers-reduced-motion` fallback that resolves to instant or crossfade.

## Typography requirements

One UI family, self-hosted via `next/font`, open-source. Tabular numerals for money/measurements/dates/counts. Fixed `rem` scale — never viewport-scaled. See `docs/phase-0/02-typography-comparison.md` for the candidate evaluation and recommendation.

## Navigation direction (prototype-only in Phase 0)

Stable work areas in a grouped side nav (Work / Pipeline / Relationships / Business / Company, per the approved IA in `docs/AERNOVA_DESIGN_REFERENCE.md` §9.1); creation actions accessible through a global `+ Create` command rather than being a nav destination. The production sidebar (`components/dashboard/app-sidebar.tsx`) is untouched in Phase 0 — this is a prototype exploration only.

## Mobile / field behavior

Field-critical routes (`/today`, schedule, job workspace, crew actions) get the most aggressive mobile treatment: bottom-reachable primary actions, agenda-style time views (never a compressed desktop calendar), 44px minimum touch targets, sheet-based inspectors instead of desktop split panes.

## Public-document distinction

Public quotes/invoices/warranties/change orders are **Document mode**: contractor identity first, warm print-safe paper surface, no app shell, no entry choreography. Untouched in Phase 0.

## Viewer distinction

The roof measurement viewer is **Instrument mode**: full-bleed dark stage in both themes, cyan/signal-blue reserved for geometry. Untouched in Phase 0 (Phase 7).

## Accessibility constraints

WCAG 2.2 AA in both themes. Visible focus on every interactive element. 44×44px touch targets on mobile/field actions. Color never the sole status signal. 200% zoom without breakage. Reduced motion and (where practical) increased contrast as first-class states.

## Rollout sequence (reference only — not re-decided here)

Phase 0 (this) → 1 Foundation/tokens → 2 Shell/nav → 3 Shared primitives → 4 Pilot slice → 5 Remaining authenticated surfaces → 6 Public/onboarding/auth → 7 Roof viewer → 8 Hardening/cutover.

## Phase 0 success criteria

- The direction is validated against real Aernova-shaped content (fixture data modeled on actual entities/fields), not a mood board.
- Dark and light are both complete in the prototype, reviewed together, not sequentially.
- The typography recommendation is justified against the evaluation criteria, not fashion.
- The prototype is exercised with mouse, keyboard, and a touch-sized viewport.
- Nothing in `app/(dashboard)/**`, `app/globals.css`, or `lib/astryx/theme.ts` changes.
