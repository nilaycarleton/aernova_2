# Phase 13 — Visual Workflow Builder: Implementation Plan

**Planning pass only. No production code, schema, or UI changed in this pass — this document is the only artifact.** Implements the planning instructions in `AERNOVA_PROJECT_WORKFLOW.md` §14.6, §15, §16, §17, §23, §25 Phase 13. Phases 1–12 (complete and approved) are unmodified; nothing here touches the 3D model viewer, roof detection, measurement tools, photogrammetry rendering, or quote-builder rendering.

## Executive summary

Phase 11 already gives every company a real customization experience — pick a trade template, rename stages, hide stages — without touching `JobStatus`. Phase 12 layered a dashboard/jobs-list attention surface on top, also without touching `JobStatus`. Both were deliberately safe: `CompanyWorkflowStage` is a display/visibility join, never a second source of truth for where a job is.

Phase 13, as named in the plan (drag-and-drop reordering **and** genuinely custom stages), is two very different pieces of work wearing one name:

- **Reordering the fixed 8-stage list** is a safe, additive UI feature. `CompanyWorkflowStage.sortOrder` already exists in the schema for exactly this, unused since Phase 11 shipped. It needs no migration, no change to `Job.status`, no change to `updateJobStatusAction`, and it composes cleanly with everything Phase 11/12 built.
- **Genuinely custom stages** (a company inventing a stage `JobStatus` has no value for) is not a UI feature — it is the trade-agnostic-core/`JobStatus` schema split the very first draft of this plan called out and every revision since has deferred. It touches `Job.status` (the single field nineteen other files key off of), every public document route, the dashboard Action Center, Phase 11's own disabled-stage machinery, quality-check gates, and reporting. There is no safe, small version of this.

**Recommendation:** split Phase 13 into three sub-phases — **13A** (reorder-only, safe, buildable now), **13B** (a usage-data checkpoint — a product decision gate, not code), and **13C** (the real schema split, designed in detail only if 13B's data says companies actually need it). This document designs 13A to implementation-ready detail, defines exactly what 13B needs to observe, and sketches 13C's shape and risks without writing its migration. **Nothing beyond this planning document is implemented in this pass**, per the prompt's own instruction — 13A is not built here even though it is judged safe.

---

## 1. Current-state inventory

### The shared backend enum and its fixed order
- **`JobStatus`** (Prisma enum, physical column still on the `Project`-mapped table) — `LEAD, INSPECTION, PROCESSING, READY_FOR_QUOTE, QUOTED, SCHEDULED, IN_PROGRESS, COMPLETED, ARCHIVED`. Untouched since before Phase 11; every phase's plan has explicitly forbidden changing it.
- **`STATUS_FLOW`** (`lib/job-status.ts`) — the real, fixed underlying order (`ARCHIVED` excluded — it's a terminal side-state reachable from anywhere, not part of the flow).
- **`STATUS_META`** (`lib/job-status.ts`) — per-status `{label, description, nextStep, advanceLabel, badge}`. The one and only source of default copy; `CompanyWorkflowStage` can override `label` alone.
- **`ALL_STATUSES`** — `STATUS_FLOW` + `ARCHIVED`, used by the plain job-status `<select>` on `/jobs` (unfiltered — see §2's file-impact list) and by `updateJobStatusAction`'s validity check.
- **`nextStatus()`** — the *old*, still-present linear-successor helper. `JobStatusStepper` no longer calls it directly (see below); it's retained because `ALL_STATUSES`/`STATUS_FLOW` are still read elsewhere unfiltered.

### Phase 11's display/visibility layer
- **`CompanyWorkflowStage`** (`prisma/schema.prisma`) — `{id, companyId, jobStatus, label, isEnabled, sortOrder, createdAt, updatedAt}`, `@@unique([companyId, jobStatus])`. One row per `(company, JobStatus)` a company has an opinion about; absence of a row means "default." **`sortOrder` has existed since Phase 11's migration, is written by every code path that touches this table (defaulted to array/flow position), and is never read by anything yet.** This is the load-bearing fact for Option A below.
- **`WorkflowTemplate`** — `{id, trade, name, stagesJson}`, `@@unique([trade, name])`. Seed data (`prisma/seed-workflow-templates.ts`), 4 built-in rows (one per `Trade`), each `stagesJson` an ordered `[{jobStatus, label, isEnabled}]` array — **no `sortOrder` field inside `stagesJson` itself**, since v1 templates don't reorder (see §2).
- **`lib/workflow-stages.ts`** (pure, zero Prisma) — `effectiveStageMeta(status, overrides, currentStatus?)`, `effectiveStageFlow(overrides, currentStatus?)`, `nextEnabledStatus(status, overrides)`, `parseStageOverridesJson(json)`. `effectiveStageFlow()` iterates `STATUS_FLOW` **in its fixed, hardcoded order** — this is precisely the function `sortOrder` would need to be threaded into for reordering to have any visible effect.
- **`lib/workflow-template.ts`** (Prisma-touching) — `applyWorkflowTemplate(companyId, templateId)`, upserts `CompanyWorkflowStage` rows by `(companyId, jobStatus)` from a template's `stagesJson`, writing `sortOrder` from the *template's own array index* — i.e., today `sortOrder` is always written equal to `STATUS_FLOW` position (0–7), never independently.

### The UI built on top of it
- **`components/dashboard/job-status-stepper.tsx`** — reads `effectiveStageFlow(workflowOverrides, status)`, filters to `isEnabled || status === current`, renders the pills/select in the **array order returned by `effectiveStageFlow()`** (i.e., `STATUS_FLOW` order today). The smart advance button targets `nextEnabledStatus()`. Renders the exact §15 warning copy when the current stage is disabled.
- **`components/dashboard/workflow-stages-form.tsx`** (Settings → Workflow) — one `<form>`, one row per `STATUS_FLOW` stage **in fixed order**, each a checkbox ("Shown") + text input (label). Single `saveWorkflowStagesAction` upserts all 8 rows, `sortOrder` written from loop index — never user-editable.
- **`app/(dashboard)/settings/workflow/page.tsx` / `actions.ts`** — `saveWorkflowStagesAction` (per-stage save) and `resetWorkflowToTemplateAction` (re-applies a built-in template, confirmed via `ConfirmSubmit`). Gated on `manageCompany` (office-tier), no new capability.
- **`app/onboarding/page.tsx` / `actions.ts` / `components/onboarding/onboarding-form.tsx`** — two-step client flow (trade+province, then a template-card picker pre-filtered to the chosen trade); `completeOnboardingAction` optionally calls `applyWorkflowTemplate` before redirecting.
- **`app/(dashboard)/jobs/[jobId]/page.tsx`** — one small `prisma.companyWorkflowStage.findMany({where:{companyId}})` query, passed to `<JobStatusStepper workflowOverrides={...}>`.
- **`app/(dashboard)/jobs/[jobId]/status-actions.ts`** — `updateJobStatusAction` is **completely untouched** by Phase 11/12: it validates `ALL_STATUSES.includes(status)`, writes `Job.status`, runs the quality-check completion gate, records `STATUS_CHANGED`. It has never read `CompanyWorkflowStage` and doesn't need to for 13A.

### Phase 12's read layer on top of that
- **`lib/disabled-stage-jobs.ts`** — `getDisabledStageJobs(companyId)`: finds `CompanyWorkflowStage` rows with `isEnabled: false`, finds jobs whose `status` is in that set, derives each job's **stage-entry time from the latest `STATUS_CHANGED` `ActivityEvent`** for that job (`distinct: ["jobId"], orderBy: {createdAt: "desc"}` — one query, no N+1), falling back to `Job.createdAt` for a job that's never changed status. `sortDisabledStageJobs()` (pure) implements the full §15 six-level tiebreak (stage-entry → job-created → numbered-before-unnumbered → jobNumber → title → id).
- **`lib/dashboard-action-center.ts`** — `buildActionCenterItems(facts)` (pure), one of four possible items is `{priority: "low", tone: "neutral", ...}` for `disabledStageJobCount`, linking to `/jobs?attention=disabled-workflow-stage`.
- **`app/(dashboard)/jobs/page.tsx`** — branches on `?attention=disabled-workflow-stage` to a dedicated, deliberately *unsortable* `DisabledWorkflowStageJobs` view (`components/dashboard/disabled-stage-jobs-list.tsx`) — explicitly not `JobsBrowser`, because `JobsBrowser` always re-sorts to "recently updated" on mount and would silently break the required tiebreak order.
- **`STATUS_CHANGED` activity as a stage-entry clock**: this is now load-bearing for the disabled-stage sort, not just the job timeline. `updateJobStatusAction` is the only writer, and it only logs when `previousStatus !== status` — so "latest `STATUS_CHANGED` for a job" is definitionally "when it entered its current status." Any future change to how/whether status transitions are logged must preserve this invariant, or `sortDisabledStageJobs`'s primary sort key silently degrades to the `createdAt` fallback for every job.

### Existing tests over this area
`tests/workflow-stages.test.ts` (12), `tests/disabled-stage-jobs.test.ts` (7), `tests/dashboard-action-center.test.ts` (11) — all pure-function tests, no database. No test currently exercises `sortOrder` as anything other than "always equals array position," because nothing writes it otherwise yet.

### Files Phase 13 would touch (either sub-phase)

**13A (reorder-only) touches:**
`lib/workflow-stages.ts` (respect `sortOrder` in `effectiveStageFlow()`), `app/(dashboard)/settings/workflow/actions.ts` (`saveWorkflowStagesAction` accepts an order), `components/dashboard/workflow-stages-form.tsx` (the reorder UI), `tests/workflow-stages.test.ts` (new sort-order tests). Everything else in the inventory above is read-only with respect to 13A — `job-status-stepper.tsx`, `getDisabledStageJobs()`, `buildActionCenterItems()`, `updateJobStatusAction`, `applyWorkflowTemplate()`, and the onboarding flow all already consume `effectiveStageFlow()`'s output positionally and need zero changes to keep working once it respects `sortOrder`.

**13C (true custom stages) would touch, at minimum:** `prisma/schema.prisma` (new model(s) + migration), `Job.status`'s role across the entire app, `lib/job-status.ts`, `lib/workflow-stages.ts`, `lib/workflow-template.ts`, `lib/disabled-stage-jobs.ts`, `lib/dashboard-action-center.ts`, `lib/pipeline.ts` (sales-pipeline stage classification reads `JobStatus`), `lib/quality-check.ts` (the `COMPLETED` gate), every public document route that reads or displays a job's status, `components/dashboard/job-status-stepper.tsx`, `components/dashboard/jobs-browser.tsx`, `app/(dashboard)/jobs/[jobId]/status-actions.ts`, `app/(dashboard)/jobs/page.tsx`, `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/settings/workflow/*`, `app/onboarding/*`, and every report under `lib/reports/*` that groups by job status. See §7.

---

## 2. Product boundary

Seven distinct capabilities hide under "workflow builder." They are not one feature, and they are not all the same size of change:

| Capability | What it changes | Safe extension of Phase 11? |
|---|---|---|
| **Reorder the fixed canonical stages** | Display order only — which pill/option comes before which | **Yes.** `sortOrder` already exists, already persisted, already unused. This is 13A. |
| **Rename existing stages** | `CompanyWorkflowStage.label` | **Already shipped in Phase 11.** Not part of Phase 13 at all. |
| **Hide/show existing stages** | `CompanyWorkflowStage.isEnabled` | **Already shipped in Phase 11.** Not part of Phase 13 at all. |
| **Add company-specific custom stages** | A stage with no `JobStatus` value behind it | **No.** Every consumer of "a job's stage" — the stepper, the completion gate, public documents, reports, the Action Center — currently assumes the stage *is* a `JobStatus`. A stage with nothing behind it has nowhere to store which jobs are in it. |
| **Remove custom stages** | Deleting a stage a job might currently be in | **No** — inherits the same problem as adding them, plus needs an answer to "what happens to a job whose only stage was deleted" that `JobStatus`-hiding never had to answer (a hidden `JobStatus` stage still *is* something; a deleted custom stage might not map to anything). |
| **Map custom stages to existing canonical statuses** | A company's own stage *is* one of the 8 `JobStatus` values, just relabeled/reordered/split | **Partially — this is Option B**, a real design with real tradeoffs (see §4), not a trivial extension, but it doesn't require touching `Job.status`'s type or every consumer of it. |
| **Replace canonical `JobStatus` with a company workflow-stage pointer** | `Job`'s source of truth for "where is it" becomes a per-company row, not a shared enum | **No — this is the schema split** every revision of this plan has named and deferred. This is Option C / 13C. |

The load-bearing distinction: **reordering, renaming, and hiding are all operations on the *display layer* Phase 11 already built.** They change what `effectiveStageMeta()`/`effectiveStageFlow()` return, never what `Job.status` can *be*. **Custom stages and replacing `JobStatus` are operations on the *domain model*** — they change what a job's status can be, which is a fact roughly twenty other files (quality-check gates, public documents, pipeline classification, dashboard counts, reports) currently assume is always one of 9 known values.

---

## 3. Usage data needed before implementation

Phase 11 has been live in this codebase since its own phase, but there is no telemetry/analytics pipeline anywhere in this repo today — **no tracking code exists to document as "already there," and none is added in this pass**, per the instruction. Everything below is what should be observed (via direct database queries against production once real companies are using Phase 11, or via a lightweight future instrumentation task explicitly scoped and approved on its own) before committing to 13C's schema work:

- **How many companies rename at least one stage** — `count(distinct companyId) from CompanyWorkflowStage where label is not null`, against `count(distinct companyId) from Company where onboardedAt is not null`. A rename rate near zero weakens the case for anything beyond Phase 11.
- **How many companies hide at least one stage** — same shape, `where isEnabled = false`. Distinguish "picked a non-roofing template, so `PROCESSING` was pre-hidden" (default behavior, not a signal) from "a company hid a stage *after* onboarding, via Settings → Workflow" (a real, deliberate signal) — the second needs the row's `updatedAt` to differ meaningfully from the company's `onboardedAt`.
- **How often non-roofing companies re-enable `PROCESSING`** — a `PLUMBING`/`LAWN_CARE`/`GENERAL` company explicitly turning a roofing-only stage back on is a strong, concrete signal that the trade/stage mapping itself is wrong somewhere, not that reordering is needed.
- **Whether companies request stages that don't map to an existing `JobStatus`** — this one has no query; it has to come from support/sales conversations, feature requests, or a lightweight in-app "request a stage" text field (itself a future, separately-scoped feature, not built here). This is the single most important signal for justifying 13C at all, and it's also the one piece of data a database query cannot produce.
- **Which trades request which stage names** — informs whether the answer is "add more `WorkflowTemplate` variety" (cheap, no schema change, same pattern as Warranty's Simple/Detailed variants) rather than "add custom-stage infrastructure" (expensive, schema change).
- **Whether the ask is reordering only, or genuinely new states** — a company asking "can Quoted come before Scheduled in a different order" is asking for 13A. A company asking "we need a 'Waiting on permit' stage between Scheduled and In Progress" is asking for 13C. These read identically in a feature-request inbox unless someone is specifically listening for the difference.
- **Whether disabled-current-stage jobs are common** — `count(*) from CompanyWorkflowStage where isEnabled=false` joined against jobs whose current status matches (`getDisabledStageJobs()`'s own query, aggregated across companies). If this number is consistently near zero, Phase 11's own safety net is rarely triggered, which is mildly reassuring about the current design but doesn't bear directly on whether 13C is needed.
- **Whether custom stages would need different business rules, permissions, dashboard items, or document gates** — the real cost center. Every existing gate (`lib/quality-check.ts`'s `COMPLETED` check, the Action Center's disabled-stage item, public document eligibility, `lib/pipeline.ts`'s sales-stage classification) is written against specific, named `JobStatus` values. A genuinely custom stage between two existing ones raises real questions none of Phase 11/12 had to answer: does a job in a custom stage count as "in progress" for the dashboard? Can it still be invoiced? Is a quality check required before a custom stage, same as before `COMPLETED`? These need product answers *before* schema, not after — a schema built without them will need a second migration once the answers arrive.

**How to collect this without building telemetry infrastructure right now:** everything with a "how many / how often" phrasing above is a direct SQL query against the existing `CompanyWorkflowStage`/`ActivityEvent`/`Job` tables — no new columns, no new tracking, run periodically by whoever owns the product decision. Only the "stages that don't map" and "different business rules" signals require a human conversation (support tickets, sales calls, direct user feedback) rather than a query. **No code is added in this pass for any of this.**

---

## 4. Architecture options

### Option A — Reorder-only builder over Phase 11

Let a company reorder the 8 fixed `STATUS_FLOW` stages (still can't add/remove any), on top of Phase 11's existing rename/hide.

**Schema impact:** none. `CompanyWorkflowStage.sortOrder` already exists, already has a default (`0`), already gets written (equal to array position) by every current writer. No migration.

**Implementation complexity:** low. The read side (`effectiveStageFlow()`) needs to sort by `sortOrder` instead of iterating `STATUS_FLOW` directly; the write side needs one new form field (a numeric position, or a reordered submission) per stage; the UI needs either a drag-and-drop list or (simpler, and required regardless per the accessibility guardrail) Move-up/Move-down buttons.

**Risk:** low, contingent on three things staying true, all independently verifiable and none requiring new code to check:
1. `nextEnabledStatus()` must walk stages in **display order** (`sortOrder`), not enum-declaration order, once reordering is live — today it walks `STATUS_FLOW` directly (see §6, "what actually needs to change").
2. `updateJobStatusAction`'s validity check (`ALL_STATUSES.includes(status)`) is order-independent already — reordering doesn't touch it.
3. `jobsBrowser.tsx`'s plain `<select>` (unfiltered `ALL_STATUSES`, `STATUS_META` labels only, no `workflowOverrides` passed in today) would keep rendering in enum order unless a future, separate change threads company-specific ordering into it too — **out of scope for 13A**, and not a correctness bug (that `<select>` doesn't currently reflect Phase 11 labels/hiding either — a pre-existing, documented, small gap, not something 13A needs to fix to be safe).

**What it solves:** the one concrete, named complaint the plan anticipates — "our stages are shown in an order that doesn't match how we actually talk about the job" (e.g., a company that schedules before quoting, or wants `Ready for quote` to read as the very first thing they look at each morning).

**What it does not solve:** anything in the "custom stages" row of §2's table. A company that wants a stage with no `JobStatus` behind it gets nothing new from 13A — reordering the same 8 values, however they're arranged, is still the same 8 values.

**Effect on `effectiveStageFlow()`:** its output array changes order (sorted by `sortOrder` ascending, tie-broken by `STATUS_FLOW` position for two never-touched defaults) but its *contents* — the set of `EffectiveStageMeta` objects and every field on each — are unchanged. Every caller that only cares about "is this stage enabled," "what's its label," or "is the current stage disabled" needs zero changes.

**Effect on `nextEnabledStatus()`:** needs to walk in `sortOrder` order instead of `STATUS_FLOW` order — the smart advance button should mean "the next stage in *this company's own* displayed order," not "the next stage in the enum's declaration order," once those two can differ. This is 13A's one real logic change (see §6).

**Effect on disabled-stage jobs and the Action Center:** none. `getDisabledStageJobs()` filters by `isEnabled`, sorts by stage-entry time / job-created / jobNumber / title / id — none of which are `sortOrder`. A reordered company's disabled-stage list looks identical to today's.

**Verdict: yes, this is a safe Phase 13A**, and the rest of this document designs it to implementation-ready detail without building it.

### Option B — Custom display stages mapped to canonical `JobStatus`

Let a company define its own named stage, but require every custom stage to point at exactly one existing `JobStatus` value — `Job.status` itself never changes shape.

**Possible schema shape:** something like `CompanyDisplayStage { id, companyId, jobStatus, name, sortOrder }`, many-to-one against `JobStatus`, replacing (or extending) `CompanyWorkflowStage.label` with a small list of named sub-stages per `JobStatus` instead of one label.

**How jobs would still store real `Job.status`:** unchanged — a job is still, e.g., `SCHEDULED`. The custom stage is purely which of the company's own sub-labels for `SCHEDULED` currently applies, which would need a *second* field on `Job` (or a join table) to record — `Job.status` alone can't distinguish "Scheduled — waiting on materials" from "Scheduled — crew confirmed" if a company defines both as custom stages mapped to `SCHEDULED`.

**What happens if two custom stages map to the same canonical status:** this is the option's central design problem, not an edge case — it's the whole point of offering more than one custom label per status. It requires exactly the extra field/join above, and it requires deciding whether moving between two custom stages that map to the *same* `JobStatus` still fires `STATUS_CHANGED` (arguably yes, since something meaningful happened) even though `Job.status` didn't change — which means `recordActivity()`'s `previousStatus !== status` guard (the exact mechanism Phase 12's disabled-stage sort depends on) would need to become "previous custom stage !== new custom stage," a real behavioral change to code Phase 12 explicitly load-bears on.

**Whether the smart Next button can remain reliable:** yes, but its meaning gets murkier — "next" would need to mean "next custom stage in this company's list," which might or might not also cross a `JobStatus` boundary, and the button's label (today, `STATUS_META[currentStatus].advanceLabel`, e.g. "Mark quoted") would need a custom-stage-aware replacement, since "Mark quoted" doesn't make sense as the label for moving between two custom sub-stages of `SCHEDULED`.

**How activity/timeline would read:** `STATUS_CHANGED`'s `meta.to`/`meta.from` currently store `STATUS_META[status].label` (the *default* label, frozen at write time — a deliberate Phase 1 choice, confirmed in Phase 11's own implementation notes as a known gap: custom labels never appear in the timeline). Option B would need to decide whether the timeline should now show the *custom sub-stage* name instead, which is a real, visible copy change to a feature (the job timeline) no phase since Phase 1 has touched.

**How dashboard filters would work:** `getDisabledStageJobs()`'s "which jobs are in a disabled stage" query currently reads `CompanyWorkflowStage.isEnabled` keyed on `jobStatus` alone. If a company can disable one custom sub-stage of `SCHEDULED` while keeping another enabled, "disabled" stops being a fact about a `JobStatus` and becomes a fact about a `(JobStatus, customStageId)` pair — the query, the sort, and the Action Center item's count all need to key on the finer-grained identity instead.

**How disabled-stage jobs would work:** same problem one level down — a job's "current custom stage" would need its own column (see above), and Phase 11's disabled-*current*-stage warning (`isCurrentDisabled`) would need to compare against that column instead of `Job.status` directly.

**Why this may confuse users:** this is the option's real weakness, not just an implementation detail. A homeowner-facing document, a report grouped by `JobStatus`, and the dashboard would all still reason in terms of the 8 canonical statuses, while the job page shows a company's own finer-grained custom label — two different, only-sometimes-aligned vocabularies for "where is this job," visible in different places at different times. Aernova's own design principle (§0/§15's "Aernova adapts to the business, not the other way around," and the calm/plain-language brand voice) argues for *one* word per stage the owner sees everywhere, which Phase 11's rename-in-place already delivers. Option B reintroduces the two-vocabulary problem Phase 11 was specifically designed to avoid, in exchange for finer granularity nothing in the current usage-data gate (§3) has yet shown is actually wanted.

### Option C — True workflow-stage engine / schema split

A real per-company workflow-stage model; each job stores its current stage by id (or a nullable pointer into that model), with `JobStatus` preserved, derived, or retired as a coarse cross-product category.

**Possible schema shape:**
```prisma
model CompanyStage {
  id           String    @id @default(cuid())
  companyId    String
  name         String
  /// The coarse bucket this stage counts as, for every cross-product
  /// consumer that still needs to reason in the old 9-value vocabulary
  /// (reports, pipeline classification, public documents, quality-check
  /// gate eligibility). Every custom stage still has to answer "which of
  /// these am I," the same constraint Option B has, just applied once per
  /// stage definition instead of once per job.
  category     JobStatus
  sortOrder    Int       @default(0)
  isTerminal   Boolean   @default(false) // replaces the ARCHIVED special-case
  company      Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  jobs         Job[]
}
```
`Job` gains `currentStageId String?` (nullable through the migration window, required after backfill) alongside the existing `status JobStatus` column.

**Migration path from `Job.status`:** additive first — add `CompanyStage` and `Job.currentStageId` as nullable, ship read paths that fall back to `Job.status`/`STATUS_META` when `currentStageId` is null, exactly the "absence of a row means default" doctrine Phase 11 already established for `CompanyWorkflowStage`. Only after every company has been backfilled (see next) would `Job.status` potentially become a derived/generated column instead of a real one — and even then, keeping it as a real, kept-in-sync column is very likely safer than deriving it, given how many places read it directly today.

**How old jobs are backfilled:** for each company, materialize one `CompanyStage` row per `JobStatus` value it currently has enabled (i.e., literally migrate each `CompanyWorkflowStage` row into a `CompanyStage` row with `category` set to its own `jobStatus`), then set every `Job.currentStageId` to the `CompanyStage` row matching its current `Job.status`. This is a mechanical, data-preserving migration *if* no company has customized beyond Phase 11's rename/hide/reorder by the time it runs — which is exactly why 13B (the usage-data gate) needs to run first: it tells you whether that mechanical backfill is still sufficient or whether real production data already contains states this simple mapping can't represent.

**How public documents, invoices, quality checks, warranties, dashboard, requests, pipeline, progress, and `/today` would keep working:** every one of these currently reads `Job.status` (a `JobStatus` value) directly — the quality-check `COMPLETED` gate compares against the enum, `lib/pipeline.ts`'s `stageForJob()` switches on it, the Action Center and `getDisabledStageJobs()` filter by it, public quote/invoice/warranty pages don't read job status at all (they read their own document's status) so they're actually unaffected, and `/today`'s crew view reads `Visit`, not `Job.status`, so it's also largely insulated. The two real risk surfaces are **`lib/quality-check.ts`'s completion gate** (which must keep meaning "the job reached the terminal stage," however staging is now represented) and **`lib/pipeline.ts`'s sales-stage classification** (which needs every custom stage's `category` field to resolve correctly, or the sales pipeline silently miscounts jobs). Keeping `Job.status` as a real, always-in-sync column — updated whenever `currentStageId` changes, derived from the new stage's `category` — is what lets all of these keep working entirely unmodified, which is the strongest argument for *not* trying to retire `Job.status` even after the split ships.

**Whether `Job.status` remains canonical, becomes derived, or is replaced:** recommend **kept as a real column, always written in lockstep with `currentStageId`** (never purely derived/generated in Postgres, never dropped) — every consumer named above gets to stay exactly as it is today, and the blast radius of the whole migration shrinks to "one new table, one new nullable column, one write path that now sets two fields instead of one."

**How `STATUS_CHANGED` activity evolves:** would need a `stageId`/`stageName` pair alongside (or instead of) the current `from`/`to` label strings, so the timeline can read a custom stage's real name rather than falling back to its `category`'s default label. This is additive to `ActivityMeta` (a new optional field), not a breaking change to existing events.

**How disabled-stage filtering evolves:** `CompanyStage` would need its own `isEnabled` (or the concept moves from "is this `JobStatus` disabled" to "is this `CompanyStage` disabled" — the more natural fit once stages are first-class rows rather than enum-keyed overrides). `getDisabledStageJobs()`'s query shape stays structurally the same (find disabled stage ids → find jobs pointing at them → derive stage-entry time from the latest relevant activity event) — this is the part of Phase 12 that survives the split with the least conceptual change, because it was already written against "rows," not against the enum directly.

**How company templates evolve:** `WorkflowTemplate.stagesJson` would need a richer shape — not just `{jobStatus, label, isEnabled}` but potentially `{name, category, isEnabled, sortOrder}` with `jobStatus` renamed to `category` and no longer required to be 1:1 (a template could define two stages with the same `category`). Built-in templates could still ship 8-stages-one-per-category (identical to today) as the default row shape, so no template *needs* to change to keep working — richer templates become possible, not mandatory.

**Risks:**
- **The single biggest risk is silent data disagreement between `Job.status` and `currentStageId`** if any write path is ever added that updates one without the other. This is exactly the class of bug "two sources of truth" always produces, and it's the reason Phase 11 was so deliberately designed to avoid a second source of truth in the first place. Mitigation: a single write path (extend `updateJobStatusAction`, never a second function) that always sets both fields together, plus a test asserting they can never diverge.
- **Every report that groups by `JobStatus` needs the `category` mapping to be right, permanently** — a miscategorized custom stage doesn't fail loudly, it just quietly miscounts revenue/pipeline/completion reports. Mitigation: `category` should not be optional or freely re-editable after jobs exist in a stage — changing a stage's `category` after the fact needs the same "confirmed, explicit, not folded into an ordinary save" treatment `resetCompanyCatalog`/`resetWorkflowToTemplateAction` already use for similarly consequential resets.
- **Migration blast radius is real even done carefully** — this touches more files than any phase shipped so far (Phase 2's Change Orders is the closest comparison, and that added new models without touching an existing, universally-read field). Mitigation: ship additive-only first (new table, new nullable column, dual-write), verify in production for a full release cycle with `Job.status` still the only thing anything *reads*, before any consumer is switched to read `currentStageId`/`CompanyStage` instead.
- **Rollback strategy:** because the migration is additive (new table, new nullable column) and `Job.status` stays real and authoritative throughout, rollback at any point before a consumer is switched to the new read path is a no-op — just stop writing to the new table/column and it's inert. Rollback *after* a consumer has been switched to read `currentStageId` needs that consumer reverted first (read `Job.status` again), which is why consumers should be switched one at a time, each independently revertible, never as one big-bang cutover.

---

## 5. Recommended path

**13A — reorder-only, buildable now, no schema change.** Judged safe in §4 with concrete evidence (`sortOrder` already exists, already persisted, currently a no-op). Designed to implementation-ready detail in §6. **Not built in this pass**, per the prompt's explicit instruction — this plan recommends it, it does not implement it.

**13B — usage-data review and product decision.** Not a code phase. Run the queries in §3 against real Phase 11/12 usage once there is some; combine with direct product/support feedback on whether requests are "reorder what's there" (satisfied by 13A) or "we need a stage that doesn't exist" (only satisfied by 13C). This is a scheduled checkpoint, not an open-ended wait — revisit explicitly once Phase 11 has been live long enough to have real companies past onboarding, not on a fixed calendar date.

**13C — the schema split, only if 13B's data says companies need it.** Sketched in §4/§7 to the depth needed to scope the decision, deliberately not designed to migration-ready detail — per the plan's own instruction, and because the right shape depends on what 13B actually observes (e.g., if every real request turns out to be "one extra stage between two existing ones," a narrower schema than the full `CompanyStage` model above might suffice; if requests are wildly varied, the fuller model earns its complexity).

This plan does **not** recommend building true custom stages immediately. Nothing in the current codebase inspection (§1) surfaced a surprisingly safe path to Option C — every consumer of `Job.status` found in §1's file-impact list genuinely would need to change, which is exactly the risk profile the workflow doc's own §15/§25 anticipated when it named this "long-term" and "deliberately not designed in detail."

---

## 6. Phase 13A implementation plan (future work — not implemented in this pass)

### Files to modify
- **`lib/workflow-stages.ts`** — `effectiveStageFlow()` sorts its output by the override's `sortOrder` (ascending; ties broken by `STATUS_FLOW` position, so two stages neither of which has ever been reordered keep today's exact order). `nextEnabledStatus()` changes from walking `STATUS_FLOW` directly to walking `effectiveStageFlow(overrides)`'s own order and returning the first enabled entry after the current one — this is the one real logic change 13A needs, and it's a pure function, fully unit-testable without a database.
- **`app/(dashboard)/settings/workflow/actions.ts`** — `saveWorkflowStagesAction` gains one more per-stage field (a position), written into `sortOrder` on the same upsert it already does for `label`/`isEnabled`. No new action needed — reordering is one more field on the existing save, not a separate write path (matches the existing "one form, one save" shape, avoids a second, harder-to-reason-about mutation path for the same table).
- **`components/dashboard/workflow-stages-form.tsx`** — the reorder UI itself (see below). `WorkflowStageRow` gains an explicit position; the row list is rendered in current `sortOrder` order rather than fixed `STATUS_FLOW` order.
- **`tests/workflow-stages.test.ts`** — new tests for `effectiveStageFlow()` respecting `sortOrder`, and `nextEnabledStatus()` walking display order instead of enum order (see "Tests" below for the exact cases).

### Helper changes, precisely
- `effectiveStageFlow(overrides, currentStatus?)`: unchanged signature, unchanged per-item shape (`EffectiveStageMeta` gains no new field — `sortOrder` is an input concern, not something callers need back, since the array's own order already communicates it). Internally: build the array as today, then `.sort((a, b) => sortOrderFor(a.status) - sortOrderFor(b.status))` where `sortOrderFor` reads the matching override's `sortOrder` or falls back to the stage's `STATUS_FLOW` index (so an un-reordered company's flow is bit-for-bit identical to today's output).
- `nextEnabledStatus(status, overrides)`: reimplemented in terms of `effectiveStageFlow(overrides)` — find `status`'s position in the *sorted* array, walk forward from there, return the first `isEnabled: true` entry's status (or `null` at the end). Every existing caller (`JobStatusStepper`'s advance button) needs no changes — same signature, same return type, only the internal walk order changes.

### Settings → Workflow UI changes
Two real options, and the plan should build **both** — a pointer-friendic reorder plus a keyboard-accessible fallback, not one or the other:

1. **Primary: native HTML5 drag-and-drop**, following the exact pattern already hand-rolled in `components/dashboard/pipeline-board.tsx` (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) rather than adding a new dependency. **No drag-and-drop library exists in this repo today** (`package.json` has no `@dnd-kit/*`, `react-beautiful-dnd`, `react-sortable-*`, etc. — checked directly) — the pipeline board's own hand-rolled native-DnD is the only precedent, and 13A should reuse that pattern rather than introduce a new npm dependency for what is, structurally, the same "reorder a short list" problem the pipeline board already solves for drag-between-columns.
2. **Required fallback: Move up / Move down buttons** on every row, always visible (not hidden behind a "keyboard mode" toggle) — per the accessibility requirement below, and because native HTML5 drag-and-drop has no built-in keyboard story at all, unlike most modern DnD libraries' built-in sensors. Each button is a plain `<button type="button">` that swaps the row's `sortOrder` with its neighbor's, client-side, then the existing single "Save changes" button persists the whole list — no separate save-per-move network round-trip, matching the existing form's "edit everything, save once" shape.

### Accessibility requirement (explicit, not optional)
Drag-and-drop alone is not an acceptable reorder mechanism on its own — Move up/Move down buttons must exist and must be fully equivalent (same end state reachable, same save flow) for anyone who can't drag, whether that's a keyboard-only user, a switch-access user, or someone on a touch device where the drag gesture conflicts with scrolling. Both mechanisms write to the same client-side `sortOrder` state and share one save action — there is exactly one source of truth for "the current proposed order" in the component, regardless of which control changed it.

### Save action behavior
`saveWorkflowStagesAction` stays a single transaction upserting all 8 `CompanyWorkflowStage` rows (unchanged shape from Phase 11), now writing `sortOrder` from the submitted position instead of always writing loop index. Still gated on `manageCompany` (no new capability). Still safe to call from a company with zero existing rows (creates all 8, same as today).

### `sortOrder` persistence
No new column, no new default — `sortOrder Int @default(0)` already exists from Phase 11's migration. The only behavior change is that it starts being written with *meaningful, distinct* values (0–7 in display order) instead of always equaling `STATUS_FLOW` index. A company that never touches the reorder UI keeps `sortOrder` implicitly equal to `STATUS_FLOW` index forever (or has no rows at all), which is exactly why `effectiveStageFlow()`'s fallback-to-`STATUS_FLOW`-index tiebreak (above) is what keeps every non-reordering company's stepper pixel-identical to today.

### Tests (future)
- `effectiveStageFlow()` respects a custom `sortOrder` and returns stages in that order.
- `effectiveStageFlow()` with no `sortOrder` overrides (or all-zero/all-equal) falls back to `STATUS_FLOW` order — the exact "existing companies render exactly as they do today" guarantee, re-verified under the new code path.
- `nextEnabledStatus()` returns the next stage in **display order**, not enum order, when the two differ (the concrete regression case: a company reorders `SCHEDULED` before `QUOTED`, and the smart button must offer `SCHEDULED` next from `QUOTED`, not fall back to enum order).
- `nextEnabledStatus()` still skips disabled stages correctly when combined with a custom order (the two features composing, not just each in isolation).
- A disabled *current* stage is still detected correctly regardless of its `sortOrder` (`isCurrentDisabled` must not depend on position).
- `getDisabledStageJobs()`/`sortDisabledStageJobs()`'s existing test suite re-run unmodified, confirming reordering has zero effect on the disabled-stage sort (a "did not regress" test, not a new-behavior test).

### Manual verification (future)
- Existing company, no reordering ever done: stepper, Settings page, onboarding, and disabled-stage list all render byte-for-byte as they do before 13A ships.
- Reorder two stages via drag; confirm the job-page stepper reflects the new order immediately, and the smart advance button's target changes accordingly.
- Reorder the same two stages via Move up/Move down instead of drag; confirm identical resulting state and identical save behavior.
- Reorder while a stage is disabled; confirm the disabled stage still doesn't appear in the reordered forward-choices list, and a job currently in it still shows the warning at its (reordered) position.
- Apply a built-in template after having manually reordered; confirm the template's own order (today, `STATUS_FLOW` order) correctly overwrites the manual reorder, matching the existing "start over with a template" destructive-and-confirmed framing.
- Onboarding template application still writes `sortOrder` equal to array position (unchanged) — confirm a freshly onboarded company's stepper matches its template's intended order.
- `/jobs?attention=disabled-workflow-stage` list is unaffected by reordering (its own sort is stage-entry-time-based, never `sortOrder`).

---

## 7. True custom-stage migration outline (future — not designed to migration-ready detail, not implemented)

This section exists to scope the decision in §5, not to hand off a ready migration. Per the prompt's instruction, this is deliberately incomplete until 13B produces real data.

- **Candidate Prisma models:** `CompanyStage` as sketched in §4 Option C (`id, companyId, name, category: JobStatus, sortOrder, isTerminal, isEnabled`), plus `Job.currentStageId String?` (nullable through the whole migration, foreign key to `CompanyStage`).
- **Migration phases:** (1) additive schema migration only — new table, new nullable column, no backfill, no consumer changes, fully inert on ship; (2) backfill script — one `CompanyStage` row per existing `CompanyWorkflowStage` row (mechanical, per company), then one `Job.currentStageId` write per job matching its current `Job.status` to the right `CompanyStage` row; (3) dual-write — `updateJobStatusAction` extended to set both `Job.status` and `Job.currentStageId` together, verified never to diverge; (4), only after a full release cycle of (3) running clean, individually and reversibly switch each consumer (stepper, dashboard, reports, pipeline) from reading `Job.status` to reading through `CompanyStage`, one file at a time.
- **Backfill strategy:** mechanical and data-preserving *if* 13B confirms no company has needs beyond what Phase 11's rename/hide/reorder already represents — see §4 Option C for the exact mapping. If 13B instead surfaces real custom-stage requests already informally represented some other way (e.g., in job names or notes, as a workaround), the backfill would need a one-time, per-company review rather than a pure mechanical script — a real cost this plan flags but cannot size without knowing what 13B finds.
- **Compatibility shims:** every consumer keeps reading `Job.status` unmodified through phases (1)–(3) above — the shim *is* the dual-write, not a separate adapter layer. No consumer needs an if/else "check the new field, fall back to the old one" branch, because the old field is never allowed to go stale during the transition.
- **How existing public routes keep working:** unaffected in every phase — `/q/[token]`, `/i/[token]`, `/w/[token]`, `/co/[token]` all read their own document's status (`QuoteStatus`/`InvoiceStatus`/`WarrantyStatus`/`ChangeOrderStatus`), never `Job.status` directly, confirmed by direct inspection of each route in §1's earlier phases.
- **How activity history stays readable:** old `STATUS_CHANGED` events keep their existing `from`/`to` label strings verbatim (never rewritten); only new events, once a company has real `CompanyStage` rows, would carry the richer optional field described in §4. A job's timeline reads as a mix of old-style and new-style entries, same as any additive schema change to a log table — no migration of historical rows.
- **How old links and filters stay stable:** `/jobs?attention=disabled-workflow-stage` and every `?status=`-style filter elsewhere in the app keep meaning exactly what they mean today throughout phases (1)–(3); only if/when a consumer is switched in phase (4) would a URL's meaning need to expand (e.g., accepting a `CompanyStage` id as well as a `JobStatus` value) — and even then, old links keep working unchanged, since `JobStatus` values remain valid filter targets forever (every custom stage still has a `category`).
- **How the Action Center and disabled-stage jobs stay stable:** `getDisabledStageJobs()`'s query shape (find disabled → find matching jobs → derive stage-entry time → sort) is structurally unchanged; only its "disabled" source shifts from `CompanyWorkflowStage.isEnabled` to `CompanyStage.isEnabled` once that consumer is switched in phase (4), and `buildActionCenterItems()` (pure, facts-in/items-out) needs no changes at all — it never touches the schema, only the count it's handed.
- **How reports stay correct:** every report grouping by `JobStatus` (`lib/reports/revenue.ts`, `lib/pipeline.ts`) keeps reading `Job.status` throughout the dual-write phase, so they're correct by construction as long as the dual-write itself is correct — the `category` mapping (§4's biggest named risk) is what has to be gotten right once, not per-report.
- **Rollback strategy:** phases (1)–(2) are inert until (3) starts writing; rolling back at that point is deleting the new table/column with no data loss to anything else. Rolling back during/after (3) means reverting `updateJobStatusAction` to single-write and leaving `currentStageId` stale-but-unread (safe, since nothing reads it yet). Rolling back any individual consumer-switch in (4) means reverting that one file to read `Job.status` again — each switch is independently revertible by design, never a single irreversible cutover.
- **Risks:** all named in §4 Option C — dual-write divergence (the big one), `category`-mapping correctness for reports, and overall migration surface area. No new risks beyond what §4 already names.

---

## 8. Product and UX guardrails

Carried into both the 13A design above and any future 13C work:

- **No CAD-style dense config panels.** 13A's reorder UI is a plain list with two controls (drag, or two buttons) — not a grid, not a properties inspector, not a node graph. This matches `PRODUCT.md`'s own anti-reference ("Exposed technical controls, dense parameter panels... must never reach a screen").
- **No exposed technical state-machine language.** "Stage," "shown," "order" — never "state," "transition," "enum," "node."
- **No raw enum names.** Every existing guardrail from Phase 11 (`effectiveStageMeta()`'s `label`/`defaultLabel` split, the dedicated "no raw enum" unit tests in `tests/workflow-stages.test.ts`) carries forward unchanged into 13A, since 13A doesn't touch labeling at all.
- **"Hide," never "delete," for the safe action.** Phase 11 already established this copy discipline (`workflow-stages-form.tsx`'s "Shown" checkbox, never "Enabled/Disabled" or "Delete"); 13A's reorder controls need their own equivalent care — "Move up"/"Move down," never "Promote"/"Demote" or anything implying a stage is being judged rather than repositioned.
- **No giant diagram where a list is clearer.** 13A is explicitly a list with position controls, not a canvas/diagram — the workflow doc's own §16 UI Architecture note ("generalize `JobStatusStepper`'s shape... don't build a cross-entity config engine") argues directly against a heavier visual metaphor for what is, functionally, reordering eight rows.
- **The visible-stage vs. backend-state distinction must stay legible.** Phase 11's disabled-current-stage warning already carries this discipline ("this stage is disabled for *future* jobs" — explicitly not "this job is broken"); 13A introduces no new instance of this distinction (reordering doesn't change what's enabled), so no new copy is needed here, but the existing warning copy should not be revisited casually just because the surrounding UI changed shape.
- **No workflow change silently moves a job.** True today (`updateWorkflowStagesAction`/`resetWorkflowToTemplateAction` never touch `Job.status`) and explicitly re-confirmed as a 13A requirement: reordering, saved, must never write to any `Job` row.
- **No workflow change silently alters invoices, quotes, warranties, quality checks, or progress.** None of these read `CompanyWorkflowStage`/`sortOrder` today, and 13A adds no new coupling between them.
- **Design system conventions carried forward:** flat cards (`rounded-3xl border border-hairline bg-surface-raised`, the exact class Phase 11's `WorkflowStagesForm` already uses), hairline borders, no shadows, no gradients, the established `border-instrument-bright/70 bg-instrument-bright/10` selected-state convention (confirmed via direct grep against `imagery-upload-form.tsx`/`comparison-create-form.tsx`/`inspection-photo-input.tsx` during Phase 11's own `impeccable` audit) for any "currently being dragged/selected" row treatment, the existing `ConfirmSubmit` pattern for the destructive "start over with a template" action (unchanged by 13A). A future `impeccable audit`/`impeccable critique` pass against the actual reorder UI, once built, is the right verification step — not proposed or run in this planning-only pass, since there is no UI yet to review.

---

## 9. Explicit non-goals (this pass and 13A)

Not included in this planning pass, and not included in 13A even if built later, without a separate, explicitly-approved future phase:

- Changing `JobStatus` (adding, removing, or renaming enum values).
- Deleting any existing backend status.
- Changing `QuoteStatus`, `InvoiceStatus`, `RequestStatus`, or `WarrantyStatus`.
- Changing Phase 12 Action Center semantics (item types, priority model, or link doctrine).
- Changing the quality-check completion gate (`lib/quality-check.ts`).
- Changing pre-construction checklist behavior.
- Changing progress-tracking behavior.
- Changing any public document flow (`/q`, `/i`, `/w`, `/co`).
- Adding workflow analytics or telemetry code (§3 names what to observe; it does not build the observing).
- Adding a notification severity model.
- Building a node-and-edge / canvas-style workflow graph editor.
- Building automation rules (e.g., "when a job enters stage X, do Y").
- Building conditional/branching workflows (a stage with more than one possible "next").
- Any schema migration (13A needs none; 13C's is explicitly not written here).
- Any actual UI code, for 13A or otherwise — this document is the only artifact of this pass.

---

## 10. Validation plan (future, once 13A is actually implemented)

Standard suite, matching every prior phase's own documented baseline:
- `npm run lint`
- `npx tsc --noEmit -p .` (no `typecheck` script exists in `package.json`, consistent with every prior phase's own note)
- `npm test`
- `npm run build`

**Testing baseline to preserve:** Phase 12 reported 451 tests / 449 passing, with the same 2 pre-existing, unrelated failures every phase since Phase 3 has documented and left alone:
- `tests/action-guards.test.ts` — a bare company check in `notifications-actions.ts`.
- `tests/permissions.test.ts` — a stale crew-capability assertion from before Phase 3 added `submitFieldEvidence`.

13A's own new tests (§6) should land as net-new passing tests on top of that baseline — 451 + N passing, same 2 pre-existing failures, no new failures, documented the same way every prior phase's implementation doc has documented it.

**Manual checks, once built:**
- Settings → Workflow: reorder via drag, reorder via Move up/Move down, confirm both produce identical saved state.
- Onboarding: template application still produces the expected fixed order for a freshly onboarded company.
- Job-page stepper: pills and the status `<select>` reflect a company's custom order; the smart advance button targets the correct next-in-display-order stage.
- Disabled-current-stage warning: still renders correctly regardless of the disabled stage's position in the reordered list.
- Dashboard Action Center: disabled-stage item count and copy unaffected by reordering.
- `/jobs?attention=disabled-workflow-stage`: list contents and sort order unaffected by reordering (its sort is stage-entry-time-based, never `sortOrder`).
- Normal status transitions (`updateJobStatusAction`, via the stepper) continue to work exactly as before for a company that has never reordered anything.

---

## Summary of what happens next

This document is the complete output of this pass. No source file, schema, or UI was changed. Per the prompt's explicit instruction: **stop here and wait for approval before any Phase 13 implementation** — including 13A, even though it's judged safe above.
