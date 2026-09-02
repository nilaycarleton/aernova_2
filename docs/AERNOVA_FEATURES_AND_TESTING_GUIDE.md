# Aernova — Complete Feature & Manual Testing Guide

## 1. Purpose

This document is the definitive, current-state manual QA guide for Aernova. It exists so a
business owner, a new developer, or a tester can open the running app and systematically work
through every implemented feature, top to bottom, without reading the implementation code first.

**How this was built.** Every feature listed here was verified against the actual repository —
routes, Prisma schema, server actions, components, and library code were read directly, not
inferred from planning documents or route names. Where a planning document (`docs/PLAN-CRM.md`,
`docs/AERNOVA_PROJECT_WORKFLOW/*`) says a feature exists, that claim was checked against real
code before being written here. Several planning documents describe features at different points
in the project's history — some say "not built" for things later phases actually completed;
some implementation records describe a state that was later changed. **Documentation was treated
as evidence, not as fact.** Current code and current tested behavior are the source of truth for
"what Aernova has today."

Anything that is planned but not yet implemented in real code is explicitly excluded from the
feature sections below and instead listed in the **Planned / Not Current Features** appendix at
the end. Workflow Phase 13 (stage reordering, a usage checkpoint, a custom-stage schema) is
planning-only as of this audit — its own plan document exists, but no code in the repository
reorders or adds custom job stages beyond renaming/enabling/disabling the fixed `JobStatus` flow.
Where this guide says a feature is current, it is current; where it is planned, it says so
explicitly and does not describe manual test steps for it.

**Audited:** 2026-08-17, branch `feature/astryx-integration`, commit `d0eb3a4`.

**Scope note on this pass.** This guide was written as part of the same session that migrated
Aernova's AI features from Anthropic to Google Gemini (§30 below covers the AI feature set in its
post-migration state — every AI-related step in this document reflects Gemini, not the historical
Claude implementation). No product features, workflow states, permissions, or financial logic were
changed to produce this document — it describes the product exactly as the Premium UI Redesign's
post-audit completion pass and the Aernova Project Workflow phases (1 through 12) left it.

## 2. Product at a glance

Aernova carries a job the whole way from first contact to paid invoice:

**Request → Quote → Job/Schedule → Production → Invoice → Paid**

A homeowner (or the office, on their behalf) submits a **Request**. The office turns a promising
request into a **Job** and, once the scope is understood, a **Quote**. Once approved, the job is
**Scheduled** — a single **Visit** for one-off work, or a series of visits under a
**RecurrenceRule** for repeating work (lawn care, maintenance contracts). Crew work the visits from
`/today`; the office tracks progress and, once satisfied via the **Quality Check** gate, marks the
job **Completed**. An **Invoice** (from the quote, from a progress draw, or billed directly as
**Additional Work**) collects payment — online via Stripe, or recorded manually. A **Warranty** can
close out the job. Every step along the way writes an **ActivityEvent**, visible on the job's own
timeline.

**Roofing is an optional, specialized module on top of this core**, not the whole product. A
company picks a `Trade` (Roofing, Plumbing, Lawn Care, General) at onboarding, which selects its
starter price list and (for roofing) unlocks a real technical pipeline: drone imagery in,
photogrammetric 3D reconstruction, automatic roof-facet measurement, a manual 3D measurement
editor, and quote-from-measurement. A plumbing or lawn-care company uses the identical core
workflow with none of that roofing-specific tooling in view. **As currently implemented, every
company's job workspace shows the "Scan & measure" tab regardless of the company's chosen trade —
there is a `CompanyModule` enum in the schema (`ROOFING`, `AERIAL_MEASUREMENT`, `AI_ASSISTANT`) that
looks like it should gate this, but as of this audit it is written once at company creation and
never read anywhere to hide or show anything.** This is documented precisely because it is exactly
the kind of gap that only reading the code (not the schema comments or the product plan) reveals —
see §9's per-feature note.

Five roles exist: **OWNER**, **ADMIN**, **ESTIMATOR**, **SALES**, **VIEWER**, and **CREW** — the
one money-blind, job-scoped role, restricted to only the jobs it is actually assigned a visit on.
The full grant matrix is in `lib/permissions.ts` and is reproduced in §4 of this guide.

## 3. Test environment setup

These are the exact current commands from `package.json` and `.env.example` — nothing here is
invented.

1. **Clone/open the repo.** You should already be in `/Users/nilay/Documents/New project/aernova`
   on branch `feature/astryx-integration`.
2. **Node version.** The repo pins `"node": "24.x"` in `package.json`'s `engines` field. Run
   `node --version` and confirm it starts with `v24`.
3. **Install dependencies.**
   ```
   npm install
   ```
4. **PostgreSQL.** The repo ships a bundled local Postgres instance (not a system install).
   Start it with:
   ```
   npm run db:start
   ```
   This runs `pg_ctl` against a local `.postgres-data` directory on port `5433`. Check it's up
   with `npm run db:status`; stop it later with `npm run db:stop`.
5. **Environment variables.** Copy the template and fill in what you need:
   ```
   cp .env.example .env
   ```
   At minimum for a working dev session you need `DATABASE_URL` (the `.env.example` default,
   `postgresql://USER@localhost:5433/aernova`, works once step 4 is running — replace `USER` with
   your own Postgres role name) and a Clerk key pair (§4 below). Everything else is optional and
   degrades gracefully — see §4's table for exactly what each variable unlocks.
6. **Prisma client generation.** Runs automatically on `npm install` via the `postinstall` script
   (`prisma generate`). If you ever see a Prisma type-mismatch error, re-run it directly:
   ```
   npx prisma generate
   ```
7. **Apply the schema.** This repo uses `prisma db push` for local development (not migrations —
   see the schema's own note on `model Job`/`model Quote` about why):
   ```
   npm run db:push
   ```
8. **Seed data.** Several seed scripts exist, each independent:
   ```
   npm run db:seed                    # base seed
   npm run db:seed-catalog             # starter price list for a company (also runs automatically on first sign-in)
   npm run db:seed-warranty-templates  # built-in warranty starters (Simple/Detailed per trade)
   npm run db:seed-workflow-templates  # built-in workflow templates read by /onboarding
   ```
   For a working manual-test session, run all four once against a fresh database.
9. **Start the dev server.**
   ```
   npm run dev
   ```
   This starts Next.js (Turbopack) on `http://localhost:3000`.
10. **Sign in.** Visit `http://localhost:3000` — you'll land on `/sign-in` (Clerk-hosted-look,
    Aernova-branded page). Sign up with any email Clerk's test instance accepts. Your **first
    sign-in automatically provisions a new Company** with you as `OWNER` (see `lib/auth.ts`) and a
    starter price list for the Roofing trade — you'll then be redirected to `/onboarding` once,
    to confirm your real trade and province (§9's Account/Company section covers this in detail).
11. **Identify your seeded company.** After onboarding, `/settings` shows your company's profile.
    There is no multi-company switcher in the current UI — one Clerk user's first sign-in creates
    exactly one company, and every subsequent action happens inside it.
12. **Obtaining test IDs/share tokens safely.** Public document links (quote, invoice, change
    order, warranty, client hub, calendar feed) are minted through their own UI panels — see each
    feature's own "Manual test" section below for exactly which button mints which link. Never
    read a real token out of the database and paste it anywhere outside your own local testing —
    treat a minted local token exactly as you would a real one, since Aernova's authorization model
    treats "knows the token" as "may view/act."

## 4. Environment-variable checklist

Never put a real secret value in this table, in a commit, in a test, or in a screenshot. This
table only names variables and explains what depends on them.

| Variable | Required for | Where used | Testable without it? | Secret? | Notes |
|---|---|---|---|---|---|
| `DATABASE_URL` | Everything | Prisma client, every route | No — the app cannot start meaningfully | Yes | Local dev default points at the bundled Postgres on port 5433. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Sign-in/sign-up, all authenticated routes | `middleware`, `lib/auth.ts`, every `(dashboard)` route | No — nothing behind auth is reachable without it | Secret key: yes. Publishable key: no (it's meant to be public) | Get a free Clerk instance at clerk.com; use its test-mode keys. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Routing Clerk to the app's own branded pages | `app/(auth)/` | Yes — Clerk falls back to its own hosted pages | No | Defaults (`/sign-in`, `/sign-up`) rarely need changing. |
| `GEMINI_API_KEY` | AI photo capture, AI scope draft, AI follow-up draft, roof-assistant chat, job overview summary | `lib/ai/client.ts` and everything under `lib/ai/` | Yes — every AI control is **absent**, not disabled, without it (§30) | Yes | Get a key at `https://aistudio.google.com/apikey`. Server-only — never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SENTRY_DSN` | Production error monitoring | `sentry.*.config.ts` | Yes — Sentry is fully disabled without it, app behavior is unchanged | No (a DSN isn't a secret, though `SENTRY_AUTH_TOKEN` is) | Not needed for local manual testing. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Emailing a quote/invoice/warranty/change-order instead of only copying a link | `sendQuoteEmailAction` and siblings | Yes — the "Email it to them" button is absent; "Copy link" always works | API key: yes | Without this, every share panel still works via its link — email is additive. |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Online invoice payment, Stripe Connect onboarding | `lib/stripe*.ts`, `/settings`'s Payments section, public invoice Pay button, `/api/webhooks/stripe` | Yes — manual payment recording always works; the online-pay path and Connect settings section are simply absent | Yes | Test-mode Stripe keys need no business verification. |
| `STORAGE_DRIVER`, `S3_*` | Where uploaded photos/logos/imagery persist | `lib/storage.ts` | Yes — `local` (default) writes to `public/uploads`, fine for a dev session | Access keys: yes | Only matters for a real deploy (`public/uploads` doesn't survive Vercel's ephemeral filesystem). |
| `NODEODM_URL`, `NODEODM_TOKEN` | Real drone-photo photogrammetric processing | `lib/roof-extraction*`, the processing pipeline | Yes — without it the app uses a built-in draft model package instead of a real NodeODM worker | Token: yes | See §28 for exactly what this changes. |
| `CRON_SECRET` | Authorizing the three `/api/cron/*` routes | `app/api/cron/*` | Yes for manual testing (leave unset locally); **must** be set before any public deploy | Yes | Without it those routes are unauthenticated — a real security requirement in production, not just a nicety. |

## 5. Seed/test accounts

There is no pre-seeded multi-role account bundle in `prisma/seed.mjs` — the base seed populates
catalog/tax/workflow-template data, not Clerk users. To manually test every role:

1. **OWNER** — sign up once (§3, step 10). This is automatic; the first user in a fresh company is
   always `OWNER`.
2. **Every other role** — from `/team` (as OWNER or ADMIN), use **"Make a link"** to mint an invite
   at the role you want to test (`CREW`, `ESTIMATOR`, `SALES`, `VIEWER`, or `ADMIN` — `OWNER` is not
   an invite option, see §9.2), then open that link (`/join/[token]`) in a private/incognito
   browser window and sign up with a second email address. Repeat per role you want to test — a
   thorough permission pass needs at least one CREW and one VIEWER account alongside your OWNER
   account, since those two sit at the extremes of the permission matrix (§4 of `lib/permissions.ts`,
   reproduced below in §9.2).

The automated Playwright visual-regression suite (`tests/visual/`) uses its own separate,
scripted seed (`tests/visual/fixtures/seed-visual-test-company.mjs`) and a dedicated Clerk test
user — that seed is for the automated suite only; do not reuse its credentials for manual testing.

## 6. Feature matrix

This table is a map, not a substitute for §7 onward. "Manual test section" references the
numbered section below where the click-by-click procedure lives.

| ID | Area | Feature | Status | Role(s) | Module | Primary route | Automated coverage | Manual test section |
|---|---|---|---|---|---|---|---|---|
| ACC-1 | Account | Sign up / sign in / sign out | Implemented — user-facing | Everyone | — | `/sign-in`, `/sign-up` | Playwright `entry.spec.ts` | §9.1 |
| ACC-2 | Account | Onboarding (trade, province, workflow template) | Implemented — user-facing | OWNER/ADMIN (first sign-in) | — | `/onboarding` | — | §9.1 |
| ACC-3 | Account | Company profile | Implemented — role-gated | `manageCompany` | — | `/settings` | — | §9.1 |
| ACC-4 | Account | Starter price list & tax reset | Implemented — role-gated | `manageCompany` | — | `/settings` | — | §9.1 |
| ACC-5 | Account | Request-form link | Implemented — role-gated | `manageCompany` | — | `/settings` | — | §9.1 |
| ACC-6 | Account | Stripe Connect onboarding | Implemented — role-gated, external-config-gated | `manageBilling` (OWNER only) | Stripe key | `/settings` | — | §9.1 |
| TEAM-1 | Team | Invite / invite link | Implemented — role-gated | `manageTeam` | — | `/team` | — | §9.2 |
| TEAM-2 | Team | Accept invite | Implemented — user-facing | Anyone with a link | — | `/join/[token]` | — | §9.2 |
| TEAM-3 | Team | Remove member | Implemented — role-gated | `manageTeam` | — | `/team` | — | §9.2 |
| SHELL-1 | Shell | Desktop/mobile navigation | Implemented — user-facing | Role-filtered | — | every `(dashboard)` route | Playwright `shell.spec.ts` | §9.3 |
| SHELL-2 | Shell | Theme toggle (dark/light) | Implemented — user-facing | Everyone | — | shell header | Playwright `shell.spec.ts` (both themes) | §9.3 |
| SHELL-3 | Shell | + Create menu | Implemented — user-facing | Role-filtered per item | — | shell header | — | §9.3 |
| SHELL-4 | Shell | Notification bell | Implemented — user-facing | Everyone (content role-filtered) | — | shell header | — | §25 |
| DASH-1 | Dashboard | Action Center | Implemented — user-facing | `viewAllJobs` | — | `/dashboard` | — | §9.4 |
| DASH-2 | Dashboard | Pipeline snapshot / revenue trend | Implemented — user-facing | `viewMoney` | — | `/dashboard` | — | §9.4 |
| CLI-1 | Clients | Client list, filters, tags | Implemented — user-facing | `viewAllJobs` | — | `/clients` | — | §10 |
| CLI-2 | Clients | Quick-create client | Implemented — user-facing | `editJob` | — | shell + Create | — | §10 |
| CLI-3 | Clients | Client Hub share link | Implemented — user-facing | `editJob` | — | `/clients/[clientId]` | Playwright `public-documents.spec.ts` (hub) | §10 |
| REQ-1 | Requests | Office-created request | Implemented — user-facing | `editJob` | — | `/requests/new` | `tests/public-request.test.ts` | §11 |
| REQ-2 | Requests | Public request form | Implemented — user-facing | Public (no auth) | — | `/request/[companySlug]` | `tests/public-request.test.ts` | §11 |
| REQ-3 | Requests | Request → job conversion | Implemented — user-facing | `editJob` | — | `/requests` | `tests/request-status.test.ts` | §11 |
| PIPE-1 | Pipeline | Board (desktop drag/drop) | Implemented — user-facing | `editJob`/`editQuote` (move-gated) | — | `/pipeline` | `tests/pipeline.test.ts` | §11 |
| PIPE-2 | Pipeline | Mobile stage list | Implemented — user-facing | Same | — | `/pipeline` | Playwright `pipeline.spec.ts` | §11 |
| JOB-1 | Jobs | New Job (full form) | Implemented — user-facing | `editJob` | — | `/jobs/new` | Playwright `jobs.spec.ts` | §12 |
| JOB-2 | Jobs | Quick Job (minimal) | Implemented — user-facing | `editJob` | — | `/jobs/quick` | — | §12 |
| JOB-3 | Jobs | AI photo capture → job | Implemented — user-facing, AI-gated | `editJob` + `GEMINI_API_KEY` | — | `/jobs/capture` | `tests/ai-capture.test.ts` | §12, §30 |
| JOB-4 | Jobs | Job workspace (status stepper, tabs, gaps) | Implemented — user-facing | Role-scoped visibility | — | `/jobs/[jobId]` | Playwright `jobs.spec.ts` | §12 |
| JOB-5 | Jobs | Workflow customization (rename/enable/disable stages) | Implemented — role-gated | `manageCompany` | — | `/settings/workflow` | `tests/workflow-stages.test.ts` | §13 |
| JOB-6 | Jobs | Pre-construction checklist | Implemented — role-gated, non-blocking | `editJob` | — | job workspace | — | §14 |
| JOB-7 | Jobs | Job costing (expenses vs. quote) | Implemented — role-gated | `manageJobCosts` | — | job workspace | — | §12 |
| SCHED-1 | Scheduling | One-off & recurring visits | Implemented — user-facing | `manageSchedule` | — | `/schedule` | — | §15 |
| SCHED-2 | Scheduling | Calendar feed (.ics) | Implemented — user-facing | `manageCompany`(mint)/anyone(subscribe) | — | `/settings`, `/calendar/[token]` | — | §15 |
| FIELD-1 | Field | Today / crew visit completion | Implemented — role-gated | `completeVisit`, `submitFieldEvidence` | — | `/today` | Playwright `field.spec.ts` | §16 |
| QUAL-1 | Quality | Quality check gate | Implemented — role-gated, blocking | `submitFieldEvidence` + `completeQualityCheck` | — | job workspace | — | §16 |
| QUO-1 | Quotes | Quote builder (full) | Implemented — user-facing | `editQuote` | — | job workspace → Quote tab | `tests/quote-*.test.ts` | §17 |
| QUO-2 | Quotes | Send / public view / approve / decline | Implemented — user-facing | `sendQuote` (send); public (view/approve) | — | `/q/[token]` | Playwright `public-documents.spec.ts` | §17 |
| QUO-3 | Quotes | AI scope draft / AI follow-up draft | Implemented — user-facing, AI-gated | `editQuote`/`sendQuote` + `GEMINI_API_KEY` | — | Quote tab | `tests/ai-scope-draft.test.ts` | §17, §30 |
| CO-1 | Change Orders | Create/send/approve | Implemented — user-facing | `editQuote`/`sendQuote` | — | job workspace | — | §18 |
| ADD-1 | Additional Work | Below/at-threshold billing | Implemented — user-facing | `editInvoice` | — | job workspace | — | §19 |
| INV-1 | Invoices | Create / send / public view | Implemented — user-facing | `editInvoice`/`sendInvoice` | — | `/invoices`, `/i/[token]` | Playwright `business.spec.ts` | §20 |
| PAY-1 | Payments | Manual payment recording | Implemented — user-facing | `recordPayment` | — | invoice detail | — | §21 |
| PAY-2 | Payments | Online Stripe payment | Implemented — user-facing, external-config-gated | Public (pay); `manageBilling` (connect) | Stripe key | `/i/[token]` | — | §21 |
| WAR-1 | Warranty | Create/send/acknowledge | Implemented — user-facing | `editJob`(create/send); public(acknowledge) | — | job workspace, `/w/[token]` | Playwright `public-documents.spec.ts` | §22 |
| REP-1 | Reports | Revenue, aged receivables, internal job report | Implemented — user-facing | `viewMoney` | — | `/reports/*`, `/jobs/[jobId]/report` | Playwright `business.spec.ts` | §23 |
| ACT-1 | Activity | Job timeline | Implemented — user-facing | Role-scoped | — | job workspace | — | §24 |
| NOTIF-1 | Notifications | Bell, unread count, cron reminders | Implemented — background/user-facing | Role-filtered | — | shell header, `/api/cron/*` | — | §25 |
| HUB-1 | Public | Client Hub | Implemented — user-facing | Public (token) | — | `/hub/[clientToken]` | Playwright `public-documents.spec.ts` | §10, §26 |
| ROOF-1 | Roofing | Imagery upload → processing → model | Implemented — user-facing, NOT module-gated (see §2, §9) | `editJob` | (should be) AERIAL_MEASUREMENT | job workspace → Scan tab | Playwright `viewer.spec.ts` | §28 |
| ROOF-2 | Roofing | 3D viewer, manual measurement | Implemented — user-facing | `editJob` | (should be) AERIAL_MEASUREMENT | job workspace → Scan tab | `tests/viewer-*.test.ts` | §29 |
| AI-1 | AI | Photo capture, scope draft, follow-up draft, chat, job summary | Implemented — user-facing, AI-gated (Gemini) | Varies per feature | `GEMINI_API_KEY` | See §30 | `tests/ai-*.test.ts` | §30 |

## 7. Roles reproduced from `lib/permissions.ts`

This is the authoritative, current capability matrix. Every "who can use it" line elsewhere in this
guide is a restatement of this table — if the two ever disagree, trust `lib/permissions.ts` itself,
not this document.

| Capability | OWNER | ADMIN | ESTIMATOR | SALES | VIEWER | CREW |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `viewMoney` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `viewAllJobs` | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `editJob` | ✓ | ✓ | ✓ | ✓ | — | — |
| `editQuote` | ✓ | ✓ | ✓ | ✓ | — | — |
| `sendQuote` | ✓ | ✓ | ✓ | ✓ | — | — |
| `editInvoice` | ✓ | ✓ | — | — | — | — |
| `sendInvoice` | ✓ | ✓ | — | — | — | — |
| `recordPayment` | ✓ | ✓ | — | — | — | — |
| `deleteJob` | ✓ | ✓ | — | — | — | — |
| `deleteQuote` | ✓ | ✓ | — | — | — | — |
| `deleteInvoice` | ✓ | ✓ | — | — | — | — |
| `deleteClient` | ✓ | ✓ | — | — | — | — |
| `deleteRequest` | ✓ | ✓ | — | — | — | — |
| `manageSchedule` | ✓ | ✓ | ✓ | — | — | — |
| `completeVisit` | ✓ | ✓ | ✓ | — | — | ✓ |
| `submitFieldEvidence` | ✓ | ✓ | ✓ | — | — | ✓ |
| `completeQualityCheck` | ✓ | ✓ | ✓ | — | — | — |
| `manageTeam` | ✓ | ✓ | — | — | — | — |
| `manageCompany` | ✓ | ✓ | — | — | — | — |
| `manageBilling` | ✓ | — | — | — | — | — |
| `manageJobCosts` | ✓ | ✓ | ✓ | — | — | — |

**CREW is additionally job-scoped**, not just capability-scoped: even for `completeVisit` and
`submitFieldEvidence`, a CREW member can only reach a job they are actually assigned a visit on
(`jobScopeForRole()` in `lib/permissions.ts`) — this is enforced in every query that lists jobs for
a CREW user, not just hidden in the UI.

## 8. Navigation reference

The entire shell (desktop side nav, mobile bottom nav, mobile "More" drawer, and the page-identity
title in the top bar) reads from one file, `lib/shell-nav.ts` — there is no second, hand-maintained
nav list anywhere else. Every item below is filtered per-role by the capability in the "Needs"
column; an item with no "Needs" is visible to every authenticated role including CREW.

| Group | Label | Route | Needs |
|---|---|---|---|
| Work | Today | `/today` | — |
| Work | Dashboard | `/dashboard` | `viewAllJobs` |
| Work | Jobs | `/jobs` | `viewAllJobs` |
| Work | Schedule | `/schedule` | — |
| Pipeline | Requests | `/requests` | `viewAllJobs` |
| Pipeline | Pipeline | `/pipeline` | `viewAllJobs` |
| Relationships | Clients | `/clients` | `viewAllJobs` |
| Business | Quotes | `/quotes` | `viewAllJobs` |
| Business | Invoices | `/invoices` | `viewMoney` |
| Business | Reports | `/reports` | `viewMoney` |
| Company | Team | `/team` | `manageTeam` |
| Company | Settings | `/settings` | `manageCompany` |

**CREW's visible nav is exactly Today and Schedule** — every other item needs `viewAllJobs` or a
higher capability CREW does not hold. On mobile, the bottom bar shows up to 4 items in a
role-specific priority order (e.g. OWNER/ADMIN/ESTIMATOR/VIEWER see Today/Dashboard/Jobs/Schedule;
SALES sees Today/Requests/Pipeline/Jobs; CREW sees only Today/Schedule) — everything else
authorized but not in the bottom 4 is reachable through a "More" overflow drawer, grouped the same
way as desktop.

Creation entry points (`/jobs/new`, `/jobs/quick`, `/jobs/capture`, `/requests/new`) are
deliberately **not** in this nav list — they live behind the shell's own **+ Create** button
instead, since they're destinations you're sent to, not places you browse to.

## 9. Account, Company, Team, Shell, and Dashboard

### 9.1 Account / Company

**What it does.** Sign-up/sign-in is entirely Clerk-hosted-look but Aernova-branded
(`app/(auth)/sign-in/`, `app/(auth)/sign-up/`). A brand-new Clerk user's very first sign-in
auto-provisions a new `Company` (named after the user, e.g. "Alex's Company"), makes that user its
`OWNER`, defaults the company to the Roofing trade with a starter Roofing/GST price list, and sets
`onboardedAt` to `null` — which is what sends that one user, on their very next page load, to
`/onboarding` to confirm their real trade and province. Nobody else who later joins that company
(via an invite) goes through onboarding — it is a one-time, owner-only, per-company step.

**Who can use it.** Sign-in: everyone. Onboarding: whoever the invite/auto-provisioning made
OWNER of a not-yet-onboarded company (gated on `manageCompany` as a backstop — an ADMIN who
somehow lands on `/onboarding` before the owner does is redirected to `/dashboard` instead, since
the page has "nothing left to ask" a second person). Company profile / price-list reset / request-
form link: `manageCompany` (OWNER, ADMIN). Stripe Connect: `manageBilling` (OWNER only).

**Where.** `/sign-in`, `/sign-up`, `/onboarding`, `/settings`.

**Prerequisites.** A working Clerk key pair (§4). Nothing else — this is the very first thing a
new user does.

**Related code.** `lib/auth.ts` (`resolveCompanyContext`, `requireCompanyContext`,
`requireCapability`, `requirePageCapability` — every one of these is the actual server-side gate,
not a UI convenience), `components/onboarding/onboarding-form.tsx`, `app/(dashboard)/settings/page.tsx`
and its `actions.ts`, `lib/trade-catalog.ts` (the `TRADE_OPTIONS`/`PROVINCE_OPTIONS` lists and the
starter catalog each trade+province combination seeds), `lib/stripe-connect.ts`.

**Automated coverage.** Playwright `tests/visual/entry.spec.ts` (sign-in screenshots, desktop +
mobile). No unit test exercises the onboarding flow itself (it's a Prisma-touching, multi-step
form flow — outside what `node --test` can run without a database).

**Manual test — happy path (sign-up through onboarding):**
1. Open an incognito/private browser window to `http://localhost:3000`.
2. You land on `/sign-in`. Click through to **Sign up** (Clerk's own link inside the card).
3. Complete Clerk's sign-up flow with a fresh test email.
4. You should land on `/onboarding` automatically — a card titled **"Let's set you up"**, showing
   **"Step 1 of 2"**.
5. On step 1, pick a **Trade** (e.g. "Plumbing") from the dropdown and a **Province**.
6. Advance to step 2 (the form's own "Next"/continue control). You'll see a list of workflow-
   template cards for the trade you picked, each showing what it hides/renames relative to the
   default stage set (from `WorkflowTemplate` seed rows) — pick one (or the default).
7. Submit the form.
8. **Expected result:** you land on `/dashboard`. Your company's `trade` and `province` are now
   set to what you picked (verify on `/settings` — the Trade and Province fields should show your
   choice). `company.onboardedAt` is now set (verify indirectly: reloading `/onboarding` directly
   redirects you straight to `/dashboard` instead of showing the form again).
9. Open `/settings/workflow` and confirm the stages shown match the template you picked (renamed
   labels, or a stage marked disabled, depending on which template you chose).

**Manual test — company profile:**
1. Sign in as OWNER or ADMIN. Go to `/settings`.
2. Under **"Company profile"**, fill in **Legal business name**, **Phone**, **Email**, **Address**,
   **City**, **Postal code**, **Licence number**, **Business number**, **WCB / WSIB number**.
3. Click **Save**.
4. **Expected result:** the page reloads with your values retained in every field. Open a job's
   printable report or a public quote/invoice document and confirm the company name/legal name now
   appears there (never Aernova's).
5. Fill in **Review link** with any URL (e.g. a Google review link) and Save.
6. **Expected result:** go to a `COMPLETED` job (§24, "Ask for a review") — the review-request panel
   should now be present where it was previously absent (no button exists until this field is set).

**Manual test — starter price list & tax reset (destructive, confirm carefully):**
1. On `/settings`, under **"Starter price list & tax rates"**, click **"Reset starter price list &
   tax rates"**.
2. **Expected result:** a confirmation dialog appears, naming your current trade/province and
   explicitly warning this deletes every current `Service` and `TaxRate` for the company, replacing
   them with the starter set — and separately reassures you that quotes/invoices already sent keep
   their own numbers regardless.
3. Confirm.
4. **Expected result:** `/quotes/new` (or any quote's catalog picker) now shows only the fresh
   starter services for your trade/province; any custom services you'd added are gone.

**Manual test — Stripe Connect (needs `STRIPE_SECRET_KEY` set, §4):**
1. As OWNER (not ADMIN — this section is invisible to ADMIN, verify that first by signing in as
   ADMIN and confirming the whole "Online payments" section is absent from `/settings`), go to
   `/settings`.
2. Click **"Connect with Stripe"**.
3. **Expected result:** you're sent to Stripe's own hosted onboarding (Express account creation).
4. Complete Stripe's test-mode onboarding and return to `/settings`.
5. **Expected result:** the section now reads **"Connected — your invoices can be paid online."**
   and offers **"Manage in Stripe"** instead. A public invoice for this company should now show a
   working Pay button (§21).

**Data/state verification.** `Company.onboardedAt`, `.trade`, `.province`, `.legalName`, etc. — view
via `/settings` itself (no direct DB query needed for a manual pass).

**Pass criteria:**
- [ ] First sign-in creates exactly one company with you as OWNER.
- [ ] Onboarding shows Step 1 of 2, accepts a trade + province + template, and never shows again
      after submission.
- [ ] Company profile fields save and appear on real documents.
- [ ] Price-list reset requires confirmation and correctly replaces the catalog.
- [ ] Stripe Connect section is invisible to ADMIN, visible and functional for OWNER.

### 9.2 Roles / Team / Permissions

**What it does.** `/team` lists every current member and every outstanding (unaccepted,
unrevoked) invite. Inviting someone mints a single-use, time-limited link (`CompanyInvite`) rather
than sending an email — the office is expected to text/WhatsApp it themselves, matching how a
contractor actually reaches their crew. There is no in-app role *editing* after a member joins —
an existing member's role is fixed once they've accepted; to change someone's role today you would
remove them and re-invite at the new role (this is a real, current limitation, not a bug — verify
there's no "Change role" control anywhere on `/team` before reporting it as a defect).

**Who can use it.** Everything on `/team` requires `manageTeam` (OWNER, ADMIN). Accepting an invite
requires nothing — any signed-out or freshly-signed-up user with the link.

**Where.** `/team`, `/join/[token]`.

**Prerequisites.** None beyond being OWNER/ADMIN of an onboarded company.

**Related code.** `app/(dashboard)/team/page.tsx`, `app/(dashboard)/team/actions.ts`
(`createInviteAction`, `revokeInviteAction`, `removeMemberAction`), `app/(public)/join/[token]/page.tsx`,
`components/dashboard/invite-link.tsx`.

**Automated coverage.** None dedicated (no `tests/team*.test.ts` or Playwright spec) — this is a
genuine coverage gap worth noting, not hidden.

**Manual test — invite and accept:**
1. Sign in as OWNER. Go to `/team`.
2. Under **"Add someone"**, type a name in **"Who's it for"** (e.g. "Dave"), pick a role from
   **"What they do"** (try `CREW` first — it's the default), click **"Make a link"**.
3. **Expected result:** a new row appears under the form showing "Dave · Crew", an expiry date
   ("Good until …"), and a copyable link.
4. Copy the link, open it in a private/incognito window, and complete Clerk sign-up with a second
   test email.
5. **Expected result:** the new user lands inside the same company (not a new one of their own),
   with the CREW role. Confirm by checking their visible nav — should be exactly Today and
   Schedule (§8).
6. Back on `/team` as OWNER, confirm the invite row is gone from the pending list and the new
   person now appears under **"On the team"** with the label **"Crew"**.

**Manual test — revoke an unused invite:**
1. Make another invite (any role).
2. Click **"Cancel"** on its row.
3. **Expected result:** the row disappears immediately. Opening that same link afterward should no
   longer grant access (it's been revoked — verify by trying the link in a private window; it
   should not silently add the person).

**Manual test — remove a member:**
1. As OWNER, find a non-OWNER, non-yourself member row under "On the team".
2. Click **"Remove"**.
3. **Expected result:** a confirmation dialog appears naming them and explaining their account
   itself survives but they lose access to this company. Confirm.
4. **Expected result:** the row disappears. Signed in as that removed user (if you have their
   session), confirm they can no longer reach any `(dashboard)` route for this company.

**Permission test — self-removal and OWNER protection:**
1. As OWNER, look at your own row and the row of any OWNER-role member.
2. **Expected result:** neither row shows a "Remove" control at all — self-removal and removing an
   OWNER are both structurally impossible from this UI, not just discouraged.
3. As a CREW or VIEWER user, try navigating directly to `/team` by URL.
4. **Expected result:** you're denied before any team data loads (the whole page is gated on
   `manageTeam`) — not a page that loads then hides controls.

**Pass criteria:**
- [ ] Invite link creation offers exactly CREW/ESTIMATOR/SALES/VIEWER/ADMIN (never OWNER).
- [ ] Accepting an invite adds the person to the correct existing company at the correct role.
- [ ] Revoking an unused invite actually invalidates the link.
- [ ] Removing a member is confirmed and blocked for self/OWNER rows.
- [ ] `/team` is fully inaccessible to non-`manageTeam` roles.

### 9.3 Global App Experience (shell)

**What it does.** The Astryx-built application shell wraps every `(dashboard)` route: a desktop
side nav grouped into Work/Pipeline/Relationships/Business/Company (§8), a mobile bottom nav
showing up to 4 role-prioritized items plus a "More" overflow drawer, a command/search affordance,
a **+ Create** menu, a dark/light theme toggle whose choice persists, and a notification bell
(§25). `app/(dashboard)/layout.tsx` is a Server Component — the shell itself does not force the
whole authenticated app into a client bundle.

**Who can use it.** Every authenticated role, with nav items filtered per §8.

**Where.** Every route under `app/(dashboard)/`.

**Related code.** `app/(dashboard)/layout.tsx`, `components/dashboard/shell/` (side nav, mobile
bottom nav, mobile drawer), `lib/shell-nav.ts`, `lib/sidenav-store.ts` (collapse-state
persistence), `components/dashboard/quick-create-menu.tsx`, `components/dashboard/notification-bell.tsx`.

**Automated coverage.** Playwright `tests/visual/shell.spec.ts` (dashboard desktop dark/light,
mobile shell, collapsed sidebar — 4 tests) and `tests/visual/jobs.spec.ts`'s "mobile overflow"
coverage; `tests/split-inspector.test.ts` and route-title unit tests exercise `lib/shell-nav.ts`'s
pure logic directly.

**Manual test — desktop nav and collapse:**
1. Sign in as OWNER at a desktop width (≥1024px). Confirm the left side nav shows all five groups
   with every item §8 lists for OWNER.
2. Click the current route in the nav — confirm it's visually highlighted as active.
3. Find the sidebar's collapse control (near the bottom). Click it.
4. **Expected result:** the sidebar narrows to icon-only; its aria-label should now read "Expand
   sidebar" (confirm via a screen reader or the browser's accessibility inspector).
5. Reload the page.
6. **Expected result:** the sidebar stays collapsed — the choice persists (stored via
   `lib/sidenav-store.ts`, `localStorage` key `aernova-sidenav-collapsed`).

**Manual test — mobile nav:**
1. Resize the browser to a mobile width (390px) or use a real phone.
2. **Expected result:** the desktop side nav is replaced by a bottom bar with up to 4 icons plus a
   "More" icon.
3. Tap "More".
4. **Expected result:** a drawer opens showing every remaining authorized nav item, grouped the
   same way as desktop.

**Manual test — theme toggle:**
1. Find the theme toggle in the shell header. Click it.
2. **Expected result:** the whole app switches between dark and light immediately, with no flash of
   the wrong theme on the next page navigation.
3. Reload the page.
4. **Expected result:** your chosen theme persists.

**Manual test — + Create menu:**
1. Click the **+** button in the shell header.
2. **Expected result:** a menu opens offering creation shortcuts (New job, New client, New request,
   etc. — exact set depends on your role's capabilities).
3. Pick **"New client"**.
4. **Expected result:** a dialog opens inline (not a page navigation) titled "New client" — see
   §10 for the full client-creation test.

**Permission test:**
1. Sign in as CREW. Confirm the side nav (or mobile bottom nav) shows only Today and Schedule —
   every other item from §8's table is absent, not disabled.
2. Try navigating directly by URL to `/clients` as CREW.
3. **Expected result:** denied server-side (redirected or a permission error), not a client-side
   hide that a direct URL bypasses.

**Pass criteria:**
- [ ] Nav visibility exactly matches §8's table for every role you test.
- [ ] Sidebar collapse and theme choice both persist across reloads.
- [ ] Mobile bottom nav + overflow drawer together contain every item desktop nav shows.
- [ ] Direct-URL navigation is blocked server-side for unauthorized roles, not just hidden.

### 9.4 Dashboard

**What it does.** `/dashboard` is an "Action Center" — surfaces exactly the things that need a
decision right now (overdue invoices, new/unanswered requests, quotes whose status just changed,
jobs stuck in a disabled workflow stage) rather than a generic activity feed. Below the action
items sit summary tiles: a pipeline snapshot and revenue trend. There is deliberately no
`PageHeader` on this route — the shell's own top bar already carries "Dashboard" as the route
title, so a second heading would be redundant (confirmed in code, not a missing feature).

**Who can use it.** `viewAllJobs` (OWNER, ADMIN, ESTIMATOR, SALES, VIEWER — not CREW).

**Where.** `/dashboard`.

**Related code.** `app/(dashboard)/dashboard/page.tsx`, `components/dashboard/dashboard-action-center.tsx`,
`components/dashboard/pipeline-snapshot.tsx`, `components/dashboard/revenue-trend-summary.tsx`,
`components/dashboard/receivables-summary.tsx`, `components/dashboard/new-requests-summary.tsx`,
`components/dashboard/disabled-stage-jobs-list.tsx`.

**Automated coverage.** Playwright `tests/visual/shell.spec.ts` covers the dashboard route in both
themes.

**Manual test — happy path:**
1. Sign in as OWNER with at least one overdue invoice, one open request, and one job sitting in a
   disabled workflow stage (set one up via §13 if you don't have one).
2. Go to `/dashboard`.
3. **Expected result:** you see distinct tiles/rows for overdue invoices (with a link into
   `/invoices` or the specific invoice), new requests (linking into `/requests` or the specific
   request), and the disabled-stage job (linking into that job) — each with enough detail to act
   without clicking through first (amount owed, who's waiting, how long stuck).
4. Confirm the disabled-stage list is ordered oldest-stuck-first (deterministic, not the newest
   first) — this is a documented, intentional invariant (`components/dashboard/disabled-stage-jobs-list.tsx`'s
   own doc comment): if you have two stuck jobs, the one that's been stuck longer should list
   first.
5. Scroll to the pipeline snapshot and revenue trend tiles — confirm they reflect your real data
   (create a quote and check the numbers move accordingly).

**Permission test:**
1. Sign in as CREW or a role without `viewAllJobs`.
2. Confirm `/dashboard` is not reachable (redirected/denied), and not present in that role's nav.

**Pass criteria:**
- [ ] Every action-center row deep-links to the right destination.
- [ ] Disabled-stage jobs list oldest-stuck-first, not newest-first.
- [ ] Pipeline/revenue tiles reflect real current data, not placeholders.
- [ ] Dashboard is unreachable without `viewAllJobs`.

## 10. Clients & Properties

**What it does.** A `Client` is the person or business being sold to; a `Property` is the building
work happens at. Splitting them means a repeat customer or a second job at the same address reuses
everything already known. `ClientStatus` is `LEAD → ACTIVE → ARCHIVED` — a client becomes ACTIVE
automatically the first time work of theirs is scheduled (`lib/client-lifecycle.ts`), not by hand.

**Who can use it.** List/detail: `viewAllJobs`. Create/edit: `editJob`. Delete:
`deleteClient` (OWNER/ADMIN only).

**Where.** `/clients`, `/clients/[clientId]`.

**Prerequisites.** None to view an empty list. Deleting requires an existing client.

**Related code.** `components/dashboard/clients-browser.tsx`, `app/(dashboard)/clients/page.tsx`,
`app/(dashboard)/clients/[clientId]/page.tsx`, `app/(dashboard)/clients/actions.ts`
(`createLeadClientAction`), `components/dashboard/client-picker.tsx` (the reusable inline-create
autocomplete used on job/request forms), `components/dashboard/client-hub-share-panel.tsx`,
`app/(dashboard)/clients/[clientId]/hub-actions.ts`, `lib/client-status.ts`, `lib/client-matching.ts`,
`lib/client-resolve.ts`, `lib/client-insights.ts`.

**Automated coverage.** `tests/client-matching.test.ts`, `tests/client-name.test.ts`,
`tests/client-status-tone.test.ts`, `tests/client-insights.test.ts`, `tests/client-hub.test.ts`;
Playwright `tests/visual/clients.spec.ts` (list + detail, desktop dark).

**Manual test — happy path (quick-create a client):**
1. Sign in with `editJob` (e.g. OWNER). Click **+ Create** in the shell header → **"New client"**.
2. In the dialog, type a name (e.g. "Dave Chen"). Leave **"This is a business"** unchecked (try it
   checked separately — the name placeholder should switch to a business-style example).
3. Optionally pick a lead source from **"How did they find you? (optional)"** (a free-text field
   with datalist suggestions: Referral, Repeat customer, Google, Facebook, Truck or sign, Door
   knock, Home show).
4. Submit.
5. **Expected result:** you land on `/clients` and the new client appears in the list, status
   **"Lead"**, with the lead source you entered shown under their name.

**Manual test — client list filters:**
1. On `/clients`, use the search box (**"Search by name or address…"**) — type part of a client's
   name and confirm the list filters live.
2. Use the status filter dropdown — default is **"Leads and active"**; confirm switching to
   **"Archived"** shows only archived clients (create one to test, or archive one via the client
   detail page if that control exists there).
3. If any client has tags, confirm a tag filter dropdown appears (it's conditionally rendered only
   when at least one client has a tag) and filters correctly.

**Manual test — client detail & duplicate-avoidance:**
1. Open a client's detail page (`/clients/[clientId]`). Confirm you see their status, phone/email,
   a Client Hub panel, their properties, and their jobs (each job row showing its own status).
2. Start creating a new job (`/jobs/new`) and, in the client field, type the first few letters of
   an existing client's name.
3. **Expected result:** the picker live-searches and surfaces the existing client as you type,
   with a "No matching clients. Press enter to add a new one." fallback only when nothing matches —
   this is a duplicate-avoidance nudge, not a hard block; you can still create a second client with
   a similar name if you deliberately do.

**Manual test — Client Hub link:**
1. On a client's detail page, find the **"Client hub"** panel and click **"Create the link"**.
2. **Expected result:** a read-only URL appears with **"Copy link"**, **"See what they see"** (opens
   the public page in a new tab), and **"Turn the link off"**.
3. Click **"See what they see"**.
4. **Expected result:** `/hub/[clientToken]` opens showing every quote/invoice/visit/roof-report
   already **sent** to this client across all their jobs — anything still in draft must not appear.
5. Back in the dashboard, click **"Turn the link off"**.
6. **Expected result:** a confirmation dialog warns that anyone who has the link will lose access.
   Confirm, then revisit the previously-copied public URL — it should no longer work.

**Manual test — delete (destructive, confirm carefully):**
1. As OWNER/ADMIN, on `/clients`, find a client with at least one job and click delete (only
   visible for this role).
2. **Expected result:** a confirmation names the client and explains precisely what happens: their
   properties and any open requests are deleted, but **any jobs they have keep their own name and
   address as denormalized data and are not deleted**. Confirm this exact behavior after deleting —
   go check that job still exists and still shows the (now-orphaned) client name.

**Properties note.** There is **no dedicated "manage properties" page** — a `Property` is created
implicitly whenever an address is entered on a job or request form (`lib/client-resolve.ts`'s
`resolveProperty()`), and shown read-only on the client detail page. Roof measurement data
(sections, imagery, issues) attaches to the Property, not the Job, specifically so a second job at
the same address reuses everything already measured — verify this by creating a second job for an
existing client/address and confirming any prior roof sections/measurements are already present
under that job's Scan tab.

**Data/state verification.** `ClientStatus` transitions to `ACTIVE` only via
`lib/client-lifecycle.ts`, triggered by scheduling — create a lead client, quote and schedule a job
for them, and confirm their status flips from "Lead" to "Active" without anyone manually changing
it.

**Pass criteria:**
- [ ] Quick-create client works from the + Create menu with both individual and business naming.
- [ ] Search and status/tag filters behave correctly on the client list.
- [ ] The client picker nudges toward an existing match without ever silently merging two people.
- [ ] Client Hub link creation, viewing, and revocation all work and only show already-sent documents.
- [ ] Client delete cascades properties/requests but never deletes a job.
- [ ] A client's status becomes Active only through real scheduling activity, never a manual toggle.

## 11. Requests & Sales Pipeline

### Requests

**What it does.** A `Request` is an inbound ask that predates a `Job` — most requests never become
one, so keeping them separate keeps the job list meaningful. Status flow:
**NEW → CONTACTED → ASSESSING → CONVERTED / CLOSED**, where `CONVERTED` is reachable *only* by
actually converting the request into a job (never by directly setting status to it — verify this).

**Who can use it.** Office-created request: `editJob`. Public request form: nobody (no auth). Delete:
`deleteRequest` (OWNER/ADMIN).

**Where.** `/requests`, `/requests/new`, and the public `/request/[companySlug]`.

**Related code.** `components/dashboard/requests-browser.tsx`, `app/(dashboard)/requests/page.tsx`,
`app/(dashboard)/requests/new/page.tsx`, `app/(public)/request/[companySlug]/page.tsx`,
`lib/request-status.ts`, `lib/public-request.ts`.

**Automated coverage.** `tests/request-status.test.ts`, `tests/public-request.test.ts`.

**Manual test — office-created request:**
1. Sign in with `editJob`. Go to `/requests/new`.
2. Pick an existing client, or type a new client's name inline. Fill in **"What do they want?"**
   (required title).
3. Optionally fill email/phone (these backfill gaps on an existing client's record if left blank
   there), a source, and a requested date/time (defaults to now; try entering a future date/time —
   it should be rejected, since a request can't be from the future).
4. Submit.
5. **Expected result:** you land on `/requests` and the new request appears with status **"New"**,
   under the default **"Still open"** filter.

**Manual test — public request form:**
1. Find your company's slug (visible on `/settings`'s request-form-link panel, or derive it from
   the company name). Open `/request/[companySlug]` in a fresh/incognito window — no sign-in.
2. Fill in name, title, and either email or phone (at least one is required).
3. Submit.
4. **Expected result:** the request appears on `/requests` for your company, and if the email
   matches an existing client exactly (case-insensitive), it's attached to that client rather than
   creating a duplicate; otherwise a new client is created with lead source **"Website"**.
5. Try resubmitting the exact same form again immediately.
6. **Expected result:** you see a success message (never an error — this is deliberate anti-abuse
   design), but no second duplicate Request row is actually created for an already-matched client
   resubmitting too soon (`isResubmit()` in `lib/public-request.ts`). This is only verifiable by
   checking `/requests` doesn't show a duplicate, since the public form always looks like it
   succeeded.

**Manual test — status lifecycle and late indicator:**
1. On `/requests`, find a "New" request. Click **"Mark Contacted"**.
2. **Expected result:** its status pill changes to "Contacted / Qualified".
3. Click **"I'm looking at it"**.
4. **Expected result:** status becomes "Assessing".
5. Wait (or backdate a test request's `requestedAt` if you have DB access) past 3 days unanswered.
6. **Expected result:** the request shows an amber "late" indicator — this only applies to open
   requests; a converted or closed request is never marked late no matter how old.
7. Click **"Not going ahead"** on an open request.
8. **Expected result:** status becomes "Closed", and it drops out of the default "Still open" filter.

**Manual test — convert to job:**
1. Click **"Turn into a job"** on an open request.
2. **Expected result:** a new Job is created, starting at status `LEAD`, carrying over the client,
   property, the request's title as the job's name, its description into the job's notes, and
   whoever was assigned to the request as the job's assigned salesperson. You land on the new job's
   workspace.
3. Go back to `/requests` and try clicking "Turn into a job" again on the now-converted request (if
   the control is still reachable).
4. **Expected result:** you're redirected to the *same* existing job — a second click never creates
   a duplicate job.

**Pass criteria:**
- [ ] Both office and public request creation work, with the public form's anti-abuse behavior
      (honeypot silent-success, resubmit guard) verified to not create visible duplicates.
- [ ] Status can move to CONTACTED/ASSESSING/CLOSED directly, but CONVERTED only through conversion.
- [ ] The 3-day late indicator applies only to open requests.
- [ ] Conversion carries over client/property/title/notes/assignee and is idempotent on re-click.

### Sales Pipeline

**What it does.** `/pipeline` visualizes every open request and every job with a live quote as one
funnel: **LEAD → CONTACTED → ASSESSING → DRAFT → AWAITING_RESPONSE → OPENED → CHANGES_REQUESTED →
WON / LOST**. The first three columns are request statuses; the rest derive from the job's most
recent quote's status. **LOST is a deliberately merged column** — it holds both a cold request
(closed, no reason) and a declined/expired quote (has a reason) — same underlying fact ("this
didn't close") at two different funnel points.

**Who can use it.** View: `viewAllJobs`. Move a request card: `editJob`-tier. Move a quote card:
`editQuote`-tier (checked separately per card, since a card's move permission depends on what kind
of card it is).

**Where.** `/pipeline`.

**Related code.** `lib/pipeline.ts` (pure stage mapping, no Prisma — testable directly),
`components/dashboard/pipeline-board.tsx`.

**Automated coverage.** `tests/pipeline.test.ts`; Playwright `tests/visual/pipeline.spec.ts`
(desktop board + mobile stage list).

**Manual test — desktop board:**
1. Sign in with `viewAllJobs`. Go to `/pipeline` at a desktop width.
2. **Expected result:** a horizontal board with all 9 stage columns, each card showing enough
   identity to act on it (client name, job/request name).
3. Drag a card from one legal column to an adjacent one you're authorized to move it to.
4. **Expected result:** the card moves and the underlying request/quote status updates to match —
   verify by checking `/requests` or the quote's own status afterward.
5. Try dragging a card to the **Lost** column.
6. **Expected result:** a dialog opens asking for a reason (`MoveDialog`) rather than moving
   immediately — Lost always needs a reason, whether reached by drag or by the keyboard path below.

**Manual test — keyboard/non-drag move path:**
1. Below (not nested inside) each draggable card, find a `<select>`-driven "Move" control.
2. Use it (via keyboard Tab + arrow keys, no mouse) to move a card to a different stage.
3. **Expected result:** identical behavior to drag-and-drop, including the Lost-reason dialog when
   applicable — this is the accessible/keyboard-only path, not a secondary feature.

**Manual test — mobile:**
1. Resize to 390px or open `/pipeline` on a real phone.
2. **Expected result:** the horizontal board is replaced by `MobileStageList`, a vertical list of
   stages you scroll through — not a squeezed, horizontally-scrolling version of the desktop board.

**Permission test:**
1. Sign in as a role with `viewAllJobs` but not `editQuote` (e.g. VIEWER).
2. **Expected result:** quote-derived cards render but are not draggable and have no visible Move
   control — confirm by attempting to drag one; it should not pick up.

**Pass criteria:**
- [ ] All 9 stages render with correct card population from real request/quote data.
- [ ] Drag-and-drop and the keyboard Move control produce identical results.
- [ ] Moving to Lost always requires a reason, from either input path.
- [ ] Mobile shows a vertical stage list, not a compressed board.
- [ ] Move permission is enforced per card kind (request-move vs. quote-move), not blanket.

## 12. Job Creation & Job Workspace

### Job creation — four entry points

**What it does.** Aernova offers four distinct ways to start a job, all converging on the same
underlying `createJobRecord` (client resolution, property resolution, per-company sequential job
numbering) so there is exactly one implementation of "what a new job needs," not four:

1. **Full New Job form** (`/jobs/new`) — every field: client (pick existing or type new + business
   checkbox), email, phone, lead source, full address, notes.
2. **Quick Job** (`/jobs/quick`) — a narrow, phone-sized sheet: client, job name, an optional
   starting price. Meant for "create it now, fill in the rest later."
3. **AI photo capture** (`/jobs/capture`) — take/upload a photo; Gemini drafts a job name, a
   description, and (only if it genuinely matches) a catalog service + price (§30 covers the AI
   mechanics; this section covers the surrounding job-creation UI).
4. **Request conversion** (§11) — not a form at all; carries over an existing Request's data.

**Who can use it.** All four: `editJob`.

**Where.** `/jobs/new`, `/jobs/quick`, `/jobs/capture`.

**Related code.** `components/dashboard/new-job-form.tsx`, `app/(dashboard)/jobs/new/actions.ts`
(`createJobRecord`, shared by every entry point), `components/dashboard/quick-job-sheet.tsx`,
`app/(dashboard)/jobs/quick/page.tsx`, `components/dashboard/capture-sheet.tsx`,
`app/(dashboard)/jobs/capture/actions.ts`, `lib/job-validation.ts`.

**Automated coverage.** Playwright `tests/visual/jobs.spec.ts` ("new job form"); `tests/ai-capture.test.ts`
covers the AI capture parsing boundary.

**Manual test — full New Job form:**
1. Sign in with `editJob`. Go to `/jobs/new` (or **+ Create → New job**).
2. Type a new client name directly into the client field (don't pick an existing one) — confirm you
   can optionally check **"This is a business"**.
3. Fill in **Job name** (required — try submitting blank first and confirm a validation message
   appears without losing your other entered values).
4. Fill in email/phone/lead source (all optional) and an address (also optional at this stage —
   confirm you can submit with zero address fields filled).
5. Submit.
6. **Expected result:** you land on the new job's workspace. If you left the address blank, open the
   **"Still to add"** panel (§12, Job Workspace below) and confirm it lists an address as missing,
   explaining *why* it matters ("nobody can be sent to this job") rather than just naming the field.

**Manual test — Quick Job:**
1. Go to `/jobs/quick` (or **+ Create → Quick job**, phone-sized layout).
2. Pick/type a client, type a short job name, optionally a starting price.
3. Submit.
4. **Expected result:** the job is created immediately with none of the New Job form's optional
   fields — confirm the job workspace's "Still to add" panel lists everything you skipped.

**Manual test — AI photo capture:** see §30 for the full AI-specific procedure (catalog match,
no-match, ambiguous photo, missing/invalid key cases). At a UI level: confirm `/jobs/capture` shows
**"Draft from a photo"** with upload controls when `GEMINI_API_KEY` is set, and instead shows
**"AI capture isn't set up in this environment yet."** with a **"Use the full form instead"** link
to `/jobs/new` when it is not — verify this by unsetting `GEMINI_API_KEY`, restarting the dev
server, and reloading `/jobs/capture`.

**Data/state verification.** Every job gets a per-company sequential `jobNumber` — create two jobs
back-to-back and confirm the numbers increment by exactly 1, never reused even if a job is later
deleted.

**Pass criteria:**
- [ ] All three UI entry points (full form, quick, capture) successfully create a job.
- [ ] The full form allows submission with only a name — nothing else is hard-required.
- [ ] Quick Job's minimal fields don't block creation.
- [ ] AI capture is absent (not a disabled/broken button) when `GEMINI_API_KEY` is unset.
- [ ] Job numbers are sequential per company.

### Job Workspace

**What it does.** `/jobs/[jobId]` is the single home for everything about one job: identity header,
client/property, a status stepper with a smart "advance" button, tabs (Inspect, Scan & measure,
Quote, Costs), a "Still to add" gaps panel, a printable internal report, and — depending on role —
a money inspector panel. The status stepper (`JobStatusStepper`) shows the **effective** stage flow
— i.e., it already reflects any company workflow customization (§13): a stage the company disabled
is skipped in the forward-advance button and the dropdown of *future* choices, but a job that is
*currently sitting* in a since-disabled stage still shows that stage (with a note: "This stage is
disabled for future jobs. Move this job to the next active stage when ready.") — a job's real state
is never hidden by a later configuration change.

The **money inspector** panel (`FinancialCompletionPanel`) is a `viewMoney`-gated, read-only
closeout summary — contract value, total invoiced, total collected — distinct from the quicker
Sales/Financial mini-cards elsewhere on the page (neither replaces the other: one's a glance, this
is the closeout review). With no approved quote and no additional-work billing yet, it correctly
shows **"Nothing to summarize yet"** rather than a confusing all-zeros table — confirm this empty
state before there's any real financial activity on a job.

**Who can use it.** Visible per-role — money-denominated content requires `viewMoney`; CREW can
reach only jobs they're assigned a visit on (§7).

**Where.** `/jobs/[jobId]`.

**Prerequisites.** At least one job (any creation path above).

**Related code.** `components/dashboard/job-workspace.tsx`, `job-workspace-shell.tsx`,
`job-status-stepper.tsx`, `job-gaps-panel.tsx`, `disclosure-panel.tsx`, `print-report.tsx`,
`app/(dashboard)/jobs/[jobId]/page.tsx`, `app/(dashboard)/jobs/[jobId]/status-actions.ts`
(`updateJobStatusAction`), `lib/job-status.ts`, `lib/workflow-stages.ts`, `lib/job-validation.ts`
(the gaps list).

**Automated coverage.** Playwright `tests/visual/jobs.spec.ts` ("job workspace desktop dark/light",
mobile); `tests/job-status-tone.test.ts`, `tests/workflow-stages.test.ts`.

**Manual test — status stepper, happy path:**
1. Open a job at status `LEAD`. Confirm the stepper shows every enabled stage as a row of numbered
   circles, the current one highlighted, with a horizontal connecting line.
2. Click the primary advance button (its label is stage-specific — for LEAD it's **"Start
   inspection"**).
3. **Expected result:** the job moves to `INSPECTION`; the stepper's first circle now shows a
   checkmark, the second is highlighted, and the advance button's label changes to that stage's own
   verb (**"Send to processing"** for INSPECTION, and so on through the flow).
4. Click directly on a *non-adjacent* stage circle in the stepper (not just the advance button).
5. **Expected result:** the job jumps straight to that status — the stepper is not restricted to
   one-step-at-a-time advancement; both paths call the same `updateJobStatusAction`.
6. Use the status `<select>` dropdown instead — confirm it offers the same set of stages plus
   **Archived** at the end, and produces the same result.

**Manual test — "Still to add" gaps panel:**
1. Open a job you created with minimal info (e.g. via Quick Job with no address).
2. **Expected result:** a panel titled **"Still to add"** lists what's missing, each line explaining
   the *consequence* ("An address — nobody can be sent to this job"), with the reassurance "None of
   this stops you saving the job. It's what the job can't do yet." directly under the heading.
3. Fill in the missing information (e.g. add an address via the job's edit affordance) and reload.
4. **Expected result:** the panel either shrinks (fewer gaps) or disappears entirely once nothing is
   missing — it renders nothing at all when the gap list is empty, not an empty "nothing missing"
   state.

**Manual test — printable internal report:**
1. On a job with at least some measurements/quote data, find the **"Open printable report"** link
   (job header).
2. **Expected result:** `/jobs/[jobId]/report` opens — an Aernova-branded (not contractor-branded)
   internal document, requiring `viewMoney` to open (§20's public-vs-internal branding distinction
   is covered fully there; confirm here only that this route 404s or denies a VIEWER-tier-and-below
   role without `viewMoney`... note VIEWER *does* have viewMoney, so test with CREW instead, who
   does not).
3. Use the browser's print preview on this page.
4. **Expected result:** interactive-only chrome (buttons, nav) is hidden in print view; the report
   content itself remains legible.

**Permission test:**
1. Sign in as CREW. Try to open a job you are **not** assigned a visit on, by URL.
2. **Expected result:** denied/not-found — CREW's job visibility is scoped at the query level
   (`jobScopeForRole`), not just hidden in a list.
3. Open a job you **are** assigned to as CREW.
4. **Expected result:** you see a reduced surface with no money figures anywhere (no quote totals,
   no invoice balances) — confirm by comparing the same job's workspace as OWNER side-by-side.

**Pass criteria:**
- [ ] Status can advance via the primary button, a direct stepper click, or the dropdown — all three consistent.
- [ ] A disabled-but-current stage still displays correctly with its own warning note.
- [ ] "Still to add" never blocks saving and disappears once nothing is missing.
- [ ] The printable report is Aernova-branded and gated on `viewMoney`.
- [ ] CREW's job visibility and money-blindness are both enforced, not just visually hidden.

### Job Costing (Money Inspector)

**What it does.** A ledger of what a job **actually cost** — separate from `QuoteLineItem.unitCostCents`,
which is what it was *quoted* to cost, frozen at approval. Each `JobExpense` row is a single
Materials/Labour/Equipment/Other entry, dated and attributed to whoever logged it. For a Labour
entry, hours × an hourly rate compute the amount automatically but remain manually overridable
afterward. The panel compares total logged cost against the quote's own cost figures and shows the
variance as **"Over quote"**, **"Under quote"**, or plain **"Variance"** when exactly even.

**Who can use it.** `manageJobCosts` (OWNER, ADMIN, ESTIMATOR — not SALES/VIEWER/CREW).

**Where.** Job workspace (money inspector / Costs panel).

**Related code.** `components/dashboard/job-expenses-panel.tsx`,
`app/(dashboard)/jobs/[jobId]/expense-actions.ts` (`addJobExpenseWithState`,
`deleteJobExpenseAction`), `lib/job-costing.ts`, `lib/format.ts` (`JOB_EXPENSE_CATEGORY_OPTIONS`).

**Manual test:**
1. Sign in with `manageJobCosts`. Open a job with an approved quote, find the Costs panel.
2. Log a **Materials** expense: description, amount, a date.
3. Log a **Labour** expense: hours + an hourly rate — confirm the amount computes automatically
   (hours × rate), then manually override the computed amount and confirm your override sticks
   (the rate/hours fields are kept only as provenance, not re-applied on every view).
4. **Expected result:** both entries appear in a dated list, each attributed to who logged them, and
   the panel's cost-vs-quote comparison updates to reflect the new totals ("Over quote"/"Under
   quote"/"Variance").
5. Delete one entry (`DeletableItem` control).
6. **Expected result:** it's removed and the comparison recalculates.
7. Log an expense dated on a specific calendar day (e.g. type a date, not "today") and confirm the
   date displayed afterward matches exactly what you entered — this app has a documented,
   previously-live-caught timezone bug class around date-only fields (picking Aug 5 rendering back
   as Aug 4 for anyone west of UTC), specifically fixed for this panel; confirm it still holds by
   testing in a non-UTC local timezone if you can.

**Permission test:** confirm SALES and VIEWER cannot see or use this panel at all (they have
`viewMoney` but not `manageJobCosts` — this is a real, deliberate split: SALES quotes the work,
office costs it).

**Pass criteria:**
- [ ] Materials/Labour/Equipment/Other expenses all log correctly, with Labour's auto-computed-then-overridable amount working as described.
- [ ] Deleting an expense updates the cost-vs-quote comparison.
- [ ] Expense dates render as entered, not shifted by a day due to timezone conversion.
- [ ] Access is correctly limited to `manageJobCosts` roles, distinct from `viewMoney` alone.

## 13. Job Workflow Customization

**What it does.** A company can, per job status, hide it from the visible flow and/or rename it to
its own words — **but cannot reorder the fixed stage sequence or add a custom stage beyond the
built-in `JobStatus` enum.** `CompanyWorkflowStage` is one row per (company, status) with exactly
`label` (override text) and `isEnabled` — its own `sortOrder` field exists in the schema but the
form that edits it (`WorkflowStagesForm`) explicitly does not offer drag-and-drop reordering
("no drag-and-drop reordering yet" is the schema's own comment on that field). **This is exactly
the boundary between what's shipped and what Workflow Phase 13 only plans** — do not test for or
report a missing "drag to reorder stages" feature as a bug; it is correctly not built yet.

**Who can use it.** `manageCompany` (OWNER, ADMIN) to edit; every role sees the *effect* (renamed/
hidden stages) throughout the job workspace, dashboard, and jobs list.

**Where.** `/settings/workflow`. (The starting template is also chosen once, at `/onboarding` —
§9.1.)

**Prerequisites.** An onboarded company (workflow templates seed at onboarding, and can be
re-applied from this page's own reset control if one exists — confirm by reading the page).

**Related code.** `app/(dashboard)/settings/workflow/page.tsx`, `.../actions.ts`
(`saveWorkflowStagesAction`), `components/dashboard/workflow-stages-form.tsx`, `lib/workflow-stages.ts`
(`effectiveStageMeta`, `effectiveStageFlow`, `nextEnabledStatus` — the pure logic every consumer,
including the stepper and the disabled-stage dashboard list, reads through).

**Automated coverage.** `tests/workflow-stages.test.ts` (11 tests — override precedence, disabled-
stage skipping, malformed-JSON tolerance).

**Manual test — rename a stage:**
1. Sign in with `manageCompany`. Go to `/settings/workflow`.
2. **Expected result:** every `JobStatus` in fixed flow order is listed, each with a **"Shown"**
   checkbox and a text input pre-filled with the company's current label or showing the default as
   a placeholder.
3. Clear a stage's label field and type your own word for it (e.g. rename "Inspection" to
   "Site visit").
4. Click **"Save changes"**.
5. **Expected result:** the button reads **"Saved"**. Open any job's workspace and confirm the
   renamed stage shows your custom word everywhere it appears (stepper, dropdown, dashboard's
   disabled-stage list if applicable) — but confirm the stage's underlying *description* text
   ("Capture drone imagery and photos, and log any roof issues…") is **not** overridden by a
   rename — only the label changes, and if you renamed a roofing-flavored stage on a non-roofing
   trade company, you should be able to observe that the description text still reads
   roofing-specific. This is a real, current limitation worth confirming, not a bug to "fix" during
   testing.

**Manual test — disable a stage:**
1. Uncheck **"Shown"** on a stage that no current job is sitting in, and Save.
2. **Expected result:** that stage no longer appears as a forward-advance option or as a status-
   dropdown choice for jobs not currently in it.
3. Find (or move) a job that **is currently** in the now-disabled stage.
4. **Expected result:** its workspace still shows that stage as current (with the disabled-stage
   warning note, §12), and it still appears in the disabled-stage dashboard list (§9.4) — hiding a
   stage never hides a real job that's actually stuck there.
5. Uncheck **"Shown"** on the stage a job is *currently sitting in itself*, then open that job.
6. **Expected result:** identical to step 3/4 — a job's current stage is always shown regardless of
   its enabled/disabled state.

**Pass criteria:**
- [ ] Renaming a stage propagates everywhere that stage's label renders, without changing its
      description/next-step copy.
- [ ] Disabling a stage removes it from forward choices but never hides a job currently in it.
- [ ] No reorder/custom-stage control exists anywhere on this page (confirms Phase 13 boundary).

## 14. Pre-Construction Checklist

**What it does.** A per-job checklist (materials confirmed, permits checked + required yes/no,
crew ready, start date confirmed, free-text notes for each) that sits between contract approval and
scheduling. It is a **soft, warning-only gate** — there is no "override" control because there is
nothing to override; an incomplete checklist never blocks scheduling or any other action, it only
displays what's outstanding in plain language.

**Who can use it.** `editJob` to check items off; visible to anyone who can view the job. Never
shown on `/today` — this is an office-facing panel only.

**Where.** Job workspace (a panel, not a separate route).

**Related code.** `components/dashboard/pre-construction-checklist-panel.tsx`,
`app/(dashboard)/jobs/[jobId]/pre-construction-actions.ts`, `lib/pre-construction.ts`
(`preConstructionGaps`, `preConstructionGateMessage`).

**Automated coverage.** Check `tests/` for a `pre-construction`-named file covering
`lib/pre-construction.ts`'s pure gap logic; if absent, this is a coverage gap worth noting rather
than assuming untested code is broken.

**Manual test — happy path:**
1. Open a job's workspace with `editJob`. Find **"Pre-construction checklist."**
2. Check **Materials confirmed**, fill in **Permits checked** and answer whether one is required,
   check **Crew ready** and **Start date confirmed**, optionally add notes to each.
3. Save.
4. **Expected result:** the panel now shows a **"Confirmed [date]"** badge, and the summary message
   reads **"Everything here is confirmed. This job is ready to schedule."** in a positive (confirm-
   toned) style.
5. Go back and uncheck one item, Save again.
6. **Expected result:** the "Confirmed" badge disappears and the summary reverts to naming what's
   still outstanding — but nothing about the job's ability to be scheduled or advanced actually
   changed; confirm you can still book a visit / advance status regardless.

**Pass criteria:**
- [ ] All five checklist areas save independently.
- [ ] The panel never blocks any other action, only reports state.
- [ ] The "Confirmed" badge and message accurately reflect whether every tracked item is checked.

## 15. Scheduling

**What it does.** `/schedule` offers four views — **Day, Week, Month, Schedule** (the agenda view;
"Day" is only offered once the company has set a timezone, §9.1). A `Visit` is one occurrence of
work; a `Job` can have exactly one (one-off) or many under a `RecurrenceRule` (recurring — a lawn
contract's 26 mowings are 26 visits on **one** job, never 26 separate jobs). The page actively
surfaces two real hazards: **double-booking** (the same person on two jobs the same day) and
**overbooking** (more visits booked on a day than people on the team) — both computed and shown
inline, not silently allowed.

**Who can use it.** View: everyone (CREW sees only their own assigned days). Book/move/cancel:
`manageSchedule` (OWNER, ADMIN, ESTIMATOR). Mark a visit complete: `completeVisit` (adds CREW).

**Where.** `/schedule`.

**Prerequisites.** A company timezone set (for time-of-day fields — until then, visits are day-only,
"Anytime"). At least one job to book a visit for.

**Related code.** `app/(dashboard)/schedule/page.tsx`, `components/dashboard/visit-panel.tsx`,
`components/dashboard/visit-drag.tsx`, `lib/schedule/day.ts`, `lib/schedule/recurrence.ts`
(the recurrence generator).

**Automated coverage.** Playwright `tests/visual/field.spec.ts` ("schedule tablet", "schedule
mobile").

**Manual test — book a one-off visit:**
1. Sign in with `manageSchedule`. Open a job at status `LEAD` (this status is special — see next
   step) and find its **visit-booking panel**.
2. **Expected result:** for a LEAD job only, you're asked **"What kind"** — **"Come look"**
   (assessment) or **"Do the work"** — since a LEAD has no date anywhere until you separate "come
   assess it" from "do the actual work."
3. Pick **"Come look"**, a **Day**, and optionally a start time (only offered once a timezone is
   set — try **"Add a start time"** then **"No set time"** to confirm both states work) and a
   duration.
4. Click **"Book it in"**.
5. **Expected result:** the job's status moves to `INSPECTION` automatically (booking an assessment
   visit is what advances a LEAD — verify on the job's own status stepper), and the visit now shows
   on `/schedule` at the day/time you picked.

**Manual test — recurring visits:**
1. On a job **not** at LEAD status (recurrence is only offered for real work, never "come look"),
   open the visit panel and click **"It repeats"**.
2. **Expected result:** the form expands to show **"How often"** (Every day/week/month), **"Every"**
   (an interval — e.g. 2 + Every week = fortnightly), and **"How many"** (leave blank for "no end
   date" — confirm the helper text explicitly says the calendar fills ~5 months ahead and extends
   as you go, rather than generating an infinite backlog up front).
3. Set weekly, leave count blank, submit ("Book them all in").
4. **Expected result:** multiple visits appear on `/schedule` across the coming weeks/months. Note
   the count is capped by the ~5-month generation horizon, not infinite — you shouldn't see visits
   a year out yet.
5. Manually drag/move one of the generated visits to a different day.
6. **Expected result:** that one occurrence moves; re-running/extending the recurrence later must
   not silently regenerate over your manual move (a visit a human touched is never regenerated
   over — verify by checking it stays put after time passes and the generator extends the series
   further).

**Manual test — double-booking / overbooking warnings:**
1. Assign the same crew member to two different visits on the same day.
2. **Expected result:** the schedule page surfaces an explicit warning naming the person and both
   jobs they're double-booked on that day.
3. Book more visits on one day than you have team members to cover them.
4. **Expected result:** a separate overbooked-day warning appears, stating the visit count vs. crew
   count for that day.

**Manual test — cancel a visit:**
1. Find an upcoming visit and click **"Called off"**.
2. **Expected result:** the visit's status becomes `CANCELLED` (not deleted — it remains as a
   record) and it's visually distinguished (e.g. struck through or grayed) from active visits, and
   drops off `/today`'s crew list for that day.

**Permission test:**
1. Sign in as CREW. Open `/schedule`.
2. **Expected result:** you see only days/visits you're personally assigned to, not the whole
   company's calendar — and no booking/move controls are present.

**Pass criteria:**
- [ ] Booking an assessment visit on a LEAD job advances its status; work visits don't.
- [ ] Recurrence correctly offers frequency/interval/count and generates a bounded horizon of visits.
- [ ] A manually-moved recurring visit is never overwritten by later regeneration.
- [ ] Double-booking and overbooking are both detected and surfaced, not silently allowed.
- [ ] CREW sees only their own assigned schedule.

### Calendar feed (.ics subscription)

**What it does.** A one-way, read-only subscription link (`Company.calendarToken`) a team member
pastes into their own phone's calendar app. It is explicitly **not** an OAuth integration — no
account to connect, nothing written back to Aernova, works identically in Google/Apple/Outlook.
The panel is honest about its two real limitations: it only goes one way, and it isn't instant
(external calendar apps poll on their own schedule, from every few minutes to twice a day).

**Who can use it.** Minting/revoking the link: `manageCompany`. Subscribing to it: anyone who has
the URL (it's the only credential — treat it like a password, per the panel's own copy).

**Where.** `/schedule`'s panel; the feed itself is served at `/calendar/[token]`.

**Related code.** `components/dashboard/calendar-feed-panel.tsx`,
`app/(dashboard)/schedule/feed-actions.ts`, `app/(public)/calendar/[token]/route.ts`.

**Manual test:**
1. As OWNER/ADMIN, find **"See this in your own calendar"** and click **"Make the link."**
2. **Expected result:** a read-only URL appears with a **"Copy link"** button, plus the three
   caveats spelled out in the panel (one-way, not instant, treat it like a password).
3. Paste the URL into a real calendar app's "Subscribe by URL"/"Add by URL" feature (or just open
   it directly in a browser and confirm it downloads/serves a valid `.ics` file, content-type
   `text/calendar`).
4. **Expected result:** your company's scheduled visits appear as events.
5. Click **"Turn the link off"**.
6. **Expected result:** a confirmation warns every calendar it was added to stops updating,
   including your own phone. Confirm, then verify the old URL no longer serves valid data.

**Pass criteria:**
- [ ] The feed link works in a real external calendar app (or at minimum serves valid `.ics`).
- [ ] Revoking the link actually invalidates it.
- [ ] The panel's one-way/not-instant/treat-like-a-password caveats are all still present and accurate.

## 16. Crew, Today, Field, Progress, and Quality Check

**What it does.** `/today` is the crew-facing field surface — a short list of the visits assigned to
*you*, today, with everything a crew member needs to record from the field: marking a visit done,
uploading photos, a five-state plain-language progress picker, and a pre-completion "quality check"
evidence submission. None of this is money- or customer-facing, and none of it can mark a job
COMPLETED by itself — that decision belongs to the office (§16's Quality Check gate below).

**Who can use it.** `completeVisit` (marking done), `submitFieldEvidence` (the quality-evidence
panel) — both CREW-tier and above. CREW additionally only sees visits it's personally assigned.

**Where.** `/today`.

**Related code.** `app/(dashboard)/today/page.tsx`, `components/today/field-capture-panel.tsx`,
`components/today/progress-picker.tsx`, `components/today/quality-evidence-panel.tsx`,
`app/(dashboard)/today/progress-actions.ts`, `app/(dashboard)/today/quality-actions.ts`,
`lib/job-progress.ts`.

**Automated coverage.** Playwright `tests/visual/field.spec.ts` (today mobile, today desktop dark).

**Manual test — mark a visit complete with evidence:**
1. Sign in as CREW (or any role with `completeVisit`) with at least one visit assigned to you
   today. Open `/today`.
2. **Expected result:** you see your visit(s) for today, each with the job name, address, and a way
   to mark it done and add evidence.
3. Upload a photo (if the visit has a capture control) and add notes.
4. Mark the visit complete.
5. **Expected result:** the visit's status becomes `COMPLETED`, `completedAt` is stamped, and the
   photo appears attached to the visit (verify from the office side too — open the job workspace
   and confirm the photo shows there).

**Manual test — progress picker (crew's five-state read):**
1. On `/today`, find a job's progress control. If nothing's been set yet it reads **"How's it
   going?"**; if something has, it shows **"Progress — [current state]"**.
2. Tap it open. **Expected result:** five plain-language options render as a single-select list
   (Not started / In progress / Mostly complete / Ready for quality check / Completed — exact
   labels from `PROGRESS_STATE_OPTIONS` in `lib/job-progress.ts`).
3. Pick one and Save.
4. **Expected result:** button now shows "Saved — update again"; reopening shows your choice
   pre-selected. Confirm this never touches `Job.status` or `QualityCheck` directly — check the job
   workspace and confirm neither the status stepper nor the quality-check panel changed as a side
   effect.

**Manual test — quality-check field evidence (crew's half):**
1. On `/today`, find **"Quality check — before you go"** (or, if already submitted once,
   **"Update quality check evidence"**).
2. Check **Site cleaned up**, **Photos uploaded**, add an optional note, Save.
3. **Expected result:** button reads "Saved — update again".
4. Switch to an office-tier account (`completeQualityCheck`) and open the same job's workspace.
5. **Expected result:** the **Quality check** panel's **"What crew reported"** section shows exactly
   what was just submitted — checkmarks for site/photos, the note, and who/when submitted — but
   this is **read-only from the office side**; crew's submission by itself has not completed
   anything.

**Manual test — office quality-check gate (blocks job completion):**
1. As an office-tier user (`completeQualityCheck`), on the same job, find the **"Office review"**
   half of the Quality Check panel: **Scope of work is done**, **Deficiencies resolved**, **Final
   walkthrough completed** (plus optional walkthrough notes).
2. Before checking any of these, try to advance the job's status to `COMPLETED` via the status
   stepper.
3. **Expected result:** this is **blocked** — a real, enforced gate (`lib/quality-check.ts`'s
   `qualityCheckCompletionGaps`), not a suggestion. Confirm you get a clear error naming what's
   missing, not a silent failure.
4. Check all three office-review boxes and Save.
5. **Expected result:** the panel now shows **"Completed [date]"**.
6. Now advance the job's status to `COMPLETED`.
7. **Expected result:** this succeeds — the gate is now satisfied.

**Data/state verification.** Confirm precisely: `QualityCheck.scopeCompleted` /
`.deficienciesResolved` / `.walkthroughCompleted` are what gate `JobStatus.COMPLETED` — the crew's
`siteCleaned`/`photosUploaded` fields never do, even though both live in the same `QualityCheck`
row. This is the single most important permission-boundary fact to verify in this section: crew
supplies evidence, only office's own three checkboxes gate anything.

**Pass criteria:**
- [ ] Crew can mark a visit complete with a photo/notes, scoped to only their assigned visits.
- [ ] The progress picker's five states never touch `Job.status` or `QualityCheck`.
- [ ] Crew's field evidence appears read-only on the office's quality-check panel.
- [ ] A job cannot reach COMPLETED until office checks scope/deficiencies/walkthrough — verified as
      a real block, not a UI-only nudge.
- [ ] Crew's own evidence checkboxes never gate the COMPLETED transition by themselves.

## 17. Quotes

Quotes are one of the largest features in Aernova. This section covers the whole lifecycle:
building, sending, the homeowner's public experience, approval/decline, and follow-up.

**What it does.** A `Quote` is the priced document a homeowner reviews and approves. It starts
`DRAFT`, can be built from scratch or seeded from roof measurements, and moves through
`SENT → VIEWED → (CHANGES_REQUESTED) → APPROVED` or `REJECTED`/`EXPIRED`. Line items are either
real catalog `ITEM`s (quantity × unit price, with a separate, homeowner-invisible `unitCostCents`
for margin) or plain `TEXT` rows (a paragraph with no price, `$0`, never pretending to be free
work). A line can be marked **optional** — excluded from the total until the homeowner explicitly
ticks it on the public page.

**Who can use it.** Build/save: `editQuote`. Send: `sendQuote`. Delete: `deleteQuote` (OWNER/ADMIN,
and only while the quote is in a deletable status — see below). Public approve/decline/request-
changes: the homeowner, via the share-token link only.

**Where.** Job workspace → Quote tab (builder), `/quotes` (company-wide list), `/q/[token]` (public).

**Prerequisites.** A job. A company `Service` catalog (seeded automatically) if you want catalog
line items rather than only text rows.

**Related code.** `components/dashboard/quote-builder.tsx`, `quote-line-row.tsx`,
`quote-catalog-picker.tsx`, `quote-share-panel.tsx`, `quote-preview.tsx`, `quote-template-panel.tsx`,
`quote-start-dialog.tsx`, `quote-generator-card.tsx`, `app/(dashboard)/jobs/[jobId]/quotes/[quoteId]/actions.ts`
(`saveQuoteAction`, `draftQuoteScopeAction`), `send-actions.ts` (`shareQuoteAction`,
`markQuoteApprovedAction`, `markQuoteDeclinedAction`, `unshareQuoteAction`, `deleteQuoteAction`,
`sendQuoteEmailAction`, `draftQuoteFollowUpAction`), `app/(dashboard)/quotes/page.tsx` (company-wide
list), `app/(public)/q/[token]/page.tsx` + `actions.ts` (`approveQuoteAction`,
`requestChangesAction`), `components/public/quote-response.tsx`, `quote-extras.tsx`,
`lib/quote/totals.ts`, `lib/quote-status.ts`, `lib/share-token.ts`.

**Automated coverage.** `tests/quote-status.test.ts` and other `quote-*`/`ai-scope-draft.test.ts`
files; Playwright `tests/visual/business.spec.ts` ("quotes list") and
`tests/visual/public-documents.spec.ts` ("public quote desktop/mobile", "public quote invalid
token").

### Manual test — build a quote from scratch

1. Sign in with `editQuote`. Open a job's Quote tab. If none exists yet, create a **blank quote**.
2. Give it a **Title** (required to save — try saving blank and confirm it's rejected with a clear
   message, no partial save).
3. Add a line item: use **"Add from catalog"** to pick a real `Service` (confirm price/unit prefill
   from the catalog) or **"Add text"** for a prose row (confirm it carries no price/quantity fields
   at all).
4. Add a second line and mark it **optional**.
5. Set a **discount** (try both percent and flat-amount kinds) and pick a **tax rate**.
6. Set a **deposit** (percent or flat).
7. Toggle off **"Show unit prices"** in the client-view settings.
8. Click **Save**.
9. **Expected result:** the quote reloads with everything you entered intact, and the total shown
   matches the arithmetic (subtotal minus discount, plus tax, with the optional line **excluded**
   from the total since nobody's accepted it yet).

### Manual test — quote from roof measurements (roofing companies)

1. On a job with roof sections/measurements already captured (§28/§29), open the Quote tab and
   look for a **"Generate from measurements"**-style entry point (`quote-generator-card.tsx`).
2. Use it.
3. **Expected result:** line items are pre-populated from the measurement-derived estimate (squares,
   waste factor, accessories) — confirm these rows are flagged `source: "auto"` conceptually (you
   can tell because editing and then re-running the generator should NOT silently wipe your manual
   edit — verify this specifically: hand-edit a generated line's price, re-run "Generate from
   measurements," and confirm your edited row survives while only genuinely still-auto rows refresh).

### Manual test — send and public view

1. On a saved quote with `sendQuote`, find **"Send it to them"**. Click **"Copy link"**.
2. **Expected result:** status becomes `SENT`; the link is a `/q/[token]` URL.
3. Open that link in a private/incognito window (simulating the homeowner).
4. **Expected result:** status becomes `VIEWED` automatically on this first open (no button — just
   opening it counts) — confirm by going back to the office view and seeing the status pill change.
   Reopen the link a second time and confirm the status doesn't regress or re-trigger anything (only
   the *first* view is recorded).
5. On the public page, confirm you see the intro, line items (respecting whatever show/hide
   settings the office set), an optional-extras section if any exist (with checkboxes, not pre-
   ticked), and the total updating live as you tick/untick an optional extra — but note the total
   you see client-side is provisional; the real one is recomputed server-side on approval (next
   test).

### Manual test — homeowner approval (with an optional extra)

1. On the public quote page (from the previous test), tick an optional extra, type a name in the
   signature field, and click **Approve**.
2. **Expected result:** the quote's status becomes `APPROVED`; `acceptedByName` and
   `acceptedAt`/`acceptedIp` are recorded (IP is never displayed anywhere in the UI — confirm it's
   truly invisible, not just visually subtle). The total now includes the extra you accepted.
3. Click **Approve** a second time (double-click simulation — reload and resubmit the same form if
   your browser allows it).
4. **Expected result:** nothing changes the second time — approving an already-approved quote is a
   no-op, not a second recorded decision.
5. Back in the office view, open the same quote and confirm the accepted extra's `clientSelected`
   flag is now true, and that this flag is **never editable from the quote builder** — the builder
   can change everything else about that row, but not whether the homeowner accepted it.

### Manual test — office-recorded approval (phone/driveway yes)

1. On a sent-but-not-yet-approved quote, as an office user, find the office's own **"Mark
   approved"** control (distinct from the homeowner's own click).
2. Use it.
3. **Expected result:** the quote becomes `APPROVED` with `approvedByUserId` set (not
   `acceptedByName`/`acceptedIp`) — confirm the two approval paths are visibly distinguishable if
   the UI shows who/how a quote was approved.

### Manual test — request changes and decline

1. On the public page of a `SENT`/`VIEWED` quote, click **"Request changes"**, optionally add a
   message, submit.
2. **Expected result:** status becomes `CHANGES_REQUESTED`; the office sees this on `/pipeline` and
   the quote's own page, including any message left.
3. Back in the office, use the office-only **"Mark declined"**/reject control (there is deliberately
   **no homeowner-facing decline button** — only the roofer can move a quote to `REJECTED`, per
   `markQuoteDeclinedAction`'s own design; confirm the public page truly offers no reject option,
   only "Request changes").
4. **Expected result:** you're asked for a decline reason from a closed set (Price / Went with
   competitor / Bad timing / No longer needed / Other) plus an optional note.

### Manual test — delete (status-restricted)

1. As OWNER/ADMIN, try to delete a `DRAFT` or `REJECTED`/`EXPIRED` quote.
2. **Expected result:** allowed.
3. Try to delete a `SENT`, `VIEWED`, or `APPROVED` quote.
4. **Expected result:** blocked — a homeowner may still have that link open, or already agreed to
   it; deletion is restricted by status, not just by role.

### Manual test — public/invalid-token behavior

1. Take a valid `/q/[token]` URL and change a few characters of the token.
2. **Expected result:** a clean "not found"/expired public error page, never a stack trace or a 500.
3. Use `unshareQuoteAction` (the office's "Turn the link off" control) on a quote, then revisit its
   old link.
4. **Expected result:** same clean not-found behavior — an unshared quote's link stops working
   immediately.

**Data/state verification.** The single most important thing to verify across every test above:
**the total shown to the homeowner and the total the contractor is owed always come from the same
function** (`lib/quote/totals.ts`), recomputed server-side from the stored line items — never
trusted from the browser. Confirm this concretely: open your browser's dev tools on the public
quote page, and (in a safe test-only way) try modifying the DOM to change a displayed price, then
submit Approve — the recorded quote total must reflect the real stored line items, not your DOM edit.

**Pass criteria:**
- [ ] A quote can be built with both catalog and text lines, optional extras, discount, tax, and deposit.
- [ ] Sending, first-view tracking, and both approval paths (homeowner click vs. office-recorded) all work correctly.
- [ ] Optional extras are homeowner-controlled only, never editable from the builder.
- [ ] Only the office can decline a quote; the public page offers Approve/Request-changes only.
- [ ] Delete is blocked once a quote has been sent, viewed, or approved.
- [ ] An invalid or revoked token always shows a clean error, never a crash.
- [ ] The approved total is always server-recomputed, never trusted from the client.

## 18. Change Orders

**What it does.** A billable scope addition to an **already-approved** quote — a `ChangeOrder`
cannot exist without an approved `Quote` behind it (this is a hard schema constraint, not just a
UI rule: `quoteId` is required, not nullable, and cascades if the quote is ever deleted). Lighter-
weight than a quote by design: `DRAFT → SENT → APPROVED`/`DECLINED`, with no `VIEWED`/`EXPIRED`/
`CHANGES_REQUESTED` states. Once approved, its amount is additive to the job's effective contract
value.

**Who can use it.** Create/edit: `editQuote`. Send: `sendQuote`. Public approve: the homeowner via
share token.

**Where.** Job workspace, `/jobs/[jobId]/change-orders/[changeOrderId]`, public `/co/[token]`.

**Prerequisites.** A job with at least one `APPROVED` quote.

**Related code.** `components/dashboard/change-order-editor.tsx`, `change-order-share-panel.tsx`,
`change-orders-panel.tsx`, `app/(dashboard)/jobs/[jobId]/change-order-actions.ts`
(`createChangeOrderAction`), `.../change-orders/[changeOrderId]/actions.ts` (`saveChangeOrderAction`,
`shareChangeOrderAction`, `unshareChangeOrderAction`, `markChangeOrderApprovedAction`,
`markChangeOrderDeclinedAction`), `app/(public)/co/[token]/actions.ts`
(`approveChangeOrderAction`), `components/public/change-order-approval.tsx`, `lib/change-order.ts`
(`effectiveContractValueCents`).

**Automated coverage.** Playwright `tests/visual/business.spec.ts` ("change order detail
desktop dark"), `tests/visual/public-documents.spec.ts` ("public change order desktop").

**Manual test — happy path:**
1. On a job with an approved quote, find **"New change order"** (or equivalent entry point).
2. **Expected result:** if you try this on a job with **no** approved quote, the entry point should
   be absent or blocked — confirm this precondition before proceeding.
3. Give it a title, description, and line items (priced the same way a quote line is — quantity,
   unit price, optional `unitCostCents`, no markup column beyond that since this is a homeowner-
   facing document).
4. Save, then **"Send it to them"** (mints a share token, same shape as a quote's).
5. Open the public link in a private window.
6. **Expected result:** the homeowner sees the change order's details and an Approve control — but
   confirm there is **no line-by-line optional-extras selection here** (unlike a quote) — a change
   order is approved or not, as a whole.
7. Approve it.
8. **Expected result:** status becomes `APPROVED`, `approvedByName`/`approvedIp` recorded (same
   thin-evidence pattern as a quote). Confirm the job's **effective contract value** now includes
   this change order's amount — check wherever that total surfaces (money inspector / financial
   panel).

**Manual test — office-recorded approval and decline:**
1. As office, use the office's own "Mark approved" control on a sent change order (phone/driveway
   yes) — confirm `approvedByUserId` is set instead of the public fields.
2. On a different sent change order, use **"Mark declined."**
3. **Expected result:** status becomes `DECLINED`; confirm it does **not** affect the contract
   value and does not affect the underlying quote it amends.

**Pass criteria:**
- [ ] A change order cannot be created without an approved quote behind it.
- [ ] Public approval is whole-document (no line-level optional selection).
- [ ] Both homeowner-click and office-recorded approval paths work and are distinguishable.
- [ ] An approved change order's amount is reflected in the job's effective contract value; a
      declined one is not.

## 19. Additional Work / Billable Add-ons

**What it does.** Billing for work with **no quote behind it at all** — a $450 flashing repair
nobody wrote a formal quote for, or ongoing recurring-job billing. The office creates a direct
invoice. Below the company's `billableAddOnThresholdCents` (default $500 if unset), it goes
straight to `DRAFT`/`SENT` with no review step. **At or above the threshold**, it defaults to
requiring homeowner review before it can send — unless the office records a named override.

**Who can use it.** `editInvoice`.

**Where.** Job workspace (no quote tab needed — this is the no-quote billing path), the resulting
invoice.

**Prerequisites.** A job. No quote is required — that's the point of this feature.

**Related code.** `components/dashboard/additional-work-panel.tsx`,
`app/(dashboard)/jobs/[jobId]/additional-work-actions.ts` (both the below-threshold direct-invoice
action and the override action), `components/dashboard/addon-override-fields.tsx`,
`lib/invoice/addon-override.ts` (`overrideNoteError`, `overrideNoteCounterText`,
`OVERRIDE_NOTE_MIN`/`MAX` = 20/500).

**Automated coverage.** Check `tests/` for an `addon-override`-named unit test file covering
`lib/invoice/addon-override.ts`'s pure validation.

**Manual test — below threshold (no review needed):**
1. On a job, find the Additional Work panel. Confirm it states the current threshold plainly (e.g.
   "$500 goes straight out; at or above it, the homeowner reviews").
2. Add a line item priced **below** the threshold.
3. Save/send.
4. **Expected result:** a direct `Invoice` is created (no `Quote` behind it — confirm `quoteId` is
   effectively absent by checking the invoice doesn't link back to any quote) at status
   `DRAFT`/`SENT` immediately, `requiresHomeownerReview` false.

**Manual test — at/above threshold, default homeowner-review path:**
1. Add a line item priced **at or above** the threshold.
2. **Expected result:** the panel explicitly says this will be shared to the homeowner for review
   before it can send by default.
3. Save/send.
4. **Expected result:** the invoice is created with `requiresHomeownerReview: true`. Open its public
   link — confirm the homeowner sees a review step (distinct from paying) and a way to confirm
   they've reviewed it.
5. Complete the homeowner review from the public side.
6. **Expected result:** `homeownerReviewConfirmedAt` is stamped and the invoice becomes sendable/
   payable normally.

**Manual test — office override (skip homeowner review):**
1. Create another at/above-threshold additional-work item, but this time choose an override reason
   instead of the default review path: **"No email/phone on file"**, **"Verbal approval,"** or
   **"Owner override."**
2. For the first two reasons, confirm the note field is optional.
3. For **Owner override**, confirm the note field is **required**, with a live counter. Type fewer
   than 20 characters and confirm it reads **"N more characters required"**; type past 20 and
   confirm it switches instantly (at the 20th character, no intermediate state) to counting down:
   **"N characters remaining"** toward the 500-character ceiling. Try submitting under 20 characters
   and confirm you get the exact validation message: *"Please explain why homeowner review is being
   skipped. Enter 20-500 characters."*
4. Submit a valid Owner-override note (20-500 chars).
5. **Expected result:** the invoice sends immediately without homeowner review, `overrideReason`,
   `overrideNote`, `overriddenByUserId`, `overriddenAt` all recorded — this is a genuine audit
   trail, verify it's visible somewhere on the invoice (e.g. the invoice detail page's own note
   about why review was skipped).

**Pass criteria:**
- [ ] Below-threshold additional work bills directly with no review gate.
- [ ] At/above-threshold defaults to requiring homeowner review, and the public review step actually works.
- [ ] All three override reasons are available; only Owner Override enforces the 20-500-character note.
- [ ] The character counter's exact two-phase text (counting up to 20, then down from 500) is correct.
- [ ] An override is recorded as a visible audit trail, not a silent bypass.

## 20. Invoices

**What it does.** An `Invoice` is what a homeowner owes money against — created from an approved
quote (in full or as a **progress draw**, since a re-roof is commonly billed 50% deposit + 50%
final), billed directly with no quote (Additional Work, §19), or generated per-visit for recurring
work. Its numbers are frozen at creation — a quote can keep changing after the fact, but an invoice
is what was actually billed at that moment. `InvoiceStatus` (`DRAFT`/`SENT`/`VOID` are set by a
person; `PARTIALLY_PAID`/`PAID`/`OVERDUE` are always derived arithmetically from payments + due
date, never set by hand).

**Who can use it.** Create/void: `editInvoice`. Send: `sendInvoice`. Record a payment:
`recordPayment`. All three are office-tier (OWNER, ADMIN only — not ESTIMATOR/SALES).

**Where.** `/invoices` (company-wide list), `/jobs/[jobId]/invoices/[invoiceId]` (detail), public
`/i/[token]`.

**Prerequisites.** A job, and either an approved quote or an additional-work item to bill.

**Related code.** `components/dashboard/invoices-table.tsx`, `invoice-payments.tsx`,
`invoice-draw-form.tsx`, `invoice-billing-address.tsx`, `invoice-share-panel.tsx`,
`app/(dashboard)/invoices/page.tsx`, `app/(dashboard)/jobs/[jobId]/invoices/[invoiceId]/page.tsx`,
`lib/invoice/from-quote.ts` (which quote lines make it onto an invoice — accepted lines only, never
a declined optional upsell), `lib/invoice/balance.ts` (the derived-status arithmetic),
`lib/invoice/gaps.ts` (the "required to send" checklist, e.g. a business number for tax), `lib/invoice/status.ts`.

**Automated coverage.** `tests/invoice-balance.test.ts`, `tests/invoice-draw.test.ts`,
`tests/invoice-from-quote.test.ts`, `tests/invoice-gaps.test.ts`, `tests/invoice-reminders.test.ts`;
Playwright `tests/visual/business.spec.ts` ("invoices list", "invoice detail"),
`tests/visual/public-documents.spec.ts` ("public invoice desktop").

**Manual test — create from an approved quote (full):**
1. On a job with an `APPROVED` quote, find **"Raise an invoice"** (first draw) or equivalent.
2. Choose the full-amount option (not "Bill a deposit/portion instead").
3. **Expected result:** an invoice is created with line items copied from the accepted quote lines
   only — confirm any **declined** optional extra on that quote does **not** appear on the invoice.
4. Confirm the invoice's totals match the quote's approved total exactly.

**Manual test — progress draw (deposit + final):**
1. On the same approved quote, instead choose **"Bill a deposit instead"**, set amount kind
   (percent or flat) and value, leave the label as its default **"Deposit"** (or customize it).
2. Create it.
3. **Expected result:** a first invoice for just the deposit amount exists; the job/quote should now
   offer **"Bill the remaining $[X]"** for the second draw rather than "Raise an invoice" again —
   confirm the button label changes correctly.
4. Create the second (final) draw for the remaining balance, defaulting to label **"Progress
   payment."**
5. **Expected result:** two separate `Invoice` rows exist against the one quote, summing to the
   quote's full approved total. Try creating a third draw after the balance is already fully
   invoiced — confirm this is either prevented or clearly flagged as already fully billed
   (`createInvoiceFromQuoteAction`'s own double-click-vs-real-second-draw distinction).

**Manual test — billing address override:**
1. On an invoice, find **"Same as the property address"** (checked by default).
2. Uncheck it and fill in a different billing address (e.g. a landlord/property-manager address).
3. Save.
4. **Expected result:** the invoice now shows the override address wherever billing address prints
   (invoice detail, public page, PDF/print). Re-check "Same as the property address" afterward and
   confirm it reverts cleanly.

**Manual test — send and public view:**
1. With `sendInvoice`, click **"Send it to them"** / **"Copy link"** (and **"Email it to them"** if
   `RESEND_API_KEY` is configured).
2. Open the public `/i/[token]` link.
3. **Expected result:** first open stamps `viewedAt`; the homeowner sees what they were billed for,
   the amount still owing, and (if Additional Work review is pending, §19) a review step before any
   pay option appears.

**Manual test — void and derived status:**
1. On a `DRAFT` or `SENT` invoice with no payments, find **"Cancel this invoice."**
2. **Expected result:** status becomes `VOID`; confirm a voided invoice's public link stops working
   (or shows a clean "no longer available" state) and it drops out of any "amount owed" totals on
   `/dashboard`/`/reports`.
3. On a **different**, unpaid, past-due invoice (set a `dueAt` in the past, or wait), reload
   `/invoices`.
4. **Expected result:** its status reads **"Overdue"** — not a manually set value; confirm you
   cannot find any UI control that sets Overdue directly, since it's purely derived.
5. Record a partial payment on it (§21) less than the full balance.
6. **Expected result:** status becomes **"Partially paid"** (and stays Overdue-flavored if still
   past due — confirm the schema's own rule: an invoice cannot be both, and the *late half* is what
   it reads as when both are true).

**Pass criteria:**
- [ ] Full and progress-draw (deposit + final) invoice creation both work, summing correctly.
- [ ] Only accepted quote lines carry onto an invoice, never a declined optional extra.
- [ ] Billing address override works and reverts cleanly.
- [ ] Void, Partially Paid, Paid, and Overdue are all correctly derived — never independently settable.
- [ ] A voided invoice's public link stops working.

## 21. Payments

**What it does.** Money that actually arrived, recorded as a row per payment (never a single
running total) — a deposit in March and a balance in May are two facts with two dates. Supports
manual recording (e-Transfer, cheque, cash, card-offline, bank transfer, other) and, when Stripe is
connected, real online card payment via a hosted Stripe Checkout session, reconciled by webhook.

**Who can use it.** Manual recording: `recordPayment` (OWNER, ADMIN). Online payment: the homeowner,
publicly, once the company has Stripe Connect configured with `chargesEnabled: true`.

**Where.** Invoice detail's **"Money in"** panel (manual); public `/i/[token]`'s Pay button
(online); `/api/webhooks/stripe` (server-side reconciliation, not user-facing).

**Related code.** `components/dashboard/invoice-payments.tsx`, `lib/invoice/payment-methods.ts`
(`MANUAL_PAYMENT_METHODS` — deliberately excludes `STRIPE`, since no human picks that from a
dropdown), `lib/invoice/balance.ts`, `lib/stripe.ts`, `lib/stripe-connect.ts`,
`app/api/webhooks/stripe/route.ts`.

**Automated coverage.** `tests/invoice-balance.test.ts` covers overpayment/partial-payment
arithmetic directly.

**Manual test — manual payment (full):**
1. On an invoice with `recordPayment`, under **"Money in,"** fill **Amount**, pick a **Method**
   from the dropdown (confirm it offers e-Transfer/Cheque/Cash/Card (offline)/Bank transfer/Other —
   never "Stripe," since that's webhook-only), a **date** (defaults blank = today), an optional
   **Confirmation number**, and an optional **Note**.
2. Record it for the full remaining balance.
3. **Expected result:** the invoice's status becomes `PAID`, `paidAt` is stamped once (verify by
   recording a second $0 or refund-style entry doesn't re-stamp it), and the payment appears in a
   list with **"Nothing has come in yet."** replaced by the real payment row.

**Manual test — partial and overpayment:**
1. On a different invoice, record a payment for **less** than the full balance.
2. **Expected result:** status becomes `PARTIALLY_PAID`; the "still owing" figure reflects exactly
   what's left.
3. Record a second payment that, combined with the first, **exceeds** the invoice total (e.g. a
   homeowner rounds up).
4. **Expected result:** this is accepted, not rejected — the invoice correctly shows it's been paid
   in full (and the overage is visible as a fact, not silently clipped to the invoice total).

**Manual test — online payment (needs Stripe test-mode keys, §4, and a connected company, §9.1):**
1. Open the public invoice link for a company with `chargesEnabled: true`.
2. Click **"Pay $[amount] online."**
3. **Expected result:** you're sent to a real Stripe-hosted checkout page (test mode). Complete it
   with a Stripe test card (e.g. `4242 4242 4242 4242`).
4. **Expected result:** you're redirected back to the invoice with a success indicator, and — once
   the webhook fires — the invoice shows PAID with a new `InvoicePayment` row, `method: STRIPE`,
   a `stripePaymentIntentId` set.
5. Trigger the exact same webhook event a second time (Stripe's own retry, or replay it manually
   via the Stripe CLI/dashboard if you have access).
6. **Expected result:** no duplicate payment row is created and the balance is not double-credited —
   the unique index on `stripePaymentIntentId` is what enforces this; verify only one
   `InvoicePayment` row exists for that payment intent.

**Manual test — Stripe not configured:**
1. Without `STRIPE_SECRET_KEY` set, open a public invoice.
2. **Expected result:** no "Pay online" button appears at all — manual-recording remains the only
   path, and nothing on the page implies online payment is possible.

**Pass criteria:**
- [ ] Manual payment recording correctly derives PAID/PARTIALLY_PAID and handles overpayment.
- [ ] The manual-method dropdown never offers "Stripe" as a selectable option.
- [ ] Online payment (with test keys) completes and reconciles via the webhook.
- [ ] A retried/duplicate webhook delivery never double-credits a balance.
- [ ] Without Stripe configured, the online-pay path is fully absent, not broken.

## 22. Warranty

**What it does.** A homeowner-facing closeout document, structurally like a quote/invoice (office
reviews a pre-filled draft, sends via a share link) with one deliberate difference: the
homeowner's only action is a lightweight, typed-name **acknowledgement of receipt** — never an
Approve/Request-Changes pair, no money, no workflow-blocking effect. `WarrantyStatus`:
`DRAFT → REVIEWED → SENT → VIEWED → CONFIRMED`. **A confirmed warranty can never be edited in
place** — the schema enforces one warranty per job (`@@unique([jobId])`), so a correction after
confirmation is a genuinely unresolved edge case in v1 (documented as deferred in the schema's own
comment) — do not expect an "edit after confirm" path to exist; confirm it doesn't, rather than
treating its absence as a bug.

**Who can use it.** Create/edit/send: `editJob`. Public acknowledge: the homeowner via token.

**Where.** Job workspace (Warranty panel), public `/w/[token]`.

**Prerequisites.** A job. Built-in starter templates (`WarrantyTemplate`, `companyId: null`) need
the seed script (`npm run db:seed-warranty-templates`) to have been run.

**Related code.** `components/dashboard/warranty-panel.tsx`, `components/public/warranty-acknowledgement.tsx`,
`app/(public)/w/[token]/page.tsx` + `actions.ts` (`confirmWarrantyAction`),
`app/(dashboard)/jobs/[jobId]/warranty-actions.ts`.

**Automated coverage.** `tests/warranty.test.ts`; Playwright `tests/visual/public-documents.spec.ts`
("public warranty desktop").

**Manual test — create from a starter template:**
1. On a job, open the Warranty panel. Under **"Starters,"** you should see built-in templates
   filtered to your company's trade (e.g. "Roofing — Simple Warranty," "Roofing — Detailed
   Warranty").
2. Click **"Use this"** on one.
3. **Expected result:** a new warranty is created, pre-filled with that template's term/coverage/
   exclusions, plus a snapshot of your company info, the client's info, and the property address —
   all editable copies, not live joins (confirm by later changing your company's phone number and
   verifying an already-created warranty's snapshot doesn't change).
4. Alternatively, click **"Duplicate & customize"** on a starter.
5. **Expected result:** this creates your own company-owned copy of the template itself (not a
   warranty) — confirm it now appears as your own item you can further edit, separate from the
   built-in starters, which themselves remain unmodified.

**Manual test — send and public acknowledgement:**
1. Edit the term/coverage/exclusions as needed, save the draft (**"Save draft"**).
2. Send it — mint the share link.
3. Open the public `/w/[token]` link.
4. **Expected result:** the homeowner sees the warranty document (company/customer/property
   snapshot, term, coverage, exclusions) and, below it, **"Confirm you received this"** — a single
   checkbox **"I received and looked at this warranty"** plus a required **"Your name"** field, with
   copy explicitly stating *"there's nothing to approve or sign."*
5. Check the box, type a name, click **Confirm**.
6. **Expected result:** the page now reads **"Confirmed received by [name]."**, and `confirmedAt`/
   `signerIp` are recorded (IP never shown). Reload the page — confirm the same confirmed message
   persists rather than showing the form again.

**Manual test — re-send after edits (version bump):**
1. Edit and re-send an **already-sent-but-not-yet-confirmed** warranty.
2. **Expected result:** its `version` number increments — confirm this version is visible somewhere
   on the public document itself (the homeowner is entitled to know which version they're
   confirming), not just an internal field.

**Pass criteria:**
- [ ] Starter templates filter by trade and create real, editable copies — never mutate the shared built-in row.
- [ ] Public acknowledgement is checkbox + typed name only — no approve/decline anywhere in this flow.
- [ ] A confirmed warranty cannot be edited in place.
- [ ] Version increments on re-send and is visible on the public document.
- [ ] Nothing about a warranty touches money or blocks any job-status transition.

## 23. Reports

**What it does.** Three real, current reports plus the internal per-job printable report (§12).
Do not expect anything beyond what's listed here — no chart/report exists that isn't named below.

- **`/reports`** — despite the generic-sounding route, this page is specifically a **win-rate**
  report: approved-vs-total quotes in the selected period, with a **"Why they were lost"** breakdown
  by `QuoteDeclineReason`.
- **`/reports/revenue`** — invoiced/collected totals, **"By lead source"**, **"Lead funnel"**
  (request → quote → won, presumably — verify the exact stages shown), and **"Profit per job"**
  (comparing `JobExpense` totals against what was quoted).
- **`/reports/aged-receivables`** — outstanding invoice balances **"By age"** (bucketed, e.g.
  0-30/31-60/61-90/90+ days).

**Who can use it.** `viewMoney`.

**Where.** `/reports`, `/reports/revenue`, `/reports/aged-receivables`.

**Related code.** `app/(dashboard)/reports/page.tsx`, `.../revenue/page.tsx`,
`.../aged-receivables/page.tsx`.

**Automated coverage.** Playwright `tests/visual/business.spec.ts` ("reports overview desktop
dark", "reports revenue desktop dark").

**Manual test — win rate (`/reports`):**
1. Sign in with `viewMoney`. Go to `/reports`.
2. **Expected result:** a win-rate figure for the selected period, and (if any quotes were declined
   in-period) a breakdown by decline reason.
3. Change the date-range filter (if present) and confirm the numbers recompute.
4. With zero decided quotes in a period, confirm the empty state reads **"Nothing decided yet in
   this period."** rather than a blank chart.

**Manual test — revenue (`/reports/revenue`):**
1. Go to `/reports/revenue`.
2. **Expected result:** revenue totals plus the **By lead source**, **Lead funnel**, and **Profit
   per job** sections all render with real data reflecting your quotes/invoices/expenses.
3. With no invoiced activity in a period, confirm the empty state reads **"Nothing invoiced yet in
   this period."**

**Manual test — aged receivables:**
1. Go to `/reports/aged-receivables`.
2. **Expected result:** every currently-outstanding invoice balance, bucketed **"By age."** Create
   an overdue invoice (§20) and confirm it shows up in the correct age bucket.
3. With nothing outstanding, confirm the empty state reads **"Nothing outstanding right now."**

**Permission test:** sign in as CREW and confirm none of the three report routes are reachable.

**Pass criteria:**
- [ ] All three reports render real, correctly bucketed/derived data, not placeholders.
- [ ] Each has a distinct, accurate empty state.
- [ ] All three are gated on `viewMoney` and unreachable by CREW.

## 24. Activity / History

**What it does.** `ActivityEvent` is an append-only, best-effort log — every phase of the product
writes to it (status changes, quotes sent/viewed/approved/declined, invoices sent/paid, payments
recorded, reminders sent, warranty sent/confirmed, change-order/additional-work events, progress
updates from `/today`). It's the one place to answer "what's the history with this job/customer,"
shown as a timeline on the job workspace and feeding the dashboard's "Recent activity" tile.

**Who can use it.** Read: role-scoped to whatever the underlying job/data would otherwise show
(no separate permission of its own).

**Where.** Job workspace timeline; `/dashboard`'s recent-activity tile.

**Related code.** `lib/activity.ts` (`recordActivity`), `components/dashboard/recent-activity.tsx`.

**Manual test:**
1. Perform a handful of actions on one job: advance its status, create and send a quote, record a
   payment.
2. Open the job's timeline.
3. **Expected result:** each action appears as a distinct, dated entry in the order it happened,
   readable in plain language (not a raw enum name — confirm no entry reads literally
   `"QUOTE_SENT"` verbatim without a human sentence around it).
4. For an event triggered by the homeowner (e.g. a public quote approval), confirm the actor reads
   as their typed name (`actorLabel`), not blank and not a system account.
5. Check `/dashboard`'s recent-activity tile and confirm at least your most recent action appears
   there too, with a working deep link back to the job.

**Pass criteria:**
- [ ] Every major action across quotes/invoices/payments/status/warranty appears on the job timeline.
- [ ] Homeowner-originated events correctly attribute to the homeowner's typed name, not a blank or system actor.
- [ ] Recent-activity on the dashboard reflects the same data with working deep links.

## 25. Notifications, Reminders, and Automations

**What it does.** A notification bell in the shell header, showing an unread count and a list drawn
from a **curated subset** of `ActivityEvent` kinds — specifically money-adjacent ones (quote
sent/viewed/approved/declined, invoice sent/paid), gated on `viewMoney` (a CREW member correctly
never sees this bell content). Separately, three unattended cron routes exist:
`/api/cron/quote-reminders` (nudges a quote that's gone quiet), `/api/cron/invoice-reminders`
(nudges an overdue invoice), `/api/cron/sync-processing` (polls the photogrammetry worker, §28) —
all three require `CRON_SECRET` in production (§4).

**Who can use it.** Bell: `viewMoney`-gated content, visible shell chrome for everyone. Cron
routes: not user-facing at all — authorized via a bearer token, not a role.

**Where.** Shell header (bell); `/api/cron/*` (server-only).

**Related code.** `components/dashboard/notification-bell.tsx`, `lib/notifications.ts`,
`app/api/cron/quote-reminders/route.ts`, `app/api/cron/invoice-reminders/route.ts`,
`app/api/cron/sync-processing/route.ts`.

**Manual test — bell and unread state:**
1. Trigger a money-adjacent event (send a quote, have it viewed on a public link, get it approved).
2. **Expected result:** the bell shows an unread badge/count.
3. Open the bell.
4. **Expected result:** the new event appears, with a working deep link into the relevant job/quote.
5. Confirm opening the bell marks it seen (`notificationsSeenAt`) — reload and confirm the unread
   badge clears, and confirm this is per-membership, not global: if you belong to two companies (or
   simulate this by checking another user's unread state), marking one company's bell seen must not
   clear the other's.

**Permission test:** sign in as CREW and confirm the bell either shows nothing or is entirely
absent — CREW has no `viewMoney`, and every notification kind is money-adjacent.

**Manual test — cron reminders (requires manual invocation; these do not run on their own in
local dev):**
1. With `CRON_SECRET` unset locally, `curl` (or otherwise hit) `/api/cron/quote-reminders` directly.
2. **Expected result:** locally, with no secret configured, the route should still respond (§4 notes
   it's "wide open" without the secret — this is explicitly a local-dev-only allowance, not
   something to rely on past this test). If a quote has gone quiet past the reminder threshold,
   confirm a `QUOTE_REMINDER_SENT` activity event and (if `RESEND_API_KEY` is set) an actual email
   attempt occur; confirm the reminder's message is the **fixed, non-AI** copy from
   `followUpIntro()` — the AI follow-up draft (§17, §30) is explicitly never wired into this
   unattended path, since nothing AI-generated may reach a homeowner without a human reviewing it
   first.
3. Run it again immediately.
4. **Expected result:** the same quote is **not** re-nagged — `lastReminderSentAt` spaces reminders
   apart so a job that fires the cron more than once a week doesn't nag on every run.

**Pass criteria:**
- [ ] The bell's unread state is accurate, per-membership, and clears correctly on open.
- [ ] Bell content (and the bell itself, ideally) is invisible to CREW.
- [ ] Cron reminder routes use fixed, non-AI copy — never the AI follow-up draft.
- [ ] Reminder spacing prevents re-nagging the same quote/invoice on every cron run.

## 26. Client Hub / Public Experience (cross-cutting)

This section covers what's common across **every** public, unauthenticated route — the Client Hub
itself is detailed in §10; this is the shared behavior to verify across `/q`, `/i`, `/co`, `/w`,
`/hub`, and `/request/[companySlug]`.

**What it does.** Every public document shares: `DocumentSurface`/`DocumentHeader`/`DocumentMeta`
primitives for a consistent look, `print:hidden` on every interactive-only element (so a printed
copy shows only the document, not buttons), the **contractor's own branding** (never Aernova's —
§2's branding rule), and a shared error/not-found treatment for an invalid or revoked token. None
of these routes ever render any part of the authenticated shell (no side nav, no dashboard chrome)
— confirm this explicitly, since a leak here would be a real security/branding bug, not a cosmetic one.

**Related code.** `components/ui/document.tsx`, `app/(public)/layout.tsx`, `app/(public)/error.tsx`,
`app/(public)/not-found.tsx`.

**Automated coverage.** Playwright `tests/visual/public-documents.spec.ts` covers all four token
routes plus the client hub, in both a valid and an explicitly-invalid-token state.

**Manual test — invalid token, every route:**
1. For each of `/q/[token]`, `/i/[token]`, `/co/[token]`, `/w/[token]`, `/hub/[clientToken]`, visit
   it with a deliberately mangled token.
2. **Expected result:** every one shows the same calm "not found"/"no longer available" public error
   page — never a stack trace, never a 500, never any hint of internal structure.

**Manual test — no authenticated-shell leakage:**
1. While signed in as OWNER in one browser tab, open any public document link in another tab (or an
   incognito window while signed out).
2. **Expected result:** the public page never shows the side nav, the + Create button, the
   notification bell, or any other authenticated-shell chrome — it's a standalone document page,
   full stop, regardless of whether the person viewing it happens to also be signed in elsewhere.

**Manual test — print:**
1. On any of the four token documents, open the browser's print preview.
2. **Expected result:** buttons (Approve, Pay, Confirm, etc.) and any "copy link"-style controls
   disappear; the document content itself (company branding, line items, terms) remains, laid out
   for paper.

**Pass criteria:**
- [ ] Every public route's invalid-token state is a clean, uniform error page.
- [ ] No public route ever renders any authenticated-shell chrome, under any signed-in state.
- [ ] Print view hides every interactive control and keeps the document content legible.

## 27. Error & Safety States

**What it does.** Aernova has distinct error boundaries for the authenticated app, the public
surface, and the root, so a failure anywhere shows a calm, on-brand message rather than a stack
trace: `app/global-error.tsx` (root-level catch-all), `app/(dashboard)/error.tsx` (authenticated),
`app/(public)/error.tsx` (public documents), `app/not-found.tsx` and `app/(public)/not-found.tsx`
(404s, styled differently for each surface). Feature-specific failure states exist too: WebGL
unavailable/context-lost in the 3D viewer (§29), photogrammetry processing failure (§28), a missing
`GEMINI_API_KEY` (§30, features are simply absent), a missing Stripe key (§21, the Pay button is
absent).

**Manual test — trigger each boundary deliberately:**
1. Visit a nonexistent authenticated route, e.g. `/jobs/not-a-real-id-at-all`.
2. **Expected result:** either a clean "not found" state or a graceful redirect — never a raw
   Next.js/Prisma error message.
3. Visit a nonexistent public route, e.g. `/q/not-a-real-token`.
4. **Expected result:** the public not-found page (§26) — visually distinct branding from the
   authenticated 404, but equally clean.
5. If you can safely force a real server error in a local/dev-only way (e.g. temporarily stop the
   local Postgres mid-request), confirm `global-error.tsx` catches it with a generic, calm message —
   never exposing a stack trace to the browser.

**Pass criteria:**
- [ ] Every surface (dashboard, public, root) has its own distinct, on-brand error/not-found treatment.
- [ ] No error state anywhere leaks a stack trace or raw exception message to the browser.

## 28. Roofing / Aerial Measurement

**What it does. As established in §2, this entire module is currently ungated** — every company,
regardless of trade, sees the job workspace's "Scan & measure" tab. The pipeline: upload drone/
site photos → (real NodeODM worker, or a built-in draft model package when `NODEODM_URL` is unset)
→ processing → a 3D model → automatic roof-facet extraction → manual review/edit (§29) →
measurements feed a quote (§17).

**Who can use it.** `editJob` for upload/processing; viewing follows normal job-visibility rules.

**Where.** Job workspace → **Scan & measure** tab.

**Prerequisites.** None to see the tab. Real photogrammetric processing needs `NODEODM_URL`/
`NODEODM_TOKEN` (§4) — without them, the app substitutes a built-in draft model package so the
UI/workflow is still testable end-to-end, just not against real photo-derived geometry.

**Related code.** `components/dashboard/imagery-upload-form.tsx`, `processing-launcher.tsx`,
`roof-extraction-panel.tsx`, `roof-section-manager.tsx`, `section-create-form.tsx`,
`section-edit-form.tsx`, `measurement-create-form.tsx`, `measurement-edit-form.tsx`,
`measurement-manager.tsx`, `lib/reconstruction.ts`, `lib/roof-extraction*`, `lib/drone-metadata.ts`,
`lib/geotiff-metadata.ts`, `app/(dashboard)/jobs/[jobId]/phase-six-actions.ts`,
`app/api/jobs/[jobId]/imagery/route.ts`,
`app/api/jobs/[jobId]/processing/sync/route.ts`, `app/api/jobs/[jobId]/processing/[imageryId]/{download,mesh}/route.ts`,
`app/api/cron/sync-processing/route.ts`.

**GeoTIFF input (added alongside JPEG).** The upload accepts `.tif`/`.tiff` GeoTIFF files —
orthomosaics/DSMs from another survey or a prior processing run — right alongside ordinary JPEG
drone photos, in the same batch. File identity is decided by the real magic bytes
(`lib/geotiff-metadata.ts`'s `looksLikeTiff`/`looksLikeJpeg`), never by the filename extension or
browser-supplied MIME type alone, since either can lie. A JPEG gets its GPS/altitude/capture-date
read from DJI XMP (`lib/drone-metadata.ts`, unchanged); a TIFF instead gets its TIFF IFD walked for
the GeoTIFF georeferencing tags (pixel scale, tiepoint or full affine transform, and the
GeoKeyDirectory's CRS) — both are dependency-free byte-level parsers, no image-decoding library.
Either kind of location signal now counts toward the capture-quality "GPS metadata" check in
`buildCaptureQualityProfile`, so a fully-georeferenced GeoTIFF set is no longer wrongly flagged as
un-located just because it has no JPEG-style EXIF GPS. The original file is preserved as-is and
handed to NodeODM unmodified — there is no separate conversion/derived-artifact step, since NodeODM
already accepts the raw bytes over the wire regardless of image type; if a given TIFF genuinely
can't be reconstructed from, that surfaces as an ordinary `FAILED` processing state with the same
plain-language handling as any other bad photo set, not a special error path.

**Manual test — GeoTIFF upload:**
1. Under **"Upload photos,"** select one or more `.tif`/`.tiff` files (a georeferenced orthomosaic
   or DSM works well) alongside or instead of JPEGs.
2. **Expected result:** the file picker accepts them (the dropzone's accept list includes
   `.tif`/`.tiff` explicitly, since some OS file pickers don't map that extension to an `image/*`
   MIME type), and the selected-files summary line shows a GeoTIFF/JPEG split with total size.
3. Upload, then check the job's imagery — a GeoTIFF's stored metadata (`metadataJson.geotiff`)
   should show `hasGeoreferencing: true` and, when the source file's GeoKeyDirectory names one, an
   `epsg` code — this is internal/diagnostic data, not surfaced as GIS jargon in the contractor UI.
4. Queue processing as usual; the GeoTIFF source rows count toward the same image-count/quality gate
   as JPEGs.

**Automated coverage.** Playwright `tests/visual/viewer.spec.ts` ("job workspace scan tab, no model
yet").

**Manual test — upload and process (draft model, no NodeODM configured):**
1. Sign in with `editJob`. Open a job's **Scan & measure** tab.
2. Under **"Upload photos,"** pick a photo type (Drone photo / Top-down map / Before / After),
   optionally set flight height, capture date/time, and a note, then choose files and upload.
3. **Expected result:** the photos upload and appear associated with the job.
4. Click **"Build preview model"** (this exact label confirms `NODEODM_URL` is unset in your
   environment — if it instead reads **"Build 3D model,"** a real worker is configured, and results
   will reflect real geometry instead of a draft package).
5. **Expected result:** processing starts, status visibly moves through the pipeline (queued →
   processing → ready), and a model becomes available in the viewer once done.

**Manual test — processing failure:**
1. If you have a way to force a failure (e.g. a genuinely corrupt/empty upload, or by misconfiguring
   `NODEODM_URL` to an unreachable address and using the real-worker path), trigger one.
2. **Expected result:** the job shows a clear "processing failed" state with an error message, not
   a silently stuck "processing" spinner forever, and offers a retry path.

**Manual test — module-gating gap (documentation, not a defect to "fix"):**
1. As OWNER, set your company's trade to **Plumbing** on `/settings`.
2. Open any job's workspace.
3. **Expected result (current, as-built behavior):** the **"Scan & measure"** tab is still present
   and fully functional — confirming the finding in §2: `CompanyModule` is not read anywhere to
   hide this tab for non-roofing trades. Do not report this as a newly-discovered bug; it's the
   documented current state.

**Manual test — before/after comparison:**
1. On a job with existing imagery, find the comparison-creation control (`comparison-create-form.tsx`).
2. Drop/select a **Before** photo and an **After** photo, optionally add a note.
3. Click **"Create comparison."**
4. **Expected result:** button shows "Creating…", then the comparison appears — confirm both photos
   were also independently recorded as regular `BEFORE`/`AFTER`-tagged job imagery (they land in
   the general photo library too, not only inside the comparison record — this is deliberate, per
   the route's own code comment, so a before/after pair still shows up wherever a job's photos are
   otherwise listed).
5. Reopen the same comparison form on a job that already has one.
6. **Expected result:** the form supports refreshing/updating ("Refreshing…" state) rather than only
   ever creating a new, unrelated comparison each time.

**Pass criteria:**
- [ ] Upload accepts all five imagery types with their metadata fields.
- [ ] Upload accepts GeoTIFF (`.tif`/`.tiff`) files alongside JPEGs, detected by real file content
      rather than extension/MIME alone, with georeferencing recorded when present.
- [ ] Processing works end-to-end against the draft model package when no real worker is configured.
- [ ] A processing failure is surfaced clearly, not left as an infinite spinner.
- [ ] The Scan & measure tab's current lack of trade-gating is confirmed as-is, not assumed to be a bug.
- [ ] Before/after comparison photos are created and also appear in the job's general photo library.

**Fixed alongside this work:** `ImageryUploadForm` posted to `/api/jobs/[jobId]/imagery`, a route
that did not exist — every upload through this form was failing before `app/api/jobs/[jobId]/imagery/route.ts`
was added. If you're re-running this guide against a build from before this fix, upload will 404.

## 29. 3D Viewer & Manual Measurement

**What it does.** Two distinct viewer modes on the same underlying rendering stack (DRACO/GLTF via
three.js): an **internal, editable** viewer inside the job workspace's Scan tab, and a **public,
read-only** viewer embedded in the Client Hub and public documents — the public one is explicitly
"orbit, pan, zoom, and nothing else" (its own code comment). The editable viewer offers
**✨ Auto-detect roof** (boxes the roof, finds facets automatically), **Edit points** (nudge
auto-detected geometry), hand-measurement tools behind a **"More tools"** disclosure (Distance,
Area — each with a minimum point count: 2 for distance, 3 for area), automatic
ridge/hip/valley/eave/rake classification (requires at least 2 roof faces first), full Undo/Redo
with keyboard shortcuts (⌘Z/Ctrl+Z, ⌘⇧Z/Ctrl+Shift+Z), and an irreversible-feeling **"Clear all
measurements?"** confirmation before wiping everything.

**Who can use it.** Editable viewer: `editJob`. Public read-only viewer: anyone with the relevant
public document/hub link.

**Where.** Job workspace → Scan & measure tab (editable); public documents / Client Hub (read-only).

**Related code.** `components/dashboard/measure-viewer.tsx` (the large, primary editable-viewer
component), `components/public/hub-model-viewer.tsx` (read-only), `components/viewer/` (shared
scene-core/WebGL-capability/anime-scene/perf helpers).

**Automated coverage.** `tests/viewer-webgl-capability.test.ts`, `tests/viewer-fit.test.ts`;
Playwright `tests/visual/viewer.spec.ts`, `tests/visual/public-documents.spec.ts` (client hub,
which embeds the read-only viewer).

**Manual test — editable viewer, auto-detect:**
1. On a job with a ready 3D model, open the Scan tab.
2. Click **"✨ Auto-detect roof."**
3. **Expected result:** roof faces are detected and listed ("Your roof faces show up here" is the
   empty-state hint before this runs).
4. Use **"Edit points"** to nudge one detected face's boundary.
5. **Expected result:** the face's area/geometry recalculates live as you drag points.

**Manual test — hand measurement (More tools):**
1. Open **"More tools."**
2. Draw a **Distance** measurement (needs at least 2 points) and an **Area** measurement (needs at
   least 3).
3. **Expected result:** each shows a live-updating value (area in the display unit + "squares," a
   pitch ratio where applicable) as you place points.
4. Use **Undo** (⌘Z/Ctrl+Z) to remove your last point/measurement, then **Redo** (⌘⇧Z/Ctrl+Shift+Z).
5. **Expected result:** both work correctly and repeatedly, including across mixing auto-detected
   and hand-drawn edits.

**Manual test — ridge/hip/valley/eave/rake classification:**
1. With at least 2 roof faces present (auto-detected or hand-drawn), find the classification
   control.
2. **Expected result:** with fewer than 2 faces, it's disabled with a tooltip explaining why
   ("Auto-detect or draw at least two roof faces first"); with 2+, it runs and produces
   ridge/hip/valley/eave/rake lines.

**Manual test — clear all (destructive):**
1. With several measurements present, click **"Clear all."**
2. **Expected result:** a confirmation dialog titled **"Clear all measurements?"** appears before
   anything is actually removed.
3. Confirm.
4. **Expected result:** every measurement is gone; this is a real, effectively irreversible action
   (Undo history is reasonable to expect cleared too — confirm whether Undo can bring anything back
   after a Clear All, and note the actual behavior either way).

**Manual test — public read-only viewer:**
1. Open a job's public quote/hub link that includes a roof model.
2. **Expected result:** orbit/pan/zoom work; there is **no** Auto-detect, Edit points, measurement
   tool, or Clear-all control anywhere — confirm the entire editing toolset is absent, not just
   disabled-looking.

**Manual test — WebGL fallback:**
1. If you can disable WebGL in your browser (or use a browser/flag that lacks it), open the viewer.
2. **Expected result:** a graceful fallback message rather than a blank canvas or a JS crash —
   `tests/viewer-webgl-capability.test.ts` covers the pure capability-detection logic behind this;
   confirm the same graceful behavior live.

**Pass criteria:**
- [ ] Auto-detect, Edit points, and hand-drawn Distance/Area measurements all work and interoperate.
- [ ] Undo/Redo work via both keyboard shortcuts and any on-screen buttons.
- [ ] Ridge/hip/valley/eave/rake classification is correctly gated on having ≥2 roof faces.
- [ ] Clear All requires confirmation before destroying data.
- [ ] The public viewer offers orbit/pan/zoom only — zero editing controls, confirmed by their absence, not just being disabled.
- [ ] A WebGL-unavailable environment degrades gracefully.

## 30. AI Assistant (Google Gemini)

**This section reflects Aernova's AI features in their current, post-migration state.** As part of
the same work that produced this guide, every production AI call in Aernova was migrated from
Anthropic's API to Google's Gemini API. The historical implementation (Anthropic/Claude) is
preserved as a dated note in `docs/PLAN-CRM.md`; every behavior described below is what the app
does **today**, using Gemini.

### AI setup

1. Get a key at **Google AI Studio**: `https://aistudio.google.com/apikey`.
2. In your local `.env` (not `.env.example` — that file only holds a placeholder), set:
   ```
   GEMINI_API_KEY=your_real_key_here
   ```
3. Restart `npm run dev` (env vars are read at process start).
4. Sign in to Aernova as a role with `editJob`.
5. **Expected result:** AI controls now appear: **"Draft from a photo"** works fully at
   `/jobs/capture`, a **"Draft with AI"** button appears on the quote builder's Opening panel, a
   **"Draft a follow-up with AI"** link appears on an already-sent quote's share panel, and the
   **Assistant** floating button appears in the job workspace (bottom-right).

**Never put your real Gemini key in a commit, a test file, a screenshot, or this document.**

### Complete current AI feature inventory

Every AI feature in the app, and exactly what data each sends to Gemini:

| Feature | What it does | Data sent to Gemini | Where |
|---|---|---|---|
| **AI photo capture** | A photo → a suggested job name, plain-language description, and (only if genuinely matched) a real catalog service + its real price | The photo itself (image bytes), this company's own active `Service` catalog (name/unit/price) | `/jobs/capture` |
| **AI scope/opening draft** | Drafts a quote's `introTitle`/`introBody` | This job's roof/measurement/quote context (`buildRoofContext`), up to 3 of this company's own past **approved** quotes (tone/structure reference only) | Quote builder → Opening panel |
| **AI follow-up draft** | Drafts a nudge message for a quote that's gone quiet | This job's roof context, the quote's title/total, days since sent | Quote share panel (only once a quote has been sent) |
| **Roof assistant chat** | Free-form Q&A about a specific job's roof/quote, streamed | This job's roof/measurement/quote context, the conversation history (capped at 20 messages, 4000 chars each) | Assistant drawer's chat panel |
| **Job overview / summary** | A 3-5 sentence plain-language recap of a job | Same roof context as chat | Assistant drawer's "Job overview" (collapsed by default) |

**Company data isolation is preserved**: every one of these builds its context from exactly one
company's own job/catalog data (`buildRoofContext(jobId)`, `serviceCatalogForCapture(companyId)`) —
never another company's. Confirm this concretely in a multi-company test: as a user in Company A,
use the roof assistant on a Company A job, and confirm nothing about Company B's jobs, quotes, or
catalog could plausibly appear in a response (the query itself is scoped by `jobId`/`companyId`, not
filtered after the fact).

**What never changed with this migration:** the model never sets an actual price (only a real,
matched `Service.unitPriceCents` is ever used — a model-echoed number is always dropped, §"AI
capture manual test" Case B below); nothing AI-drafted saves or sends automatically — a human
reviews every field before it's saved (quote builder Save) or sent (the existing Email/link-share
action); the unattended quote-reminder cron never uses AI-drafted text (§25); rate limits are
unchanged (50 AI calls/job/day, 20 calls/user/minute, 20 AI-capture calls/company/day —
`lib/ai/rate-limit-policy.ts`).

**Related code.** `lib/ai/client.ts` (the Gemini client, `isAiConfigured()`, model routing),
`lib/ai/capture.ts` + `capture-response.ts`, `lib/ai/scope-draft.ts` + `scope-draft-response.ts`,
`lib/ai/quote-followup.ts`, `lib/ai/roof-context.ts` (shared context builder + system prompt),
`lib/ai/rate-limit.ts` + `rate-limit-policy.ts`, `app/api/jobs/[jobId]/ai/route.ts` (summary),
`app/api/jobs/[jobId]/chat/route.ts` (streaming chat), `app/(dashboard)/jobs/capture/actions.ts`,
`.../quotes/[quoteId]/actions.ts` (`draftQuoteScopeAction`), `.../quotes/[quoteId]/send-actions.ts`
(`draftQuoteFollowUpAction`), `components/dashboard/roof-assistant.tsx`, `ai-summary.tsx`,
`assistant-drawer.tsx`.

**Automated coverage.** `tests/ai-capture.test.ts` (hallucination-guard / pure parsing),
`tests/ai-scope-draft.test.ts` (pure parsing), `tests/ai-client.test.ts` (`isAiConfigured()` gating —
added as part of this migration), `tests/ai-rate-limit.test.ts` (rate-limit policy, provider-
agnostic). None of these make a live network call — they test the deterministic validation
boundary, which is identical regardless of which provider's SDK sits behind it.

### AI photo capture — manual test

1. **Case A — obvious catalog match.** With `GEMINI_API_KEY` set, go to `/jobs/capture`. Photograph
   (or upload a photo of) something that clearly matches one of your company's real catalog
   services (e.g. a shingle-covered roof section if you have a "Shingle repair" service). Submit.
   - **Expected result:** a draft appears with a plausible job name, an honest description of what
     the photo shows, and — since it genuinely matched — your **real catalog service's own price**,
     never a number invented by the model.
2. **Case B — no catalog match.** Photograph something with no plausible catalog match (e.g. a
   random household object, if your catalog is roofing-only).
   - **Expected result:** the draft has `serviceId: null` and no suggested price — **Aernova must
     never invent a service or a price here.** This is directly tested by
     `tests/ai-capture.test.ts`'s "a hallucinated serviceId is dropped, not trusted" case at the
     pure-logic level; this manual step confirms it holds true end-to-end with a real Gemini call.
3. **Case C — ambiguous photo.** Use a blurry, dark, or genuinely ambiguous photo.
   - **Expected result:** an honest, uncertain description — not a confident but wrong guess.
     Aernova's own product principle is "be honest about uncertainty"; the AI capture system prompt
     explicitly instructs the model not to invent damage or measurements it can't actually see.
4. **Case D — missing `GEMINI_API_KEY`.** Unset the key, restart the dev server, revisit
   `/jobs/capture`.
   - **Expected result:** the feature is **absent** — the page shows "AI capture isn't set up in
     this environment yet." with a link to the full manual form. No broken/greyed-out button.
5. **Case E — invalid Gemini API key.** Set `GEMINI_API_KEY` to a syntactically-plausible but
   invalid value, restart, and try a capture.
   - **Expected result:** a safe, plain-language error ("Couldn't draft a job from that photo." or
     similar) — never a raw provider error, never a stack trace, and **the uploaded photo is still
     saved** (confirmed in code: the upload happens before the AI call and the photo URL is
     returned even on a drafting failure) so the contractor doesn't lose the picture over an AI
     failure — they can still create the job manually with the photo attached.

### AI scope/opening draft — manual test

1. Open a real job with roof measurements/context (roofing companies) or at least some quote
   context. Open or create a quote for it.
2. Click **"Draft with AI"** on the Opening panel.
3. **Expected result:** the `introTitle`/`introBody` fields populate with a draft grounded in the
   job's real data — confirm it doesn't invent a measurement or pitch you don't actually have on
   the job.
4. **Do not click Save yet.** Reload the page (or navigate away and back without saving).
5. **Expected result:** your draft is gone — confirming nothing auto-saved; the AI draft only ever
   lands in component state until the quote's own normal Save.
6. Re-generate a draft, manually edit the text, then click the quote's own **Save**.
7. **Expected result:** your edited version (not the raw AI output) is what persists.
8. **Test the no-measurement case:** try this on a job with no roof context at all (e.g. a fresh
   plumbing job with nothing captured yet).
9. **Expected result:** a shorter, honest opening rather than padded generic claims — or a clear
   "not enough to draft from" style message, per the system prompt's own instruction to write a
   short, honest opening when the data is thin rather than pad with generic claims.

### AI follow-up draft — manual test

1. Create and **send** a quote (§17) — do not skip this; the follow-up draft only appears once
   `sentAt` is set.
2. On a **not-yet-sent** quote, confirm the follow-up-draft control is **absent** (verify the
   precondition before testing the happy path).
3. On the sent quote, find **"Draft a follow-up with AI"** on the share panel.
4. **Expected result:** an editable draft message appears, referencing the real quote (title, and
   implicitly its context) — never inventing a discount or deadline that doesn't exist (the system
   prompt explicitly forbids this).
5. Edit the draft text.
6. **Expected result:** nothing sends automatically — you still have to use the quote's own
   existing **"Email it to them"** action, and your edited text becomes the custom message on that
   same send path (not a separate, second send mechanism).
7. Discard the draft (navigate away without sending) and regenerate.
8. **Expected result:** a fresh draft generates cleanly, with no leftover state from the discarded one.

### Roof assistant chat — manual test

1. Open a job workspace, click the floating **Assistant** button (bottom-right).
2. **Expected result:** a drawer slides in; try one of the suggested prompts (e.g. "Explain this
   quote in plain language").
3. **Expected result:** a streamed response appears token-by-token (not all at once), grounded in
   the job's real numbers.
4. Ask a follow-up question referencing something you asked before.
5. **Expected result:** the assistant maintains conversation context correctly.
6. Ask something the job's data genuinely doesn't contain (e.g. about a measurement type you never
   captured).
7. **Expected result:** an honest "the data doesn't show that" answer, not an invented number.
8. Click **"Clear"** in the drawer header.
9. **Expected result:** the conversation resets.
10. Try sending more than 20 messages in one session (the server-side cap).
11. **Expected result:** older history is silently truncated server-side rather than erroring — the
    chat keeps working, just with a bounded context window.

### Job overview / summary — manual test

1. In the same Assistant drawer, find **"Job overview"** (collapsed by default).
2. Click **"Generate."**
3. **Expected result:** a 3-5 sentence plain-language recap of the job appears, covering roof
   type/size, key measurements, issues, and estimate/quote status — grounded in real data.
4. Click **"Refresh"** (the button relabels once a result exists).
5. **Expected result:** a fresh summary generates.

### Rate limits and errors — manual test

1. Exhaust the per-minute burst limit: send AI chat messages rapidly (20+ in under a minute).
2. **Expected result:** you're blocked with a clear message ("You're sending messages too quickly.
   Wait a moment and try again.") and a `Retry-After` — not a silent failure.
3. If practical, exhaust the daily per-job cap (50) or the daily per-company capture cap (20).
4. **Expected result:** a clear message naming the actual limit and that it resets within 24 hours.
5. With a valid key but Gemini temporarily unreachable (e.g. block the relevant domain at your
   network level briefly, if you can do so safely), try an AI action.
6. **Expected result:** a safe, generic "couldn't reach the assistant" style message — never a raw
   provider stack trace or API error surfaced to the user.

**Pass criteria:**
- [ ] All five AI features (capture, scope draft, follow-up draft, chat, summary) work correctly against a real Gemini key.
- [ ] Every AI feature is completely absent (not disabled) without `GEMINI_API_KEY`.
- [ ] AI capture never invents a service or price — only a real catalog match is ever used.
- [ ] Nothing AI-generated ever saves or sends without an explicit human action afterward.
- [ ] The unattended quote-reminder cron never uses AI-drafted text.
- [ ] Rate limits are enforced and produce clear, non-technical error messages.
- [ ] Company data isolation holds — no feature's context ever includes another company's data.

## 31. End-to-End Journeys

These exercise multiple features together, in the order a real business owner would actually
touch them. Each references the section above with the detailed steps for its own sub-part —
treat these as a checklist of sequence and handoffs, not a duplicate of the click-by-click detail.

### E2E 1 — Normal one-off job

1. Public request form (§11) or office-created request (§11) →
2. Convert to job (§11) — status starts `LEAD` →
3. Book an assessment visit (§15) — status advances to `INSPECTION` →
4. (Roofing) upload imagery, process, measure (§28-29) →
5. Advance through `PROCESSING → READY_FOR_QUOTE` →
6. Build and send a quote (§17) — status `QUOTED` once sent/approved →
7. Homeowner views and approves the quote publicly (§17) →
8. Book the work visit, advance to `SCHEDULED` (§15) →
9. Crew works the visit from `/today`, submits field evidence (§16) →
10. Office completes the office-side quality check — job unlocks `COMPLETED` (§16) →
11. Advance to `COMPLETED` →
12. Raise an invoice from the approved quote (§20), send it →
13. Homeowner pays (online or the office records a manual payment) (§21) — invoice reaches `PAID` →
14. Create and send a warranty (§22), homeowner acknowledges →
15. (Optional) request a review (§9.4's dashboard note, §24) →
16. Archive the job.

**Verify at each handoff:** the right role can perform that step and no other role can skip ahead
(e.g. a SALES-only user cannot raise the invoice in step 12).

### E2E 2 — Recurring job

1. Create/select a client →
2. Create a job, and instead of a one-off visit, use **"It repeats"** to set a `RecurrenceRule`
   (§15) — weekly, no end date →
3. Confirm visits generate on `/schedule` across the coming weeks (bounded horizon, not infinite) →
4. Crew completes several individual visits from `/today` over time (§16) →
5. Track progress via the crew's `ProgressPicker` and/or the office's manual `progressPercent`
   (§16) — confirm both can coexist without one silently overwriting the other →
6. Bill via a progress draw or per-visit invoicing rather than one final invoice (§20) →
7. Record payment(s) against each invoice (§21).

**Verify specifically:** a manually-moved individual occurrence is never regenerated over when the
recurrence rule later extends further (§15).

### E2E 3 — Change order

1. Start from a job with an already-`APPROVED` quote (a prerequisite, not optional) →
2. Create a change order for additional scope (§18) →
3. Review internally, then send it (§18) →
4. Homeowner approves publicly, or office records a phone/driveway approval (§18) →
5. Confirm the job's effective contract value now includes the change order's amount →
6. Raise/adjust an invoice to reflect the new total (§20).

### E2E 4 — Additional Work

Run this as **three separate sub-journeys**, since the three paths have genuinely different
behavior (§19):

1. **Below threshold:** on a no-quote job, bill a small item directly — confirm it sends
   immediately with no review step.
2. **At/above threshold, default path:** bill a larger item — confirm it requires homeowner review
   before it can send, and that the homeowner's public confirmation actually clears the gate.
3. **Office override:** bill a larger item but choose **Owner Override** with a valid 20-500
   character note — confirm it sends immediately and the override is recorded as a visible audit
   trail (not silently indistinguishable from a normal invoice).

### E2E 5 — Roofing / Aerial (roofing-enabled company)

1. Create a job for a roofing-trade company →
2. Upload drone/site imagery (§28) →
3. Build the model (real NodeODM worker, or the built-in draft package if unconfigured) →
4. Once ready, open the 3D viewer, auto-detect roof faces, edit points as needed (§29) →
5. Add hand-drawn measurements for anything auto-detect missed →
6. Run ridge/hip/valley/eave/rake classification →
7. Generate a quote from the resulting measurements (§17) →
8. Confirm the public quote/client-hub result shows the **read-only** viewer with the same model,
   with zero editing controls present (§29).

### E2E 6 — AI-assisted job creation

1. With `GEMINI_API_KEY` configured, go to `/jobs/capture` →
2. Take/upload a photo of something matching a real catalog service (§30, Case A) →
3. Confirm the drafted job name, description, and catalog-sourced price →
4. Pick/create the client, review and edit the draft, save →
5. Confirm the resulting job has the photo attached and (if a service matched) a draft quote
   already sitting on it, ready for further editing (§12's AI capture manual test, §30).

### E2E 7 — AI quote drafting and follow-up

1. On a real job with genuine context (measurements, or at least some notes), open/create a quote →
2. Use **"Draft with AI"** for the opening (§30) →
3. Review and hand-edit the AI draft →
4. Save the quote, then send it (§17) →
5. Wait (or simulate time passing) until the quote has gone unanswered →
6. Use **"Draft a follow-up with AI"** (§30) →
7. Review and edit the follow-up draft →
8. Send it through the existing **"Email it to them"** action — confirm this is the same send path
   a manually-typed message would use, not a separate AI-send mechanism.

### E2E 8 — Crew day

1. As OWNER/ADMIN, assign a CREW member to today's visits (§15) →
2. Sign in as that CREW member →
3. Open `/today`, confirm only your own assigned visits are visible (§16) →
4. For one visit: submit quality-check field evidence (site cleaned, photos, notes) →
5. Update the job's progress state via the `ProgressPicker` →
6. Mark the visit complete →
7. Sign back in as an office-tier user, confirm the crew's evidence appears read-only on the
   office's Quality Check panel, and that completing the job still requires the office's own
   separate sign-off (§16).

### E2E 9 — Workflow customization

1. As OWNER, on `/settings/workflow`, rename a stage and disable another one not currently in use
   (§13) →
2. Open a job and confirm the renamed stage's label updates everywhere, while its underlying
   description text is unchanged (documented current limitation, §13) →
3. Confirm the disabled stage no longer appears as a forward-advance choice for jobs not in it →
4. Find or move a job into the now-disabled stage, and confirm it still displays correctly with the
   disabled-stage warning note (§12), and still surfaces on `/dashboard`'s disabled-stage list
   (§9.4), oldest-stuck-first →
5. Advance that job out of the disabled stage — confirm this still works normally.

Do **not** attempt to test drag-to-reorder stages or adding a custom stage beyond the fixed
`JobStatus` enum — neither exists in current code (§13, §32 appendix).

### E2E 10 — Public customer experience

Test all four document types plus the hub and the request form, each with:

1. **Valid token** — confirm the document renders correctly, contractor-branded, with the correct
   action available (Approve/Request changes for a quote; Approve for a change order; Confirm for a
   warranty; Pay/review for an invoice).
2. **Invalid token** — confirm a clean, uniform "not found" state (§26).
3. **Already-completed action** — e.g. revisit an already-approved quote's link, or an
   already-confirmed warranty's link — confirm it shows the completed state rather than re-offering
   the action or erroring.
4. **Mobile** — confirm each document is fully usable at 390px.
5. **Print** — confirm print preview hides all interactive controls (§26).

## 32. Automated Test Commands

Every command below is copied directly from `package.json` — nothing here is invented.

| Command | What it runs | Expected result as of this audit |
|---|---|---|
| `npm run lint` | ESLint over `app`, `components`, `lib` | 0 errors, ~24 pre-existing warnings (`<img>`-vs-`next/image` suggestions, one unused-variable warning) |
| `npx tsc --noEmit` | TypeScript project-wide typecheck | Clean, 0 errors |
| `npm test` | `node --test` over every `tests/*.test.ts` (pure/unit tests, no database) | 527 tests total as of this commit: 526/527 in environments that reproduce the known timezone/ICU issue below; otherwise 527/527 |
| `npm run test:visual` | Playwright visual-regression suite (`tests/visual/`) — real Chromium, real Clerk auth, real seeded data | 41/41 passing; requires `npm run db:start`, `npm run test:visual:seed`, and `.env.playwright.local` sourced first — see `tests/visual/README.md` |
| `npm run build` | Production Next.js build | Succeeds; current warnings are the pre-existing broad NodeODM filesystem trace and a skipped Sentry sourcemap upload caused by a stale local `SENTRY_AUTH_TOKEN` |
| `npx astryx doctor` | Astryx design-system dependency/config health check | 4 passed, 2 pre-existing informational warnings (no `@astryxdesign/theme-*` package; agent docs present without Astryx section markers — both deliberate), 0 failures |
| `graphify update .` | Regenerates the repo's knowledge graph (routes/models/actions/imports) | Zero import cycles, zero dangling/missing-endpoint/self-loop edges as of this audit |
| `npm ls three` | Confirms a single, non-duplicated `three.js` version across the dependency tree | One `three@0.184.0`, deduped under `animejs` and `three-mesh-bvh` |

**Known pre-existing CI issue, reported honestly:** the GitHub Actions Linux runner fails
`tests/schedule-timezone.test.ts:21` ("the same 8am is 4pm UTC in the winter") — a real
environment-specific difference between the Linux CI runner's timezone/ICU data and macOS local,
confirmed to **predate** both the Premium UI Redesign completion pass and this Gemini migration
(reproduced identically on a commit before either). It is not hidden here: as of this audit, CI
shows this one known failure and otherwise passes. Do not treat a green local `npm test` plus this
one specific CI failure as a regression — it is a known, tracked, pre-existing gap, not something
this pass introduced or is required to fix.

## 33. Manual Release Matrix

| Feature area | Desktop Chrome | 390px (Playwright emulation) | Dark | Light | Keyboard | Real iPhone Safari | Real Android Chrome | Print | External integration | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Shell/nav | Automated | Automated | Automated | Automated | Manually verified (collapse/expand) | Still needs real device | Still needs real device | N/A | N/A | Mostly automated |
| Jobs/quotes/invoices lists | Automated | Automated | Automated | — | — | Still needs real device | Still needs real device | N/A | N/A | Automated coverage strong |
| Pipeline board | Automated | Automated | Automated | — | Manually verified (keyboard Move control exists) | Still needs real device | Still needs real device | N/A | N/A | Good |
| Public documents (q/i/co/w/hub) | Automated | Automated (mobile spec) | Automated | — | — | Still needs real device | Still needs real device | Still needs manual print-preview check | N/A | Automated + one manual gap (print) |
| Client Hub | Automated | — | Automated | — | — | Still needs real device | Still needs real device | N/A | N/A | Good |
| 3D viewer | Automated (WebGL capability unit tests + one visual spec) | — | Automated | — | — | Still needs real device (touch orbit) | Still needs real device | N/A | N/A | Partial — interaction paths largely manual-only |
| AI features | — (no automated live-Gemini test in CI) | — | — | — | — | — | — | N/A | **Still needs a real Gemini smoke test** (§30 — not performed with a live key during this audit) | Manual-only, live-key test still outstanding |
| Stripe payment | — | — | — | — | — | — | — | N/A | Still needs a real test-mode Stripe walkthrough | Manual-only |
| Calendar feed | — | — | — | — | — | — | — | N/A | Still needs a real external calendar app subscription test | Manual-only |
| Reduced motion / prefers-contrast / prefers-reduced-transparency | — | — | — | — | — | — | — | N/A | N/A | Still needs a live OS-level toggle-and-observe pass |
| Native 200% browser zoom | — | — | — | — | — | — | — | N/A | N/A | Still needs a real device/browser pass (CSS-zoom approximation only, previously) |

**Legend:** "Automated" = covered by `tests/visual/` (Playwright) or a unit test with real
assertions. "Manually verified" = checked live in this or a prior audit pass, not automated.
"Still needs …" = a genuine, currently-open gap — do not report these as newly discovered defects;
they were already known and are listed here for completeness, matching the Premium UI Redesign
final audit's own honest "MANUAL RELEASE CHECKS" list.

## 34. Planned / Not Current Features

**These do not exist in current code.** Do not test for them; their absence is expected, not a bug.

- **Workflow Phase 13A — stage reordering.** `docs/AERNOVA_PROJECT_WORKFLOW/WORKFLOW_PHASE_13_PLAN.md`
  describes drag-to-reorder for `CompanyWorkflowStage` rows. Current code only supports rename and
  enable/disable (§13); `CompanyWorkflowStage.sortOrder` exists in the schema but is explicitly
  "display-only in v1 — no drag-and-drop reordering yet" per the schema's own comment, and
  `WorkflowStagesForm` offers no reordering UI at all.
- **Workflow Phase 13B — a usage checkpoint.** Planning-only; no corresponding code found.
- **Workflow Phase 13C — a custom-stage schema.** Planning-only; `JobStatus` remains a fixed,
  closed enum with no company-defined custom stages anywhere in the schema or application code.
- **`CompanyModule`-based feature gating.** The enum (`ROOFING`, `AERIAL_MEASUREMENT`,
  `AI_ASSISTANT`) exists in the schema and is written once at company creation, but — as documented
  throughout this guide (§2, §28) — is never read anywhere to actually hide or show a feature. AI
  gating is entirely `GEMINI_API_KEY`-driven; roofing/aerial-measurement UI is currently
  unconditional for every company regardless of trade.
- **Client role editing.** `/team` offers no "change this member's role" control once someone has
  accepted an invite — only remove-and-re-invite.
- **Voice capture** for AI job drafting. Explicitly deferred as a "fast-follow" in the original AI
  capture implementation record — photo-only ships today.
- **A general multi-provider AI abstraction.** This migration deliberately did not build a
  provider-factory framework — Aernova uses Gemini directly through one small, shared
  `lib/ai/client.ts`, matching the "don't overbuild" instruction this migration was performed
  under. There is no code anywhere that would let a second AI provider be swapped in without
  editing the same five call sites this migration touched.
- **Gemini explicit context caching.** The historical Anthropic implementation used prompt caching
  (`cache_control: ephemeral`) to reduce the cost of repeated roof-context prefixes across chat
  turns. This was **not** ported — it's a cost optimization, not a functional behavior, and most
  jobs' roof-context text is well under typical context-caching token minimums anyway. Every AI
  call still receives the full, correct context regardless.
- **Gemini `responseJsonSchema` strict structured-output enforcement.** AI capture and scope-draft
  use Gemini's JSON mode (`responseMimeType: "application/json"`, guaranteeing syntactically valid
  JSON) but not a full field-level `responseJsonSchema`. The existing pure validators
  (`parseCaptureResponse`, `parseScopeDraft`) remain the real safety net regardless, unchanged by
  this migration.

## 35. Non-Feature Routes (completeness-audit note)

Every route under `app/` was checked against this guide (§A of the completeness audit performed
while writing it). These exist in the repository, are intentionally excluded from the feature
sections above, and are recorded here so nothing is silently unaccounted for:

- **`/` (root)** — a pure redirect (`app/page.tsx`): signed-in → `/dashboard`, signed-out →
  `/sign-in`. Not a feature in its own right.
- **`/internal/design-system`, `/internal/design-system/primitives`, `/internal/astryx-preview`** —
  OWNER-only, deliberately unlinked from any nav, internal developer/design tooling for reviewing
  the Astryx component library and design tokens live. Not a product feature; do not include in a
  customer-facing test pass.
- **`/phase-0` and its sub-routes** (`app/(prototype)/phase-0/*`) — an early, superseded design
  prototype from the Premium UI Redesign's Phase 0, kept in the repo as a historical artifact, not
  linked from production nav, not the current design system. Do not test this as current Aernova UI.
- **`/privacy`, `/terms`** — static legal pages. Verify they load and their content is accurate
  (§30's provider addendum specifically updated `/privacy`'s AI-processor disclosure from
  Anthropic to Google as part of this migration — worth a quick read-through to confirm it now
  correctly names Google/Gemini, not Anthropic/Claude), but there's no interactive behavior to
  script a manual test around.
- **`app/(dashboard)/*/loading.tsx` files** (one per authenticated route) — Next.js loading-state
  skeletons, not independently testable features; they're exercised implicitly by every other
  manual test in this guide (watch for a skeleton flash on slow connections, not a blank screen).
- **`/api/jobs/[jobId]/processing/[imageryId]/{download,mesh}` routes** — non-UI data endpoints
  (serving the raw processing output/mesh file) consumed by the 3D viewer (§29) rather than
  visited directly; covered implicitly by §29's manual tests, not as their own feature section.

No other route, model, server action, or test file was found without a home in §7 onward or this
note during this audit's cross-check.
