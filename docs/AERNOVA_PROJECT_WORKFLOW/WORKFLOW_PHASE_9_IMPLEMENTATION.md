# Phase 9 — Progress Tracking: Implementation Summary

Implements `AERNOVA_PROJECT_WORKFLOW.md` §7.8, §12, §14.5, §22, §25 Phase 9 only. Branch: `feature/astryx-integration`. Phases 1–8 (confirmed complete and approved) were re-read from `WORKFLOW_PHASE_1_IMPLEMENTATION.md` through `_8_` before starting; nothing here touches the 3D viewer, roof detection, measurement tools, photogrammetry rendering, the quote builder, or Phase 1–8 code beyond the two integration points the job page and `/today` always need.

Core product rule: progress tracking is optional and never blocks anything. Default is computed visit completion ("3 of 5 visits completed"); two independent, optional manual overrides — a crew five-state picker from `/today`, and an office exact-percentage override on the job page — sit on top of it, per §7.8's own decision.

## Files changed

### Schema
| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `enum JobProgressState` (5 values, exactly as specified) and two nullable `Job` columns: `progressState JobProgressState?`, `progressPercent Int?`. |

### New
| File | Purpose |
|---|---|
| `lib/job-progress.ts` | Pure helper — `jobProgressDisplay()`, `jobProgressStateLabel()`, `PROGRESS_STATE_META`/`PROGRESS_STATE_OPTIONS`. Implements the exact precedence rule and the calm empty state. |
| `app/(dashboard)/today/progress-actions.ts` | `saveJobProgressStateAction` — crew's one write path, gated on `submitFieldEvidence`. |
| `app/(dashboard)/jobs/[jobId]/progress-actions.ts` | `saveJobProgressPercentAction` — office's one write path, gated on `editJob`. |
| `components/today/progress-picker.tsx` | `ProgressPicker` — the crew's five-state, collapsible, mobile-first control on `/today`. |
| `components/dashboard/job-progress-panel.tsx` | `JobProgressPanel` — the office-facing read/review card on the job page, with an editable percent form for `editJob`-capable roles. |
| `tests/job-progress.test.ts` | 8 tests covering the full precedence chain and every edge case named in the task. |

### Modified
| File | Change |
|---|---|
| `lib/activity.ts` | `ActivityMeta` gains `source`/`previousPercent`/`nextPercent` (reusing the existing `from`/`to` fields for the crew's plain-language state change — the same shape `STATUS_CHANGED` already uses). One new `describeActivity()` case for `PROGRESS_UPDATED`. |
| `app/(dashboard)/today/page.tsx` | Renders `ProgressPicker` after `QualityEvidencePanel`, gated on `visit.job.status === "IN_PROGRESS" && visit.kind === "WORK"` — same production-stage window, work-visits-only. No new query — `visit.job.progressState` was already loaded (a nested `include` returns full scalar fields by default). |
| `app/(dashboard)/jobs/[jobId]/page.tsx` | Computes `progressDisplay` via `jobProgressDisplay()` from data already on the page (`job.progressPercent`, `job.progressState`, `job.visits.map(...)` — no new query). Renders `JobProgressPanel` directly after `VisitPanel`, unconditionally (its own empty state handles a job with nothing to report). |

No changes to `components/dashboard/measure-viewer.tsx`, `hub-model-viewer.tsx`, roof detection/extraction, photogrammetry rendering, the quote builder, `lib/job-status.ts`, `app/(dashboard)/jobs/[jobId]/status-actions.ts`, `app/(dashboard)/today/quality-actions.ts`, `lib/quality-check.ts`, `lib/permissions.ts` (no new capability), or any Phase 1–8 file.

## Schema changes

Additive only; `@@map("Project")` and `@@map("Proposal")` confirmed untouched (unaffected — neither `@@map` line was touched).

```prisma
enum JobProgressState {
  NOT_STARTED
  IN_PROGRESS
  MOSTLY_COMPLETE
  READY_FOR_QUALITY_CHECK
  COMPLETED
}

// On Job:
progressState   JobProgressState?
progressPercent Int?
```

## Migration

`20260812040404_add_job_progress_tracking` — applied via `npx prisma migrate dev`. Generated SQL is `CREATE TYPE "JobProgressState" AS ENUM (...)` plus `ALTER TABLE "Project" ADD COLUMN "progressPercent" INTEGER, ADD COLUMN "progressState" "JobProgressState"` — no data migration, no backfill, nullable-safe by construction.

## Progress-display precedence (`lib/job-progress.ts`)

Exactly as specified, and unit-tested end to end:

1. **`progressPercent` (office), if set** — the primary label is `"{n}%"`. The crew's own `progressState`, if also set, is never hidden — it appears in `crewStateLabel` and in the secondary description ("Set by the office. Crew last reported: ready for quality check.") — the two signals are independent, not one overriding the other's *visibility*, only its *primacy*.
2. **`progressState` (crew), if `progressPercent` is null** — the primary label is the plain-language state (`jobProgressStateLabel()`), never the raw enum.
3. **Computed visit completion, if both are null** — only when there are **2 or more** non-cancelled `WORK` visits (§7.8: "already computable for any job with more than one Visit"). `ASSESSMENT` visits and `CANCELLED` ones are excluded from both the numerator and denominator. Produces `"{completed} of {total} visits completed"` plus a derived percent for the bar.
4. **Calm empty state** — zero or one meaningful work visit, and no manual signal: `"No progress reported yet"`, never a blank UI.

## Crew `/today` behavior

- `ProgressPicker` renders only on a `WORK` visit whose job is `IN_PROGRESS` — the same window `QualityEvidencePanel` already uses, directly below it.
- Collapsed by default (shows the current state, or "How's it going?"); expands into a `fieldset`/`legend`-grouped set of five large (`px-4 py-3.5`, exceeding the 44px touch-target minimum), full-width toggle buttons — no percentage input anywhere near it, no money, no invoices, no change orders, no warranty, no customer-facing or legal action.
- `saveJobProgressStateAction` is gated on `submitFieldEvidence` — the same crew-tier capability the quality-evidence panel already uses, reused rather than adding a new one.
- Writes only `Job.progressState`. **Verified live and in the database**: `Job.status` stayed `IN_PROGRESS` (untouched), the `QualityCheck` row stayed `null` (never created or touched), and `Job.progressPercent` stayed independently `null` throughout.
- Records `PROGRESS_UPDATED` with `{ source: "crew", from: <previous label or undefined>, to: <new label> }` — skipped entirely when the submitted state equals what's already saved (no-op guard, same "a history row should mean something happened" reasoning `updateJobStatusAction` already applies).

## Office override behavior

- `JobProgressPanel` always renders on the job page (not gated by job status) — its own empty state already handles a job with nothing to report, so a status-based gate would just duplicate that logic.
- The percent form only renders for `editable` (`can(role, "editJob")`) — the same tier the Pre-Construction Checklist already uses for an office judgment call.
- Blank + Save clears `progressPercent`; the display then falls back to the crew's state or the computed visit count — **verified live**: clearing 72% on the test job immediately revealed "Mostly complete" (the crew signal set moments earlier), exactly as specified.
- **A real bug was found and fixed during manual testing**: the number input originally carried native `min={0} max={100}` attributes. Chrome's own constraint validation silently blocked submission of an out-of-range value (e.g. "150") *before* it ever reached the server action — confirmed by checking the dev server's request log, which showed zero invocations of `saveJobProgressPercentAction` for those attempts, only the page's background `unreadNotificationCountAction` polling. This meant the task's own "Invalid office percentages are rejected with clear validation" requirement was silently unmet in the common case: no custom error text ever appeared, only (if anything) a native browser tooltip. Fixed by removing `min`/`max` from the input, letting every submission reach `saveJobProgressPercentAction`'s own validation, matching this codebase's established convention — grepped every other numeric `<input type="number">` in the app and found none combine `min`/`max` with custom server-side validation messaging; they either use no bounds at all (server floors/validates) or aren't paired with a custom error path. **Re-verified live after the fix**: typing "150" and saving now correctly shows "Enter a whole number from 0 to 100, or leave it blank to clear it." in the same red error-text style every other form on this page already uses.
- Records `PROGRESS_UPDATED` with `{ source: "office", previousPercent, nextPercent }` — same no-op guard (identical value, including null-to-null, records nothing).

## Activity/timeline behavior

`describeActivity()`'s new case reads `meta.source` to pick the sentence: `"{who} set progress to {n}%"` / `"{who} set progress to no percentage"` for office, `"{who} updated progress to {state, lowercased}"` for crew. **Verified live** on the dashboard's Recent Activity feed: three real events appeared, correctly interleaved with pre-existing Phase 1–8 activity (an Additional Work invoice send, a request, a completed quality check) with no formatting regressions:

- "Nilay Sorathia set progress to 72%"
- "Nilay Sorathia set progress to no percentage"
- "Nilay Sorathia updated progress to mostly complete"

No enum name appeared anywhere in the feed. The no-op guard was also confirmed live: repeated failed "150" submission attempts (before and after the validation fix) produced **zero** additional `PROGRESS_UPDATED` rows — only the three real changes are in the database.

## Validation results

- `npm run lint` — **0 errors**, 26 warnings, identical list to every prior phase (all pre-existing, in files this phase didn't touch).
- `npx tsc --noEmit -p .` — clean, zero errors (no `typecheck` script exists in `package.json`).
- `npm test` (`node --test tests/*.test.ts`) — **406 passed, 2 pre-existing failures, 0 new failures.** Went from Phase 8's reported 398/400 to 406/408 — the 8 new tests in `tests/job-progress.test.ts` all pass; the same two pre-existing, unrelated failures every prior phase since Phase 5 has documented are still exactly the same two:
  - `tests/action-guards.test.ts` — flags `app/(dashboard)/notifications-actions.ts` for a bare company check.
  - `tests/permissions.test.ts` — a stale assertion expecting `CREW`'s capability list to be exactly `["completeVisit"]` (Phase 3 added `submitFieldEvidence` without updating this test).
  Both remain out of scope per "avoid broad refactors" and "do not refactor Phases 1–8." Notably, the new `app/(dashboard)/today/progress-actions.ts` and `app/(dashboard)/jobs/[jobId]/progress-actions.ts` were **not** flagged by `action-guards.test.ts`'s "no bare company check" scan — confirming both new action files use `requireJobAccess` correctly.
- `npm run build` — succeeds. All 34+ routes generated, including `/today` and `/jobs/[jobId]`. Only non-blocking output is the same pre-existing, unrelated Sentry sourcemap-upload rejection every prior phase has also seen.

## Manual test notes

Done against the live dev server + dev database (schema changed this phase, so the dev server was restarted once to pick up the regenerated Prisma Client — same one-time step every migrating phase has needed).

- **Visit-count fallback** — created 5 real `WORK` visits on a job (3 `COMPLETED`, 2 `SCHEDULED`, no manual signals set): the job page correctly showed "3 of 5 visits completed" with a 60%-filled progress bar using the exact `bg-instrument`/`h-3`/`bg-ground/70` convention already established in `job-intelligence.tsx` (matched, not merely similar, after a review fix — see below).
- **Office percent set/clear/precedence** — set 72%: display correctly switched to "72%" / "Set by the office," bar updated to 72%. Cleared it: display correctly fell back to "3 of 5 visits completed" again.
- **Invalid office percentage rejected with clear validation** — see the bug/fix write-up above; re-verified live after the fix with the exact custom error text rendering.
- **Crew picker, all five states available** — expanded `ProgressPicker` on `/today` for a real `WORK` visit on an `IN_PROGRESS` job: all five options ("Not started," "In progress," "Mostly complete," "Ready for quality check," "Completed") rendered as large tappable cards; selecting "Mostly complete" highlighted it and enabled the Save button (disabled while nothing is selected).
- **Crew save correctness, verified in the database directly** — after saving "Mostly complete" from `/today`: `Job.progressState` was `MOSTLY_COMPLETE`; `Job.status` was still `IN_PROGRESS` (untouched); the `QualityCheck` row was still `null` (never created, confirming the crew progress save never touches quality check); `Job.progressPercent` was still independently `null`.
- **Office percent and crew state stay independent** — set 72% (office), then separately saved "Mostly complete" (crew): the office write never touched `progressState`, and the crew write never touched `progressPercent` — confirmed both by reading the database after each step and by the display correctly re-prioritizing to the crew state the moment the office percent was cleared.
- **`PROGRESS_UPDATED` activity, human-readable, no spam** — three real events recorded (72% set, cleared, crew "Mostly complete"), all rendering correctly on the dashboard's Recent Activity feed in plain language; zero extra events from repeated invalid/retry submissions.
- **Existing Phase 1–8 flows still work** — re-checked the same test job: Phase 7's Sales/Financial mini-cards rendered unchanged above the new Progress panel; the Quality Check panel below it still correctly read "Nothing submitted from the field yet" (untouched by the progress writes); the workflow stepper's dropdown and "Mark completed" button were both still present and functional.
- **No raw enum names** — read `lib/job-progress.ts`, `lib/activity.ts`'s new case, `progress-picker.tsx`, and `job-progress-panel.tsx` end to end: every label is either `PROGRESS_STATE_META[...].label` or a plain string this phase wrote directly; no `.progressState`/`.status` value is ever interpolated raw.
- **No new console errors or hydration/client-only errors** — checked the browser console on fresh navigations to `/today` and the job page, before and after every write; zero errors throughout. Both new client components (`ProgressPicker`, `JobProgressPanel`) follow the exact `useActionState` pattern already established by `QualityEvidencePanel`/`PreConstructionChecklistPanel`, so there was no new hydration boundary to get wrong.
- **CREW / non-`editJob` gating not live-tested** — same known limitation every prior phase has documented (the dev database has only one company membership, `OWNER`). Verified by code inspection instead: `saveJobProgressStateAction` gates on `submitFieldEvidence` (`CREW` has it, per `lib/permissions.ts`, unchanged this phase); `saveJobProgressPercentAction` gates on `editJob` (`CREW` does not have it); `JobProgressPanel`'s percent form is conditioned on the same `editable` flag already proven live for the Pre-Construction Checklist.

## Intentionally deferred

- Warranty, workflow customization, dashboard action center, visual workflow builder — none implemented, per instruction (Phases 10–13).
- Progress was **not** added to `jobGaps()`, any status-advancement check, the quality-check completion gate, or any invoice/warranty/closeout flow — confirmed by grep: no file outside this phase's own new files reads `progressState` or `progressPercent`.
- The two pre-existing, unrelated test failures (`tests/action-guards.test.ts`, `tests/permissions.test.ts`) were left exactly as Phases 5–8 found and documented them.
- No new capability, no new `JobStatus`, no new `QuoteStatus`/`InvoiceStatus` — none were needed and none were added, per instruction. `ActivityKind.PROGRESS_UPDATED` was not newly added — Phase 1 already reserved it; this phase is the first to write it.

## Stop point

Phase 9 complete. Waiting for approval before Phase 10.
