# CRM, scheduling, quoting & invoicing — build plan

Scope changed on 2026-07-26. This is no longer "add a CRM to a roofing tool."
It is **a trades CRM and scheduling platform for Canadian contractors, where
aerial roof measurement is a premium add-on.** Roofing stays the wedge — it is
the reason a contractor switches off Jobber — but it is no longer the trunk.

Three decisions set the shape of everything below (confirmed 2026-07-26):

1. **Split the domain model before building quotes.** Not after.
2. **Both one-off and recurring work, from the start.** So `Job → Visit[]` with
   recurrence rules exists in the first calendar, not as a later retrofit.
3. **Crew log in, on phones, and put data back in** — photos, visit completion,
   notes. So crew are real users with a restricted role, and there is a
   mobile-first field surface.

## Positioning

Vertical go-to-market, horizontal product. Sell to roofers first, because the
drone pipeline is a thing no competitor has. Build the core so a plumber, a
lawn-care company, or a cleaner can use it unchanged.

| Tier | Contains |
|---|---|
| **Core** | Clients, requests, quotes, jobs, visits, schedule, invoices, payments |
| **Pro** | Pipeline board, automations, reporting, roles beyond owner |
| **Add-on: Aerial Measurement** | Drone → roof report. Per property or credit pack. |
| **Add-on: AI Assistant** | Quote drafting, follow-ups, job summaries |

The two add-ons carry the margin and the differentiation. The Core is table
stakes — necessary to be considered at all, not sufficient to win.

## Position on Twenty and Jobber

Build native in this repo's Prisma schema. Twenty is NestJS + Nx + its own
Postgres schema and auth; running it alongside means two services, two auth
systems, and a sync layer.

Take from Twenty: the pipeline board interaction, the activity-timeline pattern.
Do **not** take: the custom-object / custom-field engine. `PRODUCT.md` names
exposed parameter panels as the anti-reference.

Twenty is checked out at `../twenty-reference` as a **read-only reference**,
never a dependency and never in this repo's git. Two limits on how it is used,
confirmed 2026-07-27:

- **AGPL-3.0.** Reading it for interaction patterns is fine; copying code into
  this product is not. Every borrowing is a re-implementation.
- **Its data model is the wrong shape.** Twenty is a generic *sales* CRM —
  people, companies, opportunities. It has no visit, no crew, no recurring
  agreement. The borrowing genuinely stops at interaction patterns. The one with
  near-term value is the activity timeline: `ActivityEvent` has existed since
  Phase 0 with no renderer.

What the two patterns actually are, read out of the reference:

- **Timeline (Phase 0's missing renderer).** `EventRowDynamicComponent.tsx` is a
  single `switch` on the event's linked object type, returning one of six row
  components — message, calendar, note/task, generic-linked, main-object — with
  an identical prop signature. There is no polymorphic renderer registry and no
  per-event-type feed query. One flat event list, one dispatcher, six dumb rows.
  That maps onto `ActivityKind` directly and is the whole borrowing.
- **Board drag (Phase 6).** `useRecordBoardDndKit.ts` splits drag into
  start/move/end where **move only ever sets local highlight state** and end is
  the only writer. Before writing it consults a pure
  `getBoardCardDropBehavior({ hasRecordSorts, sourceDroppableId,
  destinationDroppableId })` that can return `shouldBlockDrop` — a manual
  reorder under an active sort opens a modal instead of silently fighting the
  sort. Worth stealing: the pure drop-behaviour function, and the fact that a
  same-column no-op drop resets rather than writing.

Take from Jobber, verified against screenshots of the live product:

- **The five-noun spine.** Their global `+` offers exactly Client, Request,
  Quote, Job, Invoice, and the home dashboard is those same nouns as four
  counters. That is the whole product in one row.
- **The quote builder.** Sectioned document (introduction / line items / client
  message / contract / notes), per-line photo and description, "mark as
  optional" so the homeowner self-upsells, deposit and payment schedule, and
  **cost + estimated margin visible to the contractor behind a "client view"
  toggle**.
- **Lead is a status on the client**, not a separate entity, plus a `leadSource`
  that powers a revenue-by-source report.
- **Job list status vocabulary**: unscheduled, late, requires invoicing, action
  required, ending within 30 days.

### What the 2026-07-27 screenshots settled

Thirteen screenshots of the live Jobber job form, job detail, client list and
schedule. What they pin down, so none of it gets guessed again:

**The client box.** Rows carry name · address · phone and a **status badge**
(Lead / Active), not a job count. The last row is always `+ Create new client`,
and it is the *only* row when nothing matches. It opens a **modal** — title,
first, last, company, phone, email, lead source, street 1/2, city, province,
postal, country, plus "Show every client detail" — **prefilled from what was
typed** (typing "Haari" put Haari in First name). So Jobber does *not* create
from a name alone; our inline creation is a deliberate divergence, and the
prefill is the half worth stealing. Worth adding to our rows: the Lead/Active
badge, which we have in `Client.status` and are not yet showing.

**Client and property are separate steps.** After creating a client the box
becomes a card with an **"Add property"** button, and the property modal carries
its own **tax-rate dropdown** ("No tax rate created"), Property details, and
Property contacts. That independently confirms Phase 1 item 8: the tax rate
belongs to the building, not the business.

**The job detail right rail is money, then notes.** "Total cost to date" as the
hero figure with Revenue / Cost / Profit rows under it, then a Notes panel.
There is **no missing-info checklist anywhere** — Jobber has no need for one
because it refuses the save instead. Ours is the panel that replaces their wall.

**The live recurrence summary is the best idea in these screenshots.** The
schedule block reads `Total visits 27 · First Jul 27, 2026 · Last Jan 25, 2027 ·
Repeats weekly on Mon`, and it recomputes as the rule changes. Billing does the
same: `Total invoices 7 · First Jul 31 · Last Jan 31`. That is what makes
recurrence legible to someone non-technical — it turns an abstract rule into a
count they can sanity-check, which is exactly PRODUCT.md's "calm is a function
of sequence". **Phase 4 item 27 and Phase 5 item 35 must both ship this line.**

Also settled, by phase:

- **Phase 4.** One-off vs Recurring is a two-button toggle at the top of the
  schedule block. One-off: start date, start/end time, `Schedule later`,
  `Anytime`, assignee chips, `Email team about assignment`, visit instructions.
  Recurring adds `Ends after [n] [Months]` vs `Ends on [date]` as radios.
  Calendar is Month/Week/Day with an **`Anytime` lane above the hour grid** for
  untimed visits, filters for Type / Team / Status, and a visit popover carrying
  a `Completed` checkbox, links to both client and job, team, location, start.
- **Phase 5.** One-off billing is `Remind me to invoice when I close the job` +
  `Split into multiple invoices with a payment schedule`. Recurring billing is
  **Visit based vs Fixed price** plus an invoice frequency. Line items are
  name · qty · unit cost · unit price · total · description, footed by **Total
  cost and Total price** — cost and price side by side, which is the
  contractor-only view `unitCostCents` exists to feed.
- **Phase 2 item 15** is fully specified by the clients screenshot: three tiles
  (New leads / New clients past 30 days with a % delta, Total new clients YTD),
  a `Filter by tag +` chip, a `Status | Leads and Active` chip, and a table of
  Name · Address · Tags · Status · Last Activity.

Deliberately **not** copying for now: timesheets and payroll, expenses, the
marketing suite, GPS waypoints. Each is its own product, all are low
differentiation, and Jobber already does them well.

## What already exists (do not rebuild)

- `lib/report-generator.ts` prices a full itemized roofing quote from
  measurements. Becomes one *producer* of line items, not the pricing engine.
- `Proposal` model + `proposal-editor.tsx` + `proposal-draft-form.tsx`.
- `/projects/[id]/report` renders a print-ready document (`print-report.tsx`).
- `lib/storage.ts` — local/S3 driver abstraction, ready for generated PDFs.
- Multi-tenancy: `requireCompanyContext()` / `requireProjectAccess()`.
- `CompanyRole` already has OWNER / ADMIN / ESTIMATOR / SALES / VIEWER. Needs
  a CREW role and actual enforcement.
- `lib/money.ts`, `lib/activity.ts` — Phase 0, done.

## Real gaps

1. **`Project` is four entities in one.** It carries the customer, the address,
   the request, and the job simultaneously. Everything else on this list is
   downstream of that.
2. No `Property`, so a roof measured once cannot be reused on the next job at
   the same address — the single biggest asset the drone pipeline produces.
3. No recurrence. One agreement mowing a lawn 26 times has nowhere to live.
4. Quote line items are a JSON string inside `Proposal.scopeOfWork`.
5. `lib/pricing-template.ts` is a hardcoded const — same shingle cost, labour
   rate, markup and 13% tax for every company, in every trade.
6. `ProposalStatus` has SENT/VIEWED/APPROVED but nothing can set them.
7. No invoice, no payment, no schedule, no crew.
8. Creating anything requires five fields, and quoting requires measurements —
   a $450 flashing repair cannot get through the front door.
9. Roles exist but are not enforced; every member sees everything.

---

## Two principles that apply to every phase

**Required-to-advance, not required-to-exist.** Nothing is required to create a
record. The address is required to *schedule*; the client email is required to
*send*; the tax number is required to *invoice*. `lib/project-validation.ts`
becomes a set of per-transition guards, and the UI shows what is missing as a
checklist on the record ("Add an address to schedule this"), never as a wall in
front of creation. This is what makes small repair jobs viable.

**Nothing is hardcoded per company or per trade.** Every new model gets
`companyId` and every query goes through `requireCompanyContext()`. Trade-specific
surfaces are gated on `Company.modules`; trade-specific copy comes from a small
per-trade string pack, not from literals in components.

---

## Target domain model

```
Company (+ trade, modules[], branding, tax rates, business number, WCB number)
  Client        status: LEAD | ACTIVE | ARCHIVED, leadSource, tags
    Property    address, lat/lng          ← roof data attaches HERE
      Request   inbound job request, converts to quote or job
      Job       type: ONE_OFF | RECURRING
        Visit   start, end, assignees, completion  ← what the calendar renders
        Quote   shareToken, sent/viewed/accepted   (today's Proposal)
        Invoice + InvoicePayment
  Service       the per-company catalog every quote line comes from
  CrewMember    a User with role CREW
```

Roofing tables (`RoofSection`, `Measurement`, `RoofIssue`, `ProjectImagery`,
`ProcessingJob`, `RoofComparison`, `ModelMeasurement`) re-parent to `Property`
and `Job`, and render only when the roofing module is on.

---

## Phases, in priority order

### Phase 0 — Foundations ✅ done
1. ✅ `lib/money.ts` + `Proposal.totalAmountCents`. Additive: the float column is
   still there, dual-written, and `npm run db:backfill-money` is idempotent. Drop
   `Proposal.totalAmount` after a release. 23 existing proposals backfilled.
2. ✅ `ActivityEvent` + `ActivityKind` + `lib/activity.ts`. Writes are best-effort:
   a failed history row never fails the action that produced it.
3. ✅ Sidebar: removed six links pointing at a `?view=` parameter nothing reads.

Note on `lib/money.ts`: there are two entry points on purpose. `toCents()` is for
values already computed as floats and is honest that half-cents are gone by then;
`parseMoneyToCents()` reads the digits off the user's string and never touches a
float, so anything typed or charged is exact. Covered by `tests/money.test.ts`.

### Phase 1 — The split  ← everything else sits on this
Do this before quotes. The database holds 23 test proposals and no real
customers; this is the cheapest this migration will ever be. Once quotes carry
share links a homeowner has opened, and invoices reference them, re-parenting is
a migration with customer-visible risk.

Split into two commits on purpose. **1A** adds the new entities, re-parents the
data and backfills, while `Project` keeps its name; **1B** is the mechanical
rename. A rename touching ~52 files is not something to be debugging at the same
time as a migration.

**1A — the entities and the data**

1. ✅ `Client` (companyId, name, email, phone, status, leadSource, tags, notes).
   The name is **three optional parts** — first, last, business — with a rule
   that at least one is present, matching Jobber and the shape of the trade: a
   homeowner, a strata corporation, and a property manager who is the contact
   for forty buildings are all clients. `displayName` is maintained alongside
   for sorting, searching and matching.
2. ✅ `Property` (clientId, address fields, lat/lng, notes). A client may have
   many. Address parts are nullable: an address is required to *schedule*, not
   to exist, which is what lets a small repair through the front door.
3. ✅ `Project` gains `clientId`, `propertyId`, `type`, `jobNumber` (per-company
   sequential, assigned through `lib/job-number.ts` which retries on the race).
4. ✅ Backfill (`npm run db:backfill-domain`): one Client and one Property per
   existing Project, deduplicating on name + address within a company via
   `lib/client-matching.ts`. Denormalized columns kept for one release behind a
   `@deprecated` comment; `lib/job-identity.ts` is the only reader of them, so
   dropping them is a one-file change.
5. ✅ Roofing tables re-parented: `RoofSection`, `Measurement`,
   `ModelMeasurement`, `ProjectImagery` and `RoofIssue` gain `propertyId`.
   `ProcessingJob`, `PhotoAsset` and `RoofComparison` stay on the job — they
   describe the work, not the building.
6. ✅ `Company` gains `trade`, `modules[]`, and branding: logo, legal name,
   phone, address, licence number, business number, WCB/WSIB number.
7. ✅ `Service` catalog, seeded per trade from `lib/trade-catalog.ts` at sign-up
   (`lib/company-setup.ts`). Roofing is full; plumbing and lawn care are thin,
   and exist to prove one one-off trade and one recurring trade both fit.
   `lib/pricing-template.ts` stops being the pricing source of record.
8. ✅ `TaxRate` — a *list*, per province. Rates are held as parts per million
   (`rateMicros`), not floats: QST's 9.975% is 99_750 exactly, and it multiplies
   every taxable dollar a Quebec contractor bills. `Property.taxRateId`
   overrides the company default, because an Ottawa contractor working in
   Gatineau charges QST — the tax follows the building, not the business.
   (Column now; the picker is Phase 3, alongside the quote builder.)

Three rules set here that later phases inherit:

- **A possible duplicate client is a question, never a decision.** Silently
  attaching a job to the wrong Dave Chen puts one customer's work in another's
  history, and nothing downstream ever makes that visible. The new-job form asks,
  showing each candidate with the two facts that settle it — how much work they
  have, and where.
- **The address stopped being required to save.** It is required to *schedule*.
  This is the first concrete instance of required-to-advance, and the reason a
  $450 flashing repair described over the phone can now be written down.
- **Lead source is captured at creation**, on the job form, as a free-text field
  with suggestions rather than a fixed list — a company whose best source is the
  hockey rink board has to be able to say so. (Phase 2 item 15's capture half is
  therefore already done; the filter chips and tiles are not.)

**1B — the rename**

9. ✅ `Project` → `Job` and `/projects` → `/jobs`, with permanent redirects in
   `next.config.ts` so a bookmarked or texted job link still lands. Also
   `ProjectStatus` → `JobStatus`, `projectId` → `jobId` throughout, and the
   user-facing word "project" replaced with "job" in copy.

   **The physical table is still named `Project`**, held by `@@map`, and the
   columns still `projectId`, held by `@map`. `prisma db push` implements a
   rename as a drop and a create, and this project has no migration history in
   which to write a real `ALTER TABLE ... RENAME`. The mapping is invisible to
   application code and costs nothing; it comes off when `prisma migrate` is
   adopted, which should happen before the first production deploy.
   `ActivityKind.PROJECT_CREATED` is unchanged for the same reason — renaming a
   Postgres enum value through `db push` rewrites the column.

### Phase 2 — Fast path in, and leads
The front door. Answers the roofer's complaint directly.

10. ✅ **Global `+` quick-create** (2026-07-30) — a button in the dashboard
    header, reachable from anywhere, same gate as the sidebar's "New job"
    (`editJob`, so it's absent for crew and the office role rather than
    disabled). **Four destinations, not five**: Invoice has no page yet
    (Phase 5), and a menu entry pointing nowhere is exactly the dead-link
    problem the sidebar's own `navItems` comment already tore eight of out.

    Three of the four are links to where creation already lives — `/jobs/new`,
    `/requests/new`, and `/jobs` for Quote, since a quote is written on a job
    and has never had a bare form of its own (`/quotes`' own empty state
    already says as much). Building a second, thinner creation form for any of
    these would be two ways to do the same thing drifting apart later.

    **Client is the one genuinely new form**, because nothing before this
    button could make a client with no job attached — `/clients` said so
    explicitly: *"a second creation path... is a Phase 3 decision, not a
    button to add because the page looks bare without one."* This is that
    decision, made now that there's somewhere other than the job form to ask
    for it. Same rule as the job form's inline creation: a name is enough,
    everything else — lead source — is optional. `createLeadClientAction`
    reuses `createClient`/`splitTypedName` from the job form's own client
    resolution rather than a second copy of client-creation logic.
10b. ✅ **`/jobs` becomes the real job list** (confirmed 2026-07-27), carrying the
    status vocabulary above; `/dashboard` demotes to the overview — Jobber's home
    screen, the five nouns as counters. The five nouns have to be peer routes in
    the sidebar or the fourth one is always the odd one out. Done now because
    there is no real traffic and the `/projects` redirect is already in place;
    it only gets more expensive per phase. `/projects` re-points to `/jobs`.
11. ✅ One-field job creation: client typeahead that creates a client inline from a
    name alone (confirmed 2026-07-27 — a full New Client form on a miss would
    contradict required-to-advance and kill the phone-call repair job that
    Phase 1 just made possible). The last row of the results is always
    `Create "Dave Chen"`; enter takes it and the client exists as a LEAD. The
    typed name splits on the last space into first/last, with a one-click "this
    is a business" toggle in the row — enough for a strata corporation without a
    form. Selecting an existing client auto-fills their default property, so
    repeat work needs no address typed at all.

    **The duplicate-client question moves into the typeahead.** Phase 1's panel
    asked after the fact; matches with their job count and address now surface
    *while you type*, so the question is answered before the record exists. The
    panel is retired rather than maintained alongside.

    Two rules the build settled, both about what enter does:

    - **One match is highlighted; two are not.** With a single match, enter
      takes it. With two clients of the same name, nothing is highlighted and
      enter does nothing at all — that is the case the whole component exists
      for, and a question that answers itself on a keypress was never asked.
    - **The server does not second-guess the answer.** `findMatchingClients` is
      gone. Choosing "Add «Dave Chen»" beside two existing Dave Chens is an
      explicit answer, and re-running the match on submit would overrule the
      person who just gave it.

    Three things fell out of the design review worth keeping as house rules: a
    floating layer needs an *opaque* neutral (`surface-raised` is a 7% film in
    dark mode, so a dropdown using it is unreadable) and no shadow, since the
    system is flat by doctrine; a hint inside a `role="listbox"` has to sit
    outside the `<ul>`, because a listbox's children must be options; and the
    sidebar now needs a real active state — three entries where two share the
    `/jobs` prefix cannot be told apart without one.
12. ✅ Per-transition validation replacing the five-field gate. Missing-info
    checklist on the record.

    **One required field now: the client.** The job name went optional too, on
    the strength of Jobber's own form — its Title is optional and the job reads
    as "Job for Haari Raja". A name you have to invent is a name nobody searches
    for later, and inventing one was the last thing standing between a phone
    call and a written-down job. `jobDisplayName()` resolves the fallback **at
    write time**, not read time, so renaming a client later cannot silently
    rename every job they ever had.

    `jobGaps()` + `JobGapsPanel` put what's missing in the job's right rail
    (confirmed 2026-07-27). Three rules, and the middle one is the one to hold:

    - **It appears only when there is something to say.** A permanent "nothing
      missing" panel is furniture, and furniture stops being seen.
    - **It is a list, not an alarm.** Amber means *attention*; an address
      missing from a two-minute-old job is not something gone wrong, it is work
      not done yet. Ordinary ink, ordinary panel.
    - **Each line says what it costs.** "An address" is a nag; "An address —
      nobody can be sent to this job" is a reason.

    The copy is phrased against what the product does **today**, and a test
    enforces it. "Add an address to schedule this" is the obvious wording and it
    is wrong until Phase 4 exists — a roofer would go looking for a calendar
    that isn't there. It tightens as each phase lands.

    Note the divergence this creates, deliberately: Jobber *refuses to save*
    ("Property is required" — screenshot). We save and then say what's missing.
    That difference is the whole reason the panel has to exist.
13. ✅ **Remove the measurement wall.** `ProposalGeneratorCard` always offers
    "Create quote"; "Build from roof measurements" appears as an accelerator
    when measurements exist, never as a prerequisite.

    `createBlankProposalAction` exists beside `generateProposalAction` rather
    than inside it. Running `generateRoofingReport()` with no measurements
    returns a full report of zeroes — 0 sq ft, 0 squares, "based on 0 sq ft of
    roof" — which reads as a *broken* quote rather than an empty one. A repair,
    a chimney flashing and a call-out fee are all real quotes that no amount of
    photogrammetry helps with.

    One thing the change created and then had to close: **"Rebuild quote" is now
    hidden when there are no measurements.** With a hand-written quote on screen
    it would replace it with a report of zeroes — the one way that button could
    destroy work.
14. ✅ `Request` (clientId, propertyId, title, description, status, source,
    requestedAt, jobId) + `/requests` and `/requests/new`. The inbound lead
    record.

    Four states, and the middle two earn the record its existence: NEW is "the
    phone rang", ASSESSING is "someone is going to look at it". CLOSED matters
    as much — the number of asks you turned down is a real figure, and deleting
    them loses it.

    Three decisions worth keeping:

    - **`requestedAt` is when *they* asked**, not when it was typed in. A
      voicemail left Saturday and entered Monday is a two-day-old request, and
      how long someone has been waiting is the only urgent thing on the page.
      The form backdates; the action refuses a future date, because Phase 4's
      calendar is where a future date means something.
    - **The list sorts longest-wait-first and defaults to "Still open."** It is
      a queue of people owed an answer, not an archive.
    - **CONVERTED cannot be set by hand.** It is what converting *did*;
      `updateRequestStatusAction` throws on it, so no request can claim to be a
      job that isn't. Converting carries the client, property and their own
      words into the job — that carry-over is the whole reason this is a record
      rather than a note in someone's phone.

    The title is required where the job's name is optional: "Job for Dave Chen"
    is a usable job name, "Dave Chen wants something" is not a usable request.
15. ✅ Lead tracking: `Client.status` filter ("Leads and active" by default),
    `leadSource` captured at creation, new-leads / new-clients tiles, at
    `/clients`.

    **Nothing in the product moved `Client.status`,** so every client in the
    database was a LEAD and a "new clients" tile would have counted zero
    forever. `lib/client-lifecycle.ts` is the rule that fixes it: a lead becomes
    a client when work is **won** — SCHEDULED or beyond. QUOTED sits
    deliberately below the line, because a sent quote is exactly the thing that
    has not been answered yet. It only ever promotes; a status that flickers is
    worse than one that is slightly generous.

    `Client.convertedAt` was added for the same reason. "New clients this month"
    is a question about when they *converted*, and `updatedAt` moves every time
    someone fixes a phone number.

    The tile rule that generalizes: **`delta` is nullable and a zero baseline
    yields `null`.** A jump from nothing is not "+100%" and a computed 0% reads
    as "no change", which is the opposite of what it means. The YTD tile claims
    no delta at all.

    Clicking a client goes to `/jobs?q=<name>` — there is no client detail page
    yet, and a real destination beats a dead link.
16. ✅ Mobile quick-job sheet at `/jobs/quick`: who · what · price.

    **[Book] is deliberately absent until Phase 4.** Booking means a date, a
    visit and a calendar to put it on, none of which exist; a button that says
    Book and quietly does not book is worse than no button. The price is what
    the door-step conversation actually produces, and a number typed here
    becomes a **draft quote**, not a field on the job — it is the thing you will
    send, argue about and eventually invoice, so putting it anywhere else means
    moving it later.

    Every input is `text-base`, not the desktop `text-sm`: iOS zooms the page
    when a focused input is under 16px, and a form that jumps under your thumb
    is unusable outdoors. Buttons are full-width and stacked — one thumb, no
    precision. The entry point is `sm:hidden` on `/jobs`; on a desktop the full
    form is right there and a shortcut past it is a second door to the same
    room.

### What the 2026-07-28 quote screenshots settled

Seventeen screenshots of Jobber's quote builder, its client-view controls, and a
real homeowner-facing estimate. This is Phase 3 specified almost end to end.

**The client-view toggle is not a preview.** This is the correction: it is a
per-quote **visibility setting** with four independent checkboxes — Quantities,
Unit prices, Line item totals, Totals — under the copy "Adjust what your client
will see on this quote. To change the default for all future quotes, visit the
PDF Style." Previewing is a *separate* action ("Preview as Client" in the More
menu, which opens the client-hub page with `?preview=true`).

That difference matters more than it looks. A preview toggle answers "what will
they see"; these checkboxes answer "what should they see" — a roofer quoting a
$7,500 job as one number, deliberately, so the conversation is about the roof
and not about whether $250 for a decking inspection is fair. **Cost and margin
are not among the four.** They are never client-visible under any setting, which
is why they need no switch.

**Cost and markup live in a popover on the unit price**, not in columns. Click
Unit price and a small panel opens with `Unit cost` and `Markup (%)`, footed by
"These calculations won't be visible to your clients". Markup is derived from
the pair — $4,100 → $6,800 reads 65.85%, $175 → $450 reads 157.14%, $80 → $250
reads 212.5%, i.e. `(price − cost) / cost`. Editing either one recomputes the
other. The cost never appears in the row itself, so the editing surface and the
client's document are the same shape.

**The totals block, in order:** Subtotal, Discount, Tax, **Total** — then below
a rule, in quieter type, `Costs` and `Estimated margin $3,145.00 (41.93%)`.
Margin percent is of **price, not cost**: 3145/7500. Then `Add Deposit or
Payment Schedule`.

- **Discount is an amount plus a unit dropdown (% or $)**, with the computed
  reduction shown to its right and a trash icon to remove it.
- **Tax is one rate on the whole quote**, chosen from the company's tax rate
  list — "No options / Create new tax rate" when the list is empty. Not
  per-line. This confirms `TaxRate` as built, and `Service.taxable` stays the
  per-line escape hatch we already have.
- **Deposit is a modal with two radios**: "Deposit only — collect an upfront
  payment on quote approval" and "Payment Schedule — split the job into multiple
  invoices". The second is Phase 5's job; the first belongs here, because the
  homeowner page shows it.

**A quote is sections, not one table.** `+ Add section` offers Introduction,
Attachments, Images, Client Message; Product/Service is always present; a
Contract / Disclaimer sits at the bottom with an **"Apply to all future quotes"**
checkbox. A line item is Name · Quantity · Unit price · Total, with a
description textarea and an image drop zone under it, a drag handle on hover,
`•••` overflow, and a **`Mark as optional` checkbox** — Jobber does have one,
directly under every line. Two add buttons: `Add Line Item` and `Add Text`.

**Templates are the first decision, not a feature.** "New quote" opens a modal
that is a template list first ("Roof Replacement (Architectural Asphalt
Shingles)") with `Create New Quote` underneath. That moves item 21 forward: it
is the entry point, not a nicety bolted on later.

**The More menu** is: Convert to Job · Send as… (Email / Send Text) · Preview as
Client · Collect Signature · Print or Save PDF · Delete, with `Create Similar
Quote` as a peer button.

**The homeowner page** (a real estate quote, not the sandbox): company logo and
name, `Estimate #287`, an **`Awaiting response`** chip, the client's name and
address, `Sent on`, and — where a deposit exists — the italic line *"An
outstanding deposit of $5,138.68 will be required to begin."* directly under the
address. Line items carry long prose descriptions. Totals read Subtotal ·
HST (13.0%) · Total · **Deposit Required**. Warranty text below. The right rail
holds **Approve** and **Request Changes**; Request Changes opens a modal with a
textarea ("Please provide as much detail as you can about your changes") and
Send Request. Top bar: Back and **Download PDF**.

Note the homeowner's rail is a whole **client hub** — Requests, Estimates,
Appointments, Invoices, Wallet, Contact Us, Refer a Friend. That is Phase 7, and
seeing it confirms the share-token page should be built as a page that can
later live *inside* a hub rather than as a one-off document.

### Phase 3 — Send & accept a quote
17. ✅ `Quote` (renamed `Proposal`) gains `shareToken` (unique), `sentAt`,
    `viewedAt`, `acceptedAt`, `acceptedByName`, `acceptedIp`, `expiresAt`.

    Physical table stays `Proposal` via `@@map`, and `ProposalStatus` likewise —
    the same trick as `Job`, for the same reason: `db push` implements a rename
    as drop-and-create. `QuoteStatus` gained `CHANGES_REQUESTED` and `EXPIRED`.

    Two additions the plan didn't have. **`companyId` is denormalized onto the
    quote** so `quoteNumber` can be per-company and sequential — "that's quote
    14" is what a contractor says on the phone. And discounts and deposits are
    stored as **a kind plus one of two value columns** (`AmountKind` +
    `…Cents` / `…PercentMicros`) rather than one number: "500" is five dollars
    or five hundred percent depending on a sibling column, and money bugs are
    the expensive kind.
18. ✅ `QuoteLineItem` (quoteId, serviceId?, group, description, qty, unit,
    unitCostCents, unitPriceCents, amountCents, sortOrder, isOptional,
    imageUrl, source: "auto"|"manual"), plus `kind: ITEM | TEXT` for Jobber's
    `Add Text` row — a paragraph with a $0 price would otherwise sit in the
    middle of the arithmetic pretending to be free work.

    The `source` convention holds, and the builder enforces it in the direction
    that matters: **touching a generated row flips it to "manual"**, so a
    re-measure can never overwrite a price the roofer deliberately changed.
19. ✅ Quote builder UI at `/jobs/[jobId]/quotes/[quoteId]` — its own page, not
    a card in a tab. It is a document now, and a document composed three panels
    deep is a document nobody gets right.

    Shipped: sectioned document (opening, the work, totals, a note, terms),
    line-item editing and reorder, **mark as optional**, the cost/markup
    popover, discount (% or $), quote-level tax, deposit, and the four
    **client-view** checkboxes.

    Three calls worth keeping:

    - **Reorder is two arrow buttons, not a drag handle.** Dragging is the
      obvious answer and the wrong first one: invisible to a keyboard, awkward
      one-handed on a phone, and a quote is five rows, not fifty.
    - **The live total is `computeTotals` — the same function the server runs on
      save.** Not a second implementation for the preview's sake. A total that
      changes when you press Save is a total nobody trusts again.
    - **One Save, not per-row autosave.** A quote is composed — move a line,
      change a price, change it back — and a surface that commits every
      keystroke turns "let me try something" into a change to a number the
      homeowner may already be looking at.

    Not built, and deliberately: **per-line tax** — the screenshots settled that
    tax is one rate on the whole quote.

    ✅ **Add from the `Service` catalog** (2026-07-28). An inline picker, not a
    modal: one search box and a list, over the catalog every company gets on
    first sign-in. A picked line is a **copy, not a link** — next month's price
    rise must not reach backwards into a quote a homeowner is holding — but
    `serviceId` is kept so job costing can still tell what the row was.

    ✅ **Per-line photos** (2026-07-28). `QuoteLineItem.imageUrl` was already
    there; what was missing was a way to fill it. The bytes upload the moment
    the file is picked and the *link* saves with the document, under the one
    Save the builder has always had — holding a 4MB file in form state until
    Save is how you lose a quote to a dropped connection. Photos are downscaled
    to 1600px **in the browser** (`lib/image-downscale.ts`), for the server
    action's body limit and, more importantly, for the homeowner opening the
    quote on cell data. `isOwnStorageUrl` rejects any URL we did not mint: the
    builder posts its rows as JSON, so an image URL is browser input like any
    other, on a row that ends up rendered on a page we hand to a homeowner.
20. ✅ `lib/quote/line-items.ts` — `generateRoofingReport()` output as rows.

    The report prices lines at **cost** and applies one markup at the bottom.
    That shape was right when a quote was a single number and is wrong now, so
    the markup is pushed **down into every row**: the subtotal is unchanged, and
    the roofer can now see and change the margin on the shingles separately from
    the margin on the labour.

    `lib/quote/totals.ts` is the arithmetic, and it reproduces the screenshots'
    sample quote to the cent — $7,500 total, $4,355 cost, $3,145 margin at
    41.93%. **Margin percent is of price, not cost.** Tax lands on the
    *discounted* amount: you are not taxed on money you were never charged.
21. ✅ **Quote templates** (2026-07-29, settled by the Jobber help-centre
    screenshots rather than guessed).

    **A template is made from a quote that worked**, not typed into a settings
    form. Jobber offers both; the settings form is the half that sits empty. A
    roofer builds one good re-roof quote, presses *Save as a template*, and the
    twelfth takes a minute. There is no settings area in this app yet and this
    feature did not need one.

    **What travels**: the lines, the title, the opening, the note to the client,
    the terms, the deposit, and the four client-view checkboxes. Jobber does not
    template that last group; we do, because they are a house style and
    re-deciding them every quote is exactly the retyping a template kills.

    **What does not, and why it matters**: the discount (negotiated per job — a
    template carrying one gives away margin quietly), the tax rate (it comes
    from the property's province via `defaultTaxRateFor`; a template carrying
    Ontario's HST onto an Alberta roof is a wrong invoice), and the client.

    **The price chain is catalog → template (live) → quote (frozen).** A
    template row linked to the price list takes *today's* price when applied, so
    raising your prices reaches every template at once; once the quote exists it
    is a copy and nothing reaches back into a document a homeowner may be
    reading. `lib/quote/templates.ts` is that rule, and it is pure and tested.

    Two places we deliberately diverge from Jobber:

    - **Linked by `serviceId`, not by name.** Jobber re-links template rows to
      products by name, so renaming "Shingles" to "Shingles — architectural"
      silently detaches every template using it. An id does not care what you
      call it.
    - **The catalog governs the money; the template governs the words.** Jobber
      propagates description and price together. A description written for a
      template was worded on purpose and a catalog description is generic, so
      only price, cost and unit refresh. (The unit follows the price on purpose:
      a catalog that moved from "square" to "sq ft" changed what the number
      *means*.)

    The New Quote button opens the template list only when templates exist —
    with none saved it stays one click to a blank draft, because a chooser with
    one option is a step, not a choice. It is a native `<dialog>`, so the focus
    trap, Escape and the inert background come from the platform.

21b. ✅ Two smaller things the same screenshots settled (2026-07-29).

    **`Add an optional extra` is its own button**, beside `Add a line` — Jobber
    has both the button and the per-row checkbox. An upsell you have to remember
    to tick is an upsell that does not get added, and this is the money line.

    **An approved quote keeps both halves of the extras**: what they took, and
    what they didn't, greyed with the price struck through. Jobber labels these
    *Optional* and *Not included*. Hiding the declined ones — which is what we
    shipped first — makes the approved document a shorter story than the one
    that was agreed to, and "I never saw that option" is the argument this
    record exists to settle.
22. ✅ `lib/share-token.ts`; `/q/(.*)` added to `isPublicRoute` in `proxy.ts`.

    ~98 bits from `randomBytes`, in a Crockford-style alphabet with no 0/O,
    1/I/L or U, dash-grouped — unguessable first, sayable down a phone second.
    `isWellFormedShareToken` is checked before any query, so a scanner costs one
    regex rather than a round trip.
23. ✅ `app/(public)/q/[token]` — homeowner-facing. Accept / request changes,
    marks VIEWED on first open.

    **It does not reuse `print-report.tsx`.** That component is the *roof
    report* — facets, pitch, waste — which is a different document for a
    different purpose. Built from the `paper-*` tokens instead, so it reads as
    paper in either app theme, and `robots: noindex` because a forwarded link
    must never put somebody's roof price in a search result.

    The response rail sits *beside* the document rather than under it: some
    people approve on the number alone, and making them scroll past two pages
    of warranty text to find the button is a way of losing the yes.
24. ✅ **Resend email** (2026-07-30). `shareQuoteAction` still mints the link
    and hands the roofer a URL to paste into a text — that path is unchanged,
    and still how most of these actually go out. `sendQuoteEmailAction` is the
    second door onto the same link: it never mints a token of its own, only
    ever sends one that `shareQuoteAction` already created.

    **Absent, not disabled, without a key.** `lib/email.ts` mirrors
    `lib/storage.ts`'s driver split — no `RESEND_API_KEY`, no "Email it to
    them" button, same reasoning as the sidebar dropping a whole nav entry for
    crew instead of greying it out. The SDK is imported lazily inside `send()`
    so a deploy with no key never pulls it into the bundle. The button also
    needs a client email on file to appear; without one, a muted line explains
    why rather than the button silently not being there.

    The token is minted once and kept across re-sends, by either door. "The
    link you sent me doesn't work" is a phone call nobody should have to take.
25. ✅ Accept → `QuoteStatus.APPROVED`, job advanced, ActivityEvent.

    Approving walks the job to QUOTED rather than further, because "won" has no
    job status until Phase 4 gives it a date. `acceptedIp` is captured and never
    displayed — thin evidence, but it is the only thing standing behind a click
    that authorizes thousands of dollars of work.

    Two guards worth keeping: **approving twice is a double-click, not a second
    decision** (it returns early), and **`markQuoteViewed` filters on
    `status: SENT`**, so a homeowner who approves and then re-opens the link
    does not have their answer overwritten by the act of reading it again.

25b. ✅ **The homeowner ticks the extras themselves** (settled 2026-07-28).

    The contractor puts optional lines on the quote *before* sending — the roof
    was already discussed, this is the "while we're up there" list. Which of
    them get done is the homeowner's call, made on the public page, alone, with
    nobody standing over them. An upsell nobody has to refuse to a person's face
    is an upsell that gets read on its merits.

    **Order of operations: subtotal → discount → accepted extras → tax.** The
    extras go in *after* the discount deliberately. A 10%-off was agreed on the
    roof; an extra they add themselves should cost what the label beside the
    checkbox says. Otherwise ticking an $800 box moves the total by $720 and the
    homeowner is looking at a number they cannot derive — and that is the one
    rule this page cannot break.

    Three things that make it trustworthy rather than merely working:

    - **The checkboxes carry `form="quote-approve"`**, so a tick made in the
      document posts with the approval made in the rail — including with
      JavaScript off. Nothing about agreeing to pay for something should depend
      on a script loading.
    - **The browser's total is not the total.** On approve the server re-reads
      the rows, drops any id that is not an optional line on *this* quote, and
      re-runs the same `computeTotals`. `totalAmountCents` is pinned in the same
      transaction as the approval, because the total approved can now differ
      from the total sent, and that has to be a recorded fact.
    - **`clientSelected` is only ever written by `approveQuoteAction`.** The
      builder saves everything else about a row and must never touch this one;
      `saveQuoteAction` reads it back from the database so that saving an
      approved quote cannot quietly subtract the extras the homeowner bought.

    The activity record names the extras, so "why is this $800 more than I
    quoted" has an answer that does not require diffing two documents.

25c. ✅ **Mark a quote approved by hand** (2026-07-29).

    Most quotes are not approved by clicking anything. They are approved in a
    driveway, or on a call three days later, and plenty were never sent as a
    link at all. A product that can only record a click leaves a contractor
    with a pipeline full of work that looks ignored.

    **It does not forge the click.** `acceptedByName` and `acceptedIp` are the
    thin evidence that a person at that address pressed Approve; writing a name
    into them because a roofer ticked a box would turn the only evidence this
    product holds into a field anyone can fill in. They stay null, a new
    `approvedByUserId` records who marked it, and the panel says "You marked
    this approved" rather than "They approved it". A homeowner's own approval
    outranks it and is never overwritten.

25d. ✅ **`Service.imageUrl`** (2026-07-29) — photograph a shingle profile once
    on the price list and every line picked from it inherits the picture.
    Inherited as a copy, like the price.

25e. ✅ **`/quotes` — the list and its three figures** (2026-07-29, from the
    Quote List Page screenshot).

    The job list answers "what work have I got on". This answers the more
    anxious question: **what money is out there waiting on somebody else.**

    - **One cyan figure**, per the Readout Rule: the money awaiting an answer,
      because that is the number this page exists to make somebody act on. Won
      and the approval rate sit beside it in `ink-primary` — a scoreboard is
      not a reading.
    - **The figures ignore the status filter.** A rate that changes when you
      filter to Approved would read 100% and mean nothing. Filtering narrows
      the list; it never rewrites the scoreboard.
    - **Drafts are excluded from the rate.** A quote nobody was ever sent did
      not fail to convert, and counting it as a loss makes the number describe
      your admin rather than your selling. Jobber calls this *conversion rate*
      (converted ÷ sent); ours is **approval rate** until Phase 4 gives us a
      converted state to count.
    - Filters are links, not buttons: a filtered list is a place, so it has a
      URL you can bookmark and a working Back button.

    `lib/quote-status.ts` gives quote statuses the same treatment
    `lib/job-status.ts` gives jobs — no enum reaches a screen. `SENT` reads
    **"Awaiting response"**, because what a contractor wants to know is not
    that they sent it, it is that nobody has answered. Sent and Opened stay
    apart (Jobber merges them): unopened means chase the link, opened-and-silent
    means chase the price.

### Phase 4 — Schedule, visits, and the field
The largest phase, and the one the recurring decision reshaped.

26. ✅ **`Visit`** (2026-07-29) — companyId, jobId, start/end, `allDay`, status,
    completedAt, notes, plus `VisitAssignment` (a join table, because two people
    on a roof is the normal case and the exception that forces a rewrite later
    is always the second person). `VisitStatus` is deliberately *not* the job's
    status: a job with twenty-six lawn visits has one status and twenty-six of
    these. `MISSED` is kept rather than deleted — a no-show is a fact about a
    job.

27. ✅ **`RecurrenceRule` + the generator** (2026-07-29). Its own table rather
    than columns on `Job`, so a schedule can be changed while keeping the visits
    already generated under the old one — which is what happens when a client
    moves their mow day.

    **`lib/schedule/recurrence.ts` works in wall-clock terms, never elapsed
    time.** Adding seven days to an *instant* is wrong twice a year: an 8am
    Tuesday mow becomes 7am the week the clocks change and stays wrong for the
    rest of the season. The expansion walks calendar days and the time of day is
    re-attached after. 15 tests, including the DST week and the one that matters
    for month-end: **Jan 31 + 1 month is Feb 28, and the next is Mar 31, not Mar
    28** — each occurrence is re-derived from the original date so a February
    clamp cannot permanently drag a month-end schedule earlier.

    Two more decisions in there: **the horizon is not an optimisation** (a lawn
    contract with no end date has infinitely many occurrences; materialising
    them is how a scheduler hangs), and **the generator never touches a visit
    that exists** — a crew member who moved Tuesday's mow to Wednesday because
    of rain made a decision, and a scheduler that "corrects" it overnight is one
    nobody trusts with their week. Matching is by occurrence *slot*, not date.

    Also added: **`Company.timeZone`**, nullable and unset. The scheduler must
    ask rather than guess — a crew shown 7am for an 8am start because the server
    runs in UTC arrives an hour late, and the mistake is invisible until the day
    the clocks change.

    **Built on it now (2026-07-30)**: `lib/schedule/timezone.ts` — the
    conversion this note was waiting on. No date library: `Intl.DateTimeFormat`
    already knows every IANA zone's DST rules, and a wall-clock time becomes a
    real instant by the standard two-pass trick (guess as UTC, read back what
    that guess actually reads as in the zone, correct by the difference — twice,
    which is what keeps a booking exact through the one hour a year the clocks
    change and not just the other 8,759). 12 tests, including an 8am booking
    either side of Canada's 2026-11-01 DST boundary staying 8am, and a late
    Vancouver visit landing on the *local* day even though it's already
    tomorrow in UTC.

    `Company` gets a settings surface for the first time: a banner on
    `/schedule`, gated on `manageSchedule`, offering a short list of Canadian
    zones by name ("Pacific Time," not `America/Vancouver`) rather than
    Intl's ~400 — a raw IANA dropdown is exactly the exposed-parameter-panel
    `PRODUCT.md` names as the anti-reference.

28. ✅ **`/schedule`: Week, Month, Schedule, Day, drag-to-move, and filters**
    (2026-07-30). All four views, plus the two things left open when Day
    landed.

    **Drag-to-move surfaced a real bug rather than just needing a UI.**
    `moveVisitAction` had existed unused since the calendar's first version,
    and it always collapsed the visit to all-day on move — fine while nothing
    had a time, silently wrong the moment timed visits did: dragging a 2pm
    inspection to Thursday would have dropped the 2pm. It now reads the
    visit's existing time-of-day and duration and re-derives them on the new
    day through the same zone-aware helpers Day already uses, so "rain, let's
    do it Thursday instead" stays a 2pm appointment. Native HTML5
    drag-and-drop, no new dependency — a mouse/trackpad gesture that only
    matters on the office calendar, never something a crew member on a phone
    needs.

    **Filters narrow what's drawn, never what's counted.** Type, Team and
    Status are query-param pills and a `<select>` (`components/dashboard/
    filter-pill.tsx`, extracted from `/quotes`' own filter row so both pages
    share one implementation), all absent for crew — a filter dropdown that
    would need the full team roster is not a roster crew have a reason to
    see, same test as `manageSchedule` gates the double-booking banner
    beside it. The double-booking warnings keep reading the *unfiltered*
    visit set on purpose: a heads-up about Dave shouldn't vanish because
    somebody filtered the view down to Priya's jobs. Cancelled has no filter
    pill — the underlying query already excludes cancelled visits by default,
    and a filter offering to reveal what's already hidden would be a filter
    that lies.

    **A week, decided with the user rather than guessed.** A day view is mostly
    empty for a two-truck shop, a month truncates to one entry per square, and a
    week is the only one that shows the shape of what's coming while still
    naming every job on it. Empty days are drawn as *Free* rather than hidden —
    a gap you can see is a gap you can fill.

    **A visit was a day with no clock on it, honestly, because nobody had said
    which clock — not any more.** Once a company sets `Company.timeZone`, the
    booking form offers an optional start time and duration; left blank, a
    visit is still exactly the dateless square it always was. `lib/schedule/day.ts`
    keeps storing an all-day booking as **UTC midnight of the calendar square,
    read back out of the UTC parts** — a *timed* visit is a real instant instead,
    which is a second storage convention living beside the first rather than
    replacing it. The two can't be told apart by one UTC range query — a late
    timed visit can already be tomorrow in UTC without being tomorrow locally —
    so every query that buckets visits by day (`/schedule`, `/today`) widens its
    window by a day on each side and re-buckets precisely with
    `visitCalendarDay`, which is zone-aware for timed visits and falls straight
    through to the old UTC-parts read for all-day ones. `day.ts` itself stays
    zone-agnostic on purpose — "no timezone, no time, no drift" — the zone
    lives only in the new file.

    **Day** is an hour-by-hour list, not a pixel-positioned grid, with an
    `Anytime` lane above it for visits with no set time — the same place
    Jobber's own Day view puts it. A list was the deliberate choice over
    absolute positioning: this app already trusts a list to carry a day
    (`DayColumn`, the agenda view), and a list has none of a positioned grid's
    failure modes — overlapping cards, a tap target smaller than a finger, a
    focus order that doesn't match what's on screen. `Day` only appears in the
    view tabs once the company has a timezone; the hour grid it would draw over
    dateless visits was exactly the empty-gridlines problem this waited on.

    **Booking lives on the job, not on the calendar.** You schedule the work
    from the thing being scheduled; the calendar is where you read the week
    back. Booking moves the job to SCHEDULED, and completing the *last*
    outstanding visit moves it to COMPLETED — a twenty-six-visit lawn contract
    is not finished because week one went well.

    Recurrence is wired: `setRecurrenceAction` stores the rule and materialises
    visits to a ~5 month horizon. Re-running it creates **zero** duplicates —
    the unique index on `(generatedFromRuleId, occurrenceDate)` plus
    `skipDuplicates` is what makes extending the horizon safe. Verified against
    the database: 6 fortnightly Tuesdays generated, a second run added none.

29. ✅ **Done.** The join link, `CompanyRole.CREW`, the permission matrix,
    enforcement at the chokepoint, and assignment all landed 2026-07-30; the
    two things this item originally left open — `/today` and field capture —
    shipped the same day as items 31 and 32 respectively, below.

    **`lib/permissions.ts` is one readable matrix, and it denies by default.**
    A capability added next year is denied to every role until somebody decides
    otherwise — the failure mode of forgetting is a locked door, never an open
    one. `can()` is pure, so the rules are testable without a database, and the
    17 tests are weighted to the **negative** cases: what CREW *cannot* reach.
    "Can the owner edit a quote" is the test everybody writes; "can the guy
    hired last week read the margin" is the one that matters.

    Crew hold exactly one capability — `completeVisit` — asserted as a list
    equality so that granting them a second one fails the suite loudly rather
    than slipping through in a diff.

    **Enforcement is a query, not a filter.** `requireJobAccess` composes
    `jobScopeForRole` into the `where`, so a job a crew member may not see is
    never *loaded*, let alone rendered with its quote attached. Verified against
    the real database, not just the matrix: a crew member with no assignment saw
    0 jobs; after being put on one visit, exactly 1 — the job they were on — and
    the second job stayed invisible while the owner saw all three.

    Money is **absent** rather than hidden for crew: the quote figure and the
    whole Quote tab are not rendered, because a value that reaches the browser
    has already left the building. `JobWorkspace` now drops a tab whose content
    is null, so there is no empty tab advertising the thing they can't have.

    **The trapdoor is closed.** `requireCompanyContext()` still provisions a
    company for a genuine new contractor, but a pending invite now wins over
    provisioning — otherwise a crew member who landed anywhere other than
    `/join` became the owner of their own empty company while the invite sat
    unused. The invite is parked in a cookie *before* the sign-up round trip so
    no path can miss it.

    **The invite is claimed conditionally**, in a transaction: the "already
    used" check that renders the kind message is a courtesy, not the guard. Two
    taps arriving together would both pass it, and "single use" would quietly
    mean "as many as you can double-click".

    **How crew get in, decided 2026-07-30 with the user: a join link the boss
    sends himself.** Not an email invitation — that would mean building Resend
    first, and it is the wrong channel anyway: a roofer contacts his crew by
    text and WhatsApp, not by inbox. It is the same move the product already
    makes with a quote — mint a URL, hand it over, let the contractor send it
    the way he actually communicates. The link needs an expiry, a revoke, and a
    use limit, or a forwarded link is a permanent open door.

    **What crew see: their own visits only, and no money.** The client, the
    address, the roof detail, the visits they are on. Never cost, never margin,
    never another crew's work.

    Rejected: Clerk Organizations. It would hand us invitations and roles for
    free, but `Company` + `CompanyMembership` already exist and everything is
    built on them — adopting Clerk's would make our tables a mirror that has to
    be kept in sync, and two sources of truth about who can see a job is one
    too many.

    **The blocker to fix first:** `requireCompanyContext()` currently
    auto-creates a *new company* for any signed-in user without one, making them
    its OWNER. An invited crew member signing up today would land in their own
    empty company rather than their boss's. The invite has to be consumed before
    that fallback runs. `CompanyRole` also has no `CREW` member yet.

    **No assignee on `Visit` yet, decided 2026-07-29 with the user.** Every
    login in this product is effectively an admin, so an assignee could only
    ever point at somebody who already sees everything — building the wrong
    half first. `VisitAssignment` exists in the schema for when crew accounts
    land; nothing writes to it. Note that `requireJobAccess()` is now the
    graph's top god node at 60 edges, which is the one chokepoint this item has
    to widen.
29b. ✅ **The permission audit** (2026-07-30). Every server action and route
    handler in `app/` was read against its guard. The finding was not a missing
    check — every job-scoped action called `requireJobAccess` and every one
    scoped correctly to the company. What none of them did was say *what they
    were about to do*.

    **Scope is not permission.** `requireJobAccess(jobId)` answered "may this
    person reach this job", the only question it was asked. So a crew member
    assigned to a roof could edit its quote, publish it to the homeowner, mark
    it approved, delete its photos, or save a company-wide quote template.

    Five findings, worst first:

    - **`/jobs/[jobId]/quotes/[quoteId]` rendered cost, markup and margin to
      anyone who could reach the job** — including the crew member standing on
      it. Caught by the regression test below rather than by reading, which is
      the whole argument for having written it.
    - **`deleteJobAction` and `updateJobStatusAction` hand-rolled their own
      company check** instead of using the chokepoint, so they scoped the tenant
      and not the role. Every member could delete any job in the company —
      including VIEWER, whose entire purpose is to change nothing.
    - **The calendar feed could be minted or revoked by anyone**, including a
      crew member. The panel was hidden from them; the action was not. That feed
      is every client address in the company.
    - **Job creation, request handling and client search** ran on a bare company
      context, so crew could create jobs and read the whole client list.
    - **The AI and comparison routes** were reachable by anyone on the job.

    All now take a capability. `tests/action-guards.test.ts` reads the source
    and fails if a call site ever asks the narrow question again, or if a server
    action falls back to a bare `requireCompanyContext`. Finding this once is
    enough.

30. ✅ **Double-booking detection** (2026-07-30) — `lib/schedule/double-booking.ts`,
    pure and tested (10 tests), non-blocking: a heads-up banner on `/schedule`,
    never a wall in front of a booking. The assignment already happened by the
    time either warning fires, and a contractor moving a crew between two
    quick jobs on purpose is a real schedule, not a mistake to refuse.

    Two rules. **Overlapping assignments**: the same person on two different
    jobs the same calendar square. Two *timed* visits only conflict if their
    ranges actually overlap — back-to-back jobs in one day are normal — but an
    all-day visit conflicts with anything else on its day, timed or not,
    because "sometime Tuesday" has no known slot to clear against. **Overbooked
    days**: more visits booked on a day than the company has members, counted
    against total `CompanyMembership`, not just `CREW` — a two-person shop
    where the owner also swings a hammer is not a shop with zero crew.

31. ✅ **`/today`** (2026-07-30) — the one screen a crew member lives in, and
    where every crew member now lands after joining or after being redirected
    off a page they may not see.

    **It is not a calendar.** A calendar answers "what does my week look like";
    this answers "where am I going now, and what do I do when I've finished".
    Those are different questions and the second one does not want a grid — so
    it is one card per visit, one action per card, sized for a thumb.

    The address is a link into the phone's own maps app. A crew member should
    never be retyping a postcode with gloves on, and every phone already has a
    better navigator than anything we would build.

    An empty day shows **what's next** rather than nothing, so it is not a dead
    end — one visit, not a list, because this page is about now and tomorrow is
    a footnote on it.
32. ✅ **Field capture** (2026-07-30) — a crew member can now mark a visit
    complete, take a photo against it, and leave a note, from `/today`.

    **"Retries when the signal comes back," not a sync engine.** Decided with
    the user over the alternative — local-first storage, a queue, and conflict
    handling for two people editing the same visit — which is a different
    product and a lot more of one. `FieldCapturePanel` tries the server action
    directly first; only on a network failure does it fall back to
    `lib/offline/field-queue.ts`, a plain IndexedDB queue with no service
    worker, replayed on the browser's `online` event and a 20s poll while the
    tab stays open. No background sync API, because nothing in this app has
    ever registered a service worker and giving one a reason to exist is a
    bigger change than the actual failure mode — a dropped bar or two on a
    roof, not a phone in a drawer for a week.

    Photos and notes both use `completeVisit` — the one capability CREW hold —
    rather than the office's `editJob`, and go through a new
    `app/(dashboard)/today/field-actions.ts` rather than the existing
    `photo-actions.ts`, which can retag and delete: a field upload can only add.
    `PhotoAsset` gained a nullable `visitId` so a photo can be attached to the
    visit it was taken on, not just the job. Notes are appended, never
    overwritten, so a second crew member's note doesn't erase the first.

33. ✅ **Assessment/inspection visits** (2026-07-30) — a LEAD had no date
    anywhere, so the first site visit was invisible to the calendar. `Visit`
    gained a `kind`: `ASSESSMENT` (the first look) or `WORK` (default, and
    everything before this field existed).

    **Booking one is a different promise than booking work, and each gets its
    own honest destination.** `bookVisitAction` already moved a LEAD straight
    to `SCHEDULED` as a side effect of booking any visit — right for `WORK`,
    wrong for `ASSESSMENT`, which now only moves `LEAD` → `INSPECTION`: the
    same transition the "Start inspection" button already made by hand, since
    booking the first look *is* starting the inspection. Completing an
    `ASSESSMENT` visit doesn't move the job at all — what happens after
    somebody has looked at the roof is a human decision, not something
    `completeVisitAction` gets to guess — and the outstanding-visit count that
    decides when a job is `COMPLETED` now only counts `WORK` visits, so a
    lawn contract's inspection history can't stand in for its mowing schedule.

    The choice only appears on the booking form when the job is still a LEAD
    (`VisitPanel`) — every other stage only ever means work — and a booked
    assessment carries an "Inspection" badge on the job page, the week/agenda
    calendar, and `/today`.

34. ✅ **Calendar sync — built 2026-07-30.** `/calendar/[token]` serves ICS;
    `lib/schedule/ics.ts` is the generator, with 14 tests on the parts that
    silently corrupt a feed: **commas** (a list separator in iCalendar, so an
    unescaped "Smith, J." loses half the address), **backslash escaped first**,
    **folding at 75 *octets* not characters** (an accented address folded on
    character count splits a codepoint and lands as mojibake on the phone), and
    **`DTEND` being exclusive** — set an all-day event's end to the same day and
    a good half of calendar apps render a zero-length event that never appears.

    Cancelled visits are published `STATUS:CANCELLED` rather than dropped, or
    the old event sits on a crew's phone forever. `METHOD:PUBLISH`, never
    `REQUEST`, so nobody's phone sprouts Accept/Decline buttons for work they
    are not being asked to agree to. `Cache-Control: no-store`, because a CDN
    holding a stale week on top of Google's own 12-hour cadence puts a crew at
    the wrong address with nothing to explain it.

    The panel says the two things out loud that cost somebody a morning: **it
    only goes one way**, and **it isn't instant**. Both are consequences of it
    being a subscription rather than an integration, and neither is ours to fix.

    Original finding (2026-07-29 from Jobber's Calendar Syncing doc):

    This is the most valuable thing in that document, and it is a negative
    result: Jobber does **not** hold Google OAuth tokens, does not talk to the
    Calendar API, and has no per-provider integration to maintain. It publishes
    one **iCal/ICS feed at an unguessable URL** and the contractor subscribes to
    it from whatever app they already use — Google, Apple, Outlook, Yahoo,
    Thunderbird, all the same URL. That is the entire feature.

    Which means we already own the hard half: `lib/share-token.ts` mints exactly
    this kind of credential for the public quote page, and `/q/[token]` is
    already the pattern. A calendar feed is one public route that renders
    `Visit` rows as ICS.

    Four constraints worth copying, because each is an honesty decision:

    - **One-way, out only.** Their Jobber appointments appear in the calendar
      app; personal appointments never come back the other way. Two-way sync
      means conflict resolution, and conflict resolution on somebody's work
      schedule means occasionally deleting a job.
    - **A bounded window: 2 weeks back, 20 weeks forward** from when the app
      pulls. Which is the same reason the recurrence generator has a horizon —
      an open-ended recurring contract has infinitely many visits, and a feed
      is not the place to discover that.
    - **Not real-time, and it says so.** The refresh cadence belongs to the
      calendar app, not to us: Google pulls roughly every 12 hours, Apple as
      often as every 5 minutes. A product that implies live sync over a
      subscription feed is lying about somebody's Tuesday.
    - **A per-feed choice of what to include** — visits, requests, reminders,
      unassigned items, items assigned to everyone. The same shape as the
      quote's four client-view checkboxes: the contractor decides how much of
      their day leaves the building.

    Google also caps a subscribed calendar at 1,111 items and pauses the sync
    past it, which is a real cap for a lawn contractor with 26 visits a client.
    The bounded window is what keeps us under it.

### Phase 5 — Invoices & manual payments
34. ✅ `Invoice` + `InvoiceLineItem`, built from the accepted quote's line items
    (2026-07-31). `lib/invoice/from-quote.ts` is the one place that decides what
    crosses: required work, plus optional lines the homeowner *ticked*, plus the
    prose — never a declined upsell, and never a cost column, because
    `InvoiceLineItem` has nowhere to put one.

    **Two constraints in the pre-existing schema were wrong and were changed
    before any code read them.** `quoteId` was `String @unique`:

    - **Unique** forbade item 35's own 50/50 draws — one approved quote has to
      become two invoices. The duplicate guard it was really doing moved into
      `createInvoiceFromQuoteAction`, which *can* tell a second draw from a
      double-click where an index cannot.
    - **Required** meant a job nobody quoted could never be billed, which kills
      the $450 flashing repair the front-door rule exists for, and leaves
      recurring visit-based billing nowhere to go.

    Also: `Invoice.job` had no opposite relation on `Job`, so the schema did not
    validate at all — the models had been written but never wired up.
34b. ✅ **Billing address** (2026-08-02), separate from the property address,
    plus the "billing address is the same as the property address" default
    Jobber uses. Six nullable columns on `Invoice` itself — null means "same
    as the property," the same idiom `Property.taxRateId` uses for "use the
    company default" — set only once a contractor unchecks the box on the
    invoice. See `lib/invoice/billing-address.ts`. The matching UI for a
    client's *second* property ("Add Another Address") still lands with the
    client detail page in Phase 2, unrelated to this.
35. ✅ Deposit / progress / final draws (2026-08-02) — the **ad hoc** version,
    not a named `InvoiceSchedule`: a contractor picks $ or % at the moment
    they raise each draw off an approved quote, as many times as the job
    needs. `lib/invoice/draw.ts`'s `resolveDraw` enforces that the sum of every
    non-void invoice against a quote can't exceed the quote total — this
    replaced the old single-invoice-per-quote guard in
    `createInvoiceFromQuoteAction`, since more than one live invoice per quote
    is now the normal case.
36. ✅ `/i/[token]` public invoice view, same token machinery as Phase 3
    (2026-07-31). `shareUrl` became `shareUrl(kind, token, origin)` over a path
    map, which also retired `schedule/page.tsx`'s `.replace("/q/", "/calendar/")`.
    `/i/(.*)` had to be added to `proxy.ts` — caught by actually loading the
    page, not by the build.

    Unlike the quote page there is **no interactive island**: a quote is a form
    wearing a document's clothes, an invoice is settled. No way to pay, either,
    until 5b — a payment page that cannot take a payment is worse than none.
37. ✅ `InvoicePayment` with manual recording — cheque, e-transfer, cash,
    card-offline — date, method, reference, partial payments (2026-07-31). A row
    per payment, not a column: a deposit in March and a balance in May are two
    facts with two dates. **Overpayment is representable and the balance is
    allowed to go negative** — a homeowner who rounds $1,847.30 up to $1,850 is
    owed $2.70, and clamping that to a tidy zero hides it.

    Method-agnostic as asked: `PaymentMethod` carries `STRIPE` from day one so
    5b's webhook needs no migration, and `MANUAL_PAYMENT_METHODS` — the list a
    human may pick from — is deliberately shorter than the enum, so nobody can
    hand-record a payment we never processed.
38. ✅ Balance tracking and overdue detection (2026-07-31); reminder emails
    (2026-08-02). `lib/invoice/balance.ts` derives status from the money, and
    only DRAFT and VOID — the two a person chooses — outrank the arithmetic.
    Late beats part-paid, because the late half is the half to act on. OVERDUE
    is the one status that rots with nothing but the clock, so
    `sweepOverdueInvoices` settles it on an indexed `updateMany` when `/invoices`
    is opened, rather than on a cron whose failure is silent and whose absence
    locally makes the status untestable by hand.

    New capabilities `editInvoice` / `sendInvoice` / `recordPayment` are
    **OWNER and ADMIN only**. Quoting is the estimator's and selling is sales';
    billing and taking payment are the office's. Deny-by-default means widening
    that is one line and a decision.

    Reminder emails run from `/api/cron/invoice-reminders`, spaced by
    `lib/invoice/reminders.ts`'s `REMINDER_INTERVAL_DAYS` (7) against a new
    `Invoice.lastReminderSentAt`. One template now, not two — `invoiceEmailHtml`/
    `Text` moved to `lib/invoice/email-templates.ts` and take an `intro` sentence,
    so the first send and every reminder share the same HTML rather than
    drifting apart. New `ActivityKind.INVOICE_REMINDER_SENT` — every phase writes
    `ActivityEvent`, an automated send is no exception.

### Phase 5b — Stripe (2026-08-02, verified live in test mode) — confirmed 2026-07-26
Two separate Stripe products, and keeping them separate is the point:
**Stripe Billing** for Aernova's own subscription revenue, where we are the
merchant; **Stripe Connect** for contractor invoices, where the homeowner pays
the *contractor* directly. Their money never lands in our account, so we hold
no funds to reconcile, their chargebacks are theirs, and we are not merchant
of record for roofing work.

**No application fee for the MVP** (2026-08-02) — a contractor keeps 100% of
what Stripe doesn't take. `application_fee_amount` is a per-charge parameter,
not a stored column, so turning one on later needs no migration.

39. ✅ Stripe Checkout on the public invoice page + `/api/webhooks/stripe`
    writing an `InvoicePayment` of method "stripe" (2026-08-02). A **direct
    charge** — the Checkout Session is created with the `stripeAccount`
    request option against the connected account, not
    `transfer_data.destination` — so the money never touches an
    Aernova-controlled balance even transiently. The Pay button charges
    `invoiceBalance().balanceCents` as a single line, the same
    one-line-item-for-what's-owed shape item 35's draws use, not a
    re-itemized breakdown. Idempotent by a unique
    `InvoicePayment.stripePaymentIntentId`, since Stripe redelivers webhooks.
    **Verified live in test mode**: real Express account onboarded, real
    Checkout Session, paid with Stripe's `4242` test card, webhook recorded
    the payment and the invoice flipped to PAID — all in one pass.
40. ✅ Per-company Stripe Connect accounts (2026-08-02) — **Express**, so
    Stripe hosts the KYC form (same "Verification by Stripe" flow Jobber
    itself uses) rather than Aernova building it. `Company.stripeAccountId`
    plus three cached flags (`stripeChargesEnabled`/`stripePayoutsEnabled`/
    `stripeDetailsSubmitted`) mirror Stripe's own `account.updated` webhook,
    kept in sync by both the webhook and a "resync on view" read on
    `/settings` — same reasoning `sweepOverdueInvoices` already uses for a
    fact a background process might not have caught up on. New
    `manageBilling` capability in `lib/permissions.ts` — **owner only, not
    admin**, the first capability where the two roles diverge in this app,
    matching Jobber's own "only account owners can update bank account
    information." **Verified live in test mode**: a real Express account was
    onboarded through this settings page end to end, same session as item 39.

### Phase 6 — Pipeline & follow-up
41. ✅ Pipeline board over Request and Quote stages, drag to advance, salesperson
    assignment. Jobber charges extra for this; including it is a wedge.

    **Foundation built 2026-08-02**: `/pipeline`, one board over both models —
    confirmed with the user rather than guessed, since Request and Quote don't
    share a status enum. `lib/pipeline.ts`'s `stageForRequest`/`stageForJob`
    line them into seven ordered stages (Lead → Assessing → Draft → Awaiting
    response → Opened → Changes asked for → Won), reusing
    `lib/client-lifecycle.ts`'s existing `isWonJobStatus` for the Won signal
    rather than inventing a second one. Drag-and-drop is native HTML5 (no
    library), the same `DraggableVisit`/`DropDay` pattern `/schedule` already
    shipped, with the same accessible fallback: every draggable card also has
    a focusable "Move" button opening a `<dialog>`, because native drag has no
    keyboard story of its own. Every drop calls a **pre-existing** action —
    `updateRequestStatusAction`, `shareQuoteAction`, `markQuoteApprovedAction`
    — nothing new was written to make a card move.

    **Lost column added 2026-08-03**, by item 42 below, once `REJECTED` had a
    writer to give it one.

    **Salesperson assignment completed 2026-08-03**, closing this item out.
    `Request.assignedToId`/`Job.assignedToId`, both nullable FKs to `User`
    (`onDelete: SetNull` — a departed teammate clears the assignment rather
    than blocking their removal). Confirmed with the user rather than
    guessed on two open questions: assignment lives on `/pipeline` **only**
    (no picker on `/requests`, `/jobs`, or their detail pages — smallest,
    most focused change), and anyone with `editJob` can be assigned (not a
    narrower "SALES/ESTIMATOR only" set) — the same capability that already
    gates moving a card, reused rather than inventing a second permission
    tier. `app/(dashboard)/pipeline/actions.ts` is the one write path
    (`assignRequestSalespersonAction`/`assignJobSalespersonAction`), and it
    re-checks the target user's role server-side so the picker can never
    hand a deal to someone the write would then refuse.
    `convertRequestToJobAction` carries `assignedToId` across, same doctrine
    as `clientId`/`propertyId` — converting copies over everything already
    known rather than resetting ownership to unassigned.
    On the board itself, the picker is a plain native `<select>` — no cyan,
    per the Readout Rule (a name is not a reading) — that fires on change
    with no separate submit, and sits **outside** the draggable card body
    entirely rather than nested inside it: a `<select>` inside a
    `draggable="true"` region fights the browser over whether a click opens
    the dropdown or starts a drag. A read-only role (`VIEWER`) sees the name
    or "Unassigned" as plain text instead of a control it couldn't use
    anyway — absent interactivity, not disabled, same reasoning
    `QuoteSharePanel` already documents for its own buttons.
    **Verified**: 303/303 tests, tsc, lint, and a production build all
    clean. Not yet checked live in a browser.
42. ✅ Won/lost outcome capture with reasons, feeding a win-rate view
    (2026-08-03). `QuoteStatus.REJECTED` gets its first writer:
    `markQuoteDeclinedAction`, the mirror image of
    `markQuoteApprovedAction` — same "recorded, not clicked" shape, same
    refusal to overwrite an answer already on record — but **roofer-only** by
    deliberate choice: there is no public, homeowner-facing decline, because a
    "no" arrives the way most of these actually do, a call or a driveway
    conversation, not a click. The reason is a closed set,
    `QuoteDeclineReason` (Price / Went with another contractor / Bad timing /
    No longer needed / Other) — same doctrine as `ActivityKind`: a free-text
    reason can't be counted, and a win-rate view is exactly the thing that
    counts it. Surfaced from two places: a small reveal-on-click form beside
    the existing "mark it approved" phone-call button on the quote page, and
    a **Lost** column on `/pipeline` — any live quote stage can now be
    dropped there, opening a dialog for the reason first rather than firing
    on drop, since (unlike every other transition on that board) this one
    needs a fact collected before it can write anything. Lost absorbs two
    different kinds of loss on one column: a declined or expired quote
    (`stageForJob`), and a `Request` closed without ever becoming one
    (`stageForRequest`) — the latter with no reason, since `Request` has no
    field for one. Fixed in passing: `advanceCard`'s request branch was
    sending the pipeline's own stage name (`"LEAD"`) as a `RequestStatus`
    straight through, which isn't a valid value (the real one is `NEW`) —
    `requestStatusForStage` is the mapping that should have been there from
    item 41. New `/reports` page reads it back: win rate as the one cyan
    reading on the surface (the Readout Rule — a second cyan number would
    fight the first), a reason breakdown as rows, scored per *quote* rather
    than per job so a job re-quoted after a decline keeps both decisions
    instead of the second erasing the first. **Verified**: 295/295 tests,
    tsc, lint, and a production build all clean.
43. ✅ Follow-up reminders on quotes that went quiet (cron + email)
    (2026-08-03). `app/api/cron/quote-reminders/route.ts` mirrors item 38's
    `invoice-reminders` route line for line — same `CRON_SECRET` auth, same
    "one failure doesn't stop the other forty" shape, point a scheduler at
    it daily. `lib/quote/reminders.ts`'s `needsQuoteReminder` is the spacing
    rule, and it needs two gaps where the invoice side only needed one: an
    invoice's `OVERDUE` status already means "late" the moment it's set, but
    a quote's `SENT` status means nothing about elapsed time — "sent a
    minute ago" and "sent two weeks ago" look identical. So the first nudge
    waits out `QUOTE_QUIET_DAYS` (3) from `sentAt` before silence reads as
    silence, and only then does the familiar `QUOTE_REMINDER_INTERVAL_DAYS`
    (7, same cadence as invoices) cadence take over, tracked in a new
    `Quote.lastReminderSentAt` column, same role as `Invoice`'s. New
    `QUOTE_REMINDER_SENT` on `ActivityKind`.
    Pulled `quoteEmailHtml`/`quoteEmailText` out of `send-actions.ts` (where
    they were private to `sendQuoteEmailAction` alone) into
    `lib/quote/email-templates.ts`, parameterized on an `intro` line — same
    "one template, not two" doctrine `lib/invoice/email-templates.ts`
    documents — so the cron and the manual "Email it to them" button share
    one HTML rather than growing a second copy to drift from. The follow-up's
    intro leads with elapsed time ("sent 4 days ago"), not a repeat of the
    price, since a quote has no due date to be late against the way an
    invoice does. **Verified**: 303/303 tests, tsc, lint, and a production
    build all clean.

### Phase 7 — Client Hub
44. ✅ `/hub/[clientToken]` — one link showing all of a homeowner's quotes,
    invoices, visit history, and their roof report with photos and the 3D model
    (2026-08-04). Token-based, consistent with Phase 3.

    Two scope questions confirmed with the user rather than guessed, since
    both change the schema: **per-client, not per-job** — `Client.shareToken`
    aggregates every job a repeat customer has, not one link per job — and
    the roof gets a **full read-only 3D viewer**, not a static image or a
    deferred fast-follow, because an interactive model is close to Aernova's
    actual wedge (PRODUCT.md: "drone-to-proposal in one place").

    `lib/client-hub.ts` is the one place that decides what's safe to put on
    a page with no login: `shareableQuotes`/`shareableInvoices` gate on
    **having a `shareToken`** (the same "has this been sent" test
    `canDeleteQuote` already uses) rather than a status list that could
    drift, and cost/margin never enters the file at all —
    `lib/report-view-model.ts`'s `pricingSummary` (material/labour/accessory/
    disposal cost, rendered on the *authenticated* `print-report.tsx` for the
    contractor's own estimating reference) is deliberately never imported
    here, same "never client-visible under any setting" rule the quote
    builder already enforces. The hub links out to a quote's/invoice's own
    existing public page rather than re-rendering either — one document, one
    place it lives.

    `components/public/hub-model-viewer.tsx` is a new, much smaller sibling
    to `measure-viewer.tsx`: the same GLTFLoader/DRACOLoader/OrbitControls
    core, orbit/pan/zoom only, none of the authoring tool's BVH raycasting,
    draft points, or undo stack. **The live check caught a real bug before
    ship**: a stored model asset URL is one of two shapes — a plain
    `/uploads/...` static path, or `/api/jobs/.../download?asset=...`, a
    proxy that (like every other `/api/jobs/*` route) sits behind the
    session Clerk's middleware requires. `phase-six-workflow.tsx`'s own
    glbUrl check only tests for a leading `/` — harmless there, since it only
    ever renders for a signed-in contractor — but the same check on this
    page would have pointed an anonymous homeowner's browser at a URL it
    can't authenticate to, and the model would have silently failed to load
    for most real jobs. `hubModelGlbUrl` now requires the `/uploads/` prefix
    specifically. Confirmed live: a real reconstructed model loads, orbits,
    and zooms correctly from a public, token-only tab.

    New `/clients/[clientId]` — didn't exist before item 44 needed somewhere
    to host the link (create/copy/preview/turn off, same shape as
    `QuoteSharePanel`) — kept deliberately small: client identity, properties,
    a list of jobs, not a second client editor.

    **Verified**: 312/312 tests, tsc, lint, and a production build all
    clean, plus a live pass — model viewer, measurements, quotes (with
    correct status/link-out), and the empty state all confirmed in a real
    browser tab with no session.
45. ✅ Public request-a-quote form → creates a `Request` and a LEAD client
    (2026-08-04). `/request/[companySlug]` — `Company.slug` is the
    credential, permanent from signup and unused anywhere else in the app
    until now, so unlike every other public door there is no "create the
    link" step.

    Two decisions confirmed with the user rather than guessed: an **exact
    email match** attaches a repeat inquiry to the existing client instead of
    spawning a duplicate lead, and the form gets a **honeypot + a soft
    resubmit guard**, not nothing and not a CAPTCHA. Both are deliberately
    narrower than they could be. The email match is exact only — never the
    fuzzy name/address matching `lib/client-resolve.ts` already has for the
    office job form, because that file's own rule is "a possible duplicate
    client is a question, never a decision," answered by a person looking at
    a suggestion, and this form has nobody in that loop to ask. The resubmit
    guard only fires once a client is already matched by email, for the same
    reason — there's nothing to compare a brand-new lead's timing against.
    `lib/public-request.ts` holds both as pure, tested functions.

    **The live check found the same class of bug twice.** `/request/*` was
    missing from `proxy.ts`'s public-route list, so the form redirected to
    `/sign-in` for anyone without a session — which is everyone it's for.
    Checking turned up that **item 44's `/hub/*` had the identical gap**,
    silent through that item's own live check because the tab doing the
    testing was already signed in as the contractor, so `auth.protect()`
    never actually ran against it. Both are fixed now; `curl` with no cookies
    confirms `/request/[companySlug]` returns 200 and `/hub/[bad-token]`
    returns a real 404, neither redirecting to sign-in. The lesson for any
    future public route: a same-browser live check that's signed in from
    earlier work in the session proves the page renders, not that it's
    actually reachable without one — that needs a cookie-free check
    (`curl`, or this bug stays invisible until a real homeowner hits it).

    Confirmed live end to end: a real submission creates the `Client` and
    `Request` and shows up on `/requests` immediately; a honeypot-filled
    submission shows the identical "thanks" message but writes nothing; a
    second submission from the same email within the window attaches to the
    same client and does not create a second `Request`. New
    `RequestFormLinkPanel` on `/settings` surfaces the link — simpler than
    `CalendarFeedPanel`'s or any share panel's create/copy/turn-off cycle,
    since there's nothing to mint.

    **Verified**: 316/316 tests, tsc, lint, and a production build all
    clean, plus the live pass above.

### Phase 8 — Insights & job costing
46. ✅ **`JobExpense`** (2026-08-05) — a ledger of what a job actually cost,
    the counterpart to `QuoteLineItem.unitCostCents`'s "what it was quoted to
    cost." Confirmed with the user rather than guessed: a **full expense
    ledger**, not a narrower "derive labour from Visit hours, log materials by
    hand" split. `Visit.startAt`/`endAt` exist on every visit including
    all-day ones, but an all-day visit's times are UTC midnight of the
    calendar square (`lib/schedule/day.ts`), not real worked hours — deriving
    labour cost from them would have been precise-looking and wrong. A ledger
    sidesteps that gap instead of forcing automatic derivation onto data that
    often isn't there.

    Four categories — MATERIALS / LABOUR / EQUIPMENT / OTHER — a closed set,
    same doctrine as `ActivityKind`: a free-text category can't be summed into
    a breakdown, and a cost breakdown is the whole point. LABOUR is the one
    shape that isn't a bare amount: `hours × hourlyRateCents`, computed once
    at creation and stored alongside the amount (`Company.defaultLabourRateCents`
    seeds the rate field, never applied retroactively — the same "frozen at
    the moment it was written" rule a quote's own catalog pricing follows).

    A ledger of rows rather than a running total on `Job`, same reasoning as
    `InvoicePayment`: a materials run in March and a dump-fee receipt in April
    are two facts with two dates.

    **`manageJobCosts`** is a new capability, office-tier like `editQuote`
    rather than `editInvoice`'s narrower OWNER/ADMIN-only tier — costing a job
    is the estimator's business the way quoting it is; invoicing stays the
    office's alone. Crew hold neither `viewMoney` nor `manageJobCosts`: a cost
    entry is money data, and "crew never see cost or margin" already covers
    it without a new carve-out.

    `lib/job-costing.ts` is the pure arithmetic (quoted cost via
    `computeTotals().costCents` — not reimplemented, since that file already
    knows to skip a declined optional line — actual cost, variance, category
    breakdown, actual profit). Surfaced as a new **Costs tab** on the job page
    (`JobExpensesPanel`), visible wherever the Quote tab already is
    (`viewMoney`), with the log-a-cost form itself gated one tier narrower
    (`manageJobCosts`) so a salesperson can read the variance but not write to
    it. 9 tests in `tests/job-costing.test.ts`.

47. ✅ **Two new report pages** (2026-08-05) — `/reports/revenue` and
    `/reports/aged-receivables`, joined to the existing win-rate report by a
    new `ReportsNav` sub-nav rather than three unrelated sidebar entries; the
    sidebar's own comment already warns against exactly that kind of nav
    bloat.

    **"Revenue" means invoiced, not collected** — confirmed with the user
    rather than guessed. The sum of what was billed (non-DRAFT, non-VOID
    invoices) in the period, matching how a contractor already thinks about a
    sent bill; the gap between billed and collected is what
    `/reports/aged-receivables` exists to answer instead. `/reports/revenue`
    has no cyan figure competing with anything — it's the only reading on its
    own surface, same Readout Rule the win-rate page already established.

    Revenue by lead source and by job type both fall out of data the schema
    already had (`Client.leadSource` since Phase 2, `Job.type` since Phase 1)
    — no new columns. The lead funnel reuses `lib/pipeline.ts`'s existing
    seven stages rather than inventing a second funnel model; it counts what
    `/pipeline` already knows how to bucket. Profit per job billed in the
    period is billed-less-actual-cost via item 46's ledger, **not** windowed
    to the period on the cost side — a job is often costed after the invoice
    that paid for it goes out, and slicing cost to the same window would
    understate it.

    **Aged receivables deliberately has no date-range filter** — unlike every
    other report page. An invoice overdue since March is still owed today,
    and a range that hid it from the list would be a range that lies about
    what's outstanding. Buckets (not yet due / 1–30 / 31–60 / 60+ days
    overdue) are built on `lib/invoice/balance.ts`'s existing overdue
    arithmetic rather than a second implementation of "is this late."

    `lib/reports/revenue.ts` and `lib/reports/aged-receivables.ts` are both
    pure and tested (6 tests each) — rows in, figures out, same doctrine as
    `lib/quote/totals.ts`.

**Also found and fixed the same session (2026-08-05):**
`components/dashboard/operations-overview.tsx`, live on `/dashboard`, was
found during this phase's verification pass to be pre-pivot scaffolding that
survived the whole CRM rebuild undetected: it fabricated "Gross Profit" and
"Gross Margin" as a hardcoded 38%/34% split of quoted value (exactly the kind
of false precision `PRODUCT.md` names as a liability the contractor absorbs),
duplicated the real Phase 6 `/pipeline` board with a dead `JobStatus` kanban,
and was a second reader of the deprecated `Job.clientName`/`clientPhone`
columns Phase 1A documents `lib/job-identity.ts` as the sole reader of.
Removed outright rather than patched — nothing in it survived scrutiny, and a
hollowed-out one-tile remainder would have been worse than no component.

### Phase 9 — Growth & AI
48. Review requests after completion, referral tracking.
49. AI capture: photo or voice note → drafted job with a suggested service line
    and a price from catalog history. Extends `lib/ai/` + `roof-context.ts`.
50. AI scope-of-work drafting from measurements and past accepted quotes;
    follow-up drafting for stale quotes.

---

## Sequencing notes

- Phase 1 is a prerequisite for everything. Nothing else starts until the split
  and its backfill are verified.
- Phase 2 is small, high-visibility, and unblocks the customer conversation that
  started this pivot. It ships before quotes on purpose.
- Phase 4 is roughly the size of Phases 2, 3 and 5 combined. Recurrence and crew
  roles are the two parts that cannot be deferred without a later rewrite; the
  map view and offline capture can be.
- Phase 5 depends on Phase 3 (invoices need line items) and Phase 0 (cents).
- Every phase writes `ActivityEvent`, which is why it was Phase 0.

## Design constraints

`PRODUCT.md` and `DESIGN.md` still govern every surface. Two things get harder
with a horizontal product and must not slip:

- **Trade vocabulary.** The rule (settled 2026-07-27): **a trade word is allowed
  inside a module-gated surface, and nowhere else.** `measure-viewer.tsx`,
  `phase-six-workflow.tsx` and the roof-face sections of the job page render only
  when the roofing module is on, so an electrician never reads them and they may
  say "roof" freely. Routing forty such strings through a pack would be ceremony
  nobody sustains.

  The core surfaces are the ones that leak, and there are six: the new-job
  headline, the dashboard subhead ("your roofing workspace"), the sidebar tagline
  ("Roofing intelligence platform"), both layout `description`s, and
  `proposal-editor.tsx`'s default title "Roofing proposal".

  Most of those want the word **deleted**, not translated — "Add a new job" is
  correct in every trade. `lib/trade-copy.ts` (keyed by `Trade`, resolved once
  from `Company.trade` at the server boundary) exists only for the few where a
  trade word earns its place. The admission test: **if the `GENERAL` value reads
  fine, the string does not belong in the pack.** That keeps it near eight keys
  rather than two hundred.

  Photogrammetry vocabulary never appears anywhere.
- **The crew surface is a different user.** A crew member on a phone, outdoors,
  in gloves, is not the office user `DESIGN.md` was written for. Larger targets,
  higher contrast, fewer choices per screen. WCAG 2.2 AA remains the floor.
