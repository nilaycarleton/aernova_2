# Phase 3 — Quality Check + Completion Gate: Implementation Summary

Implements `docs/AERNOVA_PROJECT_WORKFLOW.md` §14.3, §20, §22, §23, §25 Phase 3 only. Branch: `feature/astryx-integration`. Phase 1 and Phase 2 (confirmed complete and approved) were re-read from `WORKFLOW_PHASE_1_IMPLEMENTATION.md` and `WORKFLOW_PHASE_2_IMPLEMENTATION.md` before starting; nothing here touches the 3D viewer, roof detection, measurement tools, photogrammetry rendering, or the quote-builder rendering code, and Phase 2 (change orders / additional work) was not refactored.

Core product rule this phase enforces: **two authors, two write paths.** Crew supplies field evidence from `/today`; only office/owner completing the quality check unlocks `[ Complete Project → ]`. Crew evidence alone can never complete a job.

## Files changed

### New
| File | Purpose |
|---|---|
| `lib/quality-check.ts` | Pure gap-checking helpers — `qualityCheckCompletionGaps()`, `qualityCheckGateMessage()` — mirroring the existing `jobGaps()`/`invoiceSendGaps()` "required to advance, not required to exist" doctrine. |
| `app/(dashboard)/today/quality-actions.ts` | `submitFieldEvidenceAction` — crew's one write path, gated on `submitFieldEvidence`. Upserts the field-evidence half of `QualityCheck`, records `QUALITY_CHECK_EVIDENCE_SUBMITTED`. Never touches `Job.status`. |
| `components/today/quality-evidence-panel.tsx` | Crew's `/today` UI — collapsible, two large checkboxes (siteCleaned, photosUploaded), a notes textarea, mobile-first tap targets. No money, invoice, change-order, or warranty content. |
| `app/(dashboard)/jobs/[jobId]/quality-check-actions.ts` | `saveQualityCheckAction` — office's one write path, gated on `completeQualityCheck`. Single save action (see Design decisions below); stamps `completedAt`/`completedByUserId` and records `QUALITY_CHECK_COMPLETED` atomically the moment all three booleans become true for the first time. |
| `components/dashboard/quality-check-panel.tsx` | Job-page panel: read-only "what crew reported" half (visible to anyone who can see the job) + editable "office review" half (only when `editable`, i.e. `completeQualityCheck`). |

### Modified
| File | Change |
|---|---|
| `prisma/schema.prisma` | New `QualityCheck` model + `Job.qualityCheck` relation (below). |
| `lib/permissions.ts` | Two new capabilities: `submitFieldEvidence` (CREW-tier, alongside `completeVisit`), `completeQualityCheck` (office-tier, alongside `manageJobCosts`). `CREW` grants gain `submitFieldEvidence` only; `ESTIMATOR` grants gain both. |
| `app/(dashboard)/today/page.tsx` | Loads `qualityCheck: true` on the visit's job include; renders `QualityEvidencePanel` right after `FieldCapturePanel`, only when `visit.job.status === "IN_PROGRESS"`. |
| `app/(dashboard)/jobs/[jobId]/status-actions.ts` | `updateJobStatusAction`'s completion gate: before transitioning to `COMPLETED`, reads `QualityCheck.{scopeCompleted,deficienciesResolved,walkthroughCompleted}`, runs `qualityCheckCompletionGaps()`, and throws `qualityCheckGateMessage(gaps)` if any are missing. No new `JobStatus` value; existing state machine otherwise untouched. |
| `app/(dashboard)/jobs/[jobId]/page.tsx` | Loads `qualityCheck: true` on the job query; renders `QualityCheckPanel` right after `VisitPanel`, when `job.status === "IN_PROGRESS" || job.status === "COMPLETED"`; resolves submitter/completer names against the already-loaded `team` array rather than adding a query (no relation on the plain-string user-id columns, same shape `Quote.approvedByUserId` already uses). |
| `lib/activity.ts` | Two new `describeActivity()` cases: `QUALITY_CHECK_EVIDENCE_SUBMITTED` → "{who} submitted quality check evidence"; `QUALITY_CHECK_COMPLETED` → "{who} completed the quality check". No other kinds touched. |

No changes to `components/dashboard/measure-viewer.tsx`, `hub-model-viewer.tsx`, roof detection/extraction, photogrammetry rendering, the quote builder, or any Phase 2 change-order/additional-work code.

## Schema changes

Additive only; `@@map("Project")` and `@@map("Proposal")` confirmed untouched (`grep` before/after).

```prisma
model QualityCheck {
  id    String @id @default(cuid())
  jobId String @unique

  // Crew-writable field evidence, from /today.
  siteCleaned                    Boolean   @default(false)
  photosUploaded                 Boolean   @default(false)
  fieldEvidenceNotes             String?
  fieldEvidenceSubmittedAt       DateTime?
  fieldEvidenceSubmittedByUserId String?

  // Office/estimator-only. This half — not the evidence above — is what
  // gates the job's actual COMPLETED transition.
  scopeCompleted       Boolean   @default(false)
  deficienciesResolved Boolean   @default(false)
  walkthroughCompleted Boolean   @default(false)
  walkthroughNotes     String?
  completedAt          DateTime?
  completedByUserId    String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  job Job @relation(fields: [jobId], references: [id], onDelete: Cascade)
}
```

Matches the workflow plan's field list exactly. `jobId` is `@unique` (one row per job); relation cascades on job delete, matching every other per-job child model in this schema.

## Migration

`20260811183319_add_quality_check` — applied via `npx prisma migrate dev`. Confirmed the generated SQL is purely `CREATE TABLE "QualityCheck"`, `CREATE UNIQUE INDEX "QualityCheck_jobId_key"`, and `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ("jobId") REFERENCES "Project"("id") ON DELETE CASCADE` — no data migration, no backfill required.

## Permissions / capabilities added

- `submitFieldEvidence` — CREW-tier. Grants: `CREW`, `ESTIMATOR` (and above, via the existing `ALL`-capability roles). Gates `submitFieldEvidenceAction`.
- `completeQualityCheck` — office-tier, same rung as `manageJobCosts`. Grants: `ESTIMATOR` and above. **Not** granted to `CREW` — this is the actual enforcement point of "crew evidence never completes the job by itself." Gates `saveQualityCheckAction` and is what `JobDetailPage` reads to decide whether to render the office half of `QualityCheckPanel` as editable.

No side channel: both actions call `requireJobAccess(jobId, "<capability>")`, the same deny-by-default mechanism every other action in this codebase uses.

## Actions / routes / components added or modified

Covered in the Files table above. No new routes — Phase 3 adds no public-facing surface (quality check is entirely an internal crew/office concern, never shown to the homeowner).

## Completion gate

`updateJobStatusAction` now short-circuits any transition to `COMPLETED`: it loads `QualityCheck`'s three office-side booleans, and if any are missing, throws a message naming exactly what's left (e.g. *"Finish the quality check first — still need: the scope of work is done, any deficiencies are resolved, the final walkthrough."*). `JobStatusStepper` already catches thrown errors from this action into local state and displays them inline — no stepper code changes were needed, this is the same mechanism `invoiceSendGaps`-style errors already use elsewhere in the app.

## Design decisions (judgment calls, not explicitly specified)

- **One save action, not a separate "finalize" step.** §20's flow diagram describes review → complete → mark-project-complete as three steps, which could imply a dedicated "finalize" button distinct from checking the boxes. Built instead: a single `saveQualityCheckAction` that always persists the three booleans + notes, and atomically stamps `completedAt`/`completedByUserId` + records `QUALITY_CHECK_COMPLETED` the instant all three become true for the first time (guarded by `!existing?.completedAt`, so it fires exactly once — sticky, like `Quote.acceptedAt`/`ChangeOrder.approvedAt`). Satisfies every literal requirement in §D without an extra UI step. Flagging in case the two-step version was actually wanted.
- **"Eligible jobs/visits" for crew evidence** interpreted as `visit.job.status === "IN_PROGRESS"` — the stage where crew is actively working toward completion, matching that status's own existing description ("Crew is on site. Track progress to completion."). Not explicitly confirmed.
- **Submitter/completer name resolution** — `fieldEvidenceSubmittedByUserId`/`completedByUserId` are plain `String?` columns with no Prisma relation (matching `Quote.approvedByUserId`'s existing precedent). Names are resolved by looking them up against the `team` array the job page already loads for the visit-assignment picker, avoiding an extra query.

## Validation results

- `npm run lint` — **0 errors**, 26 warnings, all pre-existing (`<img>`-vs-`next/image`, two unrelated unused-var warnings). No new warnings introduced.
- `npx tsc --noEmit` — clean, zero errors.
- `npm run build` — succeeds. All routes generated, including `/today`, `/jobs/[jobId]`, `/dashboard`.

## Manual test notes

All done against the live dev server + dev database (job `cmpiuam8b00019kjkypgfvei7`, an approved $16,000 quote, one scheduled visit set to `IN_PROGRESS` for this test), verified both visually in the browser and by reading the database directly after each step.

- **Crew can submit quality evidence from `/today`** — the "Quality check — before you go" panel rendered on the visit card. Checked both "Site cleaned up" and "Photos uploaded," typed a note ("Left a spare bundle of shingles in the garage."), submitted.
- **Crew evidence records `QUALITY_CHECK_EVIDENCE_SUBMITTED`** — confirmed in the database: correct `actorUserId`, `metaJson: null` (no meta needed for this kind).
- **Crew evidence does not complete the job** — confirmed `scopeCompleted`/`deficienciesResolved`/`walkthroughCompleted` all remained `false`, `completedAt` remained `null`, and `Job.status` stayed `IN_PROGRESS` after the crew submission — the office half of the row was completely untouched by the crew write path.
- **Office can see the crew evidence on the job page** — the `QualityCheckPanel`'s "What crew reported" section showed ✓ Site cleaned, ✓ Photos uploaded, the note, and "Submitted Aug 11, 2026 by Nilay Sorathia."
- **Complete Project is blocked until all three office-side checks are true** — clicked "Mark completed" before checking any office boxes: the stepper displayed inline, in red, "Finish the quality check first — still need: the scope of work is done, any deficiencies are resolved, the final walkthrough." — naming exactly what was missing, not a generic refusal.
- **Office can complete `scopeCompleted`, `deficienciesResolved`, and `walkthroughCompleted`** — checked all three boxes, added a walkthrough note, saved. Panel immediately showed a "Completed Aug 11, 2026" badge.
- **`QUALITY_CHECK_COMPLETED` is recorded when office completes final quality check** — confirmed in the database: `completedAt`/`completedByUserId` stamped, exactly one `QUALITY_CHECK_COMPLETED` activity event recorded with the correct actor.
- **Complete Project works once all three checks are true** — reloaded the job page (clearing stale client-side error state from the earlier blocked attempt), clicked "Mark completed" again: succeeded immediately. Stepper now reads "Completed / Job finished. Capture after photos and close out." Confirmed in the database: `Job.status: COMPLETED`, and a `STATUS_CHANGED` activity event (`from: "In progress", to: "Completed"`) recorded after `QUALITY_CHECK_COMPLETED` in the timeline — correct causal order.
- **Both new activity descriptions render correctly** on the dashboard's "Recent activity" feed: "Nilay Sorathia submitted quality check evidence" and "Nilay Sorathia completed the quality check," interleaved correctly with pre-existing Phase 1/2 activity lines (invoice views, additional-work billing, etc.) with no formatting regressions.
- **Existing quote, invoice, change order, additional work, and public document branding flows still work** — spot-checked the job page's roof-scan/measurements tab (model-viewer-adjacent code, untouched and rendering correctly), the public quote page (`/q/[token]`) and public invoice page (`/i/[token]`) — both rendered with correct company branding, line items, and totals, matching the values already recorded in the database from Phase 2 testing.
- **No new hydration/client-only issues** — checked the browser console after a fresh navigation to `/dashboard`; zero errors or warnings.

**Known testing limitation, same category as Phase 2's `window.confirm()` note:** the dev database currently has only one company membership, role `OWNER` (which holds every capability via the computed `ALL` array). This means the browser could not be used to *live*-demonstrate a `CREW`-role user being blocked from `completeQualityCheck`, or a non-`CREW`/non-`ESTIMATOR` role being blocked from `submitFieldEvidence`. Verified instead by code inspection: `CREW` grants are exactly `["completeVisit", "submitFieldEvidence"]` (no `completeQualityCheck`); `saveQualityCheckAction` calls `requireJobAccess(jobId, "completeQualityCheck")`, which throws for any role lacking that capability — the same mechanism already proven live for every other capability-gated action in this codebase (e.g. Phase 2's `editInvoice` gate).

## Intentionally deferred

- Warranty, pre-construction checklist, estimate summary panel, sales pipeline "Contacted," progress tracking, workflow customization, dashboard action center, visual workflow builder — none implemented, per instruction (Phases 4–13).
- No new `ActivityKind` values beyond the two specified (`QUALITY_CHECK_EVIDENCE_SUBMITTED`, `QUALITY_CHECK_COMPLETED`) — no "evidence updated" or "office review edited" events for subsequent saves after the first, matching the sticky-completion design decision above.
- No crew visibility into invoices, change orders, warranty, or customer-facing document actions — the crew `/today` panel surfaces only `siteCleaned`, `photosUploaded`, and a notes field.
- No two-step "save draft then finalize" UI for the office review — see Design decisions above.

## Stop point

Phase 3 complete. Waiting for approval before Phase 4.
