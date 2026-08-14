# Phase 6 — Sales Pipeline `Contacted / Qualified` Stage: Implementation Summary

Implements `docs/AERNOVA_PROJECT_WORKFLOW.md` §4, §14.1, §25 Phase 6 only. Branch: `feature/astryx-integration`. Phases 1–5 (confirmed complete and approved) were re-read from `WORKFLOW_PHASE_1_IMPLEMENTATION.md` through `_5_` before starting; nothing here touches the 3D viewer, roof detection, measurement tools, photogrammetry rendering, or Phase 1–5 code.

Core product rule: one new pipeline stage, `Contacted / Qualified`, sitting between "nobody has answered" (`NEW`) and "actively assessing" (`ASSESSING`). No `Follow-Up`/`Negotiation` stage. `AWAITING_RESPONSE` and `OPENED` stay two separate columns, unchanged.

## Files changed

### Schema
| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `RequestStatus.CONTACTED`, declared between `NEW` and `ASSESSING` (matching §14.1's exact enum listing). |

### Modified
| File | Change |
|---|---|
| `lib/pipeline.ts` | `PIPELINE_STAGES` gains `"CONTACTED"`, inserted after `"LEAD"`. `PIPELINE_STAGE_META.CONTACTED` added (label "Contacted / Qualified", hint "Someone has reached them — worth pursuing."). `stageForRequest()` and `requestStatusForStage()` both gain a `CONTACTED` branch. `pipelineDropTargets()` for request cards extended to route `CONTACTED` in and out of `LEAD`/`ASSESSING`/`LOST`, while keeping the existing direct `LEAD ⇄ ASSESSING` hop intact (see "Request action changes" below). |
| `lib/request-status.ts` | `REQUEST_STATUS_META.CONTACTED` added (label "Contacted / Qualified", description "Someone has reached them, and it's worth pursuing.", same `IN_FLIGHT`-style badge tone as `NEW`/`ASSESSING`). `OPEN_REQUEST_STATUSES` gains `CONTACTED` — it's still somebody's problem. `RequestFilter` type and `REQUEST_FILTERS` array both gain a `CONTACTED` entry, positioned between `NEW` and `ASSESSING`. `matchesRequestFilter()` needed no change — it already falls through to a generic `status === filter` comparison. |
| `components/dashboard/requests-browser.tsx` | Added a "Mark Contacted" `StatusButton` for `NEW` requests (writes `CONTACTED` through the existing `updateRequestStatusAction`). The existing "I'm looking at it" button's visibility condition widened from `status === NEW` to `status === NEW \|\| status === CONTACTED`, so it still appears on a `CONTACTED` request. |
| `app/(dashboard)/pipeline/page.tsx` | The board's `prisma.request.findMany` status filter widened from `["NEW", "ASSESSING", "CLOSED"]` to `["NEW", "CONTACTED", "ASSESSING", "CLOSED"]`, so contacted requests are actually fetched and bucketed onto the board. |
| `tests/pipeline.test.ts` | Extended existing `stageForRequest`/`requestStatusForStage`/`pipelineDropTargets` tests to cover `CONTACTED`; added two new tests (drop-target symmetry for `CONTACTED`, and an explicit assertion that the direct `LEAD → ASSESSING` hop still exists). |
| `tests/request-status.test.ts` | Extended the "open statuses" test to include `CONTACTED`; added two new tests (the exact label/meaning text, and that `CONTACTED` follows the same 3-day overdue clock as `NEW`). |

No changes to `components/dashboard/measure-viewer.tsx`, `hub-model-viewer.tsx`, roof detection/extraction, photogrammetry rendering, the quote builder, `components/dashboard/pipeline-board.tsx` (the board component renders columns generically off `PIPELINE_STAGES`, so the new column needed zero board-component changes), `app/(dashboard)/pipeline/actions.ts` (salesperson assignment, untouched), `components/dashboard/new-requests-summary.tsx` (deliberately still filters on `RequestStatus.NEW` only — see "Verified, not changed" below), `app/(public)/request/[companySlug]/actions.ts` (still creates every public-form submission as `NEW` — correct, nobody has been contacted yet), or any Phase 1–5 file.

## Schema changes

Additive only; `@@map("Project")` and `@@map("Proposal")` untouched (unaffected — neither model was touched this phase).

```prisma
enum RequestStatus {
  NEW
  CONTACTED
  ASSESSING
  CONVERTED
  CLOSED
}
```

## Migration

`20260812032605_add_request_status_contacted` — applied via `npx prisma migrate dev`. Generated SQL is a single `ALTER TYPE "RequestStatus" ADD VALUE 'CONTACTED';` — no data migration, no backfill, nullable-safe by construction (an enum addition, not a column). Note: Postgres appends a new enum value at the physical end of the type's storage order regardless of where it's declared in `schema.prisma`; nothing in this codebase sorts by the raw enum's ordinal (every ordering — `PIPELINE_STAGES`, `STATUS_FLOW`, etc. — is a JS-side array), so this has no observable effect. Same non-issue Phase 1's `ActivityKind` additions already established as fine.

## Pipeline mapping changes

```
NEW       → LEAD
CONTACTED → CONTACTED   (new)
ASSESSING → ASSESSING
CLOSED    → LOST
```

`PIPELINE_STAGES` (9 stages, matching §4's "Revised pipeline, 9 stages" exactly):

```
LEAD → CONTACTED → ASSESSING → DRAFT → AWAITING_RESPONSE → OPENED → CHANGES_REQUESTED → WON / LOST
```

`AWAITING_RESPONSE` and `OPENED` remain two separate columns (unchanged — neither merged nor renamed). `CHANGES_REQUESTED` unchanged. No `FOLLOW_UP`/`NEGOTIATION` stage added.

## Request action changes

**"Mark Contacted" is additive, not a replacement.** A `NEW` request now shows four actions: "Turn into a job" (direct convert, unchanged), **"Mark Contacted"** (new — writes `CONTACTED`), "I'm looking at it" (writes `ASSESSING`, unchanged), "Not going ahead" (writes `CLOSED`, unchanged). A `CONTACTED` request shows three: "Turn into a job", "I'm looking at it", "Not going ahead" — no "Mark Contacted" button, since it's already contacted.

**Two existing direct-shortcut paths are deliberately preserved, per the task's own instruction** ("do not bypass `CONTACTED` unless an existing direct-convert/start-assessing path intentionally allows it... if existing code already supports starting assessment directly from `NEW`, do not break it"):

1. **`NEW` → `ASSESSING` directly, via "I'm looking at it".** This button already skipped straight from a brand-new request to Assessing before this phase; it still does. A roofer who answers the phone and immediately drives out to look doesn't need to click through an intermediate "I called them" step first — the shortcut exists because that's a real, common case, not an oversight.
2. **`NEW` → `CONVERTED` directly, via "Turn into a job".** A request can still be turned straight into a job without ever passing through `CONTACTED` or `ASSESSING` — unchanged, `convertRequestToJobAction` was not touched.

**No new server action, no new capability.** Both the button and the pipeline board's drag-and-drop write through the same, already-existing `updateRequestStatusAction` (gated on `editJob`, unchanged) — `CONTACTED` is just one more value that function already accepted generically (it validates against `Object.values(RequestStatus)`, so it needed no code change at all to accept the new value; only the UI-side triggers for it were added).

## UI / badge / filter changes

- **Pipeline board**: `Contacted / Qualified` renders as its own column, positioned right after `Lead`, with a correct live count and the same calm "Nothing here." empty-state copy every other column already uses — no new column-level code was needed, since `PipelineBoard` iterates `PIPELINE_STAGES` generically.
- **Drag-and-drop / keyboard "Move"**: a `LEAD` card can be dropped on `CONTACTED`, `ASSESSING`, or `LOST`; a `CONTACTED` card can be dropped on `LEAD`, `ASSESSING`, or `LOST`; an `ASSESSING` card can be dropped back to `LEAD`, `CONTACTED`, or `LOST`. This both adds `CONTACTED` as a reachable stage from its neighbours and preserves the pre-existing `LEAD ⇄ ASSESSING` direct hop (see above) — nothing that worked before stopped working.
- **Request list filter** (`requests-browser.tsx`'s `<select>`): gained a "Contacted / Qualified" option between "New" and "Looking at it".
- **Badges**: `REQUEST_STATUS_META.CONTACTED.badge` uses the same `text-ink-secondary bg-surface-lifted` tone as `NEW`/`ASSESSING` — state, not achievement, reads in ordinary ink per this file's own existing doctrine; `confirm`/tonal-green stays reserved for `CONVERTED`.
- **No raw enum labels**: `CONTACTED` never renders bare anywhere it reaches a screen — pipeline column header reads "Contacted / Qualified" (`PIPELINE_STAGE_META`), the request badge and filter both read "Contacted / Qualified" (`REQUEST_STATUS_META`/`REQUEST_FILTERS`). Covered by the existing `tests/request-status.test.ts` exhaustive check ("no status label is a database enum"), which now iterates `CONTACTED` automatically.

## Activity/timeline

**No new `ActivityKind`, and no activity recorded for "Mark Contacted."** Checked `updateRequestStatusAction` before starting: it has never recorded any activity event for any status change (`NEW → ASSESSING`, `→ CLOSED`, etc. all write silently) — only `createRequestAction` (`REQUEST_CREATED`) and `convertRequestToJobAction` (`REQUEST_CONVERTED`) record activity. Per the task's explicit instruction ("if they do not [record activity], avoid inventing timeline scope for this phase unless necessary"), `CONTACTED` follows the same silent pattern as every other status transition this action already handles — extending the existing pattern faithfully means changing nothing here, not adding something new.

## Verified, not changed

- **`components/dashboard/new-requests-summary.tsx`** (the dashboard's "New requests" tile) — deliberately still filters on `RequestStatus.NEW` only. This is correct, not an oversight: the tile's whole point is "brand new, nobody's touched it yet," and a `CONTACTED` request has, by definition, been touched. Adding `CONTACTED` to this filter would blur exactly the distinction the tile exists to surface.
- **`app/(public)/request/[companySlug]/actions.ts`** (the public-facing "Request a Quote" form) — still creates every submission as `RequestStatus.NEW`. Correct: nobody has reached the lead yet at the moment they submit a form; `CONTACTED` only becomes true once a person on the office side acts.
- Searched the full `.ts`/`.tsx` tree for every `RequestStatus` reference (7 files) before starting, and again with a graphify query for anything conceptually connected (dashboard tiles, client-insights, seeds) that a plain grep might miss — found nothing beyond the 7 files, all of which are covered above. No seed script (`prisma/seed.ts`, `seed.mjs`, `seed-catalog.ts`) enumerates `RequestStatus` at all.

## Validation results

- `npm run lint` — **0 errors**, 26 warnings, identical list to every prior phase (all pre-existing `<img>`-vs-`next/image` and unused-var warnings in files this phase didn't touch).
- `npx tsc --noEmit -p .` — clean, zero errors (no `typecheck` script exists in `package.json`).
- `npm test` (`node --test tests/*.test.ts`) — **379 passed, 2 pre-existing failures, 0 new failures.** Went from Phase 5's reported 375/377 to 379/381 — the 4 new tests added this phase (2 in `pipeline.test.ts`, 2 in `request-status.test.ts`) all pass; the same two pre-existing, unrelated failures Phase 5 documented are still exactly the same two, neither touched by this phase:
  - `tests/action-guards.test.ts` — flags `app/(dashboard)/notifications-actions.ts` for a bare company check.
  - `tests/permissions.test.ts` — a stale assertion expecting `CREW`'s capability list to be exactly `["completeVisit"]` (Phase 3 added `submitFieldEvidence` without updating this test).
  Both remain out of scope per "avoid broad refactors" and "do not refactor Phases 1–5."
- `npm run build` — succeeds. All 34+ routes generated, including `/requests`, `/requests/new`, and `/pipeline`. Only non-blocking output is the same pre-existing, unrelated Sentry sourcemap-upload rejection every prior phase has also seen.

## Manual test notes

Done against the live dev server + dev database (had to restart the dev server once — same pre-migration Prisma Client issue every prior phase's migration has hit; `npx prisma migrate dev` had already regenerated the client on disk correctly).

- **A new request starts as `NEW` and appears in the `Lead` column** — created a real request ("Phase 6 pipeline test request" / "Phase 6 Test Lead") through the actual `/requests/new` form (not seeded directly): landed with a "New" badge, and the Pipeline board's `Lead` column would have shown it (verified via the DB-backed count/card render at each subsequent step below).
- **"Mark Contacted" changes it to `CONTACTED`** — clicked the button on the `/requests` list: badge changed to "Contacted / Qualified" immediately, and the "Mark Contacted" button itself disappeared (already contacted); "Turn into a job," "I'm looking at it," and "Not going ahead" all remained.
- **The contacted request appears in the `Contacted / Qualified` column** — confirmed live on `/pipeline`: new column rendered directly after `Lead`, count `1`, card visible with correct title/client name.
- **From `CONTACTED`, the existing "Start Assessing" flow still works** — clicked "I'm looking at it" on the now-`CONTACTED` request: badge changed to "Looking at it" (the pre-existing `ASSESSING` label, unchanged), and on `/pipeline` the card moved from `Contacted / Qualified` (which correctly returned to "Nothing here.", count `0`) into `Assessing` (count `1`).
- **`AWAITING_RESPONSE` and `OPENED` remain separate columns** — scrolled the live board: `Draft`, `Awaiting response`, `Opened` (showing a real existing job, "36 wetherby," with a `VIEWED` quote), `Changes asked for`, `Won` (showing the two real approved-quote jobs from Phase 1–5 testing), and `Lost` all rendered as distinct columns in the correct order, none merged or renamed.
- **No new Follow-Up/Negotiation column exists** — confirmed by scrolling the entire board end to end; exactly 9 columns, matching §4's specified order.
- **Request filters/counts/status badges handle `CONTACTED`** — inspected the filter `<select>`'s live DOM: options read New / Contacted / Qualified / Looking at it / Became a job / Closed, in that order, with `CONTACTED` correctly positioned between New and Looking at it.
- **Existing Phase 1–5 flows still work** — the `Won` column's two job cards (one with a real `$16,000.00` approved quote) rendered correctly with their quote amounts, confirming `stageForJob` and the quote-approval-driven pipeline logic are untouched; the "Opened" job card linked correctly to its quote page.
- **No new console errors or hydration/client-only errors** — checked the browser console on `/requests`, `/requests/new`, and `/pipeline` (fresh navigations, not just soft transitions); zero errors on any of the three.

## Intentionally deferred

- Sales/financial mini-cards, financial completion panel, progress tracking, warranty, workflow customization, dashboard action center, visual workflow builder — none implemented, per instruction (Phases 7–13).
- The two pre-existing, unrelated test failures (`tests/action-guards.test.ts`, `tests/permissions.test.ts`) were left exactly as Phase 5 found and documented them — fixing either would mean touching `notifications-actions.ts` or `lib/permissions.ts`, neither in Phase 6's scope.
- No new `ActivityKind`, no new capability, no new `JobStatus` — none were needed and none were added, per instruction.
- The test artifact created during manual verification ("Phase 6 pipeline test request" / "Phase 6 Test Lead," now sitting in the `Assessing` column) was left in the dev database, not reverted — consistent with the precedent every prior phase's manual-test notes already established for this environment.

## Stop point

Phase 6 complete. Waiting for approval before Phase 7.
