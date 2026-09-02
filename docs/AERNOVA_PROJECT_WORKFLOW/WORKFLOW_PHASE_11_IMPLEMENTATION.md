# Phase 11 — Workflow Customization v1: Implementation Summary

Implements `AERNOVA_PROJECT_WORKFLOW.md` §14.6, §15, §16, §17, §23, §25 Phase 11 only. Branch: `feature/astryx-integration`. Phases 1–10 (confirmed complete and approved) were re-read from `WORKFLOW_PHASE_1_IMPLEMENTATION.md` through `_10_` before starting; nothing here touches the 3D model viewer, roof detection, measurement tools, photogrammetry rendering, the quote builder, or Phase 1–10 code beyond the one integration point the job page needs and the pre-existing `JobStatusStepper`/`updateJobStatusAction` this phase is specifically about.

Core product rule, unchanged from the plan: one shared `JobStatus` enum stays the backend's only source of truth for where a job actually is. `CompanyWorkflowStage`/`WorkflowTemplate` are a display/visibility layer read at render time — never a second state machine, never something `updateJobStatusAction` consults.

`graphify` was queried against the existing graph (BFS from `JobStatusStepper()`/`updateJobStatusAction()`/`OnboardingPage()`/`SettingsPage()`) before implementation — confirmed the exact call graph already understood from direct code reading: `resolveCompanyContext()` → `provisionCompanyCatalog()` for new signups, `completeOnboardingAction()` → `resetCompanyCatalog()`, `requirePageCapability()` gating both `SettingsPage()` and `JobsPage()`, `JobStatusStepper()` → `nextStatus()`. No surprises, no additional call sites needed touching. `impeccable audit` was run against the five new/changed UI files; it found two real issues, both fixed: the onboarding template-picker's selected-card styling didn't match the codebase's own established `border-instrument-bright/70 bg-instrument-bright/10` selected-state convention (used in `imagery-upload-form.tsx`, `comparison-create-form.tsx`, `inspection-photo-input.tsx`) — it used a different, one-off combo — and the template-picker's radio group was missing the `<fieldset>`/`sr-only <legend>` wrapper the codebase's one other radio group (`pre-construction-checklist-panel.tsx`) already establishes as the accessible pattern. Both fixed to match precedent exactly.

## Files changed

### Schema
| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `model CompanyWorkflowStage` and `model WorkflowTemplate`, exactly per §14.6. Added `workflowStages CompanyWorkflowStage[]` to `Company`. |

### New
| File | Purpose |
|---|---|
| `lib/workflow-stages.ts` | Pure display helper — `effectiveStageMeta()`, `effectiveStageFlow()`, `nextEnabledStatus()`, `parseStageOverridesJson()`. Zero Prisma dependency; joins `STATUS_META`/`STATUS_FLOW` with whatever `StageOverride[]` the caller already loaded. |
| `lib/workflow-template.ts` | The one Prisma-touching write path — `applyWorkflowTemplate(companyId, templateId)`, upserts `CompanyWorkflowStage` rows by `(companyId, jobStatus)` from a `WorkflowTemplate`'s `stagesJson`. Shared by onboarding and Settings' reset, the same way `lib/company-setup.ts`'s `provisionCompanyCatalog`/`resetCompanyCatalog` are shared today. |
| `prisma/seed-workflow-templates.ts` | Idempotent seed — 4 built-in templates, one per `Trade` enum value. |
| `components/onboarding/onboarding-form.tsx` | `OnboardingForm` — the new two-step client flow (trade/province, then workflow-template picker cards), replacing the previous one-shot inline form. |
| `components/dashboard/workflow-stages-form.tsx` | `WorkflowStagesForm` — Settings → Workflow's per-stage rename/show-hide editor. |
| `app/(dashboard)/settings/workflow/page.tsx` | The new Settings → Workflow page. |
| `app/(dashboard)/settings/workflow/actions.ts` | `saveWorkflowStagesAction`, `resetWorkflowToTemplateAction`. |
| `tests/workflow-stages.test.ts` | 12 tests covering the full helper surface. |

### Modified
| File | Change |
|---|---|
| `components/dashboard/job-status-stepper.tsx` | Reads through `effectiveStageMeta()`/`effectiveStageFlow()`/`nextEnabledStatus()` instead of `STATUS_META`/`nextStatus()` directly. New `workflowOverrides?: StageOverride[]` prop, defaulting to `[]`. Renders the exact §15 warning copy when the job's current stage is disabled. Disabled future stages are filtered out of both the pills row and the status `<select>`; a disabled *current* stage is always kept visible in both. Pill numbering is now sequential-within-what's-shown rather than the stage's raw `STATUS_FLOW` position, so hiding a stage never produces a visible gap like "2, 4, 5" in the digits. |
| `app/(dashboard)/jobs/[jobId]/page.tsx` | One small, company-scoped `prisma.companyWorkflowStage.findMany()` query (independent of the job query, no N+1), passed to `<JobStatusStepper>` as `workflowOverrides`. |
| `app/onboarding/page.tsx` | Fetches the (small, ≤4-row) `WorkflowTemplate` table, computes a plain-language "Hides: …" / "Renames: … → …" summary per template, renders `<OnboardingForm>`. |
| `app/onboarding/actions.ts` | `completeOnboardingAction` gains an optional `workflowTemplateId` field; if present, calls `applyWorkflowTemplate` after the existing trade/province/catalog write. |
| `app/(dashboard)/settings/page.tsx` | Added a small "Workflow" section linking to `/settings/workflow`, matching the existing section-card convention. |

No changes to `lib/job-status.ts` (`STATUS_FLOW`/`STATUS_META`/`nextStatus` all untouched), `app/(dashboard)/jobs/[jobId]/status-actions.ts` (`updateJobStatusAction` unchanged — no integration point was needed there), `lib/permissions.ts` (no new capability — `manageCompany` already covers this), `JobStatus`/`QuoteStatus`/`InvoiceStatus`/`RequestStatus`/`WarrantyStatus`, or any Phase 1–10 file.

## Schema changes

Additive only; `@@map("Project")` and `@@map("Proposal")` confirmed untouched. `JobStatus` untouched — no new values, no removed values.

```prisma
model CompanyWorkflowStage {
  id        String    @id @default(cuid())
  companyId String
  jobStatus JobStatus
  label     String?
  isEnabled Boolean   @default(true)
  sortOrder Int       @default(0)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  company   Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  @@unique([companyId, jobStatus])
}

model WorkflowTemplate {
  id         String @id @default(cuid())
  trade      Trade
  name       String
  stagesJson Json
  @@unique([trade, name])
}
```

## Migration

`20260812160805_add_workflow_customization` — applied via `npx prisma migrate dev`. Purely additive: 2 `CREATE TABLE`s, 2 unique indexes, 1 foreign key (`CompanyWorkflowStage.companyId → Company`, `onDelete: Cascade`). No data migration, no backfill. Existing companies with no `CompanyWorkflowStage` rows render every stage exactly as before — verified live (see Manual test notes).

## Seed / template behavior

4 built-in templates, one per `Trade` enum value (`ROOFING`, `PLUMBING`, `LAWN_CARE`, `GENERAL`). `Trade` is a closed four-value enum with `GENERAL` as `Company.trade`'s own default, so `GENERAL` already *is* the generic-fallback trade — there's no separate fifth "generic" template to seed.

`stagesJson` is `STATUS_FLOW`'s real order verbatim, each entry `{ jobStatus, label, isEnabled }`:

| Template | Hides | Renames |
|---|---|---|
| Roofing (default) | nothing | nothing — matches today's labels exactly |
| Plumbing (default) | Processing | Ready for quote → Ready to price |
| Lawn Care (default) | Processing | Ready for quote → Ready to price |
| General Contractor (default) | Processing | Ready for quote → Ready to price |

`PROCESSING` ("Building the 3D model and extracting roof measurements") is roofing's photogrammetry step; every non-roofing template disables it, per §15's instruction. The one relabel applied to all three non-roofing templates is taken directly from §15's own illustrative example — "a plumbing company can call `READY_FOR_QUOTE` 'Ready to Price'." Seed run twice: first run created 4, second run created 0/4-already-existed, confirming idempotency.

**Known v1 limitation, not a bug:** `CompanyWorkflowStage` has no `description` field (matches the schema exactly as specified in §14.6) — a renamed stage's underlying `STATUS_META` description still renders as-is. A plumbing company that hides Processing never sees its roofing-flavored description at all, but a stage like Inspection ("Capture drone imagery and photos, and log any roof issues") keeps that description under any custom label, since only the label is customizable in v1. This is a real, inherited limitation of the given schema shape, not something this seed script or the helper can fix without adding a field the plan didn't ask for.

## Onboarding picker behavior

`OnboardingForm` is a two-step client flow inside one `<form>` — step 1 (trade + province, unchanged fields) stays mounted but visually hidden (`className="hidden"`, not unmounted) while step 2 shows, so both steps' values submit together in one `completeOnboardingAction` call at the end. Step 2 shows radio-styled cards for the selected trade's templates (v1: exactly one per trade), pre-selects the trade's own template, and offers an explicit "Start with the default" (skip) option. Choosing a template writes `CompanyWorkflowStage` rows via `applyWorkflowTemplate`; skipping leaves the company with zero rows, which — per the additive-migration guarantee — renders identically to picking a template that changes nothing. No `Job.status` is touched, since a brand-new company has no jobs yet.

## Settings → Workflow behavior

Gated by `requirePageCapability("manageCompany")` — the same office-tier (OWNER + ADMIN) gate the rest of Settings already uses; no new capability, and CREW (whose only grants are `completeVisit`/`submitFieldEvidence`) never reaches this route regardless of URL guessing, since the page redirects rather than rendering anything. Shows all 8 `STATUS_FLOW` stages in fixed order, each a checkbox labeled "Shown" (never "disabled" or "delete" in the visible copy) plus a text input (`placeholder` = the default label, blank = "use the default"). One "Save changes" submits all 8 rows in a single transaction via `saveWorkflowStagesAction`. A separate "Start over with a template" section — small, confirmed via `ConfirmSubmit` (same pattern as the existing "Reset starter price list & tax rates" section) — lists the company's own trade's template(s) and reuses `applyWorkflowTemplate`. The page header states once, up front, that hiding a stage "never touches a job already sitting in it," so individual rows don't need to repeat it.

## `effectiveStageMeta()` behavior

`lib/workflow-stages.ts` — zero Prisma dependency, fully unit-tested without a database (matches this codebase's established pure-helper doctrine). `effectiveStageMeta(status, overrides, currentStatus?)` returns `{ status, label, defaultLabel, description, badge, nextStep, advanceLabel, isEnabled, isCurrentDisabled }`. A blank or `null` override label falls back to `STATUS_META`'s own label (never an empty string). `isCurrentDisabled` is `true` only when `currentStatus === status && !isEnabled` — a distinct fact from `isEnabled` alone, exactly as §17 specifies. `effectiveStageFlow()` returns all 8 `STATUS_FLOW` entries joined in order. `nextEnabledStatus()` walks forward from a given status and returns the first enabled one, skipping any disabled stages — independent of whether the starting status itself is enabled.

## `JobStatusStepper` integration

Custom labels render everywhere `STATUS_META` used to be read directly: header title/description, the smart advance button (still uses the *current* stage's own `advanceLabel`, same as before — only the click target changed, from `nextStatus()` to `nextEnabledStatus()`), the status `<select>`, and the pills row. Disabled future stages are filtered from both the `<select>` and the pills; a disabled *current* stage is force-included in both regardless, so a job never loses visibility into where it actually is. `ARCHIVED` is always offered in the `<select>` (it's a terminal side-state outside `STATUS_FLOW`, not part of the customizable set) so the owner is never blocked from archiving a job even if every other forward stage is somehow disabled. `updateJobStatusAction` itself is completely unchanged — it still accepts any valid `JobStatus` and still records `STATUS_CHANGED` the same way, verified live (see below). Its activity-log description uses `STATUS_META`'s default label, not the company's custom one — an intentional scope boundary matching the instruction not to touch `status-actions.ts` beyond what's required; a future phase could thread custom labels into the timeline description if wanted, but Phase 11 didn't need to touch that file at all.

## Disabled current-stage warning behavior

Renders the exact copy specified: *"This stage is disabled for future jobs. Move this job to the next active stage when ready."* — styled with the same `border-caution/30 bg-caution/5`/`text-caution-fg` combo already established in `additional-work-panel.tsx`. Live-verified end to end (see Manual test notes): moving a job into Processing while it's enabled, then disabling Processing from Settings, correctly leaves that one job showing "Processing" as its real status with the warning banner, while the pills/select for every *other* job (and every future job) simply never offer Processing at all. Clicking the smart advance button from the disabled current stage correctly skips straight to the next enabled stage (`READY_FOR_QUOTE` in this test), after which the warning disappears and Processing vanishes from that job's own pills row too, since it's no longer current.

## Validation results

- `npx tsc --noEmit -p .` — clean.
- `npm run lint` — 0 errors, 26 warnings (all pre-existing, unrelated to Phase 11 files).
- `npm test` — 434 tests, 432 pass, 2 fail. Both failures are the same pre-existing, unrelated baseline noted in every prior phase (`tests/action-guards.test.ts`: a bare company check in `notifications-actions.ts`; `tests/permissions.test.ts`: crew's `submitFieldEvidence` capability). No new failures.
- `npm run build` — succeeds; `/settings/workflow` registered as a new dynamic route alongside the rest of Settings.

## Manual test notes (live, against the dev database)

- **Default fallback**: with zero `CompanyWorkflowStage` rows, "1550 Gilles St" (In progress) rendered all 8 stages with default labels and correct 1–8 numbering — pixel-identical to pre-Phase-11 behavior.
- **Settings save**: disabled Processing and renamed "Ready for quote" → "Ready to price" from `/settings/workflow`; saved successfully, "Saved" button state shown.
- **Stepper reflects custom labels/hidden stages**: reopened "1550 Gilles St" — Processing gone from the pills entirely, "Ready to price" shown in its place, remaining stages renumbered 1–7 with no gap.
- **Disabled current-stage warning**: re-enabled Processing, moved "36 wetherby" (a job at Inspection) into Processing via "Send to processing," then disabled Processing again. Reopened the job: title/pills still correctly showed "Processing" as the real current stage, and the exact warning copy rendered in a caution-styled banner.
- **Smart advance button past a disabled current stage**: clicked "Measurements ready" (Processing's own advance label) from the disabled-current state — job moved straight to "Ready to price" (skipping the disabled stage correctly), warning disappeared, Processing vanished from the pills since it was no longer current.
- **`updateJobStatusAction` / `STATUS_CHANGED`**: dashboard "Recent activity" showed "Moved to processing" and "Moved to ready for quote" for the moves above — activity recording confirmed unchanged.
- **Onboarding, full flow**: temporarily cleared `onboardedAt` on the dev company (reversible test, restored afterward — see below) and visited `/onboarding`. Step 1 (trade/province) rendered unchanged. Picked Plumbing + Ontario, clicked Continue — step 2 correctly showed "Plumbing (default)" pre-selected with "Hides: Processing" / "Renames: Ready for quote → Ready to price," plus a "Start with the default" fallback option. Clicked "Finish setup" — redirected to `/dashboard` cleanly. Verified directly in the database: `Company.trade` set to `PLUMBING`, `onboardedAt` set, and all 8 `CompanyWorkflowStage` rows written exactly matching the Plumbing template (Processing disabled, Ready for quote renamed).
- **Onboarding redirect for an already-onboarded company**: visiting `/onboarding` before/after the above test correctly redirected to `/dashboard` without error.
- **Test data restored**: after verifying the onboarding write, the dev company's `trade`/`onboardedAt` were restored to their original values, its `CompanyWorkflowStage` rows deleted (back to zero, matching its pre-test state), and "36 wetherby"'s job status reverted to `INSPECTION`. Reloaded both jobs afterward to confirm the pristine default state renders exactly as before any of this phase's testing began.
- **No drag-and-drop / custom-stage UI**: confirmed by inspection — `sortOrder` is written by the server action from array position only, never read from a form field; there is no reorder control anywhere in the new UI.
- **Dashboard action center**: not implemented — confirmed out of scope for Phase 11, deferred to Phase 12 per the plan.
- **No raw enum names**: verified live (every label shown was plain language) and by a dedicated unit test (`no raw enum name ever appears where a label should render`).
- **No console errors**: checked on the job page and the Settings → Workflow page after each interaction; none found.
- **Existing Phase 1–10 flows**: quality check, pre-construction checklist, progress tracking, sales/financial mini-cards, financial completion panel, and warranty panel all rendered and behaved normally on the same job pages exercised during this phase's testing — no regressions observed.

## Deferred items

- **Drag-and-drop stage reordering** — explicitly Phase 13 per §15/§25; `sortOrder` exists in the schema for forward compatibility only, never user-editable in v1.
- **Genuinely custom (non-`JobStatus`) stages** — explicitly Phase 13; v1 is show/hide/rename of the fixed `STATUS_FLOW` list only.
- **Dashboard action-center item for jobs stuck in a disabled stage** — explicitly Phase 12 per the plan; the job-page warning (this phase) is the only surface in Phase 11.
- **Activity-log `STATUS_CHANGED` descriptions using a company's custom labels** — not required by the plan and not implemented; `status-actions.ts` was deliberately left untouched, so timeline entries still read the default `STATUS_META` label even when a company has renamed that stage. A small, real future improvement, not a Phase 11 gap per the instructions given.
- **Per-company `description` customization** — the schema `CompanyWorkflowStage` provides has no `description` field, so a renamed stage still shows its default (sometimes roofing-flavored) description text underneath. Inherent to the exact schema specified in §14.6, not something Phase 11 can address without widening it.

Phase 11 complete. Stopping here per instructions — waiting for approval before starting Phase 12.
