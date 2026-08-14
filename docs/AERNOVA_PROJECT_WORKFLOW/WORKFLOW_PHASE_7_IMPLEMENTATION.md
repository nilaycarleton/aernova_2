# Phase 7 — Sales / Financial Stage Mini-Cards: Implementation Summary

Implements `docs/AERNOVA_PROJECT_WORKFLOW.md` §16, §17, §25 Phase 7 only. Branch: `feature/astryx-integration`. Phases 1–6 (confirmed complete and approved) were re-read from `WORKFLOW_PHASE_1_IMPLEMENTATION.md` through `_6_` before starting; nothing here touches the 3D viewer, roof detection, measurement tools, photogrammetry rendering, the quote builder, or Phase 1–6 code beyond the one small integration point the job page always needs (§16's own stated expectation: "extended with new panels... rather than replaced").

Core product rule: generalize `JobStatusStepper`'s shape (label/description/badge/next-action) into two compact, read-only mini-cards — sales and financial — without building the cross-entity workflow-configuration engine §17 explicitly warns against.

## Files changed

### New
| File | Purpose |
|---|---|
| `lib/job-mini-cards.ts` | Pure derivation — `salesMiniCardState()`, `financialMiniCardState()`. Reuses `QUOTE_STATUS_META`/`INVOICE_STATUS_META` for every status they already cover; only adds the "nothing exists yet" case and the Additional Work homeowner-review wait, neither of which is a `QuoteStatus`/`InvoiceStatus` value. |
| `components/dashboard/status-mini-card.tsx` | `StatusMiniCard` — the generalized, purely presentational shape: eyebrow, state badge, description, optional dollar figure, optional action link. |
| `tests/job-mini-cards.test.ts` | 9 tests covering every derivation branch (below). |

### Modified
| File | Change |
|---|---|
| `app/(dashboard)/jobs/[jobId]/page.tsx` | Added `sentAt: true` to the existing `invoices` select (the one new field needed). Computes `salesCard`/`financialCard` from data already on the page (`latestQuote`, `liveInvoice`, `approvedQuote` — all pre-existing). Renders both `StatusMiniCard`s in a `sm:grid-cols-2` row directly below `JobStatusStepper`, gated on `showsMoney`. |

No changes to `components/dashboard/measure-viewer.tsx`, `hub-model-viewer.tsx`, roof detection/extraction, photogrammetry rendering, the quote builder, `lib/quote-status.ts`, `lib/invoice/status.ts`, `lib/invoice/balance.ts`, `lib/job-status.ts`, `components/dashboard/job-status-stepper.tsx`, any quote/invoice server action, share-token machinery, public quote/invoice/change-order pages, or any Phase 1–6 file.

## Components / helpers added

**`StatusMiniCard`** takes exactly the generalized fields §17 asks for, mapped onto what a compact card actually needs to render:
- `eyebrow` — the domain identity ("Sales" / "Financial"), the "label" of the generalized shape.
- `label` + `badge` — the current state, in trade language, with its tone. Rendered together as one pill (`{badge classes}{label}`), the same convention `REQUEST_STATUS_META`/`QUOTE_STATUS_META`/`INVOICE_STATUS_META` badges already use everywhere else in this codebase — "badge" and "current state" from the task's shape list are one visual element here, not two, because that's how every sibling status pill in this product already works.
- `description` — the hint sentence.
- `secondaryDetail` — an optional dollar figure.
- `action` — an optional `{ label, href }`. **Href only, no action slot.** Every real Phase 7 use case (create a quote, continue editing, send an invoice) is satisfied by navigating to a page that already has the real control — the mini-card never performs an action itself, only points at where to go do it. Adding a second `actionSlot` prop with nothing in this phase to put in it would be speculative surface area, so it wasn't built; if a future phase needs an inline action, that's a small, targeted addition to make then; not decoration to include now.

Deliberately **not** a config-driven Request/Quote/Job/Invoice engine — no `effectiveStageMeta()`, no `CompanyWorkflowStage` read, no database-backed label overrides. Both `§17`'s explicit instruction and this phase's own scope note ("do not implement `effectiveStageMeta()`... that belongs to Phase 11") rule that out; `StatusMiniCard` takes plain strings from a caller, same as `JobStatusStepper` reads `STATUS_META[status]` directly today.

**`lib/job-mini-cards.ts`** is pure (no Prisma import beyond the two enum types, no JSX) — same doctrine as `lib/pipeline.ts`'s `stageForJob()`, `lib/quote/totals.ts`, and every other status-derivation file in this codebase. Two exported functions, each taking the narrow shape it needs (`SalesQuoteFacts`, `FinancialInvoiceFacts`) rather than a full Prisma row, matching `lib/quote/totals.ts`'s `LineForTotals` precedent.

## Data-loading changes

**One new scalar field, no new query, no N+1.** The job page already loads `job.quotes` (full rows, via `include`) and a narrow `job.invoices` select; `latestQuote` (`job.quotes[0]`), `liveInvoice` (`job.invoices.find(...)`), and `approvedQuote` were all already computed on the page before this phase. The only gap was `Invoice.sentAt`, needed to tell "a draft nobody's seen" apart from "shared for homeowner review, still DRAFT in the database on purpose" (see below) — added to the existing `invoices.select` block, one line, no new relation, no new round trip.

## Exact sales states represented

Derived from `latestQuote` (the same "first in `createdAt: desc` order" quote the rest of the page already treats as current):

1. **No quote yet** — `latestQuote` is `null`. Custom copy ("Nothing has been priced for this job."), action "Create a quote" → `/jobs/{id}?tab=quote`.
2. **Draft** — `QuoteStatus.DRAFT`. `QUOTE_STATUS_META.DRAFT` verbatim, action "Continue editing" → the quote page.
3. **Awaiting response** (sent, unopened) — `QuoteStatus.SENT`. `QUOTE_STATUS_META.SENT` verbatim, action "Open the quote".
4. **Opened** — `QuoteStatus.VIEWED`. `QUOTE_STATUS_META.VIEWED` verbatim, action "Open the quote".
5. **Changes asked for** — `QuoteStatus.CHANGES_REQUESTED`. `QUOTE_STATUS_META.CHANGES_REQUESTED` verbatim, action "Open the quote".
6. **Approved** — `QuoteStatus.APPROVED`. `QUOTE_STATUS_META.APPROVED` verbatim, action "Open the quote".
7. **Turned down / Expired** — `QuoteStatus.REJECTED` / `QuoteStatus.EXPIRED`. Same verbatim reuse, same action.

Every state after "no quote yet" is a direct, unmodified read of `QUOTE_STATUS_META` — no new copy invented for anything `QuoteStatus` already describes.

## Exact financial states represented

Derived from `liveInvoice` (the same most-recent-non-void invoice the rail's "Still owed" tile already uses) plus `hasApprovedQuote`:

1. **No invoice yet** — `liveInvoice` is `null`. Copy branches on whether a quote is approved ("Nothing has been billed for this job yet." vs. "Nothing to bill until a quote is approved, or bill directly for work outside one."), action "Go to billing" → `/jobs/{id}?tab=quote`.
2. **Draft** — `InvoiceStatus.DRAFT` and not yet shared (`sentAt` null). `INVOICE_STATUS_META.DRAFT` verbatim, action "Send invoice".
3. **Awaiting homeowner review** *(new state, not a raw `InvoiceStatus` value)* — `requiresHomeownerReview && !homeownerReviewConfirmedAt && sentAt != null`. Per Phase 2's own documented behavior, an Additional Work invoice at/above the review threshold stays `DRAFT` in the database while shared for review (`shareInvoiceAction`/`sendInvoiceEmailAction` deliberately don't advance it to `SENT`) — so a plain `INVOICE_STATUS_META[status]` lookup would have shown "Draft. Not sent." for an invoice that has, in fact, already been sent for review. Detected the same way Phase 2's own code leaves evidence of itself: shared but not confirmed. **Verified live** (see Manual test notes) — this is the one state this phase adds real interpretation for, not a pass-through.
4. **Awaiting payment** — `InvoiceStatus.SENT` (including a homeowner-review invoice that's since been confirmed, which Phase 2 already flips to `SENT` at confirmation — no double-handling needed). `INVOICE_STATUS_META.SENT` verbatim.
5. **Part paid** — `InvoiceStatus.PARTIALLY_PAID`. Verbatim, `secondaryDetail` reads what's still owed (`total − paid`), not the full total.
6. **Overdue** — `InvoiceStatus.OVERDUE`. Verbatim, same danger-tone badge `INVOICE_STATUS_META` already assigns it.
7. **Paid** — `InvoiceStatus.PAID`. Verbatim, `secondaryDetail` reads the total (owed is ≤ 0, so the "owed" framing is skipped in favor of the paid amount).

Actions: "Send invoice" only for a true, unshared draft; "Open the invoice" for every other state, including the homeowner-review wait — the review banner and override control already live on that page (Phase 2), so the mini-card points there rather than duplicating them.

## Where the mini-cards were placed, and why

Directly below `<JobStatusStepper>`, above the review-request/pre-construction/scheduling panels, in a `sm:grid-cols-2` row — gated on the same `showsMoney` check that already hides the rail's Quote/Still-owed tiles and the entire Quote tab from a `CREW` role. Reasoning, matching the task's own placement instructions:

- **"Close enough to the status stepper that the owner can see production, sales, and financial progress together"** — literally the next thing on the page after it, not buried in a tab.
- **Money-adjacent, so gated like the rest of the money surface** — the Sales card's `secondaryDetail` is a quote amount, the Financial card's is an invoice amount; both are exactly the kind of figure this page's existing comments say "must not reach a crew role."
- **Doesn't crowd** — verified live (see Manual test notes): the two-card row reads as a natural continuation of the workflow section above it, not a second unrelated block competing for attention, and the panels below (scheduling, pre-construction checklist, quality check) render exactly as before, unmoved except by the row's own height.

## Validation results

- `npm run lint` — **0 errors**, 26 warnings, identical list to every prior phase (all pre-existing, in files this phase didn't touch).
- `npx tsc --noEmit -p .` — clean, zero errors (no `typecheck` script exists in `package.json`).
- `npm test` (`node --test tests/*.test.ts`) — **388 passed, 2 pre-existing failures, 0 new failures.** Went from Phase 6's reported 379/381 to 388/390 — the 9 new tests in `tests/job-mini-cards.test.ts` all pass; the same two pre-existing, unrelated failures Phase 5 and Phase 6 both documented are still exactly the same two:
  - `tests/action-guards.test.ts` — flags `app/(dashboard)/notifications-actions.ts` for a bare company check.
  - `tests/permissions.test.ts` — a stale assertion expecting `CREW`'s capability list to be exactly `["completeVisit"]` (Phase 3 added `submitFieldEvidence` without updating this test).
  Both remain out of scope per "avoid broad refactors" and "do not refactor Phases 1–6."
- `npm run build` — succeeds. All 34+ routes generated, including `/jobs/[jobId]`. Only non-blocking output is the same pre-existing, unrelated Sentry sourcemap-upload rejection every prior phase has also seen.

## Manual test notes

Done against the live dev server + dev database (no schema change this phase, so no migration/restart needed).

- **Approved quote + sent invoice** (job `cmpiuam8b00019kjkypgfvei7`, the $16,000 Wetherby Drive job): Sales card read "Approved" / "They said yes. The job moved to quoted." / **$16,000.00** / "Open the quote"; Financial card read "Awaiting payment" / "Sent. Nothing has come in against it." / **$787.50 owed** / "Open the invoice" — both figures matched the pre-existing rail tiles ("Quote $16,000.00", "Still owed $787.50") exactly, confirming no drift between the new cards and the numbers already on the page.
- **Viewed quote, no invoice, no approved quote** (job `cmrf9e9cg00019ke0mlqqqi66`): Sales card read "Opened" / "They've read it. No answer yet." / $0.00 (an honest, zero-priced draft quote — matches the rail's own "Quote $0.00" tile) / "Open the quote"; Financial card read "No invoice yet" / **"Nothing to bill until a quote is approved, or bill directly for work outside one."** (the `hasApprovedQuote: false` copy branch, confirmed live) / "Go to billing".
- **Additional Work invoice shared for homeowner review** — created a real $600 Additional Work line item on the same job through the actual `AdditionalWorkPanel` UI (not seeded), which correctly triggered the $500 review threshold; clicked "Create the link" (the real `shareInvoiceAction`) to set `sentAt` without confirming. Reloaded the job page: Financial card correctly read **"Awaiting homeowner review"** / "Sent for review before it can be paid. They haven't confirmed yet." / $630.00 (tax included) / "Open the invoice" — while the pre-existing rail tile beside it still read "Still owed $630.00 · Draft · #6" (the literal, still-accurate database status). Seeing both at once on the same screen confirmed the mini-card adds real, correct interpretation rather than duplicating what the rail tile already said.
- **"No quote yet" state** — not exhibited live: every job in the dev database has at least one quote (none with zero). Covered instead by a dedicated unit test (`a job with no quote reads as its own state, not a database default`) and by the fact the same `StatusMiniCard` component already renders correctly for every other state live — the branch is a pure conditional with no rendering path distinct from the others.
- **Paid / partially paid / overdue invoice states** — no naturally-occurring test data in the dev database for these three (checked: 4 `DRAFT`, 1 `SENT`, 0 of the other three, across every job). Not fabricated for a screenshot, since the unit tests (`a paid invoice shows its total, not a stale $0.00 owed`, `a partially paid invoice shows what's still owed, not the full total`) exercise the exact arithmetic and copy for both, and `OVERDUE` is a pure pass-through of `INVOICE_STATUS_META.OVERDUE` with no custom logic to verify beyond what the shared `deriveInvoiceStatus`/`INVOICE_STATUS_META` already prove elsewhere in this codebase's own test suite.
- **Primary actions link to existing pages, no duplicated logic** — every `action.href` produced by `lib/job-mini-cards.ts` is one of exactly two, already-existing destinations: `/jobs/{id}?tab=quote` (confirmed via graphify as a real, already-supported tab key — the same one `?quote=` forces today) or `/jobs/{id}/quotes/{quoteId}` / `/jobs/{id}/invoices/{invoiceId}` (the same detail pages every other link on this page already points at). No new route, no new server action.
- **Existing `JobStatusStepper` still works** — rendered unchanged above the new cards on every job tested; the dropdown, advance button, and stepper row all intact.
- **Existing quote/invoice panels still work** — the Quote tab (Estimate Summary Panel, line-item builder, Change Orders, Additional Work), the invoice detail page (send link, review banner, payment recording), and Phase 4's Pre-Construction Checklist / Phase 3's Quality Check panels all rendered and behaved exactly as before, on the same pages the mini-cards now sit above.
- **Public pages untouched** — no public route, share-token action, or public component was edited this phase; not re-verified beyond confirming the diff touches only `app/(dashboard)/jobs/[jobId]/page.tsx` and two new files.
- **No raw enum names** — every label rendered is either a `QUOTE_STATUS_META`/`INVOICE_STATUS_META` `.label` or one of this phase's own plain-language strings ("No quote yet", "No invoice yet", "Awaiting homeowner review"); confirmed by reading `lib/job-mini-cards.ts` end to end — no `.status` value is ever interpolated directly into a label or description.
- **No new console errors or hydration/client-only errors** — checked the browser console on fresh navigations to both test jobs, before and after creating the Additional Work invoice; zero errors throughout. `StatusMiniCard` and `lib/job-mini-cards.ts` are both server-renderable (no client-only APIs, no `"use client"` needed), so there was no hydration boundary to get wrong.
- **CREW / non-`viewMoney` gating not live-tested** — same known limitation every prior phase has documented: the dev database has only one company membership (`OWNER`, which holds every capability). Verified by code inspection instead: the two-card row is wrapped in `{showsMoney ? (...) : null}`, the exact same gate already proven live (Phase 4/5/6) to hide the rail's Quote/Still-owed tiles and the entire Quote tab from a role without `viewMoney`.

## Intentionally deferred

- The full Phase 8 "Original Contract / Change Orders / Total / Paid / Balance Due" composed financial view — not built; this phase is stage/next-action mini-cards only, per instruction.
- `effectiveStageMeta()` / workflow customization — not built; belongs to Phase 11, per instruction.
- An `actionSlot` prop on `StatusMiniCard` for a future inline (non-navigation) action — not added, since nothing in this phase needs one; see "Components / helpers added" above.
- Sales/financial mini-cards for any entity besides the job page's current quote/invoice (e.g. multiple invoices, multiple change orders) — the cards read the same single "most relevant" quote/invoice the rest of the page already treats as current (`latestQuote`, `liveInvoice`); a job with several draws or several quotes still shows one card each, matching how the rail above it already summarizes to one figure.
- The two pre-existing, unrelated test failures (`tests/action-guards.test.ts`, `tests/permissions.test.ts`) were left exactly as Phases 5 and 6 found and documented them.
- No new `ActivityKind`, no new capability, no new schema, no new migration, no change to `JobStatus`/`QuoteStatus`/`InvoiceStatus`/`RequestStatus`/pipeline stage definitions — none were needed and none were added, per instruction.

## Stop point

Phase 7 complete. Waiting for approval before Phase 8.
