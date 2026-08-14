# Phase 8 — Financial Completion Panel: Implementation Summary

Implements `docs/AERNOVA_PROJECT_WORKFLOW.md` §6, §21, §23, §25 Phase 8 only. Branch: `feature/astryx-integration`. Phases 1–7 (confirmed complete and approved) were re-read from `WORKFLOW_PHASE_1_IMPLEMENTATION.md` through `_7_` before starting; nothing here touches the 3D viewer, roof detection, measurement tools, photogrammetry rendering, the quote builder, or Phase 1–7 code beyond the one integration point the job page always needs.

Core product rule: compose Quote, ChangeOrder, Invoice, and InvoicePayment data into the one "Original Contract / Approved Change Orders / Effective Contract Total / Additional Work / Total Invoiced / Paid / Balance Due" view §6/§21 have flagged as a gap since the first draft — while keeping contract value and Additional Work billing strictly, provably separate.

## Files changed

### New
| File | Purpose |
|---|---|
| `lib/job-financial-summary.ts` | Pure helper — `jobFinancialSummary()`. Every required calculation from the task spec, plus the five status flags. Reuses `effectiveContractValueCents()` from `lib/change-order.ts` (Phase 2) rather than reimplementing it. |
| `components/dashboard/financial-completion-panel.tsx` | `FinancialCompletionPanel` — the composed read/review panel: contract rows, a visually separated Additional Work section, then Total invoiced/Paid/Balance due, then action links. Calm dashed-border empty state when there's no financial activity at all. |
| `tests/job-financial-summary.test.ts` | 10 tests covering every required calculation and the edge cases the task named. |

### Modified
| File | Change |
|---|---|
| `app/(dashboard)/jobs/[jobId]/page.tsx` | No new query. Computes `financialSummary` from `job.changeOrders` and `job.invoices` — both already fully loaded by Phase 2/7 — plus `approvedQuote` (already computed). Renders `FinancialCompletionPanel` at the end of the Quote tab, directly after `AdditionalWorkPanel`, inside the same `!showsMoney ? null : (...)` gate that already hides the whole tab from a role without `viewMoney`. |

No changes to `components/dashboard/measure-viewer.tsx`, `hub-model-viewer.tsx`, roof detection/extraction, photogrammetry rendering, the quote builder, `lib/invoice/balance.ts`, `lib/invoice/status.ts`, `lib/invoice/draw.ts`, `lib/invoice/from-quote.ts`, `lib/change-order.ts` (only imported from, never edited), `components/dashboard/change-orders-panel.tsx`, `components/dashboard/additional-work-panel.tsx`, any quote/invoice/change-order server action, the Phase 2 overbilling guard, share-token machinery, public quote/invoice/change-order pages, or any Phase 1–7 file.

## Data-loading changes

**None beyond what Phase 2 and Phase 7 already load.** Every field `jobFinancialSummary()` needs was already on the page:

- `job.quotes` (full rows, via `include`) → `approvedQuote.totalAmountCents`.
- `job.changeOrders` — already selected with `status` and `amountCents` (added in Phase 2, for `ChangeOrdersPanel`'s own subtitle sum).
- `job.invoices` — already selected with `status`, `quoteId`, `totalAmountCents`, `amountPaidCents` (Phase 2/7). `quoteId` is exactly the field that already distinguishes a contract draw from an Additional Work direct invoice — `AdditionalWorkPanel`'s own `existingInvoices` prop already filters on it (`invoice.quoteId === null`).

No `InvoicePayment` query was added. `paidCents` sums each live invoice's own `amountPaidCents` — the cached running total `lib/invoice/balance.ts`'s own doc comment already establishes as trustworthy ("`InvoicePayment` rows are the truth, `amountPaidCents` is the cache... exists so a list can show a balance per row... without loading every payment"). Re-querying `InvoicePayment` here would have been a second implementation of arithmetic that column already exists to avoid.

## Exact formulas used

All in `lib/job-financial-summary.ts`, all in cents:

```
originalContractCents        = approvedQuote?.totalAmountCents ?? 0, or null if no approved quote
approvedChangeOrdersCents    = sum of changeOrders where status === "APPROVED"
effectiveContractValueCents  = effectiveContractValueCents(originalContractCents ?? 0, approvedChangeOrdersCents)
                                — the exact Phase 2 function, not a reimplementation
contractInvoicedCents        = sum of totalAmountCents where status !== "VOID" and quoteId != null
additionalWorkInvoicedCents  = sum of totalAmountCents where status !== "VOID" and quoteId == null
totalInvoicedCents           = contractInvoicedCents + additionalWorkInvoicedCents
paidCents                    = sum of amountPaidCents where status !== "VOID"
balanceDueCents              = totalInvoicedCents - paidCents
remainingContractToBillCents = max(0, effectiveContractValueCents - contractInvoicedCents)
```

Plus five boolean flags (`hasApprovedQuote`, `hasApprovedChangeOrders`, `hasAdditionalWork`, `isFullyInvoicedAgainstContract`, `isPaidInFull`), all direct derivations of the numbers above — no new facts, just named conditions the panel and its empty-state check both read.

## How Additional Work invoices are handled

**The one rule this file exists to enforce in code, not just in copy: contract value and Additional Work are two sums that never touch.** `Invoice.quoteId` is the only signal needed — set for a contract draw (`createInvoiceFromQuoteAction`), null for Additional Work (`createDirectInvoiceAction`, §19.2) — and it's already how `AdditionalWorkPanel` itself distinguishes its own invoices, so this phase invents no new classification, it reuses Phase 2's own.

Concretely:
- `effectiveContractValueCents` is computed **only** from `originalContractCents` and `approvedChangeOrdersCents` — an Additional Work invoice's amount never enters that formula, at any point, in any branch.
- `additionalWorkInvoicedCents` is summed separately and surfaced in its own visually distinct section ("Additional work — outside the contract"), never merged into the contract rows above it.
- `totalInvoicedCents` (and everything downstream of it — `paidCents`, `balanceDueCents`) is the one place the two sums are combined, and only there, because that combination is the honest answer to "what has this job billed in total" — the same reasoning §21 itself states: Additional Work invoices "add to what a job has billed in total without adding to 'contract value,' since there was no contract to add to."
- **A `ChangeOrder` is never read as, or confused with, Additional Work.** A change order always carries a required `quoteId` (schema-enforced, §19.1) and is summed through `approvedChangeOrdersCents`/`effectiveContractValueCents`; an Additional Work invoice always carries `quoteId: null` and is summed through `additionalWorkInvoicedCents`. The two code paths never share a variable.

## Edge cases handled

- **No approved quote at all** — `originalContractCents` is `null`, not `0` (a job with no contract has no contract value to report, not a $0 one — same null-not-zero doctrine `lib/quote/totals.ts`'s `marginPercent`/`lib/job-mini-cards.ts`'s `markupPercent` already use). The panel shows a one-line note instead of five zeroed contract rows. **Verified live** on a job with a `VIEWED` (not approved) quote plus a real Additional Work invoice: the panel correctly showed the note, the Additional Work section, and Total/Paid/Balance rows — proving the "no contract, but real billing exists" state renders cleanly, not just the fully-empty one.
- **No financial activity of any kind** (no approved quote, no Additional Work, nothing ever invoiced) — the panel renders a calm dashed-border empty state instead of a card full of zeros, matching this codebase's own established empty-state convention (`RequestsBrowser`, `QuoteBuilder`'s "Nothing on this quote yet"). **Verified live** on a real job with zero quotes/invoices.
- **Draft, sent, or declined change orders never raise the effective contract total** — only `status === "APPROVED"` is summed; covered by a dedicated unit test and verified live (the one real approved change order on the test job showed correctly; nothing else did).
- **A voided invoice counts toward nothing** — excluded from `contractInvoicedCents`, `additionalWorkInvoicedCents`, and `paidCents` alike, by the same `status !== "VOID"` filter applied once before any sum runs. Covered by a unit test.
- **`remainingContractToBillCents` floors at zero** — `Math.max(0, ...)`, so a contract that's been fully drawn (or over-drawn in a transient state) never reads as a negative "amount left to bill." Covered by a unit test.
- **"Remaining contract to bill" and "Balance due" are provably different facts** — a job can be fully billed against its contract (`remainingContractToBillCents: 0`) while still having an unpaid Additional Work invoice (`balanceDueCents > 0`); covered by a dedicated unit test and confirmed live on the Wetherby Drive test job, where both figures are simultaneously nonzero/zero in the *opposite* pattern from each other (contract remaining $0.00, balance due $18,775.00, because three Additional Work invoices are unpaid).
- **Paid total reuses the invoice's own cached figure, not a re-summed ledger** — covered by a unit test naming that intent explicitly, and reflects the actual data-loading decision above.

## Where the panel was placed, and why

At the end of the Quote tab's content, immediately after `AdditionalWorkPanel` — deeper in the page than the Phase 7 Financial mini-card, per the task's own placement instruction: "Keep the Phase 7 Financial mini-card near the top as the quick status view... Add this Phase 8 panel deeper in the job page where detailed financial review already happens, likely near the quote/invoice/change-order panels." Concretely, it now sits directly beneath the exact three panels it composes data from (`QuoteGeneratorCard`/`ChangeOrdersPanel`/`AdditionalWorkPanel`), so the office reads the individual documents first and the summary right after — closeout order, not status-check order. Neither the Phase 7 mini-card nor any existing panel was replaced, moved, or resized.

## Validation results

- `npm run lint` — **0 errors**, 26 warnings, identical list to every prior phase (all pre-existing, in files this phase didn't touch).
- `npx tsc --noEmit -p .` — clean, zero errors (no `typecheck` script exists in `package.json`).
- `npm test` (`node --test tests/*.test.ts`) — **398 passed, 2 pre-existing failures, 0 new failures.** Went from Phase 7's reported 388/390 to 398/400 — the 10 new tests in `tests/job-financial-summary.test.ts` all pass; the same two pre-existing, unrelated failures Phases 5–7 have all documented are still exactly the same two:
  - `tests/action-guards.test.ts` — flags `app/(dashboard)/notifications-actions.ts` for a bare company check.
  - `tests/permissions.test.ts` — a stale assertion expecting `CREW`'s capability list to be exactly `["completeVisit"]` (Phase 3 added `submitFieldEvidence` without updating this test).
  Both remain out of scope per "avoid broad refactors" and "do not refactor Phases 1–7."
- `npm run build` — succeeds. All 34+ routes generated, including `/jobs/[jobId]`. Only non-blocking output is the same pre-existing, unrelated Sentry sourcemap-upload rejection every prior phase has also seen.

## Manual test notes

Done against the live dev server + dev database (no schema change this phase, so no migration/restart needed).

- **Job with approved quote + approved change order + multiple invoices** (job `cmpiuam8b00019kjkypgfvei7`, the Wetherby Drive job carrying Phase 2's own real test data): panel read exactly —
  - Original contract **$16,000.00**, Approved change orders **$1,200.00**, Effective contract total **$17,200.00** — reproducing §19.1's own worked example to the cent.
  - Invoiced against contract **$17,200.00**, Remaining contract to bill **$0.00** — fully drawn, correctly floored, not negative.
  - Additional work invoiced **$1,575.00** — matching the sum of the three real Additional Work invoices listed one panel up ($787.50 + $630.00 + $157.50).
  - Total invoiced **$18,775.00** ($17,200 + $1,575, confirmed by hand), Paid **$0.00** (no payment has ever actually been recorded against any invoice in this dev database, confirmed by checking — consistent across every prior phase's testing), Balance due **$18,775.00**.
  - All three action links present: "Open the quote," "Open the latest invoice," "Go to billing."
- **Job with a quote that isn't approved, plus a real Additional Work invoice awaiting homeowner review** (job `cmrf9e9cg00019ke0mlqqqi66`, carrying the $630 invoice created during Phase 7's own live testing): panel correctly showed the note *"No approved quote yet — nothing counts toward contract value until there is one"* in place of the contract rows, the Additional Work section (**$630.00**), and Total invoiced/Paid/Balance due (**$630.00 / $0.00 / $630.00**). "Open the quote" was correctly absent (no `approvedQuoteId`); "Open the latest invoice" and "Go to billing" were present.
- **Job with zero financial activity** (job `cmrwg97ev00019ktqiarwmjgy`, a real job with no invoices and no approved quote): rendered the calm dashed-border "Nothing to summarize yet" empty state, matching the visual convention of `RequestsBrowser`'s and `QuoteBuilder`'s own empty states.
- **Approved change orders increase Effective Contract Total; draft/declined ones don't** — verified by the exact figures above (the one real change order on the test job is `APPROVED`, and it's the only one, so this was confirmed by the math checking out to the cent — not fabricated) and by the dedicated unit test covering `DRAFT`/`SENT`/`DECLINED` alongside `APPROVED` in one assertion.
- **Existing Phase 7 Financial mini-card still works** — re-checked the same Wetherby Drive job's top-of-page mini-cards after adding the Phase 8 panel: "Sales — Approved — $16,000.00" and "Financial — Awaiting payment — $787.50 owed" both rendered exactly as Phase 7 left them, unmoved and unchanged.
- **Existing panels still work** — `ChangeOrdersPanel` ("$1,200.00 approved on top of the contract"), `AdditionalWorkPanel` (three listed invoices, "Bill for something extra" control), and Phase 4's Pre-Construction Checklist all rendered correctly on the same page load as the new panel.
- **Public pages untouched** — no public route, share-token action, or public component was edited this phase; the diff touches only `app/(dashboard)/jobs/[jobId]/page.tsx` and three new files, none of them public.
- **Existing invoice overbilling guard untouched** — `createInvoiceFromQuoteAction`'s own guard (Phase 2) and `lib/invoice/draw.ts`'s `resolveDraw()` were not modified; `remainingContractToBillCents` is a new, separately-computed *display* figure for this panel, not a change to what any action actually enforces.
- **No raw enum names** — read `lib/job-financial-summary.ts` and `financial-completion-panel.tsx` end to end: no `.status` value is ever interpolated into a label; every row label is a plain-language string this phase wrote directly (there's no status badge in this panel at all — it's pure arithmetic, not a status display, so there was no `*_META` table to reuse or bypass).
- **No new console errors or hydration/client-only errors** — checked the browser console on fresh navigations to all three test jobs (rich data, limited data, empty); zero errors throughout. `FinancialCompletionPanel` and `lib/job-financial-summary.ts` are both server-renderable (no client-only APIs, no `"use client"` needed), so there was no hydration boundary to get wrong.
- **CREW / non-`viewMoney` gating not live-tested** — same known limitation every prior phase has documented (the dev database has only one company membership, `OWNER`). Verified by code inspection instead: `FinancialCompletionPanel` is rendered inside the Quote tab's existing `!showsMoney ? null : (...)` block, the same gate Phase 4/5/6/7 have all already proven live to hide this entire tab from a role without `viewMoney`.

## Intentionally deferred

- Progress tracking, warranty, workflow customization, dashboard action center, visual workflow builder — none implemented, per instruction (Phases 9–13).
- A dedicated "create the final draw" or "bill the exact remaining contract amount" workflow — not built. `InvoiceDrawForm` (the existing draw UI on the quote detail page) already lets an office type any amount up to what's remaining; this panel links to billing rather than inventing a second, competing draw control, per the instruction not to create a new final-invoice workflow.
- Change-order-specific action link — not added. The existing "New change order" control already lives one panel up in `ChangeOrdersPanel`, directly visible on the same screen; a second link to the same place would be redundant rather than useful.
- The two pre-existing, unrelated test failures (`tests/action-guards.test.ts`, `tests/permissions.test.ts`) were left exactly as Phases 5–7 found and documented them.
- No new `ActivityKind`, no new capability, no new schema, no new migration — none were needed and none were added, per instruction.

## Stop point

Phase 8 complete. Waiting for approval before Phase 9.
