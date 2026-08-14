# Phase 12 — Dashboard Action Center: Implementation Summary

Implements `docs/AERNOVA_PROJECT_WORKFLOW.md` §3, §11, §15, §25 Phase 12 only. Branch: `feature/astryx-integration`. Phases 1–11 (confirmed complete and approved) were re-read from `WORKFLOW_PHASE_1_IMPLEMENTATION.md` through `_11_` before starting; nothing here touches the 3D model viewer, roof detection, measurement tools, photogrammetry rendering, the quote builder, or Phase 1–11 code beyond the two integration points this phase needs (the dashboard page, and `/jobs` gaining an `?attention=` filter).

Core product rule: unify the dashboard's scattered "needs your attention" signals into one list — a display/read layer over facts every one of these already tracked, not a new workflow engine, notification table, or background job.

`graphify` was queried against the existing dashboard/notification/activity graph before implementation (BFS from `PipelineSnapshot()`/`NewRequestsSummary()`/`ReceivablesSummary()`/`notification-bell.tsx`/`activity.ts`), confirming the call graph already understood from direct code reading — no hidden call sites, no surprises. `impeccable` was consulted on the design system's own conventions (the Astryx `List`/`ListItem` pattern already established by `RecentActivity` and the notification bell's dropdown, and the "status quartet" `bg-{tone}/10` token convention documented in `docs/DESIGN.md`) before writing the new UI, so the Action Center reuses those exactly rather than inventing a parallel pattern. Live browser testing (see Manual test notes) exercised all four item types simultaneously and confirmed the low-priority neutral dot reads calm beside the high-priority danger dot, exactly as the product requirement asks.

## Files changed

### New
| File | Purpose |
|---|---|
| `lib/disabled-stage-jobs.ts` | `sortDisabledStageJobs()` (pure, the full §15 six-level tiebreak) + `getDisabledStageJobs(companyId)` (the one Prisma query, shared by the dashboard's count and `/jobs?attention=…`'s full list). |
| `lib/dashboard-action-center.ts` | `buildActionCenterItems(facts)` — pure derivation from narrow input facts to `ActionCenterItem[]`, already sorted high → medium → low. |
| `components/dashboard/dashboard-action-center.tsx` | `DashboardActionCenter` — the "Needs attention" list, using the same Astryx `List`/`ListItem` primitives `RecentActivity` and the notification bell already use. |
| `components/dashboard/disabled-stage-jobs-list.tsx` | `DisabledStageJobsList` — a deliberately plain, unsortable list for the filtered jobs view (see "Why not `JobsBrowser`" below). |
| `tests/disabled-stage-jobs.test.ts` | 7 tests covering every level of the sort tiebreak plus non-mutation. |
| `tests/dashboard-action-center.test.ts` | 11 tests covering empty state, each item's singular/plural copy, the `viewMoney` gate, priority ordering, and no-raw-enum. |

### Modified
| File | Change |
|---|---|
| `app/(dashboard)/dashboard/page.tsx` | Fetches the narrow facts (overdue invoices via `agedReceivables()` reuse, new-request count, changes-requested-quote count, disabled-stage job count), gates the two money facts on `can(role, "viewMoney")`, calls `buildActionCenterItems()`, renders `<DashboardActionCenter>`. Removed `<ReceivablesSummary>`/`<NewRequestsSummary>` from the grid; `<PipelineSnapshot>` and `<RevenueTrendSummary>` are untouched. |
| `app/(dashboard)/jobs/page.tsx` | Reads `?attention=disabled-workflow-stage`; when present, renders a small `DisabledWorkflowStageJobs` branch (fetches `getDisabledStageJobs()`, enriches with client/address/effective labels, renders `<DisabledStageJobsList>`) instead of the normal `<JobsBrowser>`. Normal behavior (no `attention` param) is byte-for-byte unchanged. |

No changes to `schema.prisma` (no migration this phase — a deliberate constraint per the plan), `lib/job-status.ts`, `lib/workflow-stages.ts`, `lib/pipeline.ts`, `lib/notifications.ts`, `notification-bell.tsx`, `notifications-actions.ts`, `components/dashboard/jobs-browser.tsx`, `components/dashboard/pipeline-snapshot.tsx`, `components/dashboard/revenue-trend-summary.tsx`, or any Phase 1–11 file. `components/dashboard/receivables-summary.tsx` and `new-requests-summary.tsx` are left in the codebase, untouched, simply no longer rendered on `/dashboard` — "adapt/stop using," not "delete," per the instruction not to discard tested logic.

## Components/helpers added

- **`ActionCenterItem`** — `{ id, priority, tone, title, description?, count?, href }`, exactly the shape suggested in the prompt.
- **`buildActionCenterItems(facts)`** — pure, zero Prisma. Four possible items, each added only when its count is `> 0`:
  1. Overdue invoices (`high` / `danger`) — reuses `agedReceivables()`'s exact math, the same one `ReceivablesSummary` used.
  2. New requests (`medium` / `caution`) — reuses `RequestStatus.NEW` count, the same one `NewRequestsSummary` used.
  3. Changes requested (`medium` / `caution`) — quotes at `QuoteStatus.CHANGES_REQUESTED`. This is the one existing pipeline signal promoted into the Action Center; see "Pipeline follow-up decision" below for why nothing else from `PipelineSnapshot` was.
  4. Disabled-stage jobs (`low` / `neutral`) — Phase 11's counterpart, exact §15 copy.
  Returned pre-sorted by priority (stable sort — same-priority items keep the order they were pushed in).

## Dashboard item types implemented

Exactly the four named above. No fifth, speculative type was added. "Pipeline follow-up" was deliberately narrowed to `CHANGES_REQUESTED` only — `lib/pipeline.ts`'s `PipelineStage`/`stageForJob`/`stageForRequest` classify *where* something sits, with no time-based staleness or "needs a response" flag beyond what a specific status already means. `CHANGES_REQUESTED` is the one stage that unambiguously means "the homeowner is waiting on us" — every other stage (`LEAD`, `ASSESSING`, `DRAFT`, `AWAITING_RESPONSE`, `OPENED`) is just where a deal currently sits, not evidence it's stuck, so promoting any of those into "needs attention" would have been inventing a staleness heuristic the plan explicitly said not to add.

## Data-loading/query changes

`app/(dashboard)/dashboard/page.tsx`: one `Promise.all` of five independent queries (jobs, invoices for aging, new-request count, changes-requested count, `getDisabledStageJobs()`), preceded by `sweepOverdueInvoices()` (same idempotent sweep-on-view `/invoices` already runs, so `OVERDUE` never goes stale on a company that only ever opens the dashboard). `getDisabledStageJobs()` itself is exactly 3 queries — `CompanyWorkflowStage` (disabled rows), `Job` (matching ids), `ActivityEvent` (latest `STATUS_CHANGED` per job via `distinct: ["jobId"], orderBy: {createdAt: "desc"}`) — no N+1 regardless of how many jobs are in a disabled stage. `app/(dashboard)/jobs/page.tsx`'s filtered branch reuses the same function, then does one more `Job` query (by id, for client/address) and one `CompanyWorkflowStage` query (for label resolution) — four queries total for the filtered view, independent of the normal `/jobs` path.

## How old dashboard summaries were unified

`ReceivablesSummary` and `NewRequestsSummary` were each a standalone "look at this" tile whose entire payload is now one Action Center row — keeping both would have been exactly the "multiple competing sections that repeat the same facts" the plan explicitly forbids. `PipelineSnapshot` and `RevenueTrendSummary` were kept exactly as they were: both answer "where does the business stand right now" across *every* stage/window, including non-urgent ones (`LEAD: 3`, `DRAFT: 1`), which is a different question than "what needs me to act" — the plan's own "keep non-attention metrics only if they still have a clear purpose" instruction covers both directly. The dashboard's new layout puts the Action Center at `lg:col-span-2` beside `RevenueTrendSummary` (`1` column) — the attention list gets the visual weight, the trend figure stays a secondary read — with `PipelineSnapshot` and `RecentActivity` unchanged below.

## Notification bell integration decision

**No distinct "unread notifications" Action Center item was added**, and the bell (`lib/notifications.ts`, `notification-bell.tsx`, `notifications-actions.ts`) is completely untouched. Reasoning: `NOTIFICATION_KINDS` (`QUOTE_SENT`, `QUOTE_VIEWED`, `QUOTE_APPROVED`, `QUOTE_DECLINED`, `INVOICE_SENT`, `INVOICE_PAID`, `PAYMENT_RECORDED`, `REQUEST_CREATED`) is an FYI-milestone log, not an actionable-item list — most of those kinds (a quote being viewed, an invoice being paid) are good-news events with nothing left to do, and the one kind that *is* actionable (`REQUEST_CREATED`) is already the Action Center's own "new requests" item, sourced independently. The existing model has no severity field to sort by (the instruction explicitly forbids inventing one), and there is no dedicated notifications *page* to link an Action Center row to — the bell's popover is the only surface, reachable only from the header, not a URL. Duplicating "N unread" as a second badge right below the bell that already shows the same number is exactly the "awkward duplication" the instruction warns against. `unreadNotificationCount()` was confirmed read-only (a pure `.count()`, no `notificationsSeenAt` write) — safe to reuse if a future phase finds a real, non-duplicative use for it, but Phase 12 doesn't.

## Disabled-stage item behavior

Query: `CompanyWorkflowStage` rows with `isEnabled: false` for the company → `Job.status IN (those jobStatus values)` → done. A job is included only while its *current* status matches a disabled one; disabling a stage nothing currently occupies produces zero matching jobs (verified live); a job moved out of a disabled stage stops matching the instant its `status` changes (verified live — the Action Center count and the filtered list both dropped to empty in the same request that moved the job). Nothing here writes `Job.status` or any `CompanyWorkflowStage` row — pure read. Copy is the exact §15 sentence, singular/plural handled explicitly (`"1 job is currently…"` / `"N jobs are currently…"`), covered by a dedicated unit test.

## Disabled-stage jobs filter URL

`/jobs?attention=disabled-workflow-stage` — matches the plan's own suggested shape exactly. When present, `JobsPage` renders a small dedicated branch instead of `<JobsBrowser>`. **Why not reuse `JobsBrowser` for this view:** `JobsBrowser` always re-sorts to its own "Recently updated" default in a `useMemo` the instant it mounts, and offers a sort dropdown that would let anyone re-order away from the required tiebreak — reusing it would either silently violate "sorts with the full deterministic tiebreak" on first render, or require bolting a sort-lock onto a shared component used everywhere else in the app. `DisabledStageJobsList` is instead a small, new, deliberately unsortable list: the order it's given is the order it renders, full stop. It reuses `JobsBrowser`'s own row-card visual shape (`rounded-2xl border-hairline bg-surface-raised p-5`, name/client/address/status badge) for visual consistency, plus a "Stuck since {relative}" line using the existing `sinceLabel()` helper (`lib/relative-time.ts`, already used by `requests-browser.tsx`) rather than inventing new date copy. Status labels/badges go through `effectiveStageMeta()` with the company's own overrides, so a renamed disabled stage (e.g. a hypothetical "Building the model" instead of "Processing") would show correctly here too — not a raw default label.

## Disabled-stage sort implementation and fallbacks

The six-level tiebreak from §15, implemented exactly:
1. Oldest entry into the current (now-disabled) stage.
2. Oldest job created.
3. Numbered jobs before unnumbered.
4. `jobNumber` ascending.
5. `title` ascending.
6. `id` ascending.

**Stage-entry time, derived without a dedicated timestamp column:** the codebase has no explicit "entered this status at" field, so §15's own instruction ("inspect `ActivityEvent`/`STATUS_CHANGED` history and use the safest existing signal") was followed. `Job.status` only ever changes through `updateJobStatusAction`, which always calls `recordActivity({kind: STATUS_CHANGED})` when the status actually moves (`previousStatus !== status`) — so **the most recent `STATUS_CHANGED` event's `createdAt` for a job is, by construction, exactly when that job entered its current status.** No fragile string-matching against the event's frozen `to` label was needed (and none was used) — the *latest* event for a job unambiguously describes its *current* transition, regardless of what the label text says. Fetched in one query: `activityEvent.findMany({ where: { jobId: {in: […]}, kind: STATUS_CHANGED }, orderBy: {createdAt: "desc"}, distinct: ["jobId"] })`, Prisma's documented `distinct` + `orderBy` combination for "one row per group, by a given ordering."

**Documented fallback:** a job with no `STATUS_CHANGED` event at all (created directly at its current status and never moved since, e.g. a job still sitting at `LEAD` from creation) falls back to `Job.createdAt` — which is the *correct* semantic for that case (a job "entered" its starting status at creation), not an approximation. This single fallback also naturally satisfies tiebreak level 2 ("oldest job created") for the case where two jobs have no distinguishing stage-entry event of their own. No precision is faked: every timestamp used is a real, already-recorded fact, never an estimate.

## Validation results

- `npx tsc --noEmit -p .` — clean.
- `npm run lint` — 0 errors, 26 warnings (all pre-existing, unrelated to Phase 12 files).
- `npm test` — 451 tests, 449 pass, 2 fail. Both failures are the same pre-existing, unrelated baseline noted in every prior phase (`tests/action-guards.test.ts`: a bare company check in `notifications-actions.ts`; `tests/permissions.test.ts`: crew's `submitFieldEvidence` capability). No new failures.
- `npm run build` — succeeds; `/settings/workflow` (Phase 11) and the updated `/jobs`/`/dashboard` routes all register correctly.

## Manual test notes (live, against the dev database)

All performed on "Nilay Sorathia's Company" (Roofing), then fully reverted afterward — every write below was made through the same reversible-testing discipline used in Phases 10 and 11:

- **Empty state**: with no overdue invoices, no new requests, no changes-requested quotes, and no disabled-stage jobs, the dashboard rendered "Nothing needs your attention right now." exactly, in the calm dashed-border empty-state style matching `PipelineSnapshot`'s own convention.
- **All four signals at once**: temporarily set an existing invoice's due date into the past (→ swept to `OVERDUE` on page load, same as `/invoices` already does), created one temporary `NEW` request, flipped one existing quote to `CHANGES_REQUESTED`, and moved a job into a stage then disabled that stage (mirroring Phase 11's own test recipe). All four items rendered together in the correct priority order — danger (red dot) → caution (amber) → caution (amber) → neutral (gray) — with the neutral dot for the disabled-stage item visibly calmer and not competing with the danger dot, confirmed by a zoomed screenshot.
- **Link doctrine, verified by clicking through**: "Overdue invoices" → `/invoices?status=OVERDUE&range=all` landed on exactly the one overdue invoice (range forced to `all` so nothing outside the default 12-month window is silently excluded). "1 job in a disabled stage" → `/jobs?attention=disabled-workflow-stage` showed exactly that one job, with the banner text, correct status badge, and "Stuck since Today."
- **Job page still shows Phase 11's own warning**: opened the job from the filtered list — "This stage is disabled for future jobs. Move this job to the next active stage when ready." rendered exactly as Phase 11 built it, unchanged.
- **Moving a job out clears both places at once**: clicked the job's own smart advance button (out of the disabled stage) — reloading the dashboard showed the disabled-stage item gone entirely (count back to zero) and the other three items still correctly present; the filtered `/jobs` list would now show none.
- **No console errors**: checked after every navigation. One hydration-mismatch overlay appeared once, traced to `data-gr-ext-installed`/`data-new-gr-c-s-check-loaded` attributes — Grammarly's own browser-extension injection, a well-documented false positive unrelated to any Phase 12 (or any) code change, not something to fix here.
- **Test data fully reverted**: invoice status/due date, quote status, the temporary request (deleted), all `CompanyWorkflowStage` rows (cleared), and the job's status were all restored to their pre-test values; reloaded the dashboard afterward and confirmed the calm empty state again.
- **Existing Phase 1–11 flows**: quality check, pre-construction checklist, progress tracking, sales/financial mini-cards, financial completion panel, warranty panel, and Settings → Workflow all exercised incidentally during this phase's testing (the same job pages were opened repeatedly) — no regressions observed.

## Deferred items

- **Nothing was deferred within Phase 12's own named scope** — all four item types, the filter URL, the sort with its full tiebreak, and the UI were implemented as specified.
- **Phase 13's visual workflow builder** — untouched, as instructed.
- A generic notifications page/severity model, should a future phase want the bell's own events to earn a real Action Center item — explicitly not built here; see the "Notification bell integration decision" section above for the reasoning.

Phase 12 complete. Stopping here per instructions — waiting for approval before starting Phase 13.
