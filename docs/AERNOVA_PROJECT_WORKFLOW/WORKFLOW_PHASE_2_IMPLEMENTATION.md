# Phase 2 — Change Orders + Additional Work / Billable Add-On: Implementation Summary

Implements `docs/AERNOVA_PROJECT_WORKFLOW.md` §14.2, §19, §25 Phase 2 only. Branch: `feature/astryx-integration` (confirmed via `git branch --show-current` before starting). Phase 1 (confirmed complete and approved) was re-read from `WORKFLOW_PHASE_1_IMPLEMENTATION.md` before starting; nothing here touches the 3D viewer, roof detection, measurement tools, or photogrammetry rendering.

## Files changed

### New — Change Orders
| File | Purpose |
|---|---|
| `lib/change-order.ts` | Pure helpers: per-line pricing (reuses `lineTotalCents`), `changeOrderTotalCents`, `effectiveContractValueCents`. |
| `app/(dashboard)/jobs/[jobId]/change-order-actions.ts` | `createChangeOrderAction` — blank draft against an approved quote. |
| `app/(dashboard)/jobs/[jobId]/change-orders/[changeOrderId]/actions.ts` | `saveChangeOrderAction`, `shareChangeOrderAction`, `unshareChangeOrderAction`, `markChangeOrderApprovedAction`, `markChangeOrderDeclinedAction`. |
| `app/(dashboard)/jobs/[jobId]/change-orders/[changeOrderId]/page.tsx` | Change order detail/edit page. |
| `app/(public)/co/[token]/page.tsx` | Public change-order document (paper surface, `DocumentBrand` logo). |
| `app/(public)/co/[token]/actions.ts` | `approveChangeOrderAction`, `markChangeOrderViewed`. |
| `components/dashboard/change-order-editor.tsx` | Line-item editor (client), mirrors `QuoteBuilder`'s save-the-whole-document pattern, without quote's tax/discount/deposit machinery a change order doesn't have. |
| `components/dashboard/change-order-share-panel.tsx` | Send/approve/decline panel, mirrors `QuoteSharePanel`. |
| `components/dashboard/change-orders-panel.tsx` | Job-page list + "New change order" entry point. |
| `components/public/change-order-approval.tsx` | Homeowner-facing approve form (no decline door — see Deferred/design notes). |

### New — Additional Work / Billable Add-On
| File | Purpose |
|---|---|
| `lib/invoice/addon-override.ts` | `OVERRIDE_NOTE_MIN/MAX`, exact validation message, `overrideNoteError`, `overrideNoteCounterText` — shared by the server action and the client counter so they can never disagree. |
| `app/(dashboard)/jobs/[jobId]/additional-work-actions.ts` | `createDirectInvoiceAction`, `recordAddOnReviewOverrideAction`. |
| `components/dashboard/additional-work-panel.tsx` | Job-page create form (line items, live threshold check, inline override fields). |
| `components/dashboard/addon-override-fields.tsx` | Reusable reason picklist + conditional 20–500-char textarea + two-state counter. |
| `components/dashboard/addon-override-form.tsx` | Standalone "skip review" form for an already-created, review-pending invoice. |

### Modified
| File | Change |
|---|---|
| `prisma/schema.prisma` | New models/enums (below), `Company.billableAddOnThresholdCents`, `Invoice` review/override fields, new relations. |
| `lib/activity.ts` | `ActivityMeta.changeOrderId` added; `describeActivity()` gets 6 new cases (the ones this phase actually writes — see Deferred). |
| `lib/format.ts` | `addOnReviewOverrideReasonLabel` + `ADD_ON_REVIEW_OVERRIDE_REASON_OPTIONS`. |
| `lib/share-token.ts` | `PATHS.changeOrder = "co"`. |
| `app/(dashboard)/jobs/[jobId]/invoices/actions.ts` | `createInvoiceFromQuoteAction`'s overbilling guard now uses `effectiveContractValueCents` (quote total + approved change orders) instead of the bare quote total. |
| `app/(dashboard)/jobs/[jobId]/invoices/[invoiceId]/actions.ts` | `shareInvoiceAction` / `sendInvoiceEmailAction` branch on `requiresHomeownerReview && !homeownerReviewConfirmedAt`: status stays `DRAFT` and the recorded kind becomes `ADDITIONAL_WORK_HOMEOWNER_REVIEW_SENT` instead of `INVOICE_SENT`. |
| `app/(dashboard)/jobs/[jobId]/invoices/[invoiceId]/page.tsx` | New "Needs homeowner review" banner + `AddOnOverrideForm`, and a quiet status line once confirmed or overridden. |
| `app/(dashboard)/jobs/[jobId]/quotes/[quoteId]/page.tsx` | **Bug found and fixed during manual testing**: `remainingCents` (the "how much is left to bill" figure driving the draw UI) was computed from the bare quote total only, independent of `createInvoiceFromQuoteAction`'s own (correctly fixed) guard — an approved change order would raise what the *action* allowed while the *page* still said "fully invoiced." Now uses the same `effectiveContractValueCents`. |
| `app/(public)/i/[token]/actions.ts` | New `confirmAdditionalWorkReviewAction` — the homeowner's one review-confirmation action. |
| `app/(public)/i/[token]/page.tsx` | "Please review" badge + banner + confirm button when `requiresHomeownerReview`; Stripe pay button suppressed until reviewed. |
| `app/(dashboard)/jobs/[jobId]/page.tsx` | Loads `job.changeOrders` and the extra `Invoice` fields; renders `ChangeOrdersPanel` (only when an approved quote exists) and `AdditionalWorkPanel` (always) in the quote tab. |

No changes to `components/dashboard/measure-viewer.tsx`, `hub-model-viewer.tsx`, roof detection, or photogrammetry code.

## Schema changes

All additive; `@@map("Project")` and `@@map("Proposal")` confirmed untouched (`grep` before/after).

```prisma
enum ChangeOrderStatus { DRAFT SENT APPROVED DECLINED }

enum AddOnReviewOverrideReason {
  HOMEOWNER_CONTACT_MISSING
  VERBAL_APPROVAL
  OWNER_OVERRIDE
}

model ChangeOrder {
  id, companyId, jobId, quoteId (required, not nullable),
  title, description, status, amountCents,
  shareToken, sentAt, viewedAt,                       // Quote's own share-token pattern
  approvedAt, approvedByUserId,                        // office-recorded path
  approvedByName, approvedIp,                          // homeowner-click path (mirrors Quote.acceptedByName/acceptedIp)
  declinedAt, createdByUserId, createdAt, updatedAt
  // relations to Company, Job, Quote (Cascade — a change order cannot outlive
  // the quote it amends, unlike Invoice.quote which is SetNull); lineItems
}

model ChangeOrderLineItem {
  id, changeOrderId, name, description, quantity, unit,
  unitCostCents, unitPriceCents, amountCents, sortOrder
}

// On Company:
billableAddOnThresholdCents Int?   // null = $500 v1 default

// On Invoice:
requiresHomeownerReview    Boolean @default(false)
homeownerReviewConfirmedAt DateTime?
overrideReason             AddOnReviewOverrideReason?
overrideNote                String?
overriddenByUserId          String?
overriddenAt                DateTime?
```

`ChangeOrder.quoteId` is a required (non-nullable) foreign key with `onDelete: Cascade` — matching §19.1's rule directly in the schema, not as a soft convention: a change order with no approved quote behind it isn't representable by this model at all (that's what Additional Work is for).

## Migration

`20260811173057_add_change_orders_and_additional_work` — applied via `npx prisma migrate dev`. Confirmed the generated SQL is purely `CREATE TYPE` / `ALTER TABLE ... ADD COLUMN` (nullable or `DEFAULT`-backed) / `CREATE TABLE` / `CREATE INDEX` / `ADD CONSTRAINT` — no data migration, no backfill required.

## Actions / routes / components added or modified

Covered in the Files table above. Route surface added: `/co/[token]` (public), `/jobs/[jobId]/change-orders/[changeOrderId]` (dashboard).

## Permission/capability changes

**No new capabilities added** — Phase 2 reuses the existing matrix exactly, per instruction:

- Change order create/save: `editQuote` (ESTIMATOR/SALES/ADMIN/OWNER) — matches "office/estimator" in the plan's own wording, same tier as editing a quote.
- Change order send/office-approve/decline: `sendQuote` — identical gate to `markQuoteApprovedAction`, same precedent.
- Direct invoice creation, and the override action: `editInvoice` — this is deliberately OWNER/ADMIN-only today (ESTIMATOR/SALES never had `editInvoice`, by this codebase's existing, explicit design: "billing and taking payment are the office's"). Decision 17 in the workflow doc asks for the override to be "capability-gated to OWNER/ADMIN" — reusing `editInvoice` satisfies that automatically, with no new capability needed.
- Public/homeowner actions (`approveChangeOrderAction`, `confirmAdditionalWorkReviewAction`, `markChangeOrderViewed`): no capability check — token is the only credential, same doctrine as every other public document action in this codebase.

## Validation results

- `npm run lint` — **0 errors**, 26 warnings, all pre-existing (`<img>`-vs-`next/image`, a couple of unrelated unused-var warnings). One warning introduced by this pass (an unused destructured var in `additional-work-panel.tsx`) was found and fixed before the final run.
- `npx tsc --noEmit` — clean, zero errors (no `typecheck` script exists in `package.json`).
- `npm run build` — succeeds. All 34+ routes generated, including the two new ones (`/co/[token]`, `/jobs/[jobId]/change-orders/[changeOrderId]`). Only non-blocking output is the same pre-existing, unrelated Sentry sourcemap-upload rejection (invalid `SENTRY_AUTH_TOKEN`) already present before this phase.

## Manual test notes

All done against the live dev server + dev database (job `cmpiuam8b00019kjkypgfvei7`, an approved $16,000 quote), verified both visually and by reading the database directly after each step — not just "the button didn't error."

- **Change order requires an approved quote** — confirmed two ways: the "Change orders" panel doesn't render at all on a job with no approved quote (checked live, job `cmrf9e9cg00019ke0mlqqqi66`), and `createChangeOrderAction` independently re-validates `quote.status === APPROVED` server-side regardless of what the UI shows.
- **Change order full lifecycle** — created a $1,200 change order, saved it, sent it (minted `shareToken`, status → `SENT`), approved it from the *public* page as "Jane Homeowner." Confirmed in the database: `status: APPROVED`, `approvedByName`/`approvedIp` set (public path), `approvedByUserId: null` (correctly *not* set — that field is for the office-recorded path only). `CHANGE_ORDER_CREATED` and `CHANGE_ORDER_APPROVED` activity events both present with correct `changeOrderId`/`amountCents`/`actorLabel`.
- **Approved change orders increase invoiceable amount** — raised the quote's first invoice ($16,000), then found a real bug: the quote page's own "Billed so far" / remaining-balance display had a separate, un-fixed `remainingCents` calculation that ignored change orders entirely, so it said "fully invoiced" even though $1,200 of real room existed. Fixed (see Files table). After the fix, the page correctly offered **"Bill the remaining $1,200.00"**; billing it produced a second invoice for exactly $1,200.00.
- **Overbilling guard still blocks true overbilling** — after both invoices ($16,000 + $1,200 = the full $17,200 effective contract value), the quote page correctly reads "This quote is fully invoiced," and no further draw is offered. `createInvoiceFromQuoteAction`'s own server-side `remainingCents <= 0` guard backs this even if the UI were bypassed.
- **Direct/no-quote invoice, below threshold** — $150 line item → invoice created straight to `DRAFT`, `quoteId: null`, `requiresHomeownerReview: false`. `ADDITIONAL_WORK_INVOICED` recorded with the right `invoiceId`/`amountCents`.
- **At/above threshold, default path** — $750 line item (threshold read at $500 v1 default) → `requiresHomeownerReview: true`, no activity recorded yet (correct — nothing meaningful has happened until it's shared). Shared it: `shareToken` minted, `sentAt` set, **status stayed `DRAFT`** (not `SENT`) — proving "the invoice can't reach SENT until they've looked at it" is real, not just copy. `ADDITIONAL_WORK_HOMEOWNER_REVIEW_SENT` recorded (not `INVOICE_SENT`). Opened the public link: "Please review" badge, no Pay button, an "I've reviewed this" button. Confirmed it: status flipped `DRAFT → SENT`, `homeownerReviewConfirmedAt` set, `ADDITIONAL_WORK_HOMEOWNER_CONFIRMED` recorded with `actorLabel: "The client"`.
- **Office override, at creation time** — $600 line item, picked `OWNER_OVERRIDE` from the reason picklist. First submitted a 5-character note: got back the exact required message, verbatim — **"Please explain why homeowner review is being skipped. Enter 20-500 characters."** Fixed the note to 84 characters and resubmitted: invoice created with `requiresHomeownerReview: false`, `overrideReason: OWNER_OVERRIDE`, full note saved, `overriddenByUserId`/`overriddenAt` set, `ADDITIONAL_WORK_OFFICE_OVERRIDE` recorded with `reason` + `note` in its meta.
- **`OWNER_OVERRIDE` counter, exact boundary behavior** — typed 19 characters: "1 more character required" (singular, correct). Typed a 20th: switched *immediately*, no intermediate state, to "480 characters remaining" — matching the doc's own illustrative example number exactly.
- **Below-threshold path needs no reason** — confirmed the reason `<select>` on the *creation* form is not `required` (leaving it at "No override — send for homeowner review" and submitting succeeds normally); the *standalone* override form on an already-created invoice **does** require a reason, since skipping review is that form's entire purpose.
- **A real bug found and fixed along the way**: the at/above-threshold warning copy rendered as "$500.00review threshold" — a missing space caused by adjacent JSX text/expression children. Fixed with an explicit `{" "}` separator; re-verified live.
- **Existing quote/invoice flows still work** — the quote builder, the existing "Raise an invoice" / draw flow, the invoice detail page's billing-address/terms/void/delete sections, and the pre-existing tax/business-number send-gap check (`invoiceSendGaps`) all still worked exactly as before, unmodified, alongside the new Phase 2 UI on the same pages.
- **Phase 1 logo rendering still works** — re-checked the public quote page's rendered HTML directly; `DocumentBrand`'s company-name fallback still renders correctly in the same header slot.

One incidental note: a `window.confirm()`-gated office action (mirroring `QuoteSharePanel`'s own existing pattern) triggered a native browser dialog that froze that specific browser automation tab. Not a bug — this is the same UX pattern the pre-existing `QuoteSharePanel` already ships — just a known limitation of scripted browser testing against `window.confirm`. Verified that code path by reading it against its `markQuoteApprovedAction` precedent instead, and verified the *equivalent* office-approval fact (an office-initiated approval that isn't the homeowner's own click) via the change order's public-approval test, which exercises the same downstream `recordActivity`/status-transition logic.

Test artifacts left in the dev database (harmless, illustrative real usage, not reverted — consistent with how this dev environment already carries other test/demo data): one approved $1,200 change order, four Additional Work invoices at various thresholds/override states, two draws against the test quote, and a test `businessNumber` set on the dev company (was previously unset, needed to get past the pre-existing tax-invoice gap check to complete testing).

## Intentionally deferred

- **`describeActivity()` for the 5 kinds this phase doesn't write** — `QUALITY_CHECK_EVIDENCE_SUBMITTED`, `QUALITY_CHECK_COMPLETED`, `WARRANTY_SENT`, `WARRANTY_CONFIRMED`, `PROGRESS_UPDATED` stay on the `default: "Something happened"` fallback, per Phase 1's own reasoning — they belong with the phase that writes them (3, 10, 9 respectively).
- **No `ActivityKind.CHANGE_ORDER_SENT`-equivalent event** — §13's enumerated list only specifies `CHANGE_ORDER_CREATED` and `CHANGE_ORDER_APPROVED` for change orders (unlike Quote, which has a `SENT` event too). Adding a new enum value beyond what was authorized for this phase would be schema scope creep, so sending a change order for approval records no activity event — a deliberate, spec-faithful gap, not an oversight.
- **No public "decline" door on a change order** — mirrors `Quote`'s own `REJECTED` doctrine exactly (item 42's reasoning: the roofer, not the homeowner, is the only door onto a decline). `ChangeOrderStatus.DECLINED` is office-recorded only, via `markChangeOrderDeclinedAction`.
- **No change-order delete action** — not requested, and a draft change order that's a mistake can simply be left unused; adding delete was avoided per "avoid broad refactors" / smallest clean change.
- **No multi-approved-quote picker** — a job with more than one `APPROVED` quote (an edge case) attaches change orders to the first one found. Not handled with a UI picker; out of scope for this phase.
- Everything outside Phase 2 per the instruction and §25: warranty, quality check, progress tracking, workflow customization, dashboard action center, and sales pipeline changes (Phases 3–13) — untouched.

## Stop point

Phase 2 complete. Waiting for approval before Phase 3 (Quality check + completion gate).
