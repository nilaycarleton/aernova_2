/**
 * Motion foundation — semantic presets, not raw durations scattered through
 * components. Values are the approved timing reference
 * (docs/AERNOVA_DESIGN_REFERENCE.md §11.4 / docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_REDESIGN_PLAN.md
 * §8.2), not re-derived here. Motion (the React library, `motion/react`)
 * owns everything in this file; CSS keeps owning simple hover/focus/pressed-
 * color transitions — see docs/DESIGN.md's Motion Ownership section.
 *
 * Durations are seconds (Motion's own unit), not the milliseconds the design
 * reference documents them in — converted once, here, so no component has to
 * do the conversion or the token math itself.
 */
import type { Transition, Variants } from "motion/react";

export const DURATION = {
  /** Press feedback, tiny state acknowledgment. */
  instant: 0.1,
  /** Hover, focus, selection indicator. */
  fast: 0.16,
  /** Menu, popover, compact state replacement. */
  standard: 0.22,
  /** Drawer, inspector, meaningful layout change. */
  deliberate: 0.36,
  /** Rare viewer reveal only (Phase 7) — reserved, not used before then. */
  focal: 0.6,
} as const;

/** Ease-out-expo-shaped curve for simple opacity/transform enter/exit. No bounce. */
export const EASE_STANDARD: Transition["ease"] = [0.16, 1, 0.3, 1];

/**
 * Critically damped springs (`bounce: 0`), timed by `visualDuration` rather
 * than hand-tuned stiffness/damping — Motion's documented modern spring API.
 * "Control" for buttons/toggles/small state changes; "panel" for
 * drawers/sheets/inspectors. Direct-manipulation/momentum presets are
 * deferred until something in the app actually drags — no draggable surface
 * exists yet outside the (untouched) roof viewer.
 */
export const SPRING_CONTROL: Transition = { type: "spring", visualDuration: 0.3, bounce: 0 };
export const SPRING_PANEL: Transition = { type: "spring", visualDuration: 0.4, bounce: 0 };

/** Named transitions — reach for these, not a literal `{ duration: ... }`. */
export const transitions = {
  instant: { duration: DURATION.instant, ease: EASE_STANDARD } satisfies Transition,
  feedback: SPRING_CONTROL,
  enter: { duration: DURATION.standard, ease: EASE_STANDARD } satisfies Transition,
  exit: { duration: DURATION.fast, ease: EASE_STANDARD } satisfies Transition,
  sheet: SPRING_PANEL,
  popover: { duration: DURATION.standard, ease: EASE_STANDARD } satisfies Transition,
  layout: SPRING_PANEL,
  /** A value changing in place (a count, a progress bar) — deliberate, not snappy. */
  valueChange: { duration: DURATION.deliberate, ease: EASE_STANDARD } satisfies Transition,
} as const;

/** Fade + small rise. The default enter/exit for popovers, menus, small panels. */
export const fadeUp: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: transitions.enter },
  exit: { opacity: 0, y: 4, transition: transitions.exit },
};

/** Sheet sourced from the bottom edge — the mobile inspector/drawer pattern already validated in the Phase 0 prototype, now backed by Motion instead of a hand-rolled CSS transition. */
export const sheetFromBottom: Variants = {
  initial: { y: "100%" },
  animate: { y: 0, transition: transitions.sheet },
  exit: { y: "100%", transition: transitions.sheet },
};

/** Sheet/drawer sourced from the left edge — the mobile nav drawer pattern. */
export const sheetFromLeft: Variants = {
  initial: { x: "-100%" },
  animate: { x: 0, transition: transitions.sheet },
  exit: { x: "-100%", transition: transitions.sheet },
};

/** Simple scale-in for a popover/menu anchored to a trigger. */
export const popoverScale: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: transitions.popover },
  exit: { opacity: 0, scale: 0.96, transition: transitions.exit },
};
