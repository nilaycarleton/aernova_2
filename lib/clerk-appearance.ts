/**
 * Focused Entry mode's theming for Clerk's hosted <SignIn>/<SignUp>. Reads
 * the same semantic tokens as every other authenticated surface (see
 * app/globals.css) via CSS custom properties, so it flips with light/dark
 * automatically instead of needing its own copy. `colorPrimary` is
 * `--color-action` — the app's real primary-action token (ink/ground
 * inversion) — never measurement cyan (see docs/DESIGN.md's Readout Rule).
 *
 * Only `variables` is set. No `elements` overrides: Clerk's own internal
 * markup/class names are not a stable API surface to hand-style against,
 * and the variables layer already reaches color, radius, and type without
 * that risk (§59 — "prefer configuring/theming through supported APIs").
 */
// No `Appearance` type is re-exported from @clerk/nextjs's public d.ts (it
// lives in @clerk/types, not a direct dependency) — structurally checked
// instead, against <SignIn>/<SignUp>'s own `appearance` prop at the two call
// sites.
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--color-action)",
    colorBackground: "var(--color-surface-raised)",
    colorText: "var(--color-ink-primary)",
    colorTextSecondary: "var(--color-ink-secondary)",
    colorDanger: "var(--color-danger-fg)",
    colorInputBackground: "var(--color-ground)",
    colorInputText: "var(--color-ink-primary)",
    // docs/DESIGN.md's Buttons section: 6px (`{rounded.md}`) is the documented
    // control radius — not the old 12px convention the redesign superseded.
    borderRadius: "0.375rem",
    fontFamily: "var(--font-sans)",
  },
};
