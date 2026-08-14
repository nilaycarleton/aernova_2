# Phase 1 — Foundations: Implementation Summary

Implements `docs/AERNOVA_PROJECT_WORKFLOW.md` §25 Phase 1 only. Branch: `feature/astryx-integration` (confirmed via `git branch --show-current` before starting — not `main`).

## Files changed

| File | Change |
|---|---|
| `prisma/schema.prisma` | Added 11 new `ActivityKind` enum values (§13), with doc comments naming which later phase writes each one. |
| `prisma/migrations/20260811171244_add_workflow_activity_kinds/migration.sql` | New migration — 11× `ALTER TYPE "ActivityKind" ADD VALUE`. |
| `app/(dashboard)/jobs/[jobId]/status-actions.ts` | `updateJobStatusAction` now records `ActivityKind.STATUS_CHANGED` (it didn't before). |
| `components/public/document-brand.tsx` | **New.** Shared `DocumentBrand` component — logo-or-name header slot, reused by both public document pages (and by future Warranty/Change-Order pages per §14.7's "one placement, one rule" instruction). |
| `app/(public)/q/[token]/page.tsx` | Header now renders `<DocumentBrand>` instead of a bare `<p>` for the company name. |
| `app/(public)/i/[token]/page.tsx` | Same swap, invoice page. |

No other files were touched. In particular: `components/dashboard/measure-viewer.tsx`, `components/public/hub-model-viewer.tsx`, roof detection, quote builder, and photogrammetry code are untouched, per the instruction not to touch them.

## Schema changes

Additive only, as required:

```prisma
enum ActivityKind {
  // ...existing values, unchanged...
  CHANGE_ORDER_CREATED
  CHANGE_ORDER_APPROVED
  ADDITIONAL_WORK_INVOICED
  ADDITIONAL_WORK_HOMEOWNER_REVIEW_SENT
  ADDITIONAL_WORK_HOMEOWNER_CONFIRMED
  ADDITIONAL_WORK_OFFICE_OVERRIDE
  QUALITY_CHECK_EVIDENCE_SUBMITTED
  QUALITY_CHECK_COMPLETED
  WARRANTY_SENT
  WARRANTY_CONFIRMED
  PROGRESS_UPDATED
}
```

None of these 11 values are written anywhere yet — that's the respective feature phase's job (Phase 2, 3, 9, 10, as annotated in the schema comments). Adding them now means those phases are a normal additive migration too, not a schema change bundled with the feature, matching §13's stated intent.

`Company.logoUrl` already existed (verified, not assumed — `String?`, nullable) — no schema change needed for the logo work.

`@@map("Project")` and `@@map("Proposal")` — confirmed untouched (`grep` before and after).

## Migration

`20260811171244_add_workflow_activity_kinds` — applied via `npx prisma migrate dev --name add_workflow_activity_kinds`. Ran clean against the local dev database (Postgres on `localhost:5433`), regenerated the Prisma client. Pure `ALTER TYPE ... ADD VALUE` — no data migration, no backfill, nullable-safe by construction (it's an enum, not a column).

## What was implemented

1. **New `ActivityKind` values** (§13) — see schema changes above.
2. **`STATUS_CHANGED` logging in `updateJobStatusAction`.** Confirmed first (it did not record this — `grep` for `STATUS_CHANGED` across the repo found it only in `lib/activity.ts`'s enum/switch, never written). Added:
   - A `prisma.job.findUnique` read for the job's current status *before* the update, so `from` is known.
   - `recordActivity({ kind: ActivityKind.STATUS_CHANGED, meta: { from, to } })` after the update and the existing `syncClientStatusForJob` call, using `STATUS_META[status].label` for both — human-readable labels, never raw enum names on the timeline, matching this file's own existing doctrine ("Enum names never reach a screen").
   - Guarded on `previousStatus !== status`, so re-confirming the same stage (or any no-op call) doesn't write a "Moved to X" line that isn't true. `describeActivity()`'s existing `STATUS_CHANGED` case (`meta.to ? "Moved to ${to}" : "Stage changed"`) needed no changes — it already expected exactly this shape.
3. **`Company.logoUrl` on `/q/[token]` and `/i/[token]`** (§14.7, decisions 21/26/31/36).
   - New `DocumentBrand` component: renders the logo when `logoUrl` is set, the company name (in the exact prior styling — `text-lg font-semibold text-paper-ink`) when it isn't. Built as a shared component rather than duplicated inline, because the plan explicitly says this same placement rule applies to every future customer-facing document (Warranty, Change Order, Additional Work review) — so Phase 10/2 can reuse it directly instead of recreating the same markup a third and fourth time.
   - Sizing: `max-h-12` (48px, the stated upper bound of "~40–48px") and `max-w-[200px]` (within the stated "~160–220px" range), both as *caps* — `w-auto h-auto` so the image is never forced to a fixed box and never upscaled past its natural size, `object-contain` per the plan's explicit instruction.
   - No wrapping box, no background class of any kind — the leftover space inside the (max-)bounds is just the page's own background, satisfying "transparent by default, never a neutral tile."
   - Placement: same top-left header slot the company name already occupied; nothing else in the header (phone number, business number, the paid/status badge) moved.

## What was intentionally deferred

Everything outside Phase 1's explicit scope, per the instruction and per §25:

- Change orders and Additional Work / Billable Add-On (Phase 2) — no `ChangeOrder`/`ChangeOrderLineItem` models, no direct-invoice action, no `billableAddOnThresholdCents`, no `AddOnReviewOverrideReason`.
- Quality check split (Phase 3) — no `QualityCheck` model changes, no `submitFieldEvidence`/`completeQualityCheck` capabilities.
- Pre-construction checklist (Phase 4), estimate summary panel (Phase 5), `Contacted/Qualified` pipeline stage (Phase 6), sales/financial mini-cards (Phase 7), financial completion panel (Phase 8).
- Progress tracking (Phase 9) — no `Job.progressState`/`progressPercent` columns.
- Warranty (Phase 10) — no `Warranty`/`WarrantyTemplate` models, no `/w/[token]` route.
- Workflow customization (Phase 11) — no `CompanyWorkflowStage`/`WorkflowTemplate` models.
- Dashboard action center (Phase 12).
- The `describeActivity()` switch was **not** extended with cases for the 11 new `ActivityKind` values. Writing a meaningful timeline sentence for each requires the `ActivityMeta` shape their producing feature will actually use (e.g. `overrideReason`/`overrideNote` for `ADDITIONAL_WORK_OFFICE_OVERRIDE`), which doesn't exist yet — those belong to Phases 2/3/9/10 alongside the code that writes them. Until then they fall through to the existing `default: return "Something happened"` case, which is correct and harmless since nothing produces these events yet.
- The pre-existing uncommitted working-tree state noted in the plan's §23 (`invoices/page.tsx`/`quotes/page.tsx` edits, the new table components, the `docs/` move) was left exactly as found — not part of this plan, not touched by it.

## Validation results

- `npm run lint` — **0 errors**, 26 pre-existing warnings (all `<img>`-vs-`next/image` and unused-var warnings already present on `main`/this branch before this change, in files this pass didn't touch, plus one new `<img>` warning in `document-brand.tsx` that matches the codebase's existing, established pattern for rendering `Company.logoUrl` elsewhere, e.g. `components/dashboard/company-logo-upload.tsx`).
- `npm run typecheck` — no such script exists in `package.json`; ran `npx tsc --noEmit -p .` directly per the "if available" instruction. Clean, zero errors.
- `npm run build` — succeeds. All 34 routes generated, including `/q/[token]` and `/i/[token]`. The only error-looking output is an unrelated, pre-existing Sentry sourcemap-upload rejection (`SENTRY_AUTH_TOKEN` invalid) — `next.config.ts`'s own `errorHandler` catches and explains it, and it doesn't fail the build or affect the bundle.
- **Live-rendered verification** (not just typecheck): temporarily set a real, self-origin-served image as a test `Company.logoUrl` on the dev database's one company, fetched the rendered `/q/[token]` HTML, and confirmed the exact expected markup:
  ```html
  <img src="/uploads/…" alt="…" class="block h-auto max-h-12 w-auto max-w-[200px] object-contain"/>
  ```
  Then reverted `logoUrl` to `null` and re-fetched, confirming the fallback:
  ```html
  <p class="text-lg font-semibold text-paper-ink">Nilay Sorathia's Company</p>
  ```
  Dev database left exactly as found (`logoUrl` reverted to `null`) once verification was done. The invoice page (`/i/[token]`) was not separately live-verified — no invoice in the dev database currently has a `shareToken` — but it uses the identical `<DocumentBrand>` component and integration pattern, already covered by the build/typecheck pass.

## Stop point

Phase 1 complete. Waiting for approval before starting Phase 2 (Change Orders + Additional Work / Billable Add-On).
