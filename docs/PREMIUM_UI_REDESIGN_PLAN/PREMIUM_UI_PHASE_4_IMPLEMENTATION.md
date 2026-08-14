# Premium UI Redesign — Phase 4 Implementation Record

**Phase:** 4 — Pilot vertical slice
**Scope:** Authenticated shell (as already built in Phase 2, untouched), Dashboard, Jobs index, Job workspace, and the core create/overlay flows the slice uses.
**Branch:** `feature/astryx-integration` (existing worktree, not a new branch — matches how Phase 0-3 were also committed on this branch per `git log`).
**Status:** Complete. Waiting for approval before Phase 5.

---

## 1. Scope

Per `docs/PREMIUM_UI_REDESIGN_PLAN.md` §11 Phase 4 and the task brief that initiated this work, the pilot covers exactly:

- Dashboard (`/dashboard`)
- Jobs index (`/jobs`, including the `?attention=disabled-workflow-stage` view and `/jobs/new`)
- Job workspace (`/jobs/[jobId]`)
- `QuickCreateMenu`'s dialog (the one native `<dialog>` in the slice's creation path)

Nothing outside this list was touched. The shell (`app/(dashboard)/layout.tsx`, `components/dashboard/shell/*`) is Phase 2's finished work and was read but not modified.

## 2. Worktree start state

`git branch --show-current` → `feature/astryx-integration`. `git status --short` at the start of this work showed a large set of pre-existing uncommitted changes from earlier, unrelated in-flight work (the Workflow Phases 1-13 implementation, Astryx integration Phases 0-4, and untracked docs). All of that was left untouched — every file this phase edited is listed in §3 below, and none of it overlaps with the pre-existing dirty set except where this phase's own edits landed on files already mid-flight (`jobs/[jobId]/page.tsx`, `lib/job-status.ts`, etc. — those diffs are additive on top of, not a reset of, the prior state).

## 3. Files changed

**Edited:**
- `components/ui/page-header.tsx` — added `headingLevel` prop (see §6).
- `app/(dashboard)/dashboard/page.tsx`
- `components/dashboard/dashboard-command-band.tsx`
- `components/dashboard/dashboard-action-center.tsx`
- `components/dashboard/pipeline-snapshot.tsx`
- `components/dashboard/revenue-trend-summary.tsx`
- `components/dashboard/recent-activity.tsx`
- `components/dashboard/jobs-browser.tsx`
- `components/dashboard/disabled-stage-jobs-list.tsx`
- `app/(dashboard)/jobs/page.tsx`
- `app/(dashboard)/jobs/new/page.tsx`
- `app/(dashboard)/jobs/[jobId]/page.tsx`
- `components/dashboard/quick-create-menu.tsx`
- `lib/job-status.ts` — added `statusTone()` (see §32).

**Added:**
- `app/(dashboard)/dashboard/loading.tsx`
- `app/(dashboard)/jobs/loading.tsx`
- `app/(dashboard)/jobs/[jobId]/loading.tsx`
- `components/dashboard/job-workspace-shell.tsx`
- `tests/job-status-tone.test.ts`

**Deleted:** none. (See §60 for what legacy markup was removed in place, as opposed to whole files.)

## 4. Pilot inventory before

A full code-grounded inventory (queries, permission gates, exact sort/filter logic, exact financial math, exact workflow-gate logic) was built before any edit, via direct reading of `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/jobs/page.tsx`, `app/(dashboard)/jobs/[jobId]/page.tsx`, and every domain component/lib helper each one renders. The load-bearing facts captured (and preserved) were:

- **Dashboard:** `buildActionCenterItems()`'s 4-item derivation and priority order (`lib/dashboard-action-center.ts`); `PipelineSnapshot`/`RevenueTrendSummary`/`RecentActivity` each own one distinct query; `ReceivablesSummary`/`NewRequestsSummary` are confirmed dead code (zero imports anywhere), left alone.
- **Jobs index:** `JobsBrowser`'s three sort keys and one status filter are 100% client-local state, no URL sync beyond the seeded `?q=`; `sortDisabledStageJobs()`'s exact 6-level tiebreak (stage-entry → created → numbered-before-unnumbered → jobNumber → title → id); the disabled-stage view is a structurally separate render path in `page.tsx` that must never touch `JobsBrowser`.
- **Job workspace:** the single `showsMoney = can(role, "viewMoney")` flag gates every money surface; `jobProgressDisplay()`'s precedence (office % > crew state > visit completion > empty); `qualityCheckCompletionGaps()` is the real hard gate on `COMPLETED`, enforced server-side in `updateJobStatusAction`; `jobFinancialSummary()`'s rule that Additional Work and contract value are never summed together; `WarrantyPanel`'s `CONFIRMED` state is a real, permanent freeze.

## 5. Before screenshots / visual baseline used

No new before/after screenshot set was produced — Phase 0's baseline report (`docs/phase-0/00-baseline-report.md`) already covers the pre-redesign state of these routes, and this phase's own live browser session (§62-67) documents the after-state directly against running code rather than static images.

## 6. Existing behavior checklist

Re-verified live against the running app after migration (see §75 for the full end-to-end trace): job list search/filter/sort, job creation, job status advance, disabled-stage sort order, job workspace tab switching, SplitInspector open/close on both viewport regimes, QuickCreateMenu's five actions and the new-client form. All held. No workflow, permission, or financial-math code path was edited — every change in this phase is either new presentational code or a relocation of existing markup into a shared primitive.

## 7-15. Dashboard

**Before:** hand-typed `<h2>`/description pairs (none, actually — the dashboard had no page-level header at all, just `DashboardCommandBand` as the de facto opener), three independently-styled `rounded-2xl border border-hairline bg-surface-raised` panels for Action Center / Revenue / Pipeline / Activity, four separate hand-rolled empty-state blocks, one hero readout that rendered the open-quote-value figure in `text-instrument-fg` (Instrument Cyan).

**After:**
- **No `PageHeader` on `/dashboard`.** This was tried first (title "Dashboard") and reverted after live review showed it repeating TopNav's own "Dashboard" heading with zero added content — see §87 for the screenshot evidence. `PageHeader` earns its place on Jobs and Job workspace because it carries real distinct content there (item counts, client/address, status); on Dashboard it would have been pure decoration, which the anti-decoration doctrine (redesign plan §6.1, Step 103) rules out.
- **Real bug fixed:** `DashboardCommandBand`'s hero readout used `text-instrument-fg` (measurement cyan) for the open-quote-value figure, with a doc comment that called this "the Readout Rule" — backwards. DESIGN.md's actual Readout Rule reserves Instrument Cyan for genuine technical readings (roof area, pitch), never money. Money now renders through `NumericReadout` with `tone="default"` (ordinary ink).
- **Action Center, Pipeline Snapshot, Revenue Trend, Recent Activity** — hand-rolled empty-state blocks (`rounded-2xl border border-dashed`) replaced by the shared `EmptyState` primitive, with the original copy preserved verbatim via explicit `title`/`description` overrides (not the primitive's generic defaults, to avoid a silent copy change).
- **Revenue Trend Summary** — its hand-rolled label/value/detail stack replaced by `NumericReadout`.
- Dashboard hierarchy itself (Action Center primary, `lg:col-span-2`; Pipeline/Revenue/Activity secondary) was already correct per Phase 12's decisions and was preserved exactly — no reordering.
- Added `app/(dashboard)/dashboard/loading.tsx` using `SkeletonList`/`SkeletonReadout`, replacing reliance on the generic (and now visually stale) `app/(dashboard)/loading.tsx` shared fallback for this specific route.
- Responsive/loading/empty states: verified live at 390-500px and 1512px, dark and light (§62-67).

**Deliberately not touched:** the `viewMoney` gate on `RevenueTrendSummary` — it turns out this component is *not* currently wrapped in a `canViewMoney` check in `dashboard/page.tsx`, unlike `DashboardActionCenter`'s and the rail's own money items. This is a pre-existing gap (every role that can reach `/dashboard` currently also has `viewMoney` per the grant table, so it isn't exploitable today, but it's fragile). Flagged, not fixed — adding a permission gate is a business-logic change, out of scope for a visual migration.

## 16-25. Jobs index

**Before:** hand-typed `<h2>Jobs</h2>` + count line + two `<Link>` buttons; a hand-rolled search input + two `<select>` filters; job rows as `<div>` cards with an absolutely-positioned delete button; a raw `window.confirm()` on the delete form's `onSubmit`; the disabled-stage view using a second, near-duplicate hand-rolled card list.

**After:**
- `app/(dashboard)/jobs/page.tsx` and its `?attention=disabled-workflow-stage` branch both use `PageHeader` now — title/description/primary-action for the normal view, eyebrow-breadcrumb/title/description for the disabled-stage view. Both stayed structurally separate render paths, exactly as before.
- `JobsBrowser`'s filter/search row now renders through `FilterToolbar` — **container only**. The actual filter/sort state (`useState` for query/status/sort, the `useMemo` predicate and comparator) is untouched, byte-for-byte the same logic, just handed to a shared layout component instead of a hand-rolled `<div>`.
- Job rows (both `JobsBrowser` and `DisabledStageJobsList`) now render through `DataRow`. `DisabledStageJobsList` renders the array in the exact order it's handed — no sort was added, and `DataRow` itself has no sort behavior to accidentally introduce one.
- Three hand-rolled empty states (first-use, filtered, disabled-stage-empty) now go through `EmptyState`, each with distinct, preserved copy — not the same string reused three times.
- **Delete confirmation migrated from a hand-rolled `window.confirm()` to the shared `ConfirmSubmit`** component — sanctioned specifically because `JobsBrowser` itself was migrating in this slice (Phase 3 migration map §60's stated condition for this exact cleanup).
- `app/(dashboard)/jobs/new/page.tsx`'s hand-typed header (one of the ~15 sites the Phase 3 duplication audit named by file) now uses `PageHeader`. This incidentally fixed a **second real, pre-existing duplicate-`<h1>` bug**: the page rendered its own `<h1>Add a new job</h1>` while TopNav's `routeTitle()` already renders `<h1>New job</h1>` for this route. `PageHeader` renders `<h2>` by default (§32), so there is now exactly one `<h1>`.
- Added `app/(dashboard)/jobs/loading.tsx`.

**Live-verified P2 fix:** the Delete button's touch target measured 62×30px on a 500px-wide viewport — below the 44px minimum DESIGN.md itself specifies. Fixed with `min-h-11`.

**Deliberately not touched (flagged, not fixed — pre-existing, not introduced by this phase):**
- Neither the Delete button nor the "New job" links have a client-side capability check; both rely entirely on server-side denial (`deleteJobAction`'s `requireJobAccess(jobId, "deleteJob")`, `createJobAction`'s `requireCapability("editJob")`). A VIEWER role can see and click both, then gets denied only after submitting.
- `STATUS_META`'s badge is still a raw Tailwind class string, not a `StatusTone`. A tone-based `Status` adapter was added for the Job workspace's `PageHeader` specifically (§32) but was deliberately *not* retrofitted onto the Jobs-index badge, to keep this phase's domain-adapter surface minimal per Step 16's own instruction not to rewrite `lib/job-status.ts` wholesale.

## 26-46. Job workspace

This was the primary Phase 4 proof, per the redesign plan's own framing ("Job workspace: treat this as the primary vertical slice").

**Before:** a single flat column — identity rail (name/client/address/report link) + a 320px-wide "rail" of quote/invoice tiles and gaps, then status stepper, sales/financial mini-cards, review-request, pre-construction, visit panel, progress, quality check, warranty, and finally the four-tab `JobWorkspace` (Inspect/Scan/Quote/Costs) — all in one uninterrupted scroll, no split, no PageHeader.

**After — the Workbench split:**
- `PageHeader` now owns page identity: eyebrow = `JOB-{jobNumber}` (matching the exact format already validated in the Phase 3 primitive lab's fixtures), title = job name, description = client + address, `status` slot = the shared `Status` component (dot variant), primary action = "Open printable report" (still `showsMoney`-gated, unchanged).
- **`components/dashboard/job-workspace-shell.tsx`** (new) is a narrow client controller wrapping `SplitInspector` with `main`/`inspector` children that stay whatever Server/Client component type they already were (Step 58's composition pattern — nothing was force-converted to a Client Component).
- **Inspector content** = exactly the subset of the page that was already `showsMoney`-gated: the quote figure, the still-owed/invoiced tile, `JobGapsPanel`, and the sales/financial `StatusMiniCard`s. This was a deliberate reasoning, not an arbitrary split: "context useful across every tab, not the primary task" (Step 22) turned out to be identical to "the money content," so a role without `viewMoney` gets **no inspector at all** rather than an empty one with a trigger that does nothing.
- **Main content** = everything else: `JobStatusStepper` (moved out of the rail, now leads main so it's never one click away from view — a deliberate deviation from "money-adjacent content goes in the inspector," made because hiding the status control behind a sheet trigger on mobile would have been a real regression, not a restyle), review-request, pre-construction, visit/scheduling, progress, quality-check, warranty, then the four-tab `JobWorkspace`.
- **SplitInspector breakpoint:** verified live that the split is genuinely driven by `SPLIT_INSPECTOR_BREAKPOINT_PX` (1280, `lib/split-inspector.ts`), independent of the shell's own 1024px sidebar breakpoint, exactly as the primitive's own doc comments require. See §65 for the live verification.
- **Mobile:** a "Job details" trigger button at the top of `main` (visible only below `xl:` = Tailwind's default 1280px, matching the constant) opens the inspector as Astryx's own bottom-anchored `Dialog` sheet — closes on Escape/backdrop/✕, confirmed live (§64).
- `JobStatusStepper`, `JobProgressPanel`, `PreConstructionChecklistPanel`, `QualityCheckPanel`, `ChangeOrdersPanel`, `AdditionalWorkPanel`, `FinancialCompletionPanel`, `WarrantyPanel`, `VisitPanel` — **zero business-logic changes.** All render exactly the same props, computed exactly the same way, in exactly the same conditional order (`job.status === "IN_PROGRESS" || "COMPLETED"` for QualityCheck, `approvedQuote && showsMoney` for PreConstruction, etc.) as before. Only their position in the page moved (rail → inspector or main), not their internals.
- Added `app/(dashboard)/jobs/[jobId]/loading.tsx`.

**Money permission boundary:** verified by construction, not just by review — every item now inside `inspectorContent` was already wrapped in the same `showsMoney` conditional before this phase touched the file; the migration only changed *where* that already-gated JSX renders, never *whether* it renders. `JobStatusStepper`, `VisitPanel`, `JobProgressPanel`, and `WarrantyPanel` were never money-gated before and are not now.

**Roofing module boundary:** the `scan` tab's content (`PhaseSixWorkflow`, `JobIntelligence`, `RoofSectionManager`, `MeasurementManager`, `RoofExtractionPanel`) was relocated as a single opaque block inside `JobWorkspace`'s `scan` prop, unchanged internally. Live-tested (§63) — the photo grid and 3D-model status readout render correctly inside the new tab structure with no layout collision.

**Panel-everywhere reduction — partial, documented rather than force-completed:** the identity rail's two money tiles kept their existing "quiet ground tile" markup (`rounded-2xl border-hairline bg-ground/50`) rather than being forced into `NumericReadout`, because the "None yet" empty-state copy and its distinct muted/smaller treatment would have been lost or awkwardly resized by the primitive's own empty-value handling (which renders a muted em dash, not a custom string, for `null`/`undefined`). The ~11 occurrences of the dominant `rounded-3xl border-hairline bg-surface-raised` panel pattern inside the KEEP domain composites (`JobStatusStepper`, `PreConstructionChecklistPanel`, `QualityCheckPanel`, etc.) were **not** individually restyled — each is a large, independently-tested form component, and Step 84's own guidance ("ask: does it materially break coherence? If no: leave it and document") was applied literally here given the size of the remaining Phase 4 surface. This is the single largest deferred item from this phase; see §94.

## 47-49. Core create flows / overlays

- **`QuickCreateMenu`'s `NewClientDialog`** migrated from a hand-rolled native `<dialog>` (manual `showModal()`/`close` listener via `useRef`/`useEffect`) to Astryx `Dialog`/`DialogHeader`/`LayoutContent` directly — the exact migration Phase 3's map named this file for. Preserved exactly: the same five QuickCreateMenu actions and their hrefs, the same `createLeadClientAction` server action, the same field set and validation, the same fresh-mount-per-open behavior (still conditionally rendered by the parent so `useActionState`'s error state resets on each open, matching the pre-migration behavior rather than the always-mounted pattern that would have let a stale error persist across opens).
- The hand-rolled dropdown list (the "+" button's menu) was **not** converted to Astryx `DropdownMenu` — it deliberately isn't `role="menu"` today (no arrow-key nav implemented, and the component's own comment explains why claiming that role would be worse than not claiming it), and converting it would be a real behavior change, not a pure restyle. Left as-is per Step 40's explicit "no migration merely for checkbox compliance."
- **New job flow** (`/jobs/new`) — see §16-25. Required-to-advance doctrine, optional-address behavior, and duplicate-client handling (`ClientPicker`'s typeahead, `fillClientContactGaps()`) were not touched — only the page header markup changed.
- **Global `+ Create`** — unchanged; not touched at all this phase (its dropdown markup wasn't judged to need visual migration for Dashboard/Jobs/Job coherence, and `QuickCreateMenu`'s own dialog migration was the scoped item).

## 50-51. Motion

One purposeful addition, scoped to the one new component this phase created:

- **`JobWorkspaceShell`'s inspector content** fades and rises in on mount (`fadeUp` from `lib/motion.ts`, keyed on open-state so it re-triggers each time the panel opens) — "contextual panel entry," one of the plan's explicitly named valid uses. This is Motion's to own, not Astryx's: `SplitInspector`'s desktop split conditionally mounts `LayoutPanel` with no transition of its own, so nothing here competes with an Astryx-owned animation. The mobile sheet's own open/close motion stays entirely Astryx `Dialog`'s.
- No other Motion was added. Considered and rejected: animating `JobStatusStepper`'s stage transitions (real value, but touching the highest-risk workflow-control component for a cosmetic change was judged not worth the risk in this pass); animating Dashboard Action Center row removal (there is no client-side row removal to animate — items only disappear on next navigation/revalidation, so adding one would mean inventing new optimistic behavior, which is explicitly out of scope).
- Reduced motion: not separately re-verified with the OS preference toggled (no environment access to flip `prefers-reduced-motion` in this session), but the one animation added uses `fadeUp`, whose `transitions.enter`/`exit` are plain opacity+`y` tweens under the app-wide `MotionConfig reducedMotion="user"` already mounted in `app/layout.tsx` — Motion's documented behavior for that setting disables the transform component and keeps the opacity crossfade, which is the state Step 71 asks for. This is inherited from the existing provider, not newly implemented here, and is asserted from Motion's documented behavior rather than an on-screen OS-level toggle test.

## 52-58. Server/client boundaries

- `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/jobs/page.tsx`, `app/(dashboard)/jobs/[jobId]/page.tsx` remain Server Components. None was converted to a Client Component.
- `JobsBrowser` remains a Client Component (it already was — its filter/sort state is inherently client-side); nothing was added to its client surface beyond the already-planned `FilterToolbar`/`DataRow`/`EmptyState` imports, all of which are themselves either Server-safe (`DataRow`, `EmptyState`) or already-established Client primitives (`FilterToolbar`).
- `JobWorkspaceShell` is the one new Client Component. It imports only React, `motion/react`, and the two shared UI primitives (`SplitInspector`, `lib/motion`) — confirmed via direct `grep` of its import list (§89) — no Prisma, no `lib/auth`, no `lib/permissions`, no domain component. It receives `main`/`inspector` as `ReactNode` props computed server-side in `page.tsx`, per the checked-in Next.js 16.2.4 docs' Server-children-into-Client-Components pattern (`node_modules/next/dist/docs/01-app/...`) — read before this decision was made, not assumed from prior habit, per `AGENTS.md`'s explicit warning that this Next.js version may differ from training data.
- `PageHeader` remains Server-compatible (no `"use client"`), now with the added `headingLevel` prop — a plain string-union prop, no new client surface.

## 59-61. Old UI removed / retained

**Removed** (markup deleted in the same edit as its route's migration, per Phase 3's own removal doctrine):
- Dashboard's four hand-rolled empty-state blocks.
- Jobs index's hand-rolled search/filter row markup, three hand-rolled row-card layouts (`JobsBrowser` card, `DisabledStageJobsList` card, plus the absolutely-positioned delete-button hack that existed only because the card wasn't using a primitive with built-in nested-interactive support).
- Jobs index's raw `window.confirm()` delete confirmation.
- `/jobs/new`'s hand-typed header card.
- `QuickCreateMenu`'s native `<dialog>` plumbing (`useRef<HTMLDialogElement>`, manual `showModal()`/`close` listener).
- Job workspace's flat single-column composition (superseded by the Workbench split — the underlying panels are retained, only their container structure changed).

**Retained intentionally, and why:**
- Every KEEP-listed domain composite (`JobStatusStepper`, `StatusMiniCard`, `FinancialCompletionPanel`, `WarrantyPanel`, `QualityCheckPanel`, `ConfirmSubmit`, `DocumentBrand`/`QuoteTotals` — not touched, correctly out of this route family) — per Phase 3's explicit KEEP list.
- The ~11 `rounded-3xl border-hairline bg-surface-raised` panel occurrences inside those KEEP composites — see §26-46's "partial" note.
- `STATUS_META`'s raw badge class strings on the Jobs-index badge (tone-adapter added only for the Job workspace `PageHeader`, per Step 16's minimality instruction).
- `ReceivablesSummary`/`NewRequestsSummary` — confirmed dead code, zero imports, left on disk rather than deleted (deletion wasn't part of the requested scope, and the files render nothing in the current app either way).

## 62-67. Responsive validation (live, via Chrome automation against `localhost:3000`, authenticated)

Real browser testing was performed against the running dev server — not simulated. Verified directly:

- **390-500px (mobile):** Dashboard, Jobs, Job workspace all render with no horizontal scroll (`scrollWidth === clientWidth` checked via JS on all three routes). Job workspace's "Job details" trigger opens the inspector as a bottom sheet; closes on the ✕ control. PageHeader wraps its action into its own row correctly. Jobs' `FilterToolbar` collapses to a full-width search input with filters below.
- **1512px (desktop, above the 1280 SplitInspector breakpoint):** Job workspace's inspector renders as a true side-by-side split automatically on load (no click needed) — confirmed the `JobWorkspaceShell` viewport-aware default-open logic works as designed.
- **Dark and light theme:** toggled live via the shell's theme control; Dashboard's command-band readout, Needs Attention, Revenue tile, and Jobs' status badges all read correctly in both.
- **1024-1279px band:** not separately screenshotted this pass; the breakpoint constant itself (`SPLIT_INSPECTOR_BREAKPOINT_PX = 1280`, independent of the shell's 1024px) was verified by direct source read rather than a live resize sweep at that exact width.
- **1728/1920px:** not tested live this pass (no environment access to a wider display in this session); the `max-w-[1600px]` content cap inherited from the shell (Phase 2) was confirmed to still apply by reading `shell-chrome.tsx`, not by an on-screen check at that width.
- **200% zoom, increased contrast, reduced transparency:** not tested this pass — no browser zoom/OS-preference control was exercised in this session. Marked honestly unmeasured rather than assumed passing.

## 68. Keyboard (live-verified)

Tabbed through the Jobs index with the real keyboard: focus visibly traverses the sidebar nav, the `+ Create`/notification/theme controls, the `FilterToolbar` search input, then into the first `DataRow` — which is itself a single, clearly-outlined tab stop — and, critically, **tabbing once more from the row lands cleanly on its nested "Delete" button with its own distinct focus ring**, confirming Astryx `Item`'s nested-interactive handling (the reason `DataRow` wraps `Item` rather than a hand-rolled clickable `<div>`) works correctly in practice, not just in theory. No keyboard trap, no doubled stop, no skipped element observed.

## 69. Focus return

Not separately re-verified this pass for the mobile inspector sheet specifically (Astryx `Dialog` is documented to own this, per the primitive's own doc comments and its established use elsewhere in the app) — inherited behavior, not newly implemented, and not independently re-confirmed with a live keyboard trace through open→close on the sheet in this session.

## 70. Touch targets (live-verified, one real finding fixed)

Measured via JS `getBoundingClientRect()` on every visible interactive element at 390-500px on Jobs and Job workspace. Found and fixed two real issues, both introduced or carried forward by this phase's own new/relocated markup:

- **Jobs list "Delete" button:** 62×30px → fixed to 44px minimum height (`min-h-11`).
- **Job workspace "Job details" trigger:** 38px → fixed to 44px minimum height.

Not fixed (pre-existing, outside this phase's authored markup, flagged only): several Phase-2-shell icon buttons (search/+create/notifications/theme, 36×36px) and several KEEP-domain-composite buttons (`Open printable report`, `Send to processing`, at 38px) — all pre-date this phase and are shared/repeated patterns whose fix belongs to a broader pass, not a Phase-4-scoped edit.

## 71. Long content

Not separately stress-tested with synthetic long job names/addresses this pass. The live test data (`36 wetherby`, `1550 Gilles St`, `Wetherby Drive - 5/21/2026`) includes one job with a compound title + date suffix, which rendered without truncation issues in the DataRow/PageHeader layouts observed.

## 72. Partial/missing data

Verified live via the seeded test jobs: a job with no address (`address ?? "No address yet"` renders the explicit placeholder, per `DataRow`'s own missing-data doctrine), a job with no quote (mini-card and inspector both show "No quote yet"/"None yet" states correctly), a completed job (green success-tone status badge, `Status` tone mapping confirmed correct for `COMPLETED`).

## 73. Role/permission matrix

Only the OWNER role was live-testable in this session (the seeded account is OWNER on "Nilay Sorathia's Company"). The money-boundary claim in §26-46 is therefore verified **by construction** (every inspector item was already behind the pre-existing `showsMoney` conditional before this phase touched it) and by static reading of `lib/permissions.ts`'s grant table, not by live-testing a CREW or VIEWER session. This gap is inherited from the environment, not newly introduced — the same limitation the visual-review memory for this project has documented previously.

## 74. Tested end-to-end workflow

Traced live: Jobs index → click a job row (`DataRow`'s `href`, confirmed navigation actually occurs by reading the resulting tab URL) → job workspace loads with `PageHeader` + auto-open desktop inspector → `JobStatusStepper`'s pipeline visualization and current-stage detail render correctly → scrolled into the `scan` tab's photo grid and 3D-model-ready state, confirming `JobWorkspace`'s tab content survived the container restructuring. This is the core "reduce context switching" promise the redesign plan states as Phase 4's product goal, and it held.

## 75. Click-count regression

Opening a job from the list: unchanged, one click (`DataRow`'s row-level `href`, same as the old card's wrapping `<Link>`). Reaching job context on mobile went from "already visible, scroll to find it" to "one tap on 'Job details'" — a net-neutral or arguably one-tap-worse change on mobile specifically, traded for keeping `JobStatusStepper` unconditionally visible instead of behind the same sheet (a deliberate call, see §26-46). No flow gained an extra confirmation step or intermediate screen.

## 76-77. Performance / bundle

- **Build:** `npm run build` succeeds, 44 routes, same pre-existing Sentry sourcemap warning Phase 3 also documented as unrelated.
- **Motion:** still loaded once through `LazyMotion`/`domAnimation` via the existing `MotionProvider` — this phase's one new usage (`m.div` in `JobWorkspaceShell`) imports `m` from `motion/react`, not bare `motion.div`, so it doesn't trip the `strict` LazyMotion warning.
- **Anime.js:** absent — never imported anywhere in this phase's changes.
- **Lighthouse/Core Web Vitals:** still not installed in this repo (confirmed — same gap Phase 0-3 already documented). **Not measured.** No LCP/INP/CLS numbers are claimed here; the performance gates in the redesign plan §13 remain provisional/unmeasured, honestly, not reported as passing.
- **Bundle growth:** not measured with a bundle analyzer (none installed). By inspection, the only new client-side dependency surface is `JobWorkspaceShell` (React + `motion/react`, both already-loaded app-wide dependencies) — no new package was added.

## 78-80. Graphify

`graphify . --update --code-only` (docs/paper files skipped — no LLM key configured in this environment, and the code-boundary questions this check exists to answer don't need semantic doc extraction) → 2,549 nodes, 6,150 edges, 196 communities. **Import Cycles: None detected** (`graphify-out/GRAPH_REPORT.md`). Directly `grep`-verified in addition to the graph: zero matches for Prisma/`lib/auth`/`lib/permissions`/`components/dashboard` imports anywhere under `components/ui/` or its paired `lib/status-tone.ts`/`lib/numeric-readout.ts`/`lib/split-inspector.ts`/`lib/char-counter.ts`. `job-workspace-shell.tsx`'s own import list confirmed narrow (React, `motion/react`, `SplitInspector`, `lib/split-inspector`, `lib/motion` only).

## 81-83. Impeccable

Ran a live critique/audit pass via the `impeccable` skill against the running app (not a static-file scan) — keyboard trace, focus-ring visibility, nested-interactive-row behavior, touch-target measurement, horizontal-overflow check, and a direct visual review of both themes at two viewport widths. Two real P2 findings surfaced and were fixed in this same pass (§70). No P0 or P1 findings. The Dashboard `PageHeader` redundancy caught in this same live-review process (§7-15) was itself effectively a P2/P3-grade finding, fixed before it was ever formally logged.

## 84-88. Lint / typecheck / tests / build / doctor

| Check | Result | Phase 3 baseline | Delta |
|---|---|---|---|
| `npm run lint` | 0 errors, 26 warnings | 0 errors, 26 warnings | none — same pre-existing warning set, none in this phase's files |
| `npx tsc --noEmit -p .` | clean | clean | none |
| `npm test` | 492 total, 490 passing, 2 pre-existing failing | 489 total, 487 passing, 2 pre-existing failing | +3 tests added (`tests/job-status-tone.test.ts`), 0 new failures |
| `npm run build` | succeeds, 44 routes | succeeds | none |
| `npx astryx doctor` | 4 passed, 2 warnings, 0 failures | 4 pass / 2 info / 0 failures | none |

The two pre-existing failures are the same ones Phase 3 documented: `tests/action-guards.test.ts` (a bare-company-check finding in `notifications-actions.ts`, unrelated to this phase) and `tests/permissions.test.ts` (a CREW-capability-list assertion, unrelated to this phase). Neither was touched or newly caused by this work.

## 89. Console/hydration

No new hydration or React warnings observed across the live session on Dashboard, Jobs, or Job workspace, in either theme. The known Astryx `FieldStatus` SSR/CSR hydration warning (an accepted upstream `@astryxdesign/core@0.3.0` cosmetic issue per Phase 3's own note) was not specifically re-triggered this pass since this phase didn't touch any `CounterTextArea`/`TextArea` usage.

## 90-92. Real-device / browser-matrix gap

All live testing this phase was performed through the Chrome-automation tool against a Chromium-based browser at simulated viewport widths, not on physical iPhone Safari / iPad Safari / Android Chrome / macOS Safari devices. This matches the same, previously-documented gap for this project (no real-device lab in this environment) — not a new limitation introduced by this phase, and not claimed as covered.

## 93. Remaining Lighthouse/CWV gap

Unchanged from Phase 0-3: no tooling installed, no baseline ever captured, so Phase 4's own performance claims are limited to "build succeeds, no new client dependency added, Motion/Anime bundle discipline maintained" — not a numeric LCP/INP/CLS pass.

## 94. Phase 5 deferred surfaces

Everything the redesign plan assigns to Phase 5 (Requests, Pipeline, Today, Schedule, Clients, standalone Quotes/Invoices, Change Orders outside the job pilot, Reports, Team, Settings) — untouched, as required. Within the Phase 4 surface itself, deferred for a future pass:
- Full panel-by-panel card-wrapper reduction inside the KEEP domain composites (§26-46).
- A `StatusTone` adapter for the Jobs-index badge (only the Job-workspace `PageHeader` got one).
- The two pre-existing, unrelated permission-display gaps on the Jobs index (Delete/New-job buttons render without a client-side capability check).
- 1024-1279px, 1728/1920px, 200% zoom, increased-contrast, and real-device passes (§62-67, §90-93).
- A `DropdownMenu` migration for QuickCreateMenu's own trigger list (deliberately left; see §47-49).

## 95. Explicit confirmations

- No Prisma schema changes.
- No migrations.
- No permission changes — every `can(role, ...)` / `requireCapability` / `requireJobAccess` call site is untouched; the money boundary was preserved by construction (§26-46).
- No business-logic changes — every domain lib (`lib/job-progress.ts`, `lib/quality-check.ts`, `lib/job-financial-summary.ts`, `lib/pre-construction.ts`, `lib/disabled-stage-jobs.ts`'s sort, `lib/workflow-stages.ts`) is byte-for-byte unmodified except `lib/job-status.ts`, which only gained one new pure function (`statusTone`) and no changes to any existing export.
- No workflow-rule changes — `updateJobStatusAction`'s quality-check completion gate, `JobStatusStepper`'s disabled-stage/next-enabled logic, and `sortDisabledStageJobs`'s tiebreak are all unchanged.
- No public-document migration — `/q`, `/i`, `/co`, `/w` untouched, remains Phase 6.
- No roof-viewer redesign — the `scan` tab's imagery/measurement components were relocated as an opaque block, internals untouched.

---

Phase 4 complete. Waiting for approval before Phase 5 — Operational workflow migration.
