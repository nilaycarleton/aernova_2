# Phase 4 — Pre-Construction Checklist: Implementation Summary

Implements `AERNOVA_PROJECT_WORKFLOW.md` §7.6, §25 Phase 4 only. Branch: `feature/astryx-integration`. Phases 1–3 (confirmed complete and approved) were re-read from `WORKFLOW_PHASE_1_IMPLEMENTATION.md`/`_2_`/`_3_` before starting; nothing here touches the 3D viewer, roof detection, measurement tools, photogrammetry rendering, or the quote-builder rendering code, and Phases 1–3 were not refactored.

Core product rule this phase enforces: **a checklist, not a state.** `Job.status` gains no new value — pre-construction is a gap layer, same "required to advance, not required to exist" doctrine `jobGaps()`/`invoiceSendGaps()`/`qualityCheckCompletionGaps()` already use. It sits between an approved quote and the scheduling panel, reviewed and confirmed by office/estimator roles, never by crew.

## Files changed

### New
| File | Purpose |
|---|---|
| `lib/pre-construction.ts` | Pure helpers — `preConstructionGaps()`, `preConstructionGateMessage()`, `preConstructionChecklistStatus()` — mirroring `qualityCheckCompletionGaps()`'s doctrine exactly. |
| `app/(dashboard)/jobs/[jobId]/pre-construction-actions.ts` | `savePreConstructionChecklistAction` — the office's one write path, gated on `editJob`. Upserts `PreConstructionChecklist`, stamps `confirmedAt`/`confirmedByUserId` the first time all four office-controlled fields become true (sticky, same pattern as `saveQualityCheckAction`). |
| `components/dashboard/pre-construction-checklist-panel.tsx` | Job-page panel: a status banner (gap message or "ready to schedule"), then a form — materials checkbox+notes, permits checkbox+radio group (required/not required)+notes, crew-ready checkbox, start-date checkbox, general notes. Read-only fallback for non-editable roles, same shape as `QualityCheckPanel`. |

### Modified
| File | Change |
|---|---|
| `prisma/schema.prisma` | New `PreConstructionChecklist` model + `Job.preConstructionChecklist` relation (below). |
| `app/(dashboard)/jobs/[jobId]/page.tsx` | Loads `preConstructionChecklist: true` on the job query; computes `preConstructionGapList`/`preConstructionData` (the `hasScope` fact reuses `approvedQuote.lineItems`/`scopeOfWork` rather than asking the office to re-confirm something the quote already states); renders `PreConstructionChecklistPanel` between the status stepper/review-request block and `VisitPanel` — i.e. directly ahead of the scheduling UI — when `approvedQuote && showsMoney`. |

No changes to `components/dashboard/measure-viewer.tsx`, `hub-model-viewer.tsx`, roof detection/extraction, photogrammetry rendering, the quote builder, or any Phase 1–3 code. `app/(dashboard)/schedule/actions.ts` (`bookVisitAction`) and `app/(dashboard)/jobs/[jobId]/status-actions.ts` (`updateJobStatusAction`) are both untouched — see "Gate behavior" below for why.

## Schema changes

Additive only; `@@map("Project")` and `@@map("Proposal")` confirmed untouched (`grep` before/after).

```prisma
model PreConstructionChecklist {
  id    String @id @default(cuid())
  jobId String @unique

  materialsConfirmed Boolean @default(false)
  materialsNotes     String?

  permitsChecked Boolean @default(false)
  permitRequired Boolean?   // null until reviewed
  permitNotes    String?

  crewReady          Boolean @default(false)
  startDateConfirmed Boolean @default(false)
  readinessNotes     String?

  confirmedAt       DateTime?
  confirmedByUserId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  job Job @relation(fields: [jobId], references: [id], onDelete: Cascade)
}
```

`jobId` is `@unique` (one row per job), cascades on job delete — matching `QualityCheck`'s exact precedent. `approved contract/quote exists` and `scope is known` are **not** stored fields: they're derived facts (`approvedQuote` presence, `lineItems`/`scopeOfWork` presence) read at render time, since the schema already carries them and duplicating them into a new boolean would drift from the quote itself.

## Migration

`20260812022121_add_pre_construction_checklist` — applied via `npx prisma migrate dev`. Confirmed the generated SQL is purely `CREATE TABLE`, `CREATE UNIQUE INDEX`, `ADD CONSTRAINT ... FOREIGN KEY ... ON DELETE CASCADE` — no data migration, no backfill required.

## Helper / action / component design

- **`preConstructionGaps(facts)`** returns up to six gaps: `quote`, `scope`, `materials`, `permits`, `crew`, `startDate`. The panel only renders once `approvedQuote` exists, so `quote`/`scope` are defensive rather than commonly-open in practice — the helper stays generic and independently testable regardless of the page's own gating condition, same reasoning `jobGaps()` gives for checking facts it happens to always have by the time it's called.
- **Permit item** is satisfied by `permitsChecked` alone (not by `permitRequired`'s value) — checking the box **is** the confirmation, whether the answer is "required" or "not needed," matching the task's "confirmed or explicitly marked not needed" wording exactly.
- **One save action, atomic stamp** — same judgment call Phase 3 documented for `saveQualityCheckAction`: a single form always persists the four office fields, and `confirmedAt`/`confirmedByUserId` are stamped the instant all four become true for the first time (guarded by `!existing?.confirmedAt`), sticky like `QualityCheck.completedAt`/`Quote.acceptedAt`.
- **Permission reused, none added** — `editJob` (ESTIMATOR/SALES/ADMIN/OWNER; not CREW, not VIEWER), the same tier Change Order create/save already uses (§19.1 precedent in Phase 2). No new capability, per the instruction to reuse existing patterns and avoid a capability whose only grantees would duplicate an existing tier.
- **No new `ActivityKind`** — the Phase 1 enum has no pre-construction-specific value (confirmed by reading the full enum before starting), and the instruction was explicit not to add one unless a suitable value already existed. Checklist saves are silent on the activity timeline, same as Phase 3's own undocumented-kinds list documents for events nothing yet writes.
- **Panel placement** — directly above `VisitPanel` rather than inside the Quote tab (where `ChangeOrdersPanel`/`AdditionalWorkPanel` live), because the whole point is that office reads it immediately before booking the work visit that moves the job toward `SCHEDULED`. Visible whenever `approvedQuote` exists (any `Job.status`, including after scheduling/completion), same "stays visible as the record of it" reasoning `QualityCheckPanel` uses post-completion — not hidden the moment a visit is booked.

## Gate behavior — warning-only, no hard block

**Decision: the pre-construction gate is display-only. Nothing throws, and nothing in `bookVisitAction` or `updateJobStatusAction` reads `PreConstructionChecklist` or calls `preConstructionGaps()`.**

Why, explicitly, since the task asked this to be justified:

1. **Assumption 2 in the plan is explicit and specific to this gate**: "New checklist-style gates (`preConstructionGaps`, `QualityCheck`) stay soft/overridable by default." §7.6 itself only ever describes `preConstructionGaps(job)` as "a checklist function," with none of §20's "still only unlocks once…" language that Phase 3's `QualityCheck` gate was built against. Phase 3's hard `throw` on the `COMPLETED` transition is justified by that explicit §20 wording; §7.6 carries no equivalent instruction for pre-construction, so the plan's own default (soft/overridable) governs here.
2. **No established hard-gate pattern exists for *this* transition.** The only existing hard gate in the codebase is Phase 3's `COMPLETED` gate, which fires inside `updateJobStatusAction`. The transition this phase is near — a job moving toward `SCHEDULED` — happens two different ways: `updateJobStatusAction` (manual dropdown) and `bookVisitAction` (booking a `WORK` visit, the "everyday way," per that file's own comment, that a job reaches `SCHEDULED`). Neither has ever gated on anything before this phase. Per the task's own instruction — "unless the existing codebase has an established hard-gate pattern for this exact transition" — none exists, so the default applies.
3. **§12's "Never block on…" doctrine** (missing photos, missing notes, missing progress signal) is the same spirit: block only where the plan explicitly says to, warn everywhere else.
4. **Practical effect**: the checklist panel always shows the current gaps (or the "ready to schedule" confirmation) directly above the scheduling panel — "show a clear gap message," per the task, is satisfied by always-visible, unavoidable placement rather than by an interrupting error. Office can still book a visit, change job status, or do anything else with unresolved checklist items; the checklist is there to be read, not to be a lock.

**Because the gate never blocks anything, there is no override to build.** The task's override instruction ("if implementing an override, make it explicit and office/owner-gated") only applies if a block exists to override — since none does, there is nothing to gate. If a future phase decides pre-construction should hard-block scheduling, the natural seam is `bookVisitAction`, reading `preConstructionGaps()` the same way `updateJobStatusAction` reads `qualityCheckCompletionGaps()` — deliberately not built here, to keep this phase's change surface to display-only code, per "avoid broad refactors."

## Checklist items implemented

1. Approved contract/quote exists — derived from `approvedQuote`.
2. Scope is known — derived from the approved quote's `lineItems`/`scopeOfWork`.
3. Materials confirmed, or explicitly marked not needed — `materialsConfirmed` checkbox + `materialsNotes`.
4. Permit requirements checked, or explicitly marked not needed — `permitsChecked` checkbox + `permitRequired` radio (required / not required) + `permitNotes`.
5. Crew readiness confirmed — `crewReady` checkbox.
6. Start-date readiness confirmed — `startDateConfirmed` checkbox.

"A scheduled work visit exists" (the sixth bullet in the task's checklist-content list) was **not** built as a seventh gap or a stored field: it's the natural next action once the five items above are clear, already visible one panel down (`VisitPanel`/"When it's happening"). Adding it as a gap would either always read "open" (a job rarely has a visit booked before the checklist is reviewed) or require the panel to poll scheduling state redundantly with the panel already below it — out of scope for a checklist layer per the "avoid broad refactors" instruction.

## Validation results

- `npm run lint` — **0 errors**, 26 warnings, all pre-existing (confirmed identical list to Phase 3's own recorded warnings — `<img>`-vs-`next/image`, a few unrelated unused-var warnings). No new warnings from this phase's files.
- `npx tsc --noEmit -p .` — clean, zero errors (no `typecheck` script exists in `package.json`).
- `npm run build` — succeeds. All 34+ routes generated, including `/jobs/[jobId]`. Only non-blocking output is the same pre-existing, unrelated Sentry sourcemap-upload rejection (invalid `SENTRY_AUTH_TOKEN`) every prior phase has also seen.

## Manual test notes

Done against the live dev server + dev database (had to restart the dev server once — it held a pre-migration Prisma Client in memory and threw `Unknown field 'preConstructionChecklist'` until restarted; `npx prisma migrate dev` itself had already regenerated the client on disk correctly).

- **Panel renders on a job with an approved quote** — job `cmpiuam8b00019kjkypgfvei7` (the same Wetherby Drive job used in Phase 2/3 testing, `Job.status: COMPLETED`, one `APPROVED` $16,000 quote). "Pre-construction checklist" card appeared directly above "When it's happening," with the correct initial banner: *"Not yet ready to schedule — still need: Confirm materials are ready, or note they're not needed, Check permit requirements, or note none are needed, Confirm a crew is ready for this job, Confirm a start date with the client."* (Only four items listed, not six — confirming the derived `quote`/`scope` gaps were correctly already satisfied and excluded.)
- **Panel does not render on a job with no approved quote** — job `cmrf9e9cg00019ke0mlqqqi66` (`Job.status: INSPECTION`, no quotes), the exact job Phase 2 used to confirm `ChangeOrdersPanel` doesn't render early. No pre-construction section anywhere on the page; rest of the page (workflow stepper, scheduling, roof scan) rendered normally.
- **Checklist confirmations save correctly** — checked all four boxes (materials, permits, crew, start date), selected "No permit needed," left notes blank, clicked Save. Banner switched immediately to *"Everything here is confirmed. This job is ready to schedule,"* and a "Confirmed Aug 11, 2026" badge appeared. Confirmed directly in the database: `materialsConfirmed/permitsChecked/crewReady/startDateConfirmed: true`, `permitRequired: false`, `confirmedAt`/`confirmedByUserId` both stamped, exactly once.
- **The app creates no new `JobStatus`** — confirmed by reading `prisma/schema.prisma`'s `JobStatus` enum (unchanged, 9 values) and by the fact the tested job's status stayed `COMPLETED` throughout — the checklist has no effect on `Job.status` at all.
- **Scheduling is unaffected by checklist gaps** — the "When it's happening" panel (booking a `WORK` visit) rendered and was fully interactive immediately below the checklist regardless of checklist state; nothing in `bookVisitAction` was touched, so this is true by construction, not just by observation. Confirmed no override control exists on the panel — matches the "no block, so no override" design decision above.
- **`/today` carries nothing pre-construction-related** — grepped the entire repo for `PreConstruction`; only the four new files (helper, action, component, job page) reference it. `app/(dashboard)/today/` has zero matches.
- **Existing Phase 1–3 flows still work** — re-checked live: the public quote page still renders `DocumentBrand`; the Quality Check panel (further down the same job page) still shows "Completed Aug 11, 2026" with its own crew-evidence/office-review split intact and unaffected by the new panel above it; the workflow stepper's dropdown and stage row rendered unchanged.
- **No console errors** — checked the browser console after loading both test jobs; empty.
- **CREW / VIEWER role gating not live-tested** — same known limitation Phase 3 documented: the dev database has only one company membership (`OWNER`, which holds every capability). Verified by code inspection instead: `CREW`'s grant list is exactly `["completeVisit", "submitFieldEvidence"]` (no `editJob`); `VIEWER`'s is `["viewMoney", "viewAllJobs"]` (also no `editJob`) — so a `VIEWER` sees the panel read-only (`editable={false}` renders the read-only checkmark list) and `CREW` never sees it at all (`showsMoney` gates the whole block, and `CREW` doesn't hold `viewMoney` either). `savePreConstructionChecklistAction` calls `requireJobAccess(jobId, "editJob")`, the same deny-by-default mechanism proven live for every other capability-gated action in this codebase.

## Intentionally deferred

- Estimate summary panel, `Contacted`/`Qualified` pipeline stage, sales/financial mini-cards, financial completion panel, progress tracking, warranty, workflow customization, dashboard action center, visual workflow builder — none implemented, per instruction (Phases 5–13).
- No hard block / override control for the pre-construction gate — see "Gate behavior" above for the full reasoning.
- No "scheduled work visit exists" checklist item or stored field — see "Checklist items implemented" above.
- No new `ActivityKind` for checklist confirmation — see "Helper / action / component design" above.

## Stop point

Phase 4 complete. Waiting for approval before Phase 5.
