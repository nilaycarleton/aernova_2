# Phase 0 Decision Record — Precision Workshop

Written record of the concrete decisions Phase 0 made, per the redesign plan's Step 14. Durable, evergreen decisions (identity, color meanings, theme priority, IA groups, motion ownership) are already approved and recorded in `docs/AERNOVA_DESIGN_REFERENCE.md` §21 — this record does not restate or reopen them. It records what Phase 0 itself decided, validated, or deferred.

## Selected concept

**Concept B — "Workbench,"** extended with Concept A's row density and the severity-dot pattern (see `docs/phase-0/03-concept-seeds.md` for the full comparison). Selected because it is the direction the redesign plan's own route-by-route guidance most directly calls for (§10.3's job-workspace split-inspector requirement) and because Phase 4's pilot slice is explicitly Dashboard + Jobs + Job workspace — the exact surface Workbench is strongest at.

## Selected/recommended typography

**IBM Plex Sans Variable**, self-hosted via `next/font`. See `docs/phase-0/02-typography-comparison.md` for the full evaluation. Rejected: Source Sans 3 Variable (close second, correct fallback if IBM Plex Sans hits an operational problem later), Geist Sans (reads too contemporary-SaaS for the "field notebook" voice), the system stack (correct baseline, cannot deliver the deliberate instrument character Precision Workshop calls for).

## Theme decision

Confirmed, not re-decided: dark is the authored home base, light is a first-class, simultaneously-designed outdoor-capable mode. The Phase 0 prototype and typography fixture were both reviewed in both themes (live, via the real `ThemeToggle`) rather than dark-only. No new theme mechanism was introduced — the prototype inherits the real `app/globals.css` token flip exactly as production does.

## Material approach and containment rules

Confirmed via the concept seeds and prototype: fewer, stronger containers (structured rows/tables/split panes) over nested cards; the two-layer tonal system (ground → raised → lifted) as the entire elevation vocabulary; a severity dot + text pattern for status/attention rows instead of colored border stripes (the latter was actually attempted and rejected mid-session — see below). Cards reserved for the job-list/inspector split, not for every dashboard section.

## Navigation direction

Confirmed via the prototype: stable grouped nav (Work / Pipeline / Relationships / Business / Company) with a global `+ Create` command, matching `docs/AERNOVA_DESIGN_REFERENCE.md` §9. Role-adaptive by *absence*, not disabling — mirrored from the real `components/dashboard/app-sidebar.tsx` precedent rather than invented fresh.

## Prototype interaction principles (validated live, not just specified)

- Symmetric sheet entry/exit, sourced from the trigger's own edge (mobile inspector slides from the bottom, the mobile nav drawer slides from the left where it's anchored).
- Reliable keyboard focus: initial focus moves into an opened sheet, and — after a real bug was caught and fixed during this session — focus reliably returns to the trigger control on close, not just on the happy path.
- Visible focus rings on every interactive control, confirmed via a live six-Tab traversal on the dashboard.
- Every CSS transition carries a `motion-reduce:` fallback that resolves instantly (verified in code; OS-level toggle-and-observe remains a manual follow-up — see the baseline report).
- No Motion or Anime.js — CSS transitions and React state only, consistent with the brief's scoping that Motion is a Phase 1 runtime decision, not a Phase 0 one.

## Brand constraints

Unresolved input, explicitly not fabricated: no original vector or transparent master of the Aernova symbol+wordmark exists anywhere in the repository or locally. The 500px reference JPEG was used only as a direct image reference (never traced, never retyped) in supporting materials; no Phase 0 artifact invents a substitute wordmark. Production brand surfaces (`app/icon.png`, `lib/brand-og-image.tsx`, etc.) still use an older placeholder "A" tile, unchanged — Phase 0 did not touch them, per scope. Full production asset generation remains blocked pending the original master (see the baseline report's brand asset audit).

## Mobile strategy

Confirmed and given new evidence: field-critical routes get the most aggressive mobile treatment. This was previously a stated principle; Phase 0 gave it a concrete, measured justification — a live screenshot showing the *current production shell* requires scrolling past ~13 sidebar items before any `/dashboard` or `/today` content is visible at 390px width, while the prototype's bottom-nav treatment shows real content immediately. This is now documented evidence for why Phase 2's mobile shell work is not optional polish.

## Rejected concept alternatives

- **Concept A ("Ledger")** — rejected as the primary shell because icon-only nav has a real memorability cost for infrequent/lower-frequency roles (Sales, occasional Crew desktop use) and doesn't collapse gracefully below 768px. Its density discipline is preserved as the *collapsed* state of the same nav system, not discarded — see the concept-seeds doc.
- **Concept C ("Dossier")** — rejected as the primary shell because its pacing costs too much scrolling for Office/Estimator's actual daily multi-job-comparison task. Preserved as the correct model for a future Owner daily-digest view and confirmed consistent with the already-approved public-document "Document mode."

## Rejected font alternatives and reasons

See `docs/phase-0/02-typography-comparison.md` — Source Sans 3 Variable (close second, tone slightly more neutral than the brand wants), Geist Sans (tone too contemporary-SaaS), system stack (correct but cannot deliver deliberate character).

## A real pattern decision made mid-session, not just planned

While building Concept B, a colored `border-l-2` accent stripe on action rows was flagged as a defect by both the Impeccable design hook (`side-tab` rule — "the most recognizable tell of AI-generated UIs") and independently by `docs/DESIGN.md`'s own pre-existing "One Rule Rule" (no colored border stripes; all structural separation uses the hairline at one weight). It was replaced with the severity-dot pattern already used in Concept A. This is recorded because it should carry forward as the real Phase 3 "action row" primitive's default treatment, not be re-litigated per component.

## Unresolved inputs

1. **Original Aernova vector/transparent master** — still missing; blocks full production asset generation (symbol SVG, lockups, favicon/app-icon exports, OG composition). Not obtainable from the repository or local project assets.
2. **Bundle/Core Web Vitals tooling** — no Lighthouse or `@next/bundle-analyzer` is installed. Phase 8's plan to compare bundle/CWV "against Phase 0" needs one of these added before that comparison is possible; Phase 0's own baseline is therefore build-output-and-manual-inspection only, not a CWV measurement.
3. **Real Safari/iOS/Android verification** — genuinely not available in this environment (see the baseline report); remains a manual follow-up, most urgently for iPhone Safari given its #1 priority ranking.
4. **`.impeccable/design.json` staleness** — the sidecar is older than `DESIGN.md`; refreshing it means running `/impeccable document`, which regenerates `DESIGN.md` itself from code and was deliberately not run in Phase 0 to avoid overwriting the reviewed, Precision-Workshop-pending document before Phase 1 exists to redo it properly. Phase 1 should either refresh the sidecar immediately after rewriting `DESIGN.md`, or accept the staleness until then.

## Explicitly deferred to Phase 1+

Everything in `docs/PREMIUM_UI_REDESIGN_PLAN.md`'s Phase 1 (token architecture, `app/globals.css`, `lib/astryx/theme.ts` rebuild), Phase 2 (production shell/nav replacement), and beyond. Specifically not decided or attempted here: exact refined OKLCH token values for canvas/surface/ink beyond what already exists (the plan calls exact values "a Phase 0 prototype decision," but Phase 0's prototype deliberately reused the existing token values rather than re-deriving new ones — see the redesign brief's motion-philosophy/token scoping note — because the existing palette already satisfies the approved semantic intentions in `docs/AERNOVA_DESIGN_REFERENCE.md` §6.3's table, and the diagnosed problems are compositional, not chromatic); Motion library adoption; Astryx `SideNav`/`AppShell` swizzling; Lucide icon adoption; the resolved-action-color rule fix in `docs/DESIGN.md` itself (confirmed real in the baseline audit, not fixed here).
