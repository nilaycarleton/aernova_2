"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/**
 * Narrow client boundary around Motion's two app-wide concerns:
 * `reducedMotion="user"` (honors the OS `prefers-reduced-motion` preference —
 * Motion's own documented behavior for this setting disables transform/
 * layout animation while keeping opacity/color transitions, which is exactly
 * "instant state change or a short crossfade," not just "slower") and
 * `LazyMotion` with the `domAnimation` feature bundle (so `m.div` etc. don't
 * pull in gesture/drag/layout-projection code nothing uses yet — see
 * lib/motion.ts's own note on why no drag preset exists).
 *
 * `strict` on `LazyMotion` makes the intent enforceable: importing bare
 * `motion.div` anywhere under this provider becomes a build warning, not a
 * silent bundle-size regression — every consumer is pushed toward `m.div`.
 *
 * Deliberately the only thing this file does. Mounted once in app/layout.tsx
 * alongside AstryxThemeProvider — same pattern, same reasoning: a small
 * client wrapper around Server Component children, not a broad client
 * conversion of the root layout.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
