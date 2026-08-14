# Phase 10 — Warranty: Implementation Summary

Implements `docs/AERNOVA_PROJECT_WORKFLOW.md` §14.4, §14.7, §20, §23, §25 Phase 10 only. Branch: `feature/astryx-integration`. Phases 1–9 (confirmed complete and approved) were re-read from `WORKFLOW_PHASE_1_IMPLEMENTATION.md` through `_9_` before starting; nothing here touches the 3D viewer, roof detection, measurement tools, photogrammetry rendering, the quote builder, or Phase 1–9 code beyond the one integration point the job page always needs.

Core product rule: a warranty is a closeout document a homeowner *acknowledges*, not a document they *approve*. The homeowner's only action is a checkbox + typed name confirming they received and looked at it — never approve/reject/edit/request-changes, never a drawn signature. It carries zero cost/margin data and is never required to complete a job or block invoicing/payment/archiving/quality-check/progress.

`graphify` was queried against the existing share-token/activity/permission graph (BFS from `share-token.ts`/`activity.ts`) before implementation, confirming `requireJobAccess()`, `recordActivity()`, `share-token.ts`'s `PATHS`, and `describeActivity()` are the same backbone Quote/Invoice/ChangeOrder already use — Warranty's wiring in `warranty-actions.ts` and `app/(public)/w/[token]/actions.ts` follows it exactly. `impeccable audit` was run against the three new UI files (`warranty-panel.tsx`, `warranty-acknowledgement.tsx`, the public `/w/[token]/page.tsx`); it found the public acknowledgement form using a raw `<button>` instead of the codebase's `SubmitButton` pending-state convention (unlike its direct precedent, `change-order-approval.tsx`) and missing `required`/`autoComplete="name"` on the name field — both fixed. Live browser testing surfaced two further real bugs, both fixed and covered by regression tests: a stale "Your quote" browser-tab title (the public layout's default, uncorrected — every other identity-bearing public document already overrides it) and a one-day timezone rollback in `lib/long-date.ts` when formatting a bare `yyyy-mm-dd` string.

## Files changed

### Schema
| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `enum WarrantyStatus` (`DRAFT`, `REVIEWED`, `SENT`, `VIEWED`, `CONFIRMED`), `model WarrantyTemplate`, `model Warranty` (with `@@unique([jobId])`, taken verbatim from §14.4). Added `warranty Warranty?` to `Job`, `warranties Warranty[]` / `warrantyTemplates WarrantyTemplate[]` to `Company`. |

### New
| File | Purpose |
|---|---|
| `lib/long-date.ts` | Pure helper — `longDate()`, the single funnel for every "outlives the transaction" date on this feature (long month, day, full year; no time; no relative phrasing). |
| `lib/warranty.ts` | Pure helper — `warrantyTermLabel()`, `WARRANTY_STATUS_META`, `warrantyStatusLabel()`, `isWarrantyEditable()`, `canSendWarranty()`, `buildCompanyInfoSnapshot()`, `buildCustomerInfoSnapshot()`. |
| `prisma/seed-warranty-templates.ts` | Idempotent seed — 8 built-in templates (Simple/Detailed × Roofing/Plumbing/Lawn Care/General Contracting), `companyId: null`. |
| `app/(dashboard)/jobs/[jobId]/warranty-actions.ts` | Office write paths: `createWarrantyFromTemplateAction`, `saveWarrantyDraftAction`, `reviewWarrantyAction`, `sendWarrantyAction`, `duplicateWarrantyTemplateAction`, `updateWarrantyTemplateAction`. All gated on `editJob`/`requireCapability`. |
| `app/(public)/w/[token]/actions.ts` | `markWarrantyViewed()`, `confirmWarrantyAction()` — the homeowner's one write path. |
| `app/(public)/w/[token]/page.tsx` | The public warranty document. |
| `components/public/warranty-acknowledgement.tsx` | The checkbox + typed-name + Confirm form. |
| `components/dashboard/warranty-panel.tsx` | `WarrantyPanel` — office-facing job-page card: template picker, draft editor, confirmed read-only summary. |
| `tests/long-date.test.ts` | 6 tests (5 original + 1 regression for the timezone bug found in live testing). |
| `tests/warranty.test.ts` | 8 tests covering term-label conversion, no-raw-enum, editability/send-eligibility gates, snapshot builders. |

### Modified
| File | Change |
|---|---|
| `lib/share-token.ts` | Added `warranty: "w"` to `PATHS`. |
| `lib/activity.ts` | `ActivityMeta` gains `warrantyId`/`warrantyVersion`. Two new `describeActivity()` cases: `WARRANTY_SENT`, `WARRANTY_CONFIRMED`. |
| `package.json` | Added `db:seed-warranty-templates` script. |
| `app/(dashboard)/jobs/[jobId]/page.tsx` | Loads built-in + company warranty templates, builds `warrantyRow`, renders `<WarrantyPanel>` after `<QualityCheckPanel>` — outside the money-gated Quote tab, since Warranty carries no financial data. |

No changes to `components/dashboard/measure-viewer.tsx`, `hub-model-viewer.tsx`, roof detection/extraction, photogrammetry rendering, the quote builder, `lib/job-status.ts`, `app/(dashboard)/jobs/[jobId]/status-actions.ts`, `lib/quality-check.ts`, `lib/permissions.ts` (no new capability — reuses `editJob`), or any existing public quote/invoice/change-order page.

## Schema changes

Additive only; `@@map("Project")` and `@@map("Proposal")` confirmed untouched. `JobStatus`/`QuoteStatus`/`InvoiceStatus`/`RequestStatus` untouched. No new `ActivityKind` — Phase 1 had already reserved `WARRANTY_SENT`/`WARRANTY_CONFIRMED`.

```prisma
enum WarrantyStatus {
  DRAFT
  REVIEWED
  SENT
  VIEWED
  CONFIRMED
}

model WarrantyTemplate {
  id             String     @id @default(cuid())
  companyId      String?
  trade          String?
  variant        String?
  name           String
  termMonths     Int
  coverageNotes  String?
  exclusions     String?
  isDefault      Boolean    @default(false)
  company        Company?   @relation(fields: [companyId], references: [id])
  warranties     Warranty[]
  @@index([companyId])
  @@index([trade])
}

model Warranty {
  id                     String         @id @default(cuid())
  companyId              String
  jobId                  String         @unique
  templateId             String?
  termMonths             Int
  startsAt               DateTime
  coverageNotes          String?
  exclusions             String?
  version                Int            @default(1)
  companyInfoSnapshot    String
  customerInfoSnapshot   String
  propertyAddressSnapshot String
  status                 WarrantyStatus @default(DRAFT)
  shareToken             String?        @unique
  sentAt                 DateTime?
  viewedAt               DateTime?
  confirmationChecked    Boolean        @default(false)
  signerName             String?
  confirmedAt            DateTime?
  signerIp               String?
  reviewedByUserId       String?
  reviewedAt             DateTime?
  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt
  company  Company           @relation(fields: [companyId], references: [id])
  job      Job               @relation(fields: [jobId], references: [id])
  template WarrantyTemplate? @relation(fields: [templateId], references: [id])
}
```

## Migration

`20260812042801_add_warranty` — applied via `npx prisma migrate dev`. Purely additive: `CREATE TYPE "WarrantyStatus"`, two `CREATE TABLE`s, 4 indexes, 4 foreign keys. No data migration, no backfill.

## §23 correction/immutability decision

§14.4's schema carries `@@unique([jobId])` — one warranty per job. §23's correction doctrine says "a correction is a new Warranty row, not a mutation of the confirmed one." Those two are in real tension: a single-row-per-job schema has nowhere to put a second, corrected row without either widening the constraint (out of scope for Phase 10 — a real schema/product decision, not a small fix) or replacing the row (which would erase the homeowner's original confirmation, the opposite of what §23 wants preserved).

**Decision:** keep the schema exactly as documented in §14.4 and defer the full multi-version correction flow. What Phase 10 *does* implement is the smallest safe v1 behavior: `isWarrantyEditable()` hard-blocks any edit once `status === "CONFIRMED"`, server-side, in `saveWarrantyDraftAction` — not just hidden in the UI. The office sees a clear, honest message instead of a silent no-op or a dead-end error: *"This warranty has been confirmed by the homeowner and can't be edited. Aernova doesn't yet support creating a corrected version in this release — if something needs to change, contact support."* This is documented inline as a doc comment on the `Warranty` model itself so the tradeoff isn't lost to a future reader of the schema alone.

A related, smaller version-bump mechanism *is* implemented for the pre-confirmation case: editing a `REVIEWED`/`SENT`/`VIEWED` warranty resets it to `DRAFT` (clearing `reviewedByUserId`/`reviewedAt`, forcing a fresh review) and bumps `version` if `sentAt` was ever set — because a homeowner may already have the old wording open in a still-live tab. This is what the `version` field and the public page's "Warranty version N" footer are for.

## Seed / template behavior

8 built-in templates (`companyId: null`): Simple + Detailed × Roofing (60mo) / Plumbing (12mo) / Lawn Care (6mo) / General Contracting (24mo). Term length is identical between Simple/Detailed within a trade — the plan's variants differ in coverage-text detail, not term. Seed checked idempotency by running it twice: first run created 8, second run created 0 (found all 8 already present via `findFirst({companyId: null, trade, variant})`). No template-suggestion analytics or popups — the picker is a plain list.

## Template picker / company-owned copies

- Built-in templates render "Use this" and "Duplicate & customize" — never "Edit." `updateWarrantyTemplateAction` hard-checks the target row's `companyId` matches the caller's company before allowing a write; a built-in (`companyId: null`) is rejected with "Built-in templates can't be edited directly — duplicate it first," even if someone bypasses the UI.
- `duplicateWarrantyTemplateAction` copies term/coverage/exclusions into a new row with `companyId: company.id, name: "{source.name} (your copy)"`. The company's own templates (built-in or duplicated) show "Edit" as an inline disclosure instead.
- `createWarrantyFromTemplateAction` checks `@@unique([jobId])` explicitly first and returns a clear error ("This job already has a warranty") rather than letting the DB constraint throw.

## Job-page panel behavior

`WarrantyPanel` renders one of three states: `TemplatePicker` (no warranty yet), `DraftEditor` (`DRAFT`/`REVIEWED`/`SENT`/`VIEWED`), or `ConfirmedSummary` (`CONFIRMED`, fully read-only). `editable` is a display-only prop — every write path is independently gated server-side on `editJob` via `requireJobAccess()`, matching `QualityCheckPanel`'s own "render nothing they can't act on, but never trust the render for security" convention. No new capability was added; crew has no `editJob` and therefore sees nothing (verified by code inspection — the dev database has only one `OWNER`-role membership, so a live crew-role test wasn't possible, consistent with every prior phase's own limitation here). Never rendered on `/today`.

## Public page behavior

`/w/[token]` mirrors `/co/[token]`'s exact `paper-*` document structure: `DocumentBrand` (live company relation, not the frozen snapshot — snapshot text renders separately as the "From" body field), term/start-date header, conditional coverage/exclusions sections, a From/For/Property snapshot grid, `WarrantyAcknowledgement`, and a quiet version/confirmed-date footer. Strictly view-only — no approve/reject/edit/signature control anywhere. No internal cost/margin/crew-notes/workflow-control leaks onto the page (checked directly — the component only ever receives the fields listed in `WarrantyRow`/the Prisma `include`, none of which touch money). Added `export const metadata` overriding the public layout's generic "Your quote" title, matching the precedent already set by the invoice/hub/request pages.

## Review / send / acknowledgement flow

1. Office picks a template → draft created, pre-filled with company/customer/property snapshots.
2. Office edits, saves (`saveWarrantyDraftAction`) — any edit after `DRAFT` resets to `DRAFT` and re-requires review.
3. Office marks reviewed (`reviewWarrantyAction`, `DRAFT` → `REVIEWED` only) — stamps `reviewedByUserId`/`reviewedAt`.
4. Office sends (`sendWarrantyAction`, `REVIEWED` → `SENT` only) — mints/reuses `shareToken`, records `sentAt`, records `WARRANTY_SENT` with `{warrantyId, warrantyVersion}`.
5. First public open → `markWarrantyViewed()` moves `SENT` → `VIEWED` and stamps `viewedAt`, scoped to `status: "SENT"` so it can never walk a `VIEWED` or `CONFIRMED` row backwards.
6. Homeowner checks the box, types a name, confirms → `confirmWarrantyAction` validates both, writes `confirmationChecked`/`signerName`/`confirmedAt`/`signerIp`, sets `CONFIRMED`, records `WARRANTY_CONFIRMED`. A second submit on an already-`CONFIRMED` row returns early without a second write or a second activity event.

## Date-formatting behavior

`lib/long-date.ts`'s `longDate()` is the single funnel: `Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" })`, no time, no relative phrasing. Live testing surfaced a real bug here: a bare `"2026-08-12"` date-input string parses via `new Date(...)` as UTC midnight, and formatting that in a negative-UTC-offset local timezone (e.g. Eastern) rolled it back to "August 11, 2026" — one day off from what the office had actually typed and what the homeowner saw on the public page (which passed the raw Prisma `Date` object, not the string, so it didn't show the bug). Fixed by detecting a bare `yyyy-mm-dd` string and formatting it with `timeZone: "UTC"` explicitly, since a date-only value names a calendar day, not an instant, and should render as written regardless of viewer timezone. Real `Date` objects and full ISO-datetime strings are untouched — still formatted in local time, as before. Covered by a new regression test (`tests/long-date.test.ts`).

## Activity / timeline behavior

`describeActivity()` gains two cases, verified live on the dashboard's "Recent activity" feed:
- `WARRANTY_SENT` → "Nilay Sorathia sent the warranty (version 1)"
- `WARRANTY_CONFIRMED` → "Jordan Homeowner confirmed they received the warranty"

No raw enum ever reaches the screen; copy says "received," never "approved" or "accepted," everywhere it appears (panel, public page, acknowledgement form, activity feed).

## Confirmed-warranty immutability

Server-enforced (not just UI-hidden): `saveWarrantyDraftAction` checks `isWarrantyEditable(warranty.status)` and returns the `LOCKED_MESSAGE` error before touching the row if `status === "CONFIRMED"`. Live-verified: after confirmation, the job-page panel renders only `ConfirmedSummary` — no form, no inputs — with the lock message shown directly. See the §23 section above for the full correction-flow tradeoff.

## Validation results

- `npx tsc --noEmit -p .` — clean.
- `npm run lint` — 0 errors, 26 warnings (all pre-existing, unrelated to Phase 10 files).
- `npm test` — 422 tests, 420 pass, 2 fail. Both failures are the same pre-existing, unrelated baseline noted in every prior phase (`tests/action-guards.test.ts`: a bare company check in `notifications-actions.ts`; `tests/permissions.test.ts`: crew's `submitFieldEvidence` capability). No new failures.
- `npm run build` — succeeds; `/w/[token]` registered as a dynamic route alongside `/q/[token]`, `/i/[token]`, `/co/[token]`.

## Manual test notes (live, against the dev database)

All performed against job "Wetherby Drive - 5/21/2026" (`36 Wetherby Drive, Toronto, ON`), status Completed:

- Built-in templates for the company's trade (Roofing) render in the picker: "Roofing — Detailed Warranty" and "Roofing — Simple Warranty," both 5 years. Both show "Use this" / "Duplicate & customize," never "Edit" — confirms built-ins can't be edited directly from the UI.
- Clicked "Use this" on the Detailed template → draft created instantly, badge flips to "Draft," term (60), start date (today), and coverage text pre-filled from the template.
- Clicked "Mark reviewed" → badge and "Send warranty" button appear; "Reviewed August 12, 2026 by Nilay Sorathia" renders in long-date format.
- Clicked "Send warranty" → "Sent August 12, 2026. They haven't opened it yet." with a working "Open the warranty" link; `WARRANTY_SENT` appeared on the dashboard activity feed as "Nilay Sorathia sent the warranty (version 1)."
- Opened the public link: `DocumentBrand` shows the company name, term/start-date header, coverage/exclusions sections, From/For/Property grid all render correctly; no cost, margin, internal notes, or edit controls anywhere on the page; tab title correctly read "Your warranty" after the metadata fix.
- Submitted the acknowledgement (checkbox + "Jordan Homeowner") → page flips to "Confirmed received by Jordan Homeowner," footer reads "Warranty version 1 · Confirmed August 12, 2026" (long-date, no time); `WARRANTY_CONFIRMED` appeared on the activity feed as "Jordan Homeowner confirmed they received the warranty."
- Back on the job page: panel now shows "Confirmed" badge, "Confirmed by Jordan Homeowner on August 12, 2026," a read-only term/coverage summary, and the lock message — no edit form rendered at all.
- No console errors on either the job page or the public page at any step.
- Verified Phase 1–9 flows on the same job page during this session: pre-construction checklist (confirmed), quality check (completed, office review saved), progress tracking, sales/financial mini-cards, financial completion panel, pipeline workflow stepper — all rendered and behaved as before, no regressions from the Warranty wiring.
- Not live-tested: crew-role exclusion from warranty controls (dev database has only one `OWNER` membership — verified by code inspection only, consistent with the same limitation in every prior phase).

## Deferred items

- **Full multi-version correction flow for a confirmed warranty** (§23) — deferred per the decision above; only the hard edit-lock is implemented in Phase 10.
- **Crew-role live verification** — no crew-role test account exists in the dev database; permission gating verified by code inspection only (same limitation as Phases 3/4/6/7/8/9).

Phase 10 complete. Stopping here per instructions — waiting for approval before starting Phase 11.
