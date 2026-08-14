# Aernova — One-Click Construction Project Workflow

**Status:** Planning document. No implementation in this doc.
**Grounded against:** `prisma/schema.prisma`, `lib/pipeline.ts`, `lib/job-status.ts`, `lib/quote-status.ts`, `lib/invoice/status.ts`, `lib/permissions.ts`, `lib/job-validation.ts`, `lib/client-lifecycle.ts`, `lib/activity.ts`, `components/dashboard/job-status-stepper.tsx`, `docs/PLAN-CRM.md`, `docs/DESIGN.md`, `docs/PRODUCT.md`, and a graphify pass over the live codebase — not from mockups alone.
**Revision note:** this version incorporates an eighth round of answers — five more specific follow-up decisions, sharpening exactly the five questions the seventh round left open — on top of the thirty-six already resolved across the first seven rounds (see **Decisions from the Owner**, near the end — forty-one decisions in total). Every section touched by an answer is marked; sections left alone are left alone.

---

## 0. The one thing to read before anything else in this doc

The original brief that requested this document described Aernova as if it were still built around a single `Project` entity moving through a 15-value `ProjectStage` enum, with a seeded demo project called "Maple Street Roof Replacement." **That description was out of date.** On `feature/astryx-integration` (current branch, based on `feature/ui-accessibility-and-tokens`) the domain model was already split, on 2026-07-26, into `Client → Property → Job → Visit`, plus `Request`, `Quote`, `Invoice`, `Service` — a 9-phase rebuild (`docs/PLAN-CRM.md`) that has already shipped: quoting, sending, e-signature-equivalent approval, deposits, draws, Stripe Connect payments, a sales pipeline board, job costing, recurring visits with a real scheduler, crew accounts, and revenue/aged-receivables reporting.

This doc maps the brief's Lead→Site Visit→Estimate→Proposal→Contract→Production→Invoice vision onto the **actual** five-noun model (`Request` / `Quote` / `Job` / `Visit` / `Invoice`), names what's already built against each stage, and scopes the real gap. Most of what the brief asked for already existed, under different names, spread across several small coordinated systems rather than one big state machine.

**What's changed since the first draft:** six product questions were open at the end of that draft. All six are now decided (see **Decisions from the Owner**). The real remaining gaps, now scoped with actual designs instead of open questions, are: a formal change-order flow (plus a separate no-quote "Additional Work" path), an explicit quality-check/walkthrough moment, a pre-construction readiness checklist, a homeowner-facing warranty document, visit/task-based progress tracking with an optional manual override, a `Contacted / Qualified` sales stage, and a per-company workflow-customization layer. Section 25 phases all of it.

`docs/PRODUCT.md` has been rewritten as part of this revision (see §23) — it no longer describes Aernova as a single-trade roofing product. This doc, `docs/PRODUCT.md`, and `docs/DESIGN.md` should now all agree: Aernova is a multi-trade platform for small construction and trades businesses, with roofing (drone capture, photogrammetric measurement) as one specialized, module-gated part of it.

---

## 1. Product Goal

Unchanged from the brief, and it already matches this codebase's own stated philosophy. `docs/PLAN-CRM.md`'s governing principle — **"required to advance, not required to exist"** — and `docs/PRODUCT.md`'s design principle **"calm is a function of sequence"** are the same idea the brief calls Review → Confirm → Next.

> Save a small trades business owner as much time as possible by turning "manage a job" into a sequence of *reviews*, not a sequence of *forms*. Aernova already knows most of what it's about to show; the owner corrects it and moves on.

A second, now-explicit principle joins it, from the owner's answer on workflow customization (§15):

> Aernova should adapt to the business owner's workflow, not force the business owner to adapt to Aernova.

## 2. UX Philosophy

The brief's ten UX principles (one obvious next action, never enter information twice, automation before manual work, review instead of create, progressive complexity, preserve user control, mobile-friendly, minimize clicks, context-aware actions, human-readable language) are adopted as written. Two are already codified in this repo under different names:

- "Never enter information twice" = `docs/PLAN-CRM.md`'s **required-to-advance, not required-to-exist** doctrine, implemented today as `lib/job-validation.ts`'s `jobGaps()` — a pure function that turns "missing data" into a list of `{ need, because }` gaps rendered on the record, never a creation-time wall. Any new stage gate in this plan should be a new case in a `*Gaps()`-shaped function, not a new required-field validator.
- "Context-aware actions" / "smart Next button" already exists as `STATUS_META[status].advanceLabel` in `lib/job-status.ts`, rendered by `JobStatusStepper` — see §3 and §17.

"Progressive complexity" now has a concrete second instance beyond the original doc's scope: the workflow-customization layer in §15 is itself progressive-complexity applied to the *stage list*, not just to a single form — a company sees only its own trade's stages, in its own words, and can grow into renaming/hiding more later.

## 3. What Already Exists, Mapped to the Brief's Vocabulary

| Brief's term | Real model / mechanism | File |
|---|---|---|
| "Project" | `Job` (physical table still named `Project`, held by `@@map` — see §24) | `prisma/schema.prisma` |
| Lead | `Request` (pre-job) or `Job` at `status: LEAD` (post-conversion) | `Request`, `Job.status` |
| Contacted / Qualified | **Decided, not yet built** — new `RequestStatus.CONTACTED` between `NEW` and `ASSESSING`. See §4. | — |
| Site Visit (the *inspection*) | `Visit` with `kind: ASSESSMENT` | `Visit.kind` |
| Estimate | `Quote` at `status: DRAFT`, priced from `QuoteLineItem` rows drawn from the `Service` catalog | `lib/quote/totals.ts` |
| Proposal | The same `Quote`, once `status: SENT`/`VIEWED` — physical table still `Proposal` | `Quote` (`@@map("Proposal")`) |
| Contract signed | `Quote.status: APPROVED` | `markQuoteApprovedAction` |
| Production status | `Job.status` (`SCHEDULED` → `IN_PROGRESS` → `COMPLETED`) | `lib/job-status.ts` |
| Scheduling | `Visit` with `kind: WORK`, `VisitAssignment` for crew, `RecurrenceRule` for repeat work | `lib/schedule/*` |
| Deposit / progress billing / final invoice | `Quote.depositCents`/`depositPercentMicros` + one or more `Invoice` rows drawn against the quote ("draws") | `lib/invoice/draw.ts`, `lib/invoice/from-quote.ts` |
| Payment received | `InvoicePayment` rows; `InvoiceStatus` derived, never hand-set | `lib/invoice/balance.ts` |
| Project timeline | `ActivityEvent` + `recordActivity()`/`describeActivity()` | `lib/activity.ts` |
| Smart Next button | `JobStatusStepper`, driven by `STATUS_META` | `components/dashboard/job-status-stepper.tsx` |
| Sales pipeline / Kanban | `/pipeline`, derived `PipelineStage` | `lib/pipeline.ts` |
| "Sales / Production / Financial status as separate fields" | **Already the architecture** — see §15 | — |
| Missing-info warning | `jobGaps()` | `lib/job-validation.ts` |
| Workflow customization (per-company stages) | **Decided, not yet built** — `CompanyWorkflowStage` + `WorkflowTemplate`, one shared `JobStatus` enum underneath. See §14, §15. | — |
| Dashboard "needs attention" | Partially built — see §11. | `app/(dashboard)/dashboard/page.tsx` |
| Change order | **Decided, not yet built.** Requires an approved `Quote`. See §19. | — |
| Additional Work / Billable Add-On | **Decided, not yet built.** For no-quote jobs. See §19. | — |
| Quality check / walkthrough | **Decided, not yet built.** See §20. | — |
| Pre-construction checklist | **Decided, not yet built.** See §7.6. | — |
| Warranty | **Decided, not yet built** — homeowner-facing, share link, templates. See §14, §20. | — |
| Progress tracking | **Decided, not yet built** — visit/task completion by default, optional manual override. See §7.8, §14. | — |

## 4. Sales Pipeline — updated per owner decision

**Decision applied:** add a distinct `Contacted / Qualified` stage. Do not add a separate `Follow-Up / Negotiation` stage — handle follow-up through reminders, dashboard alerts, and existing quote/proposal activity instead. Keep the pipeline short enough for a small business owner to read at a glance.

The owner's recommended pipeline:

```
New Lead → Contacted / Qualified → Site Visit / Assessment → Estimate →
Proposal Sent → Changes Requested → Won
                                   ↘ Lost
```

This maps almost exactly onto the existing derived `lib/pipeline.ts` board, which already has `LEAD`, `ASSESSING` (= Site Visit/Assessment), `DRAFT`+`AWAITING_RESPONSE` (= Estimate + Proposal Sent), `CHANGES_REQUESTED`, `WON`, `LOST`. Two adjustments:

1. **Add `Contacted / Qualified`.** The pipeline currently has no stage between "nobody has answered" (`LEAD`) and "someone is actively assessing" (`ASSESSING`) — exactly the gap the owner is closing. Recommended schema change: add `RequestStatus.CONTACTED` (between `NEW` and `ASSESSING`), and extend `stageForRequest()` in `lib/pipeline.ts`:
   ```
   NEW → LEAD
   CONTACTED → CONTACTED   (new)
   ASSESSING → ASSESSING
   CLOSED → LOST
   ```
   `PIPELINE_STAGES` gains one entry, inserted after `LEAD`. This is a plain additive enum value — safe under the `prisma migrate` history this repo now has (§24) — with no change to `Quote`/`Job` status handling.
2. **Keep `AWAITING_RESPONSE` and `OPENED` as two separate columns**, not one "Proposal Sent" column as the owner's illustrative list shows. `lib/pipeline.ts`'s own comment already explains why this distinction earns its keep: "have they even looked at it" (unopened → chase the link) and "opened and silent" (chase the price) call for different follow-ups. The owner's answer says not to add pipeline stages *casually*; it doesn't ask to remove ones that already work, so this stays.

No `Follow-Up / Negotiation` stage is added. Follow-up is handled by what already exists: `app/api/cron/quote-reminders` (item 43 in `docs/PLAN-CRM.md`), the dashboard's `ReceivablesSummary`/`NewRequestsSummary`/`PipelineSnapshot` tiles, `QUOTE_STATUS_META`'s own hints ("worth a call in a year"), and the activity timeline as a communication history. If `CHANGES_REQUESTED` starts feeling too vague in practice — the one condition the owner named for revisiting this — that's the trigger to reconsider a dedicated negotiation stage, not a default to build toward now.

**Revised pipeline, 9 stages:** `LEAD → CONTACTED → ASSESSING → DRAFT → AWAITING_RESPONSE → OPENED → CHANGES_REQUESTED → WON / LOST`.

## 5. Production Pipeline (as it exists today — unaffected by this revision)

```
lib/job-status.ts — STATUS_FLOW

  LEAD → INSPECTION → PROCESSING → READY_FOR_QUOTE → QUOTED → SCHEDULED → IN_PROGRESS → COMPLETED
                                                                                                  ↘ ARCHIVED (terminal, reachable from anywhere)
```

This enum is visibly roofing-shaped (`INSPECTION`/`PROCESSING` describe the drone-capture-and-photogrammetry pipeline). The owner's workflow-customization answer (§15) resolves how this is handled for other trades: the backend enum stays exactly as it is for v1; a new per-company configuration layer controls what a given company actually *sees* of it.

`JobStatusStepper` (`components/dashboard/job-status-stepper.tsx`) already renders the brief's "smart Next button" — see §17 for how it's extended, not replaced, by the workflow-customization decision.

## 6. Financial Pipeline (as it exists today — unaffected by this revision)

Not a stored enum. `Invoice.status` is **arithmetic, not narrative** — `lib/invoice/balance.ts` derives `PARTIALLY_PAID`/`PAID`/`OVERDUE` from `InvoicePayment` rows and `dueAt`; only `DRAFT`, `SENT`, and `VOID` are ever set by a person.

- **Deposit Due/Paid** — `Quote.depositCents`/`depositPercentMicros`, resolved by `lib/invoice/draw.ts`.
- **Progress Billing** — more than one `Invoice` against the same `Quote` ("draws"), overbilling enforced.
- **Final Invoice** — the last draw.
- **Payment Pending / Paid** — `InvoiceStatus`, derived; `agedReceivables()` answers "what's overdue" company-wide.
- **Closed / Warranty** — `Job.status: ARCHIVED` exists; warranty is now designed (§14, §20), not yet built.

**Gap unchanged from the first draft:** no single screen composes this chain into one "financial status of this job" view. See §21.

## 7. Every Workflow Stage — Detail

### 7.1 Request (the brief's "Lead")

- **Inherited:** nothing — front door. Public "Request a Quote" form exists (`docs/PLAN-CRM.md` item 45).
- **User enters:** `title`, `description`, `source`, `Client`/`Property`.
- **Automated:** `RequestStatus: NEW` on creation; `source` copies onto `Client.leadSource`.
- **Next action:** `[ Mark Contacted → ]` (new, writes `RequestStatus: CONTACTED` — §4) once someone has actually reached the lead, then `[ Start Assessing ]` once it's a real opportunity, or convert directly to a `Job` for work agreed without a formal look.

### 7.2 Site Visit / Assessment

Unchanged from the first draft. **Next action:** `[ Complete Inspection → ]`.

### 7.3 Estimate

Unchanged from the first draft, including the noted gap (a rolled-up cost/margin summary panel ahead of the line-item builder — see Phase 5, §25).

### 7.4 Proposal (Quote sent)

Unchanged from the first draft.

### 7.5 Contract Signed (Quote approved)

Unchanged from the first draft. "Starting the production workflow" on approval still means presenting the pre-construction checklist in §7.6.

### 7.6 Pre-Construction

Unchanged from the first draft: a `preConstructionGaps(job)` checklist function, not a new `JobStatus` value. See Phase 4, §25.

### 7.7 Scheduled → Production

Unchanged from the first draft.

### 7.8 Production — daily updates, change orders, delays, progress

**Progress tracking — decided.** The default is visit/task completion, not a manually entered percentage:

```
3 of 5 visits completed
```

This is already computable for any job with more than one `Visit` (recurring work especially) with zero new schema. For jobs where that's not a meaningful signal — a large one-off project with one long visit, say — Aernova supports an **optional** manual override, entered at two different levels of precision by two different audiences:

- **Crew, from `/today`** — a simple five-state picker, not a percentage, matching how a crew member actually thinks about a job in progress:
  ```
  Not Started · In Progress · Mostly Complete · Ready for Quality Check · Completed
  ```
- **Office, on the job page** — can set (or override) an exact percentage when a crew member's simple state isn't precise enough for how the office wants to report progress.

Both are optional per job; neither is required anywhere, matching §12's blocking philosophy. See §14 for the schema, and Phase 9 (§25) for sequencing.

- **Photos/notes, material usage/actual cost, change orders, report delay:** unchanged from the first draft except change orders, which are now designed — see §19.

### 7.9 Quality Check / Customer Walkthrough

Unchanged from the first draft. See §20.

### 7.10 Completed → Invoiced → Paid → Closed

Unchanged from the first draft, except: invoicing now has two paths, not one — see §19's Change Order vs. Additional Work distinction, which affects this stage directly (a job with no quote can now be invoiced at all, which was a real gap before).

## 8–11. Information Required / Inherited / Automated / User Actions

Unchanged — covered per-stage in §7, per the original document's reasoning for folding these into the stage walkthrough rather than a separate abstract list.

## 12. Validation / Blocking Conditions

Unchanged from the first draft, with one addition from the progress-tracking decision:

- **Never block on:** missing photos, missing notes, missing progress signal of either kind (visit count, manual state, or percentage — none of them required).

## 13. Project Timeline / Event Architecture

Unchanged in mechanism. The new work across all three revisions needs more `ActivityKind` values than the first draft scoped: `CHANGE_ORDER_CREATED`, `CHANGE_ORDER_APPROVED`, `ADDITIONAL_WORK_INVOICED` (the fast, below-threshold path), `ADDITIONAL_WORK_HOMEOWNER_REVIEW_SENT` and `ADDITIONAL_WORK_HOMEOWNER_CONFIRMED` (the at/above-threshold default path, §19.2), `ADDITIONAL_WORK_OFFICE_OVERRIDE` (the fallback path, carrying `overrideReason` and, when applicable, `overrideNote` — the audit trail), `QUALITY_CHECK_EVIDENCE_SUBMITTED` (crew, from `/today`), `QUALITY_CHECK_COMPLETED` (office, final), `WARRANTY_SENT`, `WARRANTY_CONFIRMED` (the acknowledgement event, §20), `PROGRESS_UPDATED` (crew-entered state changes only — not every percentage tweak, to avoid flooding the timeline). No new timeline mechanism.

## 14. Recommended Database Changes / Prisma Model Changes

Revised and expanded from the first draft to match the owner's decisions. Still additive-only — no change to `Job`, `Quote`, or `Invoice`'s existing columns, and no change to any enum `pipeline.ts`/`job-status.ts`/`quote-status.ts` already depend on.

### 14.1 Sales pipeline (§4)

```prisma
enum RequestStatus {
  NEW
  CONTACTED   // new — "someone has reached this lead and it's worth pursuing"
  ASSESSING
  CONVERTED
  CLOSED
}
```

### 14.2 Change orders and Additional Work (§19)

```prisma
/// A billable scope addition to an *already-approved* quote. Always
/// requires a Quote — see §19 for why a change order without one is
/// deliberately not representable by this model.
model ChangeOrder {
  id          String            @id @default(cuid())
  companyId   String
  jobId       String
  quoteId     String            // required — a change order amends an approved quote
  title       String
  description String?
  status      ChangeOrderStatus @default(DRAFT)
  amountCents Int               // additive to the contract value once approved
  approvedAt  DateTime?
  approvedByUserId String?
  createdByUserId  String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  job     Job     @relation(fields: [jobId], references: [id], onDelete: Cascade)
  quote   Quote   @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  lineItems ChangeOrderLineItem[]

  @@index([jobId, status])
}

enum ChangeOrderStatus {
  DRAFT
  SENT
  APPROVED
  DECLINED
}

model ChangeOrderLineItem {
  id            String @id @default(cuid())
  changeOrderId String
  name          String
  description   String?
  quantity      Float  @default(1)
  unit          String @default("each")
  unitCostCents Int?
  unitPriceCents Int   @default(0)
  amountCents   Int    @default(0)

  changeOrder ChangeOrder @relation(fields: [changeOrderId], references: [id], onDelete: Cascade)
}
```

**Additional Work / Billable Add-On needs almost no new schema.** `Invoice.quoteId` has been nullable since Phase 5 of `docs/PLAN-CRM.md`, deliberately, for exactly this case — the schema already anticipated a no-quote invoice. What's missing is mostly an *action*: today `createInvoiceFromQuoteAction` is the only way to create an `Invoice`, and it requires a quote. The gap to close is a second, small action (`createDirectInvoiceAction` or similar) that creates an `Invoice` with manually entered `InvoiceLineItem` rows and `quoteId: null` — no new table, no new relation, just a new entry point into a table that already supports this shape.

**One real field is new, from this revision's threshold decision (§19.2):**

```prisma
// On Company — nullable, so "unset" reads as the v1 default rather than $0.
// Configurable at onboarding or later in Settings.
billableAddOnThresholdCents Int?   // null = use the $500 v1 default
```

Below the threshold, `createDirectInvoiceAction` can go straight to `DRAFT`/`SENT` like any other invoice. At or above it, the same action is gated: it still creates the `Invoice`, but leaves it in a state that can't be sent until the homeowner has reviewed it — the *default* path — or, only as a named fallback (`AddOnReviewOverrideReason`, defined in §19.2), an OWNER/ADMIN capability-gated confirmation. No new table for either path — see §19.2 for the exact mechanics and why the two aren't equally weighted.

### 14.3 Quality check — revised to split crew evidence from office completion (§20)

The first draft's `QualityCheck` model already happened to have the right fields; what was missing was a stated split on *who* writes which ones. This revision makes that split explicit in the schema comment rather than leaving it to be decided at implementation time:

```prisma
/// Two authors, two different sets of fields — never the same write path.
/// Crew (capability: a new "submitFieldEvidence", CREW-tier, alongside the
/// existing completeVisit) can write the field-evidence fields from /today.
/// Only office/estimator (a new "completeQualityCheck", office-tier like
/// manageJobCosts) can write scopeCompleted/deficienciesResolved/
/// walkthroughCompleted/completedAt — the fields that actually gate
/// [ Complete Project → ] in JobStatusStepper. Crew supplies evidence;
/// office makes the call. See lib/permissions.ts's existing deny-by-default
/// doctrine — these are two new capabilities added to that matrix, not a
/// side channel around it.
model QualityCheck {
  id        String @id @default(cuid())
  jobId     String @unique

  // Crew-writable field evidence, from /today.
  siteCleaned              Boolean   @default(false)
  photosUploaded           Boolean   @default(false)
  fieldEvidenceNotes       String?
  fieldEvidenceSubmittedAt DateTime?
  fieldEvidenceSubmittedByUserId String?

  // Office/estimator-only. This half — not the evidence above — is what
  // gates the job's actual COMPLETED transition.
  scopeCompleted        Boolean   @default(false)
  deficienciesResolved  Boolean   @default(false)
  walkthroughCompleted  Boolean   @default(false)
  walkthroughNotes      String?
  completedAt           DateTime?
  completedByUserId     String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  job Job @relation(fields: [jobId], references: [id], onDelete: Cascade)
}
```

### 14.4 Warranty — homeowner-facing, view-only, lightweight e-signature (§20)

Revised a third time: e-signature is now specified precisely (typed name + checkbox + IP/timestamp, not a drawn signature), and the starter template set grows from one per trade to two — Simple and Detailed.

```prisma
/// A homeowner-facing closeout document, mirroring Quote/Invoice's shape —
/// office reviews/edits a pre-filled draft, then sends via a share link —
/// with one deliberate difference: the homeowner's only action is a
/// lightweight, typed-name acknowledgement of having viewed/received it,
/// never an Approve/Request-Changes pair. A warranty is not negotiated, and
/// this is not a contract-signing flow — see §Assumptions.
model Warranty {
  id            String         @id @default(cuid())
  companyId     String
  jobId         String
  templateId    String?

  termMonths    Int
  startsAt      DateTime
  coverageNotes String?
  exclusions    String?
  /// Bumped whenever the office edits and re-sends an already-sent Warranty.
  /// Exists so a confirmed acknowledgement can be read against the exact
  /// wording it was given for — see the correction edge case in §23, which
  /// creates a new row rather than mutating a confirmed one; version is the
  /// human-readable label for telling those rows apart in a support
  /// conversation, since a cuid alone isn't one. **Homeowner-visible, not
  /// internal-only** — rendered quietly on the public document itself (§20),
  /// since the homeowner is the one confirming a specific version and is
  /// entitled to know which one that is.
  version       Int      @default(1)

  // Pre-filled from Company/Client/Property at creation, then a real
  // editable copy — same "pre-filled, then reviewed, not a live join"
  // pattern Quote's intro/body fields already use.
  companyInfoSnapshot     String   // name, licence #, contact — also where the logo renders, see §14.7
  customerInfoSnapshot    String
  propertyAddressSnapshot String

  status     WarrantyStatus @default(DRAFT)
  shareToken String?        @unique
  sentAt     DateTime?
  viewedAt   DateTime?

  // The acknowledgement — exactly what the owner specified, no more:
  // a confirmation checkbox, a typed name, and the thin-but-real evidence
  // trail (IP + timestamp) Quote's own acceptedByName/acceptedIp already
  // sets as this codebase's bar for "the homeowner did a thing." No drawn
  // or touch signature capture in v1.
  confirmationChecked Boolean   @default(false)
  signerName          String?
  confirmedAt         DateTime?
  signerIp            String?

  // Internal office review, before send — a business owner or estimator
  // confirms the pre-filled draft. Not the homeowner's acknowledgement above.
  reviewedByUserId String?
  reviewedAt       DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company  Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  job      Job               @relation(fields: [jobId], references: [id], onDelete: Cascade)
  template WarrantyTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)

  @@unique([jobId])
}

enum WarrantyStatus {
  DRAFT
  REVIEWED
  SENT
  VIEWED
  CONFIRMED   // renamed from the prior draft's ACKNOWLEDGED, to match confirmedAt
}

/// Built-in starters, not company-authored-only. companyId null = an
/// Aernova-provided starter for that trade, visible to every company on
/// that trade and never itself editable. Picking one and editing it — or
/// hitting "Duplicate" — creates a new row with companyId set, a real copy,
/// same "starter → live company copy → frozen document" chain
/// QuoteTemplateLineItem's own catalog-price doctrine already uses
/// (catalog → template (live) → quote (frozen)). Editing a company's own
/// copy never reaches back into the shared built-in row, and sending a
/// Warranty never reaches back into the template — it's copied onto the
/// Warranty's own fields at creation, same as Company/Client/Property are.
model WarrantyTemplate {
  id            String  @id @default(cuid())
  companyId     String? // null = built-in starter; set = a company's own (possibly duplicated-and-edited) template
  trade         Trade?  // set on built-ins to filter the picker by the company's trade; unused on a company's own row
  variant       String? // "Simple" | "Detailed" on built-ins; unused/free-form once a company duplicates and renames its own copy
  name          String  // "Roofing — Simple Warranty", "Roofing — Detailed Warranty", ...
  termMonths    Int
  coverageNotes String?
  exclusions    String?
  isDefault     Boolean @default(false) // this company's default pick — meaningless on a built-in row

  company    Company?    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  warranties Warranty[]

  @@index([companyId])
  @@index([trade])
}
```

**Built-in starter set, v1 launch — Simple and Detailed per trade, eight rows total. Not a permanent ceiling.**

```
Roofing — Simple Warranty          Roofing — Detailed Warranty
Plumbing — Simple Warranty         Plumbing — Detailed Warranty
Lawn Care — Simple Warranty        Lawn Care — Detailed Warranty
General Contracting — Simple Warranty   General Contracting — Detailed Warranty
```

Seeded the same way `WorkflowTemplate` (§14.6) is, read at the point a business owner first creates a warranty rather than forced on them at onboarding (onboarding already asks enough; warranty templates are only relevant once a job is closing). "Simple" and "Detailed" differ in `coverageNotes`/`exclusions` length and specificity, not in `termMonths` — a company can still adjust the term on either variant before saving its own copy. Picking either still goes through the same edit/review step (§20) before sending; the choice is about how much starting text to work from, not a shortcut around review.

**Decided this round: two variants is the launch set, not the design's limit.** `WarrantyTemplate.variant` is a free-form `String?`, not a two-value enum, specifically so a third, fourth, or trade-specific built-in (an "Extended Warranty," a "Manufacturer + Labour Warranty," an "Emergency Repair Warranty," a "Renovation Warranty" — the owner's own examples) can be added later as a new seeded row, the same way the first two were, once usage data suggests it's worth the added onboarding choice. Nothing about the schema or the picker UI needs to change to add a third row; keeping launch to two is a product-scope decision for v1, not a technical ceiling.

**How a future variant actually gets suggested — decided this round, quiet by design, and now with a real rough signal instead of just "usage data."** If usage data shows many companies editing, say, the Detailed template the same way, that's a signal worth surfacing — but never as an interruption. It belongs in places an owner visits when they're already thinking about settings, not while they're mid-task: the Settings → Workflow/Templates area, a product-updates/changelog surface, or a dedicated admin suggestion area — never a popup or modal that appears while a business owner is actually creating or sending a warranty. An owner can also request a new variant directly at any time, independent of whatever Aernova itself might suggest; the two channels (system-suggested, owner-requested) both land on the same person eventually deciding whether to add a new built-in row, not on Aernova silently adding one.

**Per-trade rough threshold, the default** (a candidate for the signal in Assumption 12 below, not a hard trigger this doc can commit code to): **10+ companies, or 20%+ of active companies, in the same trade making a similarly-shaped edit to the same starter template over a 60–90 day window.** Either count alone is enough to be worth a look — a small trade with only 30 active companies would never hit "10+" on its own, so the percentage threshold exists specifically so a smaller trade isn't structurally excluded from ever earning a suggestion just because it has fewer companies in it than roofing does.

A second, global signal, for the case per-trade scoping would miss: Per-trade is the default lens, but Aernova shouldn't assume every worthwhile edit pattern is trade-specific — a scoping change that happens to be popular *within* roofing and *within* plumbing independently, each below its own per-trade threshold, is still a real signal if it's happening the same way across several trades at once. Rough global threshold: **20+ companies across at least 3 different trades making a similar edit to the same or an equivalent starter template over the same 60–90 day window.** A signal meeting the global bar suggests a *base/shared* template variant rather than one more trade-specific row; a signal meeting only a single trade's own bar stays a trade-specific suggestion. Both paths land in the same quiet suggestion surface (Settings/Templates, product updates, or an admin suggestion area) and both stay entirely read-only until a person acts — see Assumption 12.

**Decided this round: what "a similar edit" or "the same kind of change" actually means stays deliberately undefined as an algorithm — documented as recognizable examples instead, until real usage data exists to build against.** Overspecifying the exact equivalence logic now (word-diff thresholds, which fields count, how close is "close enough") would mean designing a detection algorithm against imagined data, which is exactly the kind of premature precision this doc's own doctrine warns against elsewhere. What's worth documenting instead is the *shape* of the patterns worth watching for — companies repeatedly touching the same kind of section, whichever specific wording they land on:

```
- Coverage terms                          - Emergency repair limitations
- Exclusions                              - Customer responsibility language
- Labour terms                            - Workmanship coverage language
- Manufacturer warranty language          - Extended warranty sections
```

If, once there's real template-edit data to look at, many companies turn out to be repeatedly expanding the exclusions section in a recognizably similar way, *that's* a concrete signal worth building real detection logic around — but the detection logic itself is a later, data-informed decision, not something this document should pretend to specify today.

### 14.5 Progress tracking (§7.8)

```prisma
enum JobProgressState {
  NOT_STARTED
  IN_PROGRESS
  MOSTLY_COMPLETE
  READY_FOR_QUALITY_CHECK
  COMPLETED
}
```

Two new nullable columns on `Job`:

```
progressState   JobProgressState?   // crew-entered, from /today
progressPercent Int?                // office-entered/adjusted; independent of progressState in v1 — see Assumptions
```

Both null by default. When both are null, the UI falls back to the computed visit/task-completion count — never a blank progress indicator.

### 14.6 Workflow customization (§15)

```prisma
/// One row per (company, JobStatus) the company has an opinion about.
/// Absence of a row means "default": visible, using STATUS_META's own
/// label. JobStatus itself is untouched — this is a display/visibility
/// layer over the one shared backend enum, not a second source of truth
/// for where a job actually is.
model CompanyWorkflowStage {
  id          String    @id @default(cuid())
  companyId   String
  jobStatus   JobStatus
  label       String?   // company's own word for the stage; null = use STATUS_META's default
  isEnabled   Boolean   @default(true)
  sortOrder   Int       @default(0)   // display-only in v1 — see Assumptions on drag-and-drop
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, jobStatus])
}

/// Seed data, not a user-editable builder in v1. One row per (trade,
/// template name) read once, at onboarding, to populate a company's
/// CompanyWorkflowStage rows so day one already looks tailored without
/// asking the owner to configure anything by hand.
model WorkflowTemplate {
  id         String @id @default(cuid())
  trade      Trade
  name       String    // "Roofing (default)", "Plumbing (default)", "General Contractor", ...
  stagesJson Json      // ordered [{ jobStatus, label, isEnabled }], applied on pick

  @@unique([trade, name])
}
```

No change to `JobStatus` itself, and no change to `updateJobStatusAction`'s state machine — see §15 for the reasoning.

### 14.7 Customer-facing document branding — new, cross-cutting

**Verified, not assumed:** `Company.logoUrl` already exists (schema, uploaded via Settings → Company profile, `docs/PLAN-CRM.md` Phase 5b), but a check of the actual public pages found it is **not currently rendered anywhere** — `app/(public)/q/[token]/page.tsx` (Quote) and `app/(public)/i/[token]/page.tsx` (Invoice) both send a homeowner to a page with no logo today, despite the field existing and being settable.

The owner's decision makes this a real, named requirement rather than a someday-nicety: **every customer-facing document renders the company's logo when set, and the company name in the document header when it isn't — never a blank header.** That's the existing `/q/[token]` (Quote) and `/i/[token]` (Invoice) pages (a real gap to close, not new scope invented by this doc), plus every new document this plan adds: `/w/[token]` (Warranty), a Change Order's approval page (§19.1), an Additional Work homeowner-review page when the threshold in §19.2 routes one there, and any future completion/closeout document. No schema change — `Company.logoUrl` already covers it.

**Decided this round, precisely — the placement rule is no longer left to implementation time:**

```
Logo exists:    top-left of the document header, inside a fixed branding
                box — max height ~40–48px, max width ~160–220px, on screen.
                Fit with contain behavior: the logo scales down to fit
                inside the box along whichever dimension binds first,
                aspect ratio always preserved, never stretched or cropped
                to fill the box. No minimum width — a small square logo
                sits at its natural size inside the box rather than being
                artificially widened, and is never upscaled past a
                reasonable visual quality just to look bigger.
No logo exists: company name renders in that exact same top-left position
                — same header slot, just text instead of an image. Never
                a blank header.
```

The width cap is decided this round alongside the height one — height alone let an unusually wide or landscape logo stretch clear across the header even while staying "short," which is exactly the kind of layout break a fixed-height-only rule misses. "Contain," not "cover" or "stretch" — the standard `object-fit: contain` behavior, so a tall, narrow (portrait-orientation) logo scales down by height and simply doesn't use the box's full width, rather than being stretched wider to fill it. No minimum-width requirement exists to counteract that; a portrait logo reading narrow inside its box is the correct, undistorted result, not a bug to compensate for.

**Decided this round: the leftover space inside the box, on whichever axis the logo doesn't fill, is transparent by default — never a neutral background fill.** A non-square logo in a fixed box always leaves space on one side; the document's own background (paper-white, or the surrounding header's own tone) shows through it rather than the logo sitting in a visible box-shaped tile. **The one exception is deliberate, template-level design, not a fallback:** a specific document template may intentionally use a branded header treatment with its own subtle neutral fill behind the logo — but that's a conscious visual-design choice for that template, applied on purpose, never the default behavior every document gets automatically.

**Decided this round: not a company-level toggle in v1, but companies aren't shut out of asking.** A neutral-fill branded header stays something Aernova designs into a document template, not a switch in Settings a company flips for its own documents — that's what keeps every document on a given template looking consistent rather than becoming a per-company styling free-for-all. A company *can* request a branded header style, the same way they can request a new warranty-template variant (§14.4); Aernova doesn't build a per-request custom header on demand, but repeated similar requests are exactly the kind of input that turns into a new built-in template variant later — a branded-header quote/invoice/warranty template, say — the same "requests inform future built-in options, a person still decides" pattern this whole document already applies to warranty variants. The transparent box stays the actual v1 default for every document that doesn't opt into a template with its own branded treatment.

One placement, one rule, applied identically across `/q/[token]`, `/i/[token]`, `/w/[token]`, and every document this plan adds — a homeowner who's seen one of a contractor's documents should recognize the next one at a glance. See `docs/DESIGN.md`'s matching addition for how this sits alongside the existing `paper-*` print-surface doctrine.

## 15. Workflow / State Architecture — updated per owner decision

The first draft answered the brief's single-enum-vs-coordinated-statuses question by pointing at the architecture that already exists: derived sales status, stored production status, derived financial status. **That answer is unchanged and still correct** — nothing about workflow customization touches it. What the owner's answer resolves is the second, narrower question the first draft left open: what to do about `JobStatus` being roofing-shaped in a multi-trade product.

**Decision: keep one shared `JobStatus` enum in the backend for v1** (this was option (a) from the first draft) — no migration risk, and it avoids re-opening a schema that was just carefully split. But the *user-facing* experience is now explicitly designed to feel customizable, via the `CompanyWorkflowStage`/`WorkflowTemplate` models in §14:

- **Onboarding asks what kind of business this is and what workflow it wants**, visually — clickable template cards per trade (`WorkflowTemplate` rows, seeded per `Company.trade`: roofing, plumbing, lawn care, general contractor, and a generic fallback), not a form. Picking one writes a full set of `CompanyWorkflowStage` rows for that company in one action.
- **A non-roofing company never sees roofing-only stages** (`Processing`, etc.) **unless it picks a roofing template or turns on the roofing module** — `CompanyWorkflowStage.isEnabled: false` for those `JobStatus` values by default on every non-roofing template. `updateJobStatusAction`'s actual state machine is unchanged; a disabled stage is simply skipped when computing what to show next (the enum value can still be written to the database if something needs it internally — e.g. a company changes trade later — it's just never surfaced).
- **Disabling a stage never touches a job already sitting in it — decided.** `isEnabled: false` only changes two things: the stage stops being offered on *new* jobs, and it stops appearing as a normal forward option in the stepper for jobs that haven't reached it yet. A `Job` whose *current* `status` is the now-disabled value keeps showing exactly that status — Aernova never auto-migrates it to some other stage on the owner's behalf, silently or otherwise. Instead, `JobStatusStepper` (§17) renders a visible notice on that job specifically:
  > *"This stage is disabled for future jobs. Move this job to the next active stage when ready."*
  The owner decides when and where that job moves next; disabling a stage is a decision about new work, not a retroactive instruction about jobs already in flight. **Decided this round:** the job page's warning is not the only place this surfaces — the dashboard action center (§11, §25 Phase 12) gets a matching low-priority item, e.g. *"1 job is currently in a stage disabled for future jobs,"* so the owner can find these jobs without having to remember to look or manually search for them. Low-priority deliberately: this is a heads-up, not something demanding immediate action the way an overdue invoice or a pending change-order approval is. **Clicking that item goes straight to a filtered jobs list scoped to exactly those jobs** — not the general `/jobs` list with an unwritten instruction to go look for a warning. The job page itself keeps the detailed, per-job warning from above; the dashboard's job is only to get the owner *to* that job with one click, following the same "if Aernova says something needs attention, clicking takes you to the relevant work" doctrine every other dashboard tile in §11 already follows (`ReceivablesSummary` links to the overdue invoices themselves, not to "invoices" in general). **Sorted oldest-stuck-first, not the jobs list's normal default** — the job that has been sitting in a disabled stage the longest surfaces at the top, because the longer it's gone unnoticed the more likely it actually needs the owner's attention, and the whole point of this item is to resolve the most stale case first rather than whichever one happens to sort newest. **Decided (and sharpened this round): a real, fully-specified tiebreak, not "sort by date and hope it never ties."**
```
1. Oldest entry into the current (now-disabled) stage — the primary sort.
2. Oldest job created — the fallback when two jobs entered that stage at
   the exact same instant (e.g. a bulk status change).
3. Jobs that have a jobNumber before jobs that don't — jobNumber is
   nullable (older backfilled rows may lack one), so this level exists
   purely to keep a numbered job from landing arbitrarily among unnumbered
   ones once the timestamps have already tied.
4. jobNumber itself, ascending, among jobs that have one.
5. title, for the (rare) jobs still missing a jobNumber.
6. id — the final, always-present fallback, so the order is fully
   deterministic even if every level above ties.
```
This is what keeps the list from visibly reordering itself between one page load and the next for no reason a business owner could see — a small thing, but exactly the kind of "why did this move" confusion a low-priority notice should never cause. A job missing a `jobNumber` isn't penalized beyond sorting after numbered jobs at level 3 — it still sorts correctly by its own oldest-stuck-first position; level 3 only ever matters among jobs that have already tied on both timestamps.

**Decided this round: treat a missing `jobNumber` as rare, not as a real workflow to design around — but keep the fallback level regardless.** Absent data proving otherwise, jobs without a `jobNumber` are assumed to be an edge case (older backfilled rows, mainly — see `docs/PLAN-CRM.md`'s own note on `jobNumber` assignment) rather than something day-to-day usage produces often. That reframes level 3 correctly: it's a *stability safeguard* for a tiebreak chain that has to be total (every job must sort somewhere, deterministically), not a user-facing feature anyone is expected to notice or rely on. The fallback stays in the design exactly as specified — cheap to keep, and removing it would just reintroduce the "why did this reorder" risk for the rare case it does apply to — it's simply not something worth further product design attention beyond that.
- **Stages can be renamed in the company's own language** — `CompanyWorkflowStage.label` overrides `STATUS_META[status].label` wherever it's set. A plumbing company can call `READY_FOR_QUOTE` "Ready to Price" if that's the phrase the owner actually uses.
- **Editable after onboarding** — a new Settings → Workflow section lists the company's enabled stages with their labels, backed by the same `CompanyWorkflowStage` rows.
- **Drag-and-drop stage *reordering* is explicitly long-term, not v1.** `sortOrder` exists in the v1 schema so it's not a breaking change to wire up later, but v1 ships with a fixed underlying order (the real `STATUS_FLOW` sequence) and only show/hide + rename as live features. A true visual, drag-and-drop workflow *builder* — where a company can define genuinely custom stages, not just reorder/relabel the fixed roofing-shaped list — is the stated long-term direction (see §25 Phase 13) and is intentionally not scoped in detail here, since it would likely require the trade-agnostic-core schema split the first draft called option (b) and explicitly deferred.

This is a real change from the first draft's plain "(a), full stop" recommendation: it's now "(a) at the data layer, with a real customization *experience* layered on top," which is what actually answers the owner's stated principle — Aernova adapts to the business, not the other way around — without taking on a schema migration to get there.

## 16. UI Architecture

Unchanged in shape from the first draft (`app/(dashboard)/jobs/[jobId]/page.tsx` stays the one central project page, extended with new panels/tabs rather than replaced). One addition: **onboarding** (`/onboarding`, which already exists per the README for trade/province selection) grows a second step — the workflow template picker from §15 — and **Settings** grows a new "Workflow" page for post-onboarding editing.

## 17. Reusable Next / Primary Action Component Design

Unchanged in its core recommendation: generalize `JobStatusStepper`'s shape (label/description/nextStep/advanceLabel/badge), don't build a cross-entity config engine spanning Request/Quote/Job/Invoice at once (§17 of the first draft explains why).

**One addition from the workflow-customization decision:** `JobStatusStepper` (and any future `QuoteStatus`/`InvoiceStatus` mini-cards) needs to read through a small `effectiveStageMeta(companyId, status)` lookup instead of `STATUS_META[status]` directly — joining the static `STATUS_META` with the company's `CompanyWorkflowStage` override (label, enabled) before rendering. This is a thin read-time join, not a new state machine; `updateJobStatusAction` itself doesn't change.

**A second addition, from the disabled-stage decision (§15):** `effectiveStageMeta()` also needs to answer "is the job's *current* stage disabled" as a distinct fact from "is this stage offered going forward." When true, the stepper renders the warning copy from §15 in place of (or alongside) the normal stage description, and the smart Next button still works exactly as it does today — the disabled flag changes what's *displayed*, never what the owner is allowed to click.

## 18. (folded into §17, as in the first draft)

## 19. Change-Order Workflow and Additional Work / Billable Add-On — decided

**The rule, stated plainly (owner's words):**

```
If there is an approved quote:  use a Change Order.
If there is no approved quote:  use Additional Work / Billable Add-On.
```

### 19.1 Change Order (requires an approved Quote)

Using `ChangeOrder`/`ChangeOrderLineItem` from §14.2 — note `quoteId` is now **required**, not nullable, reflecting the owner's "usually require a base approved Quote" rule directly in the schema rather than leaving it a soft convention.

1. Office/estimator creates a `ChangeOrder` against the job's approved `Quote`, with line items priced the same way a quote line is.
2. `[ Send Change Order for Approval → ]` — reuses `Quote`'s share-token pattern for homeowner approval, or an office-recorded phone approval, same as `markQuoteApprovedAction`.
3. On `APPROVED`: `ActivityKind.CHANGE_ORDER_APPROVED` recorded; effective contract value becomes `Quote.totalAmountCents + Σ(approved ChangeOrder.amountCents)` — computed, not a new stored total.
4. `createInvoiceFromQuoteAction`'s overbilling guard must be extended to check against quote total *plus* approved change orders, or a legitimate change order will trip the existing anti-double-invoice guard.

**Example, matching the owner's own numbers:**

```
Original approved quote:      $16,000
Approved change order:        +$1,200
Updated job value:            $17,200
```

### 19.2 Additional Work / Billable Add-On (no quote required) — now with a review threshold

For the small repair jobs `docs/PLAN-CRM.md`'s own "required to advance, not required to exist" doctrine was written to protect — a job that was never quoted at all shouldn't need one invented just to bill for it. Almost no new model (§14.2) — a new **direct invoice creation path**: an `Invoice` created straight from the job, `quoteId: null`, with manually entered `InvoiceLineItem` rows, using the schema's existing (but so far unused) support for a quote-less invoice.

**Decided this round: not approval-free at every amount, and above the threshold, the two paths are not peers.** The rule, in the owner's own words:

```
Below company threshold:      office can add directly to job/invoice.
At or above company threshold: homeowner review is the default before invoicing.
Office/internal confirmation:  allowed only as a fallback or intentional override.
```

- **Below the company's threshold** (`Company.billableAddOnThresholdCents`, §14.2 — defaults to $500 when unset): `createDirectInvoiceAction` behaves exactly as the prior revision described — office enters it, it can go straight to `SENT`. Fast, matching the "small jobs shouldn't become overcomplicated" principle.
- **At or above the threshold, the default path is homeowner review** — the draft is shared to the homeowner first, reusing the share-link/view pattern every other customer document in this doc already uses, and the invoice can't reach `SENT` until they've looked at it. This is now the *preferred* path, not one of two equally-weighted options.
- **Office/internal confirmation is a fallback, not an alternative** — available only when the office selects a specific reason from a picklist, not as a bare "confirm" button:
  ```prisma
  enum AddOnReviewOverrideReason {
    HOMEOWNER_CONTACT_MISSING   // no email/phone on file to send a review link to
    VERBAL_APPROVAL             // homeowner already said yes on the phone/in person
    OWNER_OVERRIDE              // the business owner is intentionally recording an internal approval
  }
  ```
  Alongside it, a note:
  ```prisma
  // Optional for HOMEOWNER_CONTACT_MISSING and VERBAL_APPROVAL — the reason
  // alone is usually self-explanatory. Required, application-layer-enforced
  // (not a NOT NULL column, since it's conditional on the reason), when
  // overrideReason is OWNER_OVERRIDE — an owner overriding their own
  // process without homeowner contact or a verbal yes on record needs to
  // say why, the same way QuoteDeclineReason.OTHER needs a note elsewhere
  // in this codebase. This is what keeps OWNER_OVERRIDE from becoming a
  // one-click bypass with nothing behind it.
  //
  // A real explanation, not a tag: the OWNER_OVERRIDE case renders as a
  // small multi-line textarea, not a single-line input, and a *strictly
  // enforced* 20-500 character range, not a soft guideline: the form will
  // not submit below 20 characters ("because I said so" doesn't clear the
  // bar) or above 500 (a wall of text stops being an audit-trail note and
  // starts being a policy memo).
  //
  // The validation copy is context-specific, not generic. Out-of-range
  // submission shows:
  //   "Please explain why homeowner review is being skipped. Enter 20-500
  //   characters."
  // — never a bare "Please enter between 20 and 500 characters," which
  // explains the rule but not why it exists.
  //
  // The live counter has two states, not one — decided this round, because
  // a single "characters remaining" reading is actively misleading on an
  // empty field ("500 characters remaining" reads as "plenty of room,"
  // not "you haven't met the minimum yet"):
  //   Below 20 characters:  "10 more characters required" (counts UP
  //                         toward the floor — the message is "keep
  //                         going," not a number that looks like slack).
  //   At 20 or more:        switches to "480 characters remaining" (counts
  //                         DOWN toward the 500 ceiling, the ordinary
  //                         message-length-counter convention).
  // The switch happens the instant the 20th character is typed, with no
  // intermediate state. For HOMEOWNER_CONTACT_MISSING/VERBAL_APPROVAL, the
  // note stays optional and, when given, unconstrained — the strict range,
  // its copy, and this two-state counter are all specific
  // to OWNER_OVERRIDE, not a blanket rule on the column.
  overrideNote String?
  ```
  Recording a reason (plus the usual `confirmedByUserId`/`confirmedAt` capability-gated to OWNER/ADMIN, the same phone-approval precedent `markQuoteApprovedAction` already establishes) is what lets this stay an honest fallback rather than a way to routinely skip the homeowner's own look — every override is attributable to a specific, named reason, and `OWNER_OVERRIDE` specifically carries a real, readable explanation, not a shrug or a one-click bypass. Both `overrideReason` and `overrideNote` are what `ADDITIONAL_WORK_OFFICE_OVERRIDE` (§13) writes onto the timeline — the audit trail the owner asked for lives there, readable later on the job's own activity feed, not in a side table nobody looks at.
- **Neither path is the full `ChangeOrder` approve/decline flow from §19.1** — this stays lighter-weight on purpose, since Additional Work exists specifically for jobs too small to carry a formal change order.
- **Configurable per company**, at onboarding (alongside the trade/workflow-template picker, §15) or later in Settings. This protects the homeowner from a surprise large charge without slowing down the common case of a genuinely small add-on.

One new enum beyond the one field in §14.2 — the gate and its override reason live inside the existing invoice-send action, not a new table.

**Deliberately not doing:** editing `QuoteLineItem` rows on an already-approved quote (unchanged reasoning from the first draft — `Quote` is frozen at approval).

## 20. Project Completion Workflow — updated per owner decision

- **Quality Check panel — now explicitly two-role, per §14.3.**
  ```
  Crew completes field evidence from /today
    → Office/owner reviews evidence
    → Office/owner completes final quality check
    → Office/owner marks project complete
  ```
  Crew (a new `submitFieldEvidence` capability, CREW-tier) can check off `siteCleaned`/`photosUploaded` and add `fieldEvidenceNotes` directly from `/today`, the same surface they already use to complete a visit — this is the "basic completion evidence" the owner asked for. That evidence is visible to office roles but changes nothing about the job's status by itself. `[ Complete Project → ]` in `JobStatusStepper` still only unlocks once `scopeCompleted`/`deficienciesResolved`/`walkthroughCompleted` are set — and those three, plus the final `completedAt`, are written only by an office/estimator role holding a new `completeQualityCheck` capability. Crew can supply evidence; only office/owner can finalize. Crew never gains any path to a money- or customer-facing action (invoicing, warranty, change-order approval) through this panel.
- **Warranty — a real customer-facing closeout document with a built-in starting point and a lightweight signature, not an internal record.** Using `Warranty`/`WarrantyTemplate` from §14.4:
  ```
  Built-in starter template (Simple or Detailed) → business owner edits/reviews
  → Aernova pre-fills job/customer/company details → company logo appears on
  the document → business owner sends share link →
  homeowner opens the link → reviews the view-only warranty →
  checks the confirmation box → types their name →
  confirms received/viewed → Aernova records the acknowledgement
  ```
  1. At or after job completion, the office picks a built-in `WarrantyTemplate` — Simple or Detailed, for its trade — or one of the company's own edited/duplicated templates, and Aernova pre-fills term, coverage notes, exclusions from it, plus company/customer/property information from existing `Company`/`Client`/`Property` records — nothing written from scratch.
  2. The business owner reviews, edits anything that doesn't fit this job, and **confirms** — `reviewedByUserId`/`reviewedAt`, an internal step, still not a homeowner signature.
  3. `[ Send Warranty → ]` mints `shareToken`, sets `SENT`, renders at a new `/w/[token]` route — company logo included when set (§14.7).
  4. Homeowner opens it (`viewedAt` recorded, same as a quote or invoice) and reads it — **view-only, no edits, no negotiation, no Approve/Request-Changes pair.** The main document stays clean and focused on coverage; `version` appears only in a subtle footer/document-details area (e.g. *"Document version: 2"*), never competing with the coverage terms for attention.
  5. The homeowner **checks a confirmation box, types their name, and confirms** — deliberately not a drawn or touch signature in v1. `confirmationChecked`, `signerName`, `confirmedAt`, and `signerIp` are all written together; `status` moves to `CONFIRMED`. This is explicitly **not** the same as approving a Quote and is not a contract-signing flow — there's nothing to accept or reject, only a record that the document was received and looked at. After confirming, the same footer area reads *"Warranty Version 2"* / *"Confirmed August 9, 2026"* — the homeowner is confirming a specific version, so knowing which one is theirs to see, quietly, not as the headline. **The date format is decided, not incidental — and it's a doctrine, not just an English string.** Long month name, day, full year — "Confirmed August 9, 2026" in English — never a bare `08/09/2026`, never a time-of-day, and never a relative phrasing like "confirmed 3 days ago." A relative date reads fine the week it's written and stops meaning anything the moment the page is reopened years later on a warranty claim; the long format is what still reads correctly at that distance, which is the whole point of a document meant to outlive the transaction that created it. **Sharpened this round: v1 ships English long dates only, and that's fine — non-English locale support isn't a near-term item.** The distinction the owner is drawing is between *what v1 ships* and *what v1's design should never rule out*: English long dates are the correct, complete v1 answer, not a stopgap apologized for. What matters is that nothing about how this is built hardcodes an English-only assumption in a way that would force a rewrite later — the doctrine itself (long, no time, never relative) is the future-proofing principle, expressed in English today and, whenever locale infrastructure exists, in that locale's own long-date convention (a future French locale reading *"Confirmé le 9 août 2026,"* not an English date left untranslated). This is a standing principle to build correctly by, not a locale feature being built now. **Decided this round, explicitly: v1's customer-facing copy carries no hint of this at all.** No "other languages coming soon," no visible language/locale setting, nothing in the warranty page or anywhere else that reads as a forward-looking promise about language support — v1 is meant to read as a complete, English product, not an English product apologizing for not being more yet. Future-proofing lives entirely in how the date is built (the doctrine, not a hardcoded English-only assumption baked into the implementation), never in what the homeowner or business owner sees on screen today.
- **"Prepares: Final Invoice / Warranty / Completion Summary / Final Photos / Project Records"** — unchanged reasoning from the first draft: a *display* question (a Documents panel) more than a backend one. Warranty now has a real place in that list, including its acknowledgement status.

## 21. Financial Completion Workflow

Unchanged from the first draft, with one addition: the "Original Contract / Change Orders / Total / Paid / Balance Due" panel now also needs to account for any Additional Work invoices (§19.2), which sit outside any quote entirely — they add to what a job has billed in total without adding to "contract value," since there was no contract to add to.

## 22. Mobile UX Considerations

Unchanged core reasoning (office vs. crew as two distinct mobile audiences). Progress tracking (§7.8) and crew quality-check field evidence (§20) are now the two concrete examples of "crew-first" mobile design the first draft asked for in the abstract: the five-state progress picker and the `siteCleaned`/`photosUploaded`/notes evidence fields are both designed specifically for `/today` — thumb-sized, minimal typing, no dollar figures or legal/customer-facing actions anywhere near them. The question of whether crew should touch the quality checklist at all is now **resolved**: crew supplies evidence, office/owner finalizes — see §20 for the exact split and the two new capabilities (`submitFieldEvidence`, `completeQualityCheck`) it implies.

## 23. Error / Edge Cases — updated

- **A change order on a job with no approved quote** — no longer an edge case to handle, because it's no longer representable: `ChangeOrder.quoteId` is required (§14.2/§19.1). A job with no quote uses Additional Work (§19.2) instead, which needs no quote and carries no such edge case.
- **Two change orders approved in overlapping windows** — unchanged from the first draft (additive, no conflict).
- **A job archived mid-change-order** — unchanged from the first draft.
- **Quality check completed, then a new issue found** — unchanged from the first draft.
- **A company disables a `JobStatus` stage a job is currently sitting on** — resolved in §15: the job keeps its real status and shows a warning; nothing auto-migrates.
- **A company changes its Additional Work threshold after invoices already exist** — never retroactive. The threshold is read at the moment a direct invoice is created; an existing `Invoice` keeps whatever review state it was created under, even if the company's threshold changes the same day.
- **A homeowner confirms a warranty, then the office needs to correct it** — `Warranty` doesn't support editing after `CONFIRMED`, same doctrine as `Quote` staying frozen post-approval; a correction is a new `Warranty` row (new `shareToken`, fresh acknowledgement, `version` incremented per Assumption 8), not a mutation of the confirmed one.
- **`docs/PRODUCT.md`/`docs/DESIGN.md` staleness** — resolved this revision. `docs/PRODUCT.md` has been rewritten (see the accompanying summary); `docs/DESIGN.md`'s YAML `description` field, which made the same "roof measurement platform" claim, has been corrected too.
- **Uncommitted working-tree state** — as of the first draft, `app/(dashboard)/invoices/page.tsx`/`quotes/page.tsx` had uncommitted edits and new untracked table components; separately, `DEPLOYMENT.md`/`DESIGN.md`/`PLAN-CRM.md`/`PRODUCT.md` have since been moved into `docs/` as an in-flight, uncommitted rename. Neither is touched by this revision; whoever picks up Phase 1 should resolve both — commit or stash the invoice/quote table work, and commit the docs move (or finish it, if anything still references the old root paths) — before building on top of an unknown intermediate state.

## 24. Migration Strategy for Existing Projects — updated

- **`prisma migrate` has been adopted.** `prisma/migrations/` now holds real history (`0_init`, plus at least two real migrations since). This was flagged as a blocking prerequisite in the first draft; it's done, and every schema change in §14 is a normal additive migration under this history — no special sequencing needed beyond the usual `prisma migrate dev`.
- **`@@map("Project")`/`@@map("Proposal")` are still in place** and still not part of this plan to remove — dropping them is a separate, independent cleanup (real `ALTER TABLE ... RENAME` now being possible doesn't make it urgent) that can happen whenever, not blocking anything here.
- **Branch state** — unchanged from the first draft: work continues on `feature/astryx-integration`, off `feature/ui-accessibility-and-tokens`, not `main`.
- **No data backfill needed** for any model in §14 — all additive, all nullable-safe (`Job.progressState`/`progressPercent` null-by-default; a job with no `CompanyWorkflowStage` rows renders every stage with its default label, i.e., today's exact behavior).

## 25. Recommended Implementation Phases — reordered per owner decisions

**Phase 1 — Foundations**
New `ActivityKind` values (§13); confirm `updateJobStatusAction` records `ActivityKind.STATUS_CHANGED`. `prisma migrate` is already adopted — nothing to do there. One small user-visible piece worth pulling forward because it's independent and low-risk: render `Company.logoUrl` on the existing `/q/[token]` and `/i/[token]` public pages (§14.7) — a real gap on documents that already exist, not gated on anything else in this plan.

**Phase 2 — Change orders + Additional Work / Billable Add-On** (§19)
Both together, since they're one coherent "bill for extra work" feature with a fork at the entry point: `ChangeOrder`/`ChangeOrderLineItem`, the approve/decline flow, the overbilling-guard extension, the new direct/no-quote invoice creation path, *and* the review-threshold gate (`Company.billableAddOnThresholdCents`, defaulting to $500, configurable in Settings) that routes a large Additional Work item to homeowner review by default, with `AddOnReviewOverrideReason`-gated office confirmation as the named fallback only. Still the single highest-value gap — real money the app can't bill for today, in either shape.

**Phase 3 — Quality check + completion gate** (§20)
`QualityCheck` split into crew-writable field-evidence columns and office-only completion columns, the two new capabilities (`submitFieldEvidence`, `completeQualityCheck`), the `/today` evidence UI, and the office-side panel gating `[ Complete Project → ]`.

**Phase 4 — Pre-construction checklist** (§7.6)

**Phase 5 — Estimate summary panel** (§7.3)

**Phase 6 — Sales pipeline: `Contacted / Qualified`** (§4)
`RequestStatus.CONTACTED`, `stageForRequest()` update, pipeline board column, the request-detail "Mark Contacted" action.

**Phase 7 — Sales/financial stage mini-cards** (§17)

**Phase 8 — Financial completion panel** (§21), now including Additional Work invoices in the composed view.

**Phase 9 — Progress tracking** (§7.8, §14.5)
`Job.progressState`/`progressPercent`, the crew five-state picker on `/today`, the office override control. Visit/task-completion display needs no schema work and could ship earlier if wanted — it's a read-only computation over data that already exists.

**Phase 10 — Warranty** (§14.4, §20)
`Warranty`/`WarrantyTemplate`, the built-in starter set (Simple + Detailed per trade, eight rows), the duplicate/edit-into-a-company-copy flow, the office review/confirm step, share-link send with logo (§14.7), the `/w/[token]` public page, and the lightweight acknowledgement step (`confirmationChecked`/`signerName`/`confirmedAt`/`signerIp`, `WarrantyStatus.CONFIRMED`) — checkbox and typed name only, no drawn-signature capture in v1.

**Phase 11 — Workflow customization v1** (§14.6, §15)
`CompanyWorkflowStage`/`WorkflowTemplate`, seed templates per trade, the onboarding template-picker step, the Settings → Workflow editing page, `effectiveStageMeta()`, and the disabled-stage warning notice on any job still sitting in a stage its company has since disabled. Backend `JobStatus` unchanged.

**Phase 12 — Dashboard action center** (§3, §11)
Unify `ReceivablesSummary`/`NewRequestsSummary`/`PipelineSnapshot`/notification bell into the brief's single "needs your attention" list. Depends on Phase 11 for one of its item types specifically: a low-priority *"N job(s) currently in a stage disabled for future jobs"* line, computed from `CompanyWorkflowStage.isEnabled: false` joined against jobs whose current `status` matches, linking through to that exact filtered set sorted oldest-stuck-first with the full tiebreak from §15 (stage-entry time → job creation time → numbered-before-unnumbered → jobNumber → title → id) — the dashboard counterpart to the job-page warning in §15, not a separate mechanism.

**Phase 13 — Long-term: visual workflow builder**
Drag-and-drop reordering, and genuinely custom (not just relabeled/hidden) stages — the stated long-term direction from §15. Deliberately last and deliberately not designed in detail here: it likely needs the trade-agnostic-core/`JobStatus` schema split the first draft called option (b) and this revision continues to defer. Revisit once Phase 11 is live and there's real usage data on whether companies actually want stages beyond what their template offers.

`docs/PRODUCT.md`/`docs/DESIGN.md` refresh, previously Phase 12 in the first draft, is **done** as part of this revision — not a future phase anymore.

---

## Decisions from the Owner

**1. `JobStatus` trade-agnosticism / workflow customization.** Keep one shared `JobStatus` enum in the backend for v1 — no risky migration. Layer a per-company customization experience on top: onboarding asks what kind of trade business this is and offers clickable, pre-built workflow templates (roofing, plumbing, lawn care, general contractor, and others as they're added); picking one hides irrelevant stages (a non-roofing company never sees `Processing` unless it picks a roofing template or turns on the roofing module) and can rename stages into the company's own language. Editable later, not just at onboarding. Long-term direction: a visual, drag-and-drop workflow builder — genuinely custom stages, not just show/hide/rename of a fixed list. **Applied in §14.6, §15, §25 Phase 11 and 13.**

**2. Warranty.** Homeowner-facing, not internal-only — a clean document with a share link, the same pattern as Quote and Invoice. Contents: warranty term, start date, coverage notes, exclusions, company information, customer information, project address. Pre-filled from existing job/customer/company/property data; the business owner reviews, edits if needed, and confirms before it's sent (an internal review step, not a homeowner e-signature). Supports pre-built templates per trade/service type. **Applied in §14.4, §20, §25 Phase 10.**

**3. Progress tracking.** Not required everywhere. Default is visit/task completion ("3 of 5 visits completed"), which is more reliable than a manually entered number and needs no new schema for jobs where visit/task count already tells the story. Optional manual percentage is supported for jobs where that's not enough — larger one-off projects especially. Crew update simple field progress from `/today` using five plain states (Not Started / In Progress / Mostly Complete / Ready for Quality Check / Completed); office can adjust the exact percentage separately. **Applied in §7.8, §14.5, §22, §25 Phase 9.**

**4. Sales pipeline granularity.** Add a distinct `Contacted / Qualified` stage — useful for separating raw leads from serious opportunities. Do not add a separate `Follow-Up / Negotiation` stage yet; handle follow-up through reminders, proposal activity, dashboard alerts, quote/proposal status, and communication history instead, unless `Changes Requested` proves too vague in practice. Keep the pipeline short enough for a small business owner to read at a glance. **Applied in §4, §14.1, §25 Phase 6.**

**5. `PRODUCT.md` rewrite.** Approved. Aernova is positioned as a multi-trade platform for small construction and trades businesses, with roofing as one specialized module (measurement, capture, drone/photo workflows, processing), not the whole product. **Applied — see the accompanying summary for the full rewrite of `docs/PRODUCT.md`, plus the `docs/DESIGN.md` frontmatter correction.**

**6. Change orders without an underlying quote.** A formal Change Order requires an approved Quote — it's changing an already-approved scope, and the schema now enforces this directly (`ChangeOrder.quoteId` is required, not nullable). For small no-quote jobs, use Additional Work / Billable Add-On instead: a direct invoice with manually entered lines, no quote and no change-order record required. **Applied in §14.2, §19, §21, §23, §25 Phase 2.**

**7. Warranty homeowner interaction.** Customer-facing and view-only — the homeowner never edits or negotiates it — but they must acknowledge they viewed/received it. Explicitly not the same as accepting a Quote; there's nothing to approve or reject. **Applied in §14.4, §20, §25 Phase 10 — mechanism sharpened by decision 12 below.**

**8. Warranty templates and company branding.** Aernova ships a small built-in starter set of warranty templates per trade — not company-authored-only. Business owners can edit a starter, duplicate it into their own template, save company-specific templates, and pick one before sending; the chosen template still pre-fills a real draft the owner reviews and edits before it goes out. Separately: every customer-facing document (quotes, invoices, warranties, change orders, additional-work approvals, closeout documents) should show the company's logo/branding when available. **Applied in §14.4, §14.7, §20, §25 Phase 1 and 10 — template variety sharpened by decision 14 below.**

**9. Additional Work / Billable Add-On review threshold.** Not approval-free at every amount. Small items (v1 default: under $500) can be added directly by the office. Items at or above the threshold require review before the invoice can be sent — protecting the homeowner from a surprise large charge without slowing down genuinely small add-ons. The threshold is configurable per company, at onboarding or later in Settings. This sits below the full `ChangeOrder` approval flow, not on top of it. **Applied in §14.2, §19.2, §25 Phase 2 — which of the two review paths is preferred sharpened by decision 13 below.**

**10. Crew quality-checklist participation.** Crew can complete field-based evidence from `/today` — site cleaned, photos uploaded, field notes, basic completion evidence. Crew cannot finalize the Quality Check or trigger `[ Complete Project → ]`; that stays an office/owner/estimator decision, made after reviewing what crew submitted. Crew never gets a path to money, legal, or customer-facing closeout actions through this flow. **Applied in §14.3, §20, §22, §25 Phase 3.**

**11. Disabled workflow stage with active jobs.** Disabling a stage only affects new jobs and forward-looking choices — it never touches a job already sitting in that stage. That job keeps its real status; Aernova never silently auto-migrates it. The UI shows a warning and leaves the decision of when and where to move it entirely to the owner. **Applied in §15, §17, §23, §25 Phase 11 — dashboard visibility added by decision 15 below.**

**12. Warranty e-signature strength.** Typed name + confirmation checkbox + IP/timestamp is enough for v1 — no drawn or touch signature capture. Stored: signer name, the confirmation checkbox itself, `confirmedAt`, IP address, and the warranty's `version`. This is meant to confirm the homeowner received and viewed the document, explicitly not a full contract-signing flow. **Applied in §14.4, §20, §25 Phase 10.**

**13. Additional Work review path: homeowner review is the default, not a peer option.** At or above the threshold, sharing the document to the homeowner for their own look is the preferred path. Office/internal confirmation is a fallback, used only when homeowner contact information is missing, the work was already approved verbally, or the business owner is intentionally recording an internal override. **Applied in §14.2, §19.2, §25 Phase 2 — exact reason names and note requirement sharpened by decision 17 below.**

**14. Warranty template variety: Simple and Detailed per trade, not one.** Launch starter set is eight rows — Simple and Detailed for each of roofing, plumbing, lawn care, and general contracting. Gives useful choice without an overwhelming onboarding; owners can still edit, duplicate, and save their own versions from either starting point. **Applied in §14.4, §20, §25 Phase 10 — confirmed not a permanent ceiling by decision 20 below.**

**15. Disabled-stage jobs surface on the dashboard, not just the job page.** A job sitting in a disabled stage appears as a low-priority dashboard action-center item (e.g. *"1 job is currently in a stage disabled for future jobs"*), so the owner can find these without manually searching, in addition to the warning already shown on the job itself. **Applied in §15, §25 Phase 12 — click-through behavior sharpened by decision 19 below.**

**16. Logo-missing fallback, confirmed.** When no company logo is uploaded, customer-facing documents show the company name in the document header instead of leaving it blank — across quotes, invoices, warranties, change orders, additional-work approvals, and closeout documents alike. **Applied in §14.7, `docs/DESIGN.md` — exact placement/sizing specified by decision 21 below.**

**17. Additional Work override reasons: a named picklist, and `OWNER_OVERRIDE` requires a note.** The three reasons are `HOMEOWNER_CONTACT_MISSING`, `VERBAL_APPROVAL`, and `OWNER_OVERRIDE` — a picklist, not free text, for the first two; a required free-text note alongside `OWNER_OVERRIDE` specifically, since that reason alone doesn't explain itself the way "no contact info on file" or "they already said yes" do. Reason and note are both stored for audit/history. This is explicitly not a casual one-click bypass. **Applied in §19.2 — note length/format sharpened by decision 22 below.**

**18. Warranty version is homeowner-visible, in a subtle footer/details area.** Not internal-only. The main document stays clean and focused on coverage; the version number (and, once confirmed, the confirmation date) appears quietly in a footer or document-details area — e.g. *"Warranty Version 2"* / *"Document version: 2"* — since the homeowner is the one confirming a specific version and is entitled to know which. **Applied in §14.4, §20 — confirmation date format sharpened by decision 23 below.**

**19. Disabled-stage dashboard item clicks through to a filtered list, not the general job list.** Clicking the dashboard's low-priority notice opens a jobs list scoped to exactly the jobs currently sitting in a disabled stage — never the general list with an implicit "go find it yourself." The job page keeps its own detailed warning; the dashboard's job is only to get the owner there in one click. **Applied in §15, §25 Phase 12 — sort order sharpened by decision 24 below.**

**20. Simple/Detailed is the v1 launch set, not a permanent limit.** Aernova may add further built-in variants later — an Extended Warranty, a Manufacturer + Labour Warranty, an Emergency Repair Warranty, a Renovation Warranty — as usage data supports it. Launch stays at two per trade to keep onboarding simple; the template system itself is not capped at two. **Applied in §14.4 — suggestion mechanism sharpened by decision 25 below.**

**21. Logo placement, exactly specified.** Top-left of the document header. When a logo exists: max height ~40–48px on screen, aspect ratio preserved. When it doesn't: the company name renders in that same top-left slot — never a blank header. One consistent rule across quotes, invoices, warranties, change orders, additional-work approvals, and closeout documents. **Applied in §14.7, `docs/DESIGN.md` — max width added by decision 26 below.**

**22. `overrideNote` for `OWNER_OVERRIDE`: a fuller free-text note, not a one-line tag, with a v1 guideline of roughly 20–500 characters.** Rendered as a small multi-line textarea, not a single-line input. Long enough to actually explain why homeowner review was skipped — for the audit trail to mean something — short enough to stay something a busy owner will type in the moment rather than skip. **Applied in §19.2 — strictness confirmed by decision 27 below.**

**23. Warranty footer confirmation date: long format, no time, never relative.** "Confirmed August 9, 2026" — long month name, day, full year. No `08/09/2026`, no time-of-day by default, and specifically not a relative phrasing like "confirmed 3 days ago," which stops meaning anything once the document is reopened years later. The warranty is meant to still read correctly at that distance. **Applied in §14.4, §20 — localization confirmed by decision 28 below.**

**24. Filtered disabled-stage jobs list: sorted oldest-stuck-first.** The job that's been sitting in a disabled stage the longest appears first, because it's the one most likely to actually need the owner's attention — not the jobs list's normal default sort applied to a filtered subset. **Applied in §15, §25 Phase 12 — tiebreak order sharpened by decision 29 below.**

**25. Future warranty-variant suggestions: quiet, never a popup during document creation.** If usage data suggests a third built-in variant would help, Aernova may surface that quietly in Settings/Templates, a product-updates surface, or an admin suggestion area — never as an interruption while an owner is actively creating or sending a warranty. Owners can also request a new variant directly at any time, independent of any system suggestion. **Applied in §14.4 — a rough trigger signal added by decision 30 below.**

**26. Logo sizing: a max width joins the max height.** ~160–220px wide, alongside the existing ~40–48px tall, both with aspect ratio preserved — closing the gap where a height-only cap let an unusually wide or landscape logo stretch across the entire header while technically staying within the height limit. **Applied in §14.7, `docs/DESIGN.md` — fit behavior and no-minimum-width confirmed by decision 31 below.**

**27. `OWNER_OVERRIDE`'s 20–500 character note is a strict, enforced range, not a soft guideline.** The form does not submit below 20 characters or above 500; a character counter and helper text both show while typing. The other two override reasons keep optional, unconstrained notes — the strict range is specific to `OWNER_OVERRIDE`, since that's the one reason with no self-explanatory context behind it. **Applied in §19.2 — validation copy and counter placement sharpened by decision 32 below.**

**28. Warranty confirmation date's long-format doctrine is locale-aware, not English-only.** "Confirmed August 9, 2026" is the English rendering of a standing rule — long, no time, never relative — that a future non-English locale expresses in its own long-date convention (a future French locale: "Confirmé le 9 août 2026"), not by leaving an English date untranslated. No locale infrastructure exists to build in v1; this is the rule for whenever one does. **Applied in §14.4, §20 — v1 scope and future-proofing framing sharpened by decision 33 below.**

**29. Disabled-stage tie-breaking: a real, ordered fallback chain.** Oldest entry into the current (disabled) stage first; oldest job created second, for simultaneous stage entries; a stable identifier third, so a true dead heat on both timestamps still renders identically on every reload. **Applied in §15, §25 Phase 12 — the stable-identifier level fully specified by decision 34 below.**

**30. A rough signal for suggesting a new warranty variant: 10+ companies, or 20%+ of active companies, in the same trade, editing a starter template similarly over 60–90 days.** Either count alone is sufficient — the percentage exists so a smaller trade with fewer total companies isn't structurally excluded from ever crossing the raw-count threshold. **Applied in §14.4 — a second, global signal added by decision 35 below.**

**31. Logo fit behavior: `contain`, not `cover` or `stretch`, and no minimum width.** The logo scales down to fit inside the fixed branding box along whichever dimension binds first, aspect ratio always preserved; a portrait (tall, narrow) logo simply uses less of the box's width rather than being stretched to fill it, and is never upscaled past reasonable visual quality to look bigger. No minimum-width requirement exists to counteract a naturally narrow logo. **Applied in §14.7, `docs/DESIGN.md` — the leftover space's background specified by decision 36 below.**

**32. `OWNER_OVERRIDE` validation is context-specific, with a two-state counter.** Out-of-range submission shows *"Please explain why homeowner review is being skipped. Enter 20–500 characters"* — not a generic "enter between 20 and 500 characters" that explains the rule but not why it exists. **Applied in §19.2 — the counter's two states sharpened by decision 37 below.**

**33. Warranty dates: English long-format is the complete v1 answer, not a stopgap — and the doctrine itself is what's future-proofed, not a locale feature being built now.** Non-English locale support isn't near-term. What matters for this round is that nothing about how the English date is built hardcodes an assumption that would force a rewrite later — the underlying rule (long, no time, never relative) is the future-proofing principle, expressed in English today. **Applied in §14.4, §20 — v1 customer-facing silence on localization confirmed by decision 41 below.**

**34. Disabled-stage tiebreak, fully specified with `jobNumber` presence as its own level.** The complete chain: stage-entry time → job-creation time → jobs with a `jobNumber` sort before jobs without one → `jobNumber` ascending → title → id. A job missing a `jobNumber` isn't penalized on its real position (that's still governed by the first two levels); the "numbered before unnumbered" level only ever breaks a tie that's already survived both timestamp comparisons. **Applied in §15, §25 Phase 12.**

**35. A global, cross-trade signal joins the per-trade one for warranty-variant suggestions.** Per-trade stays the default lens (decision 30). A second, rough global threshold — **20+ companies across at least 3 different trades** making a similar edit to the same or an equivalent starter template over the same 60–90 day window — catches a pattern that's real across trades even if no single trade crosses its own bar alone. A global signal suggests a shared/base template variant; a per-trade signal suggests a trade-specific one. Both stay equally quiet and equally read-only until a person acts. **Applied in §14.4 — what "a similar edit" means left deliberately open by decision 38 below.**

**36. The logo's `contain` box is transparent by default; a neutral fill is allowed only as a deliberate template-level choice, never automatic.** The document's own background shows through the empty space a non-square logo leaves inside its box. A specific document template may intentionally use a branded header treatment with its own subtle fill — a conscious visual-design decision for that template — but no document gets a fill by default just because its logo doesn't fill the box. **Applied in §14.7, `docs/DESIGN.md` — company requests for one addressed by decision 39 below.**

**37. `OWNER_OVERRIDE`'s character counter has two states, not one.** Below 20 characters, it counts *up* toward the floor — *"10 more characters required"* — rather than showing a "characters remaining" number that misleadingly looks like plenty of room on an empty field. The instant 20 characters is reached, it switches to counting *down* toward the ceiling — *"480 characters remaining"* — the ordinary convention. No intermediate or ambiguous state between the two. **Applied in §19.2.**

**38. Warranty-variant edit-pattern equivalence stays undefined as an algorithm — documented as example patterns instead, until real data exists.** Rather than overspecifying now how "a similar edit" gets detected (which would mean designing detection logic against imagined data), the doc names the *kinds* of sections worth watching for repeated edits to: coverage terms, exclusions, labour terms, manufacturer warranty language, extended warranty sections, emergency repair limitations, customer responsibility language, workmanship coverage language. The actual detection approach is deliberately left for whenever there's real template-edit data to design against. **Applied in §14.4.**

**39. Companies can request a branded header style; Aernova decides whether it becomes a real template.** Not a per-company toggle (decision 36 stands) — but a request is real input, the same way a warranty-variant request is (decision 25), and repeated similar requests are exactly the kind of signal that turns into a new built-in template later. Aernova keeps visual template design under its own control either way; a request informs, it doesn't self-serve a new look into existence. **Applied in §14.7.**

**40. A missing `jobNumber` is assumed rare, and treated as a stability safeguard, not a workflow.** Absent evidence otherwise, jobs without a `jobNumber` are an edge case, not a common occurrence — so the "numbered before unnumbered" tiebreak level (decision 34) exists to keep the sort total and deterministic, not because this is expected to matter often in practice. The fallback stays exactly as specified regardless; being rare is a reason to not over-invest in it further, not a reason to remove it. **Applied in §15.**

**41. V1 customer-facing copy carries zero forward-looking localization language.** No "other languages coming soon," no visible locale setting, nothing hinting at future non-English support anywhere in the warranty page or elsewhere — v1 reads as a complete English product, not one apologizing for a gap. The future-proofing from decisions 28/33 lives entirely in how the English date is implemented, never in what's shown on screen. Locale-facing UI only appears once non-English support is actually being built, not before. **Applied in §14.4, §20.**

---

## Assumptions

1. "Project" throughout this document means the real `Job` model (physically `Project` in Postgres) — unchanged from the first draft.
2. New checklist-style gates (`preConstructionGaps`, `QualityCheck`) stay soft/overridable by default — unchanged from the first draft.
3. `ChangeOrder`'s customer-facing approval reuses the existing share-token/public-page pattern — unchanged from the first draft.
4. Crew (`CompanyRole.CREW`) gains no new money-adjacent visibility — unchanged from the first draft. The new crew-facing progress picker (§7.8) is explicitly non-financial, consistent with this.
5. **`CompanyWorkflowStage.sortOrder` is stored but not yet interactive in v1** — a company's stage *order* stays the real `STATUS_FLOW` sequence; only visibility and labels are live-editable pre-Phase 13. This is stated explicitly because the schema in §14.6 could support reordering today, and it would be easy to accidentally build more UI than v1 calls for.
6. **The disabled-stage warning is display-only** — it doesn't block, require acknowledgement, or change what actions are available on the job; it's a notice, not a gate. Consistent with §12's general "warn, don't block" doctrine. The dashboard item (decision 15) and its oldest-stuck-first, fully tie-broken click-through (decisions 19, 24, 29, 34) are the same kind of notice, just easier to find and predictably ordered.
7. **`progressState` and `progressPercent` are independent signals in v1** — setting one does not automatically derive or suggest the other. A crew member marking a visit "Mostly Complete" does not auto-fill 75% for the office; the office sets a percentage on its own if it wants one.
8. **The homeowner-visible warranty footer shows the version number, and — once confirmed — the confirmation date, but not a full audit history.** "Warranty Version 2" / "Confirmed August 9, 2026" is the level of detail; a homeowner isn't shown who at the company made a correction or why, which stays office-facing on the job's activity timeline.
9. **The dashboard's filtered jobs list (decision 19) reuses the existing jobs list UI with a new filter and sort, not a new page.** Consistent with how this codebase already filters lists (status, date range) rather than building a bespoke view per filter type.
10. **The 40–48px / 160–220px logo caps and top-left placement apply on-screen; a printed/PDF export of the same document may need its own physical-unit equivalent** (the existing `(report)` route already has its own light, pinned-light print surface) — noted so these pixel figures aren't read as a print-resolution instruction, which is a different unit entirely.
11. **`overrideNote`'s strict 20–500 range (decisions 27, 32, 37) is enforced in the UI (blocking submit outside the range, with the context-specific error copy and two-state counter), not necessarily as a database `CHECK` constraint** — the column itself likely stays a plain nullable string; "strict" describes the user-facing validation, consistent with how this codebase generally keeps business rules in application code rather than the schema wherever the rule might reasonably need to change without a migration.
12. **A quiet system-suggested warranty-variant "suggestion" (decision 25) is read-only until an owner acts on it, whether it came from the per-trade signal, the global signal, or a company's own branded-header/template request (decisions 30, 35, 38, 39)** — Aernova never auto-creates a new built-in template or header treatment from a usage-pattern signal or a request; a human still decides whether it becomes real, the same review-first doctrine every other automated preparation in this product already follows.
13. **Locale-aware long dates (decisions 28, 33, 41) apply to the warranty footer specifically, not a commitment to full product internationalization.** This doc doesn't claim Aernova has (or is building) a locale system — only that whenever one exists, this particular date follows its long-format convention rather than staying hardcoded English, and that nothing in v1's customer-facing copy promises this is coming. Non-English locale work is explicitly not near-term.
14. **The disabled-stage tiebreak's fallback chain (decision 34) falls through in the stated order** — `jobNumber` is nullable in the current schema (assigned per-company sequentially, but not guaranteed non-null on every historical row), so the numbered-before-unnumbered level, then title, then finally the cuid `id`, all exist as real fallbacks, not decoration. Per decision 40, this level is expected to matter rarely in practice.
15. **What counts as "a similar edit" or "the same kind of change" for the warranty-variant signals (decisions 30, 35) is intentionally left undefined as an algorithm (decision 38)** — the example section-list stands in for a detection rule until real usage data exists to design one against; this document does not commit to a specific equivalence method.
16. **A neutral logo-fill "template" (decision 36) means an actual distinct document template variant, not a per-company toggle** — an individual company can't turn on a neutral fill for its own documents; it's a property of which document template Aernova itself ships and chooses to render with, decided at the product level. A company's request for one (decision 39) is input to that decision, not a self-service switch.

## Follow-Up Questions for Owner

These are new, narrower questions raised by turning this round's five decisions into concrete designs. All forty-one decisions to date are resolved and not repeated here.

1. **`overrideNote` counter, exact wording below 20 characters:** "10 more characters required" was this round's example — is that literally the phrasing wanted, or is the intent just "count up toward 20, count down after," leaving the exact copy (e.g., "10 more needed," "Enter 10 more characters") open to whatever reads most naturally in context?
2. **Warranty-variant example patterns, completeness:** the eight example categories (coverage terms, exclusions, labour terms, manufacturer warranty language, extended warranty sections, emergency repair limitations, customer responsibility language, workmanship coverage language) are meant as illustrative, not exhaustive — should this list be revisited once there's real usage data, or does the owner already have other categories in mind worth adding now?
3. **Branded-header requests, intake mechanism:** decision 39 says companies can request a branded header style — through the same channel as a warranty-variant request (if one exists), a general feedback/support channel, or something dedicated to document-branding requests specifically?
4. **`jobNumber` rarity, confirmation source:** decision 40 assumes rarity "absent evidence otherwise" — is there existing data (e.g., from the pre-numbering backfill `docs/PLAN-CRM.md` describes) that could confirm or correct that assumption now, rather than leaving it purely assumed?
5. **Localization silence, scope:** decision 41 keeps v1 UI silent on future language support — does that silence extend to internal/admin-facing copy too (e.g., a Settings page only the office ever sees), or is the "no forward-looking language" rule specifically about what a homeowner or business owner encounters in customer-facing documents?

---

## Table: Stage-by-Stage Summary

| Stage (real model) | Aernova Already Knows | User Reviews/Enters | Aernova Does Automatically | Next Action |
|---|---|---|---|---|
| Request | Nothing (front door) | Client, property, what's needed, source | Sets `RequestStatus: NEW`; copies source onto Client | Mark Contacted |
| Contacted / Qualified *(new)* | The request as entered | Confirmation this is a real opportunity | Sets `RequestStatus: CONTACTED` | Start Assessing |
| Site Visit (`Visit`, kind ASSESSMENT) | Client + property | Measurements, photos, issues, notes | Moves `LEAD → INSPECTION`; (roofing) queues photogrammetry | Complete Inspection |
| Estimate (`Quote`, DRAFT) | Inspection data + measurements | Catalog lines, quantities, manual lines | Computes cost/price/margin | Confirm & Create Proposal |
| Proposal (`Quote`, SENT/VIEWED) | The estimate, unchanged | Intro/body/contract text, deposit terms | Mints share link, tracks sent/viewed | Send Proposal |
| Contract Signed (`Quote`, APPROVED) | The full proposal | Nothing (homeowner clicks, or office records a phone yes) | Advances `Job.status`; promotes Client to ACTIVE | Ready to Schedule |
| Pre-Construction *(new)* | Contract + scope | Materials/permit/crew/start-date confirmation | Proposed checklist gate | Ready to Schedule |
| Scheduled (`Visit`, kind WORK) | Contract, checklist, crew | Date, assigned crew | Books visit(s); recurring jobs generate a series | Start Production |
| Production (`Job.status: IN_PROGRESS`) | Entire job history | Notes, photos, actual costs, progress state *(new)*, change orders *(new)*, additional work *(new)* | Visit/task completion count; compares quoted vs. actual cost | Ready for Quality Check |
| Quality Check *(new)* | Field evidence crew already submitted from `/today` | Office/owner: walkthrough notes, final checklist, completion decision | Proposed gate; crew and office write different fields | Complete Project |
| Completed (`Job.status: COMPLETED`) | Everything | Final confirmation | Status write + timeline | Generate Final Invoice / Send Warranty |
| Warranty *(new)* | Job, customer, company, property + a Simple/Detailed starter template per trade | Review, edit, confirm (office); view, check box, type name to confirm (homeowner) | Pre-fills from existing records + template; renders company logo | Send Warranty → homeowner confirms received/viewed |
| Invoiced (`Invoice`, SENT+) | Contract + approved change orders, or a no-quote job (Additional Work) | Draw amount/percent if not final; manual lines if no quote | Builds line-item snapshot; mints share link | Mark Payment Received |
| Paid (`Invoice`, PAID — derived) | Invoice + payments | Payment method/reference if manual | Derives status from payments | Close Project |
| Closed (`Job.status: ARCHIVED`) | Everything | Nothing | Nothing new | Request Customer Review / Create Similar Job |
