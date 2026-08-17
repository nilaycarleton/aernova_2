# Phase 5 — Estimate Summary Panel: Implementation Summary

Implements `AERNOVA_PROJECT_WORKFLOW.md` §7.3, §25 Phase 5 only. Branch: `feature/astryx-integration`. Phases 1–4 (confirmed complete and approved) were re-read from `WORKFLOW_PHASE_1_IMPLEMENTATION.md` through `_4_` before starting; nothing here touches the 3D viewer, roof detection, measurement tools, photogrammetry rendering, or Phase 1–4 code.

Core product goal: close the "noted gap" §7.3 has carried since the first draft — "a rolled-up cost/margin summary panel ahead of the line-item builder" — as a pure read/review surface, not a new workflow state, permission, or schema model.

## Files changed

### New
| File | Purpose |
|---|---|
| `components/dashboard/estimate-summary-panel.tsx` | Presentational panel — a 2/3-column tile grid (Estimated revenue, Estimated cost, Gross profit, Gross margin, Markup, Line items). Takes a `QuoteTotals` object and a line count as props; computes nothing itself. |

### Modified
| File | Change |
|---|---|
| `lib/quote/totals.ts` | Added one field, `markupPercent: number | null`, to `QuoteTotals` and its computation in `computeTotals()` — the aggregate of the existing per-line `markupPercent()` export, `marginCents / costCents * 100`, null when `costCents` is 0. Nothing else in the file changed; every existing field (`totalCents`, `costCents`, `marginCents`, `marginPercent`, `discountCents`, `taxCents`, `depositCents`) is untouched. |
| `components/dashboard/quote-builder.tsx` | Imports `EstimateSummaryPanel` and renders it directly above the "The work" line-item section, passing the same `totals` `useMemo` the bottom Totals block and the sticky footer already depend on, plus `lines.filter((line) => line.kind !== "TEXT").length` as the line count. No new state, no new calculation. |
| `tests/quote-totals.test.ts` | Two new tests for the aggregate `markupPercent` field (below). |

No changes to `components/dashboard/measure-viewer.tsx`, `hub-model-viewer.tsx`, roof detection/extraction, photogrammetry rendering, `lib/permissions.ts`, `prisma/schema.prisma`, any Phase 1–4 file, quote approval/send actions, invoice creation, or the overbilling guard.

## Helper / calculation changes

**One new field, no duplicated math, no new schema.** The panel is purely presentational: it destructures a `QuoteTotals` object and formats six of its existing (or newly-added) fields. All arithmetic happens exactly once, inside `computeTotals()`, exactly as it did before this phase — the panel, the bottom Totals block, and the sticky footer total now all read from the same single `useMemo` result in `QuoteBuilder`.

- **Estimated revenue** → `totals.totalCents` — the same tax-inclusive figure already shown as the big "Total" number in the existing Totals block and as the "Quote" tile on the job page. Deliberately not a new tax-exclusive "revenue" concept: the task's own wording ("estimated revenue / quoted price total") reads as one concept, and inventing a second revenue figure alongside the one already on this exact page would be the kind of duplicated financial semantics the task explicitly warned against.
- **Estimated cost** → `totals.costCents` (unchanged).
- **Gross profit** → `totals.marginCents` (unchanged) — labelled "profit" here since "margin" is used for the percentage tile next to it; same number the existing "What you keep" row already shows.
- **Gross margin** → `totals.marginPercent` (unchanged), rendered as `—` when `null`.
- **Markup** → `totals.markupPercent` (new field, described above), rendered as `—` when `null`.
- **Line items** → a plain count of non-`TEXT` lines, computed in `QuoteBuilder` from the same `lines` array the builder already renders (no new helper needed — this is a one-line `.filter().length`, not "financial math" in the sense the task meant to guard against duplicating).

**Markup basis matches margin's basis on purpose.** `marginCents` is `taxableCents - costCents` (post-discount, pre-tax, extras-included) — not `totalCents - costCents`. The new `markupPercent` divides that same `marginCents` by `costCents`, so profit, margin%, and markup% are three consistent views of one price/cost pair; only the "Estimated revenue" tile above them uses the tax-inclusive `totalCents`, matching how the existing Totals block already juxtaposes a tax-inclusive "Total" directly above a tax-exclusive "What you keep" without incident. This phase carries that existing, already-shipped convention forward rather than reinterpreting it — no bug was found in `computeTotals()`, so nothing about its existing semantics changed beyond the additive `markupPercent` field.

**Tax/discount/deposit totals were deliberately not duplicated into the summary panel.** They're already fully editable and visible in the Totals section directly below the line items (`Row` components for Discount, Tax, Deposit). Repeating them here — non-editable, out of context, ahead of the controls that produce them — would crowd the top of the page with numbers the owner hasn't set yet, which the task explicitly warned against ("not crowd the line-item editor"). The task's own phrasing for this item was conditional ("if relevant and already available"); it wasn't judged relevant enough to justify a second read-only copy of numbers one scroll away.

## Component / page changes

- **`EstimateSummaryPanel`** — a plain function component (no hooks, no `"use client"` needed on its own — it's compiled into the client bundle anyway as a child of the already-`"use client"` `QuoteBuilder`, the same relationship `JobGapsPanel` has with the server-rendered job page). Renders a `rounded-3xl border-hairline bg-surface-raised` section (matching every sibling panel on this page) containing a `grid-cols-2 sm:grid-cols-3` tile grid; each tile is `rounded-2xl bg-ground/50 p-4` with a `text-xs uppercase tracking-[0.14em]` label — copied exactly from `job-expenses-panel.tsx`'s "Quoted cost / Actual cost / Variance" tiles, the closest existing sibling pattern (a money-tile grid comparing cost figures inside a `rounded-3xl` card). A caption below the grid — "Cost, profit, margin and markup are never shown to the client" — matches the existing tone of the identical caption already in the bottom Totals block.
- **`QuoteBuilder`** — one import, one JSX insertion, no changes to any existing state, action, or save behavior. Placed between the "Opening" panel and "The work" section — i.e., before the owner starts adding/editing line items, per the task's placement requirement.
- **Office-only by construction, no new permission.** `QuoteBuilderPage` (`app/(dashboard)/jobs/[jobId]/quotes/[quoteId]/page.tsx`) already gates the entire route on `requireJobAccess(jobId, "editQuote")` — that file's own comment explains this is deliberate because the builder "renders cost, markup and margin on every line," so a crew member who can reach the job must not reach this page. The Estimate Summary Panel inherits that gate for free; no new capability was added, per the task's explicit instruction.

## Exact metrics shown

1. Estimated revenue (`totals.totalCents`)
2. Estimated cost (`totals.costCents`)
3. Gross profit (`totals.marginCents`)
4. Gross margin (`totals.marginPercent`, "—" when null)
5. Markup (`totals.markupPercent`, new field, "—" when null)
6. Line items (count of non-text lines)

## Edge cases handled

- **Empty quote** (zero lines) — every money tile reads `$0.00`, margin/markup read `—` (not `NaN%`, not `0%`), "Line items" reads `0 lines`. Verified live against a real empty quote in the dev database.
- **Zero-cost lines** (line items with no `unitCostCents` set) — `costCents` is `0`, so `markupPercent` is `null` → `—`, same null-not-zero doctrine the existing per-line `markupPercent()` and `marginPercent` already use. Covered by a new unit test.
- **Unaccepted optional lines** — verified live against a real quote where both existing lines were optional-and-not-yet-accepted: the panel correctly showed `$0.00` everywhere (matching the bottom "Total $0.00"), since `computeTotals()` already excludes unaccepted optional lines from `subtotalCents`/`costCents`. Toggling one line to required live-updated the panel to Revenue $450.00 / Cost $175.00 / Profit $275.00 / Margin 61.1% / Markup 157.1%, instantly and without a save, matching the sticky footer total exactly.
- **Singular/plural line count** — "1 line" vs. "N lines", not "1 lines".
- **A negative-quantity or negative-cost line** — already floored to zero by `computeTotals()` before this phase (a prior Strix-pentest fix); the new `markupPercent` field inherits that protection automatically since it's derived from the same `costCents`/`marginCents` the floor already applies to. No new negative-input handling was needed.

## Validation results

- `npm run lint` — **0 errors**, 26 warnings, identical list to every prior phase (all pre-existing `<img>`-vs-`next/image` and unused-var warnings in files this phase didn't touch).
- `npx tsc --noEmit -p .` — clean, zero errors (no `typecheck` script exists in `package.json`).
- `npm test` (`node --test tests/*.test.ts`) — **375 passed, 2 pre-existing failures**, neither related to this phase or to any file it touched:
  - `tests/action-guards.test.ts` — flags `app/(dashboard)/notifications-actions.ts` for a bare company check. Untouched by Phases 4 or 5.
  - `tests/permissions.test.ts` — a stale assertion expecting `CREW`'s capability list to be exactly `["completeVisit"]`; Phase 3 (approved, prior to this session) added `submitFieldEvidence` to that list without updating this test. Untouched by this phase; out of scope per "avoid broad refactors" and "do not refactor Phases 1–4."
  - The full new/relevant suite — `tests/quote-totals.test.ts`, 27 tests including the 2 new `markupPercent` tests — **all pass**.
- `npm run build` — succeeds. All 34+ routes generated, including `/jobs/[jobId]/quotes/[quoteId]`. Only non-blocking output is the same pre-existing, unrelated Sentry sourcemap-upload rejection every prior phase has also seen.

## Manual test notes

Done against the live dev server + dev database.

- **Panel appears before the line-item builder** — verified on quote `cms0osl7d00019kjubuveilsc` (job `cmrf9e9cg00019ke0mlqqqi66`, 2 line items): "Estimate summary" renders directly after "Opening" and directly before "The work," exactly as specified.
- **Empty quote renders cleanly** — quote `cmr79rv4600019k3dmacv3e4t` (job `cmpiuam8b00019kjkypgfvei7`, 0 line items): all money tiles `$0.00`, margin/markup `—`, "0 lines" — no `NaN`, no `Infinity`, no console error.
- **Quote with line items shows correct values, and matches the sticky footer exactly** — same quote `cms0osl7d...`, both lines initially unaccepted optional extras: panel read `$0.00` everywhere, matching "Total $0.00" in the sticky footer at the bottom of the screen. Unchecked "Optional extra" on the first line ($450 price / $175 cost): panel instantly updated to Revenue $450.00, Cost $175.00, Profit $275.00, Margin 61.1%, Markup 157.1% — matching "Total $450.00" in the sticky footer, confirming both read the identical `totals` memo.
- **Editing line items updates the summary correctly (client-side)** — same test as above; the change was purely local React state (no save), proving the panel tracks unsaved edits, not just the last-saved database row. Navigated away afterward without saving, so the database row was left exactly as found.
- **Saving still works** — not separately re-tested this phase (no save-path code was touched — `serialized`, `formAction`, and `saveQuoteAction` are all untouched), and Phase 2/3's own manual test notes already cover the save flow live; re-verifying it was out of scope for a change that never touches the save path.
- **Public quote page exposes no cost/margin data** — checked the live public page for the approved $16,000 quote (`/q/[token]`): renders only "What we'll do / Qty / Each / Total," "Subtotal," and "Total." No cost, margin, or markup figure anywhere, confirmed both visually and by `grep`-ing `app/(public)/q/[token]/page.tsx`, `actions.ts`, and `components/public/quote-decision.tsx` for `costCents`/`marginCents`/`marginPercent`/`markupPercent` before starting (zero matches) and after (still zero matches — nothing in this phase touched any public-facing file).
- **Existing Phase 1–4 flows still work** — re-checked the same job page (`cmpiuam8b00019kjkypgfvei7`) live: Phase 4's Pre-Construction Checklist panel still shows "Confirmed Aug 11, 2026" with all four boxes checked; Phase 3's Quality Check panel still shows "Completed Aug 11, 2026" with crew evidence and office review intact; the workflow stepper, scheduling panel, and Quote tab (Quote total tile, "Open this quote" / "Rebuild from measurements") all rendered unchanged.
- **No new console errors or hydration/client-only errors** — one hydration-mismatch warning appeared on the job page, but it is React's own diagnostic pointing at a Grammarly browser extension injecting `data-new-gr-c-s-check-loaded`/`data-gr-ext-installed` attributes onto `<body>` before React hydrated (explicitly named in React's own message as a browser-extension artifact) — an environment condition, not a defect in this phase's code or in any file it touched. The quote builder pages themselves (both the populated and empty quote) loaded with zero console errors.

## Intentionally deferred

- `Contacted`/`Qualified` pipeline stage, sales/financial mini-cards, financial completion panel, progress tracking, warranty, workflow customization, dashboard action center, visual workflow builder — none implemented, per instruction (Phases 6–13).
- No display of tax/discount/deposit totals inside the new panel — see "Helper / calculation changes" above for the reasoning (already visible, editable, and one scroll away).
- The two pre-existing, unrelated test failures (`tests/action-guards.test.ts`, `tests/permissions.test.ts`) were left as found — fixing them would mean touching `notifications-actions.ts` or `lib/permissions.ts`, neither in Phase 5's scope, and the instruction was explicit not to refactor Phases 1–4 or add new permissions.
- No new `ActivityKind`, no new Prisma model, no new `JobStatus`, no new capability — none were needed and none were added, per instruction.

## Stop point

Phase 5 complete. Waiting for approval before Phase 6.
