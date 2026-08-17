# Premium UI Redesign — Phase 6 Implementation Record

**Phase:** 6 — Public, onboarding, and authentication surfaces
**Companion plan:** [`PREMIUM_UI_REDESIGN_PLAN.md`](./PREMIUM_UI_REDESIGN_PLAN.md)
**Prior phases:** [`PREMIUM_UI_PHASE_5_IMPLEMENTATION.md`](./PREMIUM_UI_PHASE_5_IMPLEMENTATION.md) (operational workflow migration, the immediately-preceding phase)
**Branch:** `feature/astryx-integration` (same branch as Phases 0–5).
**Status:** Complete for the scope actually executed (§1, §22). Not a claim of full 120-step live-device/Lighthouse coverage — see §21.

This is the Premium UI Redesign's Phase 6, not Workflow Phase 6 — those are separate initiatives that happen to share a number (see [`../AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md`](../AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md)).

## 1. Phase scope

Per `PREMIUM_UI_REDESIGN_PLAN.md` §11's Phase 6 section (re-read directly, not assumed — confirmed the "Financial, administrative, and public surfaces" wording some historical drafts use is stale; the current file's Phase 6 is exactly "Public, onboarding, and authentication surfaces," matching what this task was given): warranties, onboarding and authentication, and all public share/document routes. Quotes/Invoices/Change Orders/Reports/Team/Settings were Phase 5's scope and were confirmed already migrated — not reopened here except where a genuinely shared Phase 6 primitive change required it (none did; authenticated Quote/Invoice/Change-Order route files were not touched).

## 2. Documentation read before starting

In order: `PREMIUM_UI_REDESIGN_PLAN.md`, `PREMIUM_UI_PHASE_3_IMPLEMENTATION.md` (document primitives — the load-bearing one for this phase), `PREMIUM_UI_PHASE_5_IMPLEMENTATION.md` (baseline numbers), [`../PRODUCT.md`](../PRODUCT.md), [`../DESIGN.md`](../DESIGN.md) (paper-token section), [`../AERNOVA_DESIGN_REFERENCE.md`](../AERNOVA_DESIGN_REFERENCE.md), [`../AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md`](../AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md) (Warranty sections), [`../AERNOVA_PROJECT_WORKFLOW/WORKFLOW_PHASE_10_IMPLEMENTATION.md`](../AERNOVA_PROJECT_WORKFLOW/WORKFLOW_PHASE_10_IMPLEMENTATION.md) (Warranty's own implementation record). `docs/phase-0/*` was not re-read line by line this phase — Phase 1's rewrite of `DESIGN.md` already absorbed its decisions, and Phase 3/5 already cite it where it matters.

## 3. Worktree start

`git branch --show-current` → `feature/astryx-integration` (unchanged). `git status --short` before any edit showed only this session's prior work (a documentation-path-reorganization pass — 62 files, doc/comment path citations only, no code behavior change) plus the untouched large pre-existing in-flight body of work every prior phase has documented (Workflow Phases 1–13, Premium UI Phases 0–5's own files). Nothing was reset, stashed, or cleaned. `git diff --stat` at the end of this phase: 69 files changed, 277 insertions, 223 deletions (includes the pre-existing doc-path-reorg diff from earlier in this session, not just Phase 6's own edits).

## 4. Files edited

```
app/(public)/q/[token]/page.tsx
app/(public)/i/[token]/page.tsx
app/(public)/co/[token]/page.tsx
app/(public)/w/[token]/page.tsx
app/(public)/hub/[clientToken]/page.tsx
app/(auth)/sign-in/[[...sign-in]]/page.tsx
app/(auth)/sign-up/[[...sign-up]]/page.tsx
components/onboarding/onboarding-form.tsx
components/dashboard/warranty-panel.tsx
lib/warranty.ts
```

## 5. Files added

```
lib/clerk-appearance.ts
PREMIUM_UI_PHASE_6_IMPLEMENTATION.md   (this file)
```

## 6. Files removed

None. No component was deleted — only markup shells inside existing files were replaced with Phase 3 primitives (§9). `WARRANTY_STATUS_META`'s `badge` field was replaced with a `tone` field in the same file (§13), not a file removal.

## 7. Phase 6 route inventory

Built from `find app -type f` plus a `grep` for `shareToken|clientToken|companySlug|calendarToken` across `app/`, not assumed from the plan document alone. Every route under `app/(public)/`, `app/(auth)/`, `app/onboarding/`, and — because it shares the "printable, no-app-shell" architecture even though it requires auth — `app/(report)/` was inspected directly.

| Route | Purpose | Audience | Auth model | Interactive actions | Branding source | Doc type | Client components |
|---|---|---|---|---|---|---|---|
| `/q/[token]` | Public quote | Homeowner | Share token | Approve, request changes, tick optional extras | `DocumentBrand` (contractor) | Formal document | `QuoteDecisionProvider`, `QuoteExtras`, `QuoteTotals`, `QuoteResponse` |
| `/i/[token]` | Public invoice | Homeowner | Share token | Pay (Stripe), confirm additional-work review | `DocumentBrand` | Formal document | none (fully server-rendered except two `<form>` islands) |
| `/co/[token]` | Public change order | Homeowner | Share token | Approve (approval-only, no decline door) | `DocumentBrand` | Formal document | `ChangeOrderApproval` |
| `/w/[token]` | Public warranty | Homeowner | Share token | Acknowledge (checkbox + typed name) | `DocumentBrand` | Formal document | `WarrantyAcknowledgement` |
| `/hub/[clientToken]` | Client Hub — every job's quotes/invoices/visits/roof report in one place | Homeowner | Share token | Links out to `/q`,`/i`; no own actions | `DocumentBrand`-equivalent inline (name/phone) | Public transactional/share surface (spans multiple jobs, not one formal record) | `HubModelViewer` (untouched, opaque per §85) |
| `/request/[companySlug]` | "Request a quote" door | Prospective customer | `Company.slug` (permanent, not a minted token) | Submit form | Company name/phone, inline | Public transactional/entry surface | `RequestForm` |
| `/join/[token]` | Team invite acceptance | Invited crew/office member | Invite token + cookie-parked before Clerk round trip | Sign up (Clerk modal) | Aernova (this is an account-creation flow, not a customer document) | Public transactional surface | `SignUpButton` (Clerk) |
| `/calendar/[token].ics` | Subscribable schedule feed | Calendar app (Google/Apple), not a person | `Company.calendarToken` | none (GET only, no page) | n/a | Not a UI route — `Response` with `text/calendar` body | none |
| `/sign-in`, `/sign-up` | Authentication | Anyone without a session | Clerk | Sign in / sign up | Aernova (plain text, see §16) | Focused Entry | `SignIn`/`SignUp` (Clerk) |
| `/onboarding` | First-run company setup | New company owner | `resolveCompanyContext()` (not `requireCompanyContext` — see the page's own comment) | Trade/province/workflow-template pick, submit | Aernova (implicit, app chrome) | Focused Entry | `OnboardingForm` |
| `/jobs/[jobId]/report` | Printable job report | Authenticated office/estimator (`viewMoney`) | Full Clerk session + company scope | Print (browser) | n/a (internal report, not customer-facing) | Formal printable document, but **authenticated**, not public | `PrintReport` |

## 8. Route classification (Step 2)

- **A — Formal printable document:** `/q`, `/i`, `/co`, `/w` (all four migrated to Document primitives this phase — §9), plus the authenticated `/jobs/[jobId]/report` (already server-first/print-safe from prior work; not touched — no bug found, and it's out of the "public" scope this phase's acceptance criteria actually describe).
- **B — Public transactional/share surface:** `/hub/[clientToken]` (migrated its outer document shell — §12), `/request/[companySlug]` (left as-is — already a focused customer-entry composition per the plan's own explicit instruction not to force `DocumentSurface` here), `/join/[token]` (left as-is — already a minimal Focused-Entry-shaped `Shell`, no bug found).
- **C — Public viewer surface:** `HubModelViewer` inside `/hub/[clientToken]` — untouched, treated as opaque (§17).
- **Not a UI route:** `/calendar/[token].ics` — a Response body, no page to migrate.

## 9. Document mode — primitive adoption

Phase 3 built `DocumentSurface`, `DocumentHeader`, `DocumentSection`, `DocumentMeta`, `DocumentRule`, `DocumentTotalRow`, `DocumentFooter` (`components/ui/document.tsx`) specifically so Phase 6 could "production-prove" them (Phase 3 §25/§60/§73). This phase is that production proof:

- **`DocumentSurface`** replaced the hand-typed `rounded-2xl border border-paper-rule bg-paper-document p-6 sm:p-10` article shell on all four formal documents plus Hub's header block and each per-job Hub section.
- **`DocumentHeader`** replaced the hand-typed eyebrow+h1 pair on all four (quote's had no eyebrow before and still doesn't — `title` only; invoice, change-order, and warranty all had an eyebrow-shaped label already and now use the primitive's `eyebrow`/`title` props for it).
- **`DocumentMeta`** replaced the two-column "Prepared for / Sent" grid on quote, the "Billed to / Issued / Due" grid on invoice, and the "From / For / Property" grid on warranty. Change order's meta was folded into the header's `eyebrow` (it was already a single line, not a grid) — no `DocumentMeta` needed there.
- **`DocumentRule` + `DocumentTotalRow`** replaced the invoice page's hand-rolled totals `<dl>`/`Row` helper — this was Phase 3's own explicitly named migration target (§60 of that record: *"Invoice page's hand-rolled totals `<dl>`... Reimplements `QuoteTotals`'s shape independently → `DocumentTotalRow`... Target phase: Phase 6"*) — and the change order page's single "Adds to your contract" row.
- **`DocumentFooter`** replaced the warranty page's quiet version/confirmed-date line.
- **Deliberately not touched:** `QuoteTotals` and `DocumentBrand` (`components/public/`) — Phase 3's own KEEP list (§61: *"components/public/document-brand.tsx, components/public/quote-totals.tsx"*). Quote's totals still render through `QuoteTotals` exactly as before; only the surrounding document shell around it changed.

No new document primitive was created. No `DocumentSurface`/`DocumentHeader` prop was added or changed — all four (five, including Hub) call sites fit the existing API without modification.

## 10. A real gap this pass closed: `min-w-0` on the grid child

`DocumentSurface` has no `className` prop (Phase 3 kept it intentionally thin — a single fixed shell, not a configurable one). The quote page's original `<article>` carried `min-w-0` because it sits in a `lg:grid-cols-[minmax(0,1fr)_18rem]` grid alongside `QuoteResponse`; without it, a long unbroken string (a long line-item description, a long URL) would push the whole grid column wider instead of wrapping inside it — a real, if narrow, regression risk the primitive's fixed API can't express on its own. Fixed by wrapping `<DocumentSurface>` in a `<div className="min-w-0">` at that one call site rather than adding a `className` prop to the primitive (the other three formal documents and Hub are single-column `max-w-3xl` layouts and don't need it).

## 11. A real bug this pass fixed: change order's browser-tab title

`app/(public)/co/[token]/page.tsx` was the one formal document that never overrode `app/(public)/layout.tsx`'s generic `"Your quote"` `metadata` — invoice, warranty, hub, and request all already had their own `export const metadata` (warranty's fix is documented in `WORKFLOW_PHASE_10_IMPLEMENTATION.md` §"Public page behavior" as precedent for exactly this class of bug). Added `title: "Your change order"`, matching the established pattern. Live-verified in §19 — the browser tab correctly reads "Your change order" now.

## 12. Client Hub

Migrated the outer header block and each per-job `<section>` to `DocumentSurface` (§9). `HubModelViewer` was not opened, imported differently, or otherwise touched — it remains an opaque Phase 7 component, exactly as instructed. The "Nothing to show yet" empty state (`border-dashed`) was deliberately left as a plain `<div>`, not `DocumentSurface` — a dashed border is how this codebase already signals "empty," and `DocumentSurface` has no variant for that; forcing it in would have erased a real, working empty-state pattern for no benefit.

## 13. Warranty — public page and authenticated panel

**Public `/w/[token]`:** migrated to Document primitives (§9). Business logic untouched — `markWarrantyViewed`, `confirmWarrantyAction`, the `WarrantyAcknowledgement` component's fields (`confirmationChecked`, `signerName`, server-side IP capture) are byte-for-byte the same. Live-verified against the seeded `CONFIRMED` warranty (§19) — confirmed state, signer name, long-form date, and version footer all render correctly through the new primitives.

**Authenticated `WarrantyPanel` (`components/dashboard/warranty-panel.tsx`):** Phase 5 explicitly deferred this panel's presentation migration to Phase 6 (§34 of the original task brief; Phase 5's own record lists Warranty as untouched). This phase migrated only the status badge: `WARRANTY_STATUS_META`'s ad hoc `badge: string` className field (`lib/warranty.ts`) was replaced with a `tone: StatusTone` field, and `WarrantyPanel` now renders the shared `Status` primitive (`variant="solid"`) instead of a hand-typed `<span>` — the same `*_STATUS_META` → `Status` migration pattern every other domain in Phase 4/5 already used. `TemplatePicker`, `DraftEditor`, and `ConfirmedSummary`'s own layout, the template-duplication/editing forms, and every server-action wiring were **not** restructured — they were judged low-duplication, already-clean, and not worth the regression risk for a phase already carrying four other document migrations. `isWarrantyEditable`'s server-side confirmed-immutability check (`lib/warranty.ts`) was not touched.

Confirmed no other consumer of `WARRANTY_STATUS_META.badge` existed before removing it (`grep` — only `warranty-panel.tsx` and the definition itself; `tests/warranty.test.ts` doesn't reference `badge`).

## 14. Onboarding

Read the actual current flow (`app/onboarding/page.tsx`, `app/onboarding/actions.ts`, `components/onboarding/onboarding-form.tsx`) before changing anything, per the task's own instruction not to design from old docs alone. It is already a single card, one step visible at a time, Focused Entry in spirit — but it had **no visible progress indicator** for its two steps, a real gap against the plan's own Phase 6 acceptance language ("visible progress where multi-step"). Added a plain `Step {n} of 2` line (`aria-live="polite"`) above the form body. Nothing else changed: `trade`/`province`/`workflowTemplateId` selection, the single-`<form>`-submits-once architecture, and `completeOnboardingAction`'s contract are untouched.

## 15. Authentication

Read the actual Clerk integration first (`app/(auth)/sign-in`, `app/(auth)/sign-up`, `app/layout.tsx`'s `ClerkProvider`) — both pages use Clerk's hosted `<SignIn>`/`<SignUp>` with no `appearance` prop at all before this phase (unthemed, default Clerk chrome).

- **Theming:** added `lib/clerk-appearance.ts`, an `appearance.variables` object read from the same CSS custom properties every other authenticated surface uses (`--color-action` for `colorPrimary` — the app's real ink/ground-inversion action token, never measurement cyan, per `docs/DESIGN.md`'s Readout Rule) so it flips with light/dark automatically. Only `variables` is set — no `elements` overrides, since Clerk's internal class names aren't a stable API surface to hand-style against (the plan's own §59: "prefer configuring/theming through supported APIs"). The `impeccable` design hook flagged an initial `borderRadius: "0.75rem"` as outside `DESIGN.md`'s documented radius scale — corrected to `0.375rem` (`{rounded.md}`, the documented 6px button radius), not silenced.
- **Aernova identity:** added a plain-text `Aernova` line above the Clerk widget on both pages — the same interim treatment `components/dashboard/shell/shell-chrome.tsx` already uses (`text-sm font-semibold text-ink-primary` / `text-lg` here for the larger single-purpose page), not a logo image or a reconstructed serif wordmark. The brand-asset blocker (§20) is unchanged — no production-ready vector/transparent master exists in the repo (confirmed by re-checking `docs/AERNOVA_DESIGN_REFERENCE.md` §5.2, which still lists it as the outstanding blocker), so this phase did not attempt to build one.
- **Not touched:** Clerk provider architecture, `signUpUrl`/`signInUrl`/`fallbackRedirectUrl` props, middleware/proxy auth boundaries, the `/join/[token]` invite-cookie flow, or any password/OAuth/MFA mechanic. No `@clerk/types` package was added — the `appearance` object is structurally typed against `<SignIn>`/`<SignUp>`'s own prop type rather than importing a type that isn't a direct dependency (confirmed clean by `tsc`, §18).

## 16. Brand-asset blocker — re-searched, still real

Per the task's explicit instruction to search again before touching Aernova identity: `docs/AERNOVA_DESIGN_REFERENCE.md` §5.1/§5.2 and the repo's actual asset files (`app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`, `public/icon-192.png`, `public/icon-512.png`) were re-checked. No SVG/vector master, no transparent lockup, exists anywhere in the repo. The 500px JPEG reference remains direction-approval-only, per the design reference's own stated conclusion. Nothing in this phase traced it, approximated the wordmark in a font, or upscaled it — the interim plain-text treatment (§15) is the safe path the task itself specified.

## 17. Viewer boundary

`components/public/hub-model-viewer.tsx` was not opened for editing. `app/(public)/hub/[clientToken]/page.tsx`'s import of it (`import { HubModelViewer } from "@/components/public/hub-model-viewer"`) is unchanged — same import, same props (`glbUrl`), same position in the surrounding markup, now just inside `DocumentSurface` instead of a hand-typed `<div>`. No Three.js code was read or modified anywhere this phase.

## 18. Validation results

| Check | Phase 6 result | Phase 5 baseline | Delta |
|---|---|---|---|
| `npm run lint` | **0 errors, 24 warnings** | 0 errors, 24 warnings | none — one warning was briefly introduced (an unused `DocumentFooter` import on the invoice page after deciding not to use it there) and fixed before this table was written; final count matches baseline exactly |
| `npx tsc --noEmit -p .` | clean | clean | none (one real error surfaced and was fixed — see §15's `@clerk/types` note) |
| `npm test` | **494 total, 493 passing, 1 pre-existing failing** | 494 total, 492 passing, 2 pre-existing failing | **`tests/permissions.test.ts` passed this run.** Not something this phase fixed — `lib/permissions.ts` was not opened. `tests/action-guards.test.ts`'s pre-existing `notifications-actions.ts` bare-company-check failure is unchanged. Reporting the number actually observed rather than copying the old baseline forward unverified. |
| `npm run build` | succeeds, **66 routes** in the manifest | succeeds, 44 routes | The repo's actual route count has grown since Phase 5 wrote its number (this phase added zero new routes/pages — every route in the current manifest, including `/internal/design-system/primitives`, `/phase-0/*`, and several `/api/*` endpoints, already existed in the file tree at the start of this session). Reported as observed, not forced to match the stale baseline. |
| `npx astryx doctor` | 4 passed, 2 warnings, 0 failures | 4 passed, 2 warnings, 0 failures | none |

Console/hydration: no new React warnings, hydration mismatches, or uncaught errors observed on any of the four public document routes during live testing (§19) — only expected dev-mode noise (HMR, Fast Refresh, Clerk's own "development keys" notice).

## 19. Live verification actually performed

Via Chrome browser automation against the running dev server (`localhost:3000`), using real seeded dev-database records (quote `5E4RD-...`, invoice `JDSP3-...` in `DRAFT`/pending-review state, change order `KPM27-...` in `APPROVED` state, warranty `Q8H8Y-...` in `CONFIRMED` state — looked up directly via Prisma, not guessed):

- `/q/[token]` — renders correctly: contractor identity, title, `DocumentMeta` (Prepared for / Sent), line-item table, `QuoteTotals` (untouched), approve/ask-for-change actions. Verified at desktop and at a ~390–500px narrow viewport (the meta grid stacks cleanly, no horizontal overflow).
- `/i/[token]` — renders correctly: "Please review" pending-state banner, `DocumentHeader` (eyebrow "Invoice #6", title), `DocumentMeta` (Billed to / Issued / Due), line items, the migrated `DocumentTotalRow`/`DocumentRule` totals block (Subtotal → ruled Total), and the "I've reviewed this" action.
- `/co/[token]` — renders correctly, and the browser tab title correctly reads **"Your change order"**, confirming the metadata fix (§11) actually works, not just compiles.
- `/w/[token]` — renders correctly in its `CONFIRMED` state: coverage/exclusions body text, the `DocumentMeta`-based From/For/Property grid, the green "Confirmed received by Jordan Homeowner" acknowledgement box, and the `DocumentFooter`-based "Warranty version 1 · Confirmed August 12, 2026" line.

**Not live-verified this phase:** `/sign-in`/`/sign-up` (the browser session already held an authenticated Clerk session and redirected straight to `/dashboard` — the same single-seeded-account limitation every prior phase has documented; Clerk's own dev-mode console notice confirmed this is why, not a bug), `/hub/[clientToken]` (no client in the dev database currently has a minted `shareToken` — `null` on direct query — so no real URL existed to visit; not fabricated), `/onboarding` (the seeded company is already onboarded), `/request/[companySlug]` and `/join/[token]` (unchanged this phase — not re-verified since no code in them moved). Browser print-preview was not exercised through automation (the tool surface has no print-emulation action) — this is the same gap Phase 3 §71 already carried forward ("Document-primitive print behavior... deferred to the Phase 6 route migration" — deferred again, honestly, rather than claimed).

## 20. Security / query audit (Step 80/81/82)

No Prisma `include`/`select` shape was changed on any of the four public document queries, Hub's query, or Warranty's query — only the JSX consuming the same already-fetched fields moved into primitives. Grepped for `console.log`/token-value rendering in every touched file — none. No new field was added to any public page's props.

## 21. Explicitly out of scope / not attempted this phase

Consistent with the task's own honesty requirements (and every prior phase's own gap-reporting style):

- **Real device testing.** All verification (§19) was Chrome automation at emulated/resized viewports, not physical iPhone/Android/iPad hardware — the same limitation every phase since Phase 0 has carried.
- **Lighthouse / Core Web Vitals.** No such tooling exists in this repo (confirmed absent, same as every prior phase's finding). No LCP/INP/CLS number is claimed.
- **Full Impeccable dual-agent critique across every route family.** Given the number of surfaces in this phase's scope (four formal documents, Hub, onboarding, auth, plus the already-migrated authenticated Quote/Invoice/Change-Order pages that were explicitly not to be reopened), a full critique/audit pass on every one was not run as a separate step this session — the `impeccable` design hook ran automatically on every edit in this phase (surfacing the one real radius finding fixed in §15) and live browser verification (§19) covered the four highest-stakes formal documents directly.
- **200% zoom, forced-colors/increased-contrast, and reduced-motion** were not independently re-verified this phase. Every primitive touched (`DocumentSurface`, `DocumentHeader`, `DocumentMeta`, `DocumentRule`, `DocumentTotalRow`, `DocumentFooter`) is unchanged from Phase 3, which already established (and this phase did not contradict) that they read the same tokens Phase 1's `prefers-contrast`/`forced-colors` blocks already strengthen, and that none of them add animation of their own — so the risk surface is inherited, not new, but it was not re-measured.
- **Full request/join/report code changes.** All three were read and classified (§7/§8) but not edited — no bug or gap was found in any of them that this phase's scope required fixing.
- **A dedicated Warranty draft-editor/template-picker visual rework.** Only the status badge was migrated (§13) — the rest of `WarrantyPanel` was judged not to need structural change.

## 22. Deferred — explicit confirmation

- No Prisma schema change. No migration.
- No permission change — `lib/permissions.ts` was not opened.
- No Clerk architecture/behavior change — only `appearance.variables` (a supported theming API) was added; `signInUrl`/`signUpUrl`/`fallbackRedirectUrl`, middleware, and the `/join/[token]` invite-cookie mechanism are untouched.
- No share-token logic change — `isWellFormedShareToken`, `markQuoteViewed`/`markInvoiceViewed`/`markChangeOrderViewed`/`markWarrantyViewed`, and every `PATHS` entry in `lib/share-token.ts` are untouched.
- No financial calculation change — `lib/money.ts`, `lib/quote/totals.ts`, `lib/invoice/*`, `invoiceBalance`, and `QuoteTotals`'s own math are byte-for-byte unmodified; every total shown through a new primitive is the same pre-computed string passed to a differently-shaped wrapper.
- No status-transition change — `QuoteStatus`/`InvoiceStatus`/`ChangeOrderStatus`/`WarrantyStatus` enums, their `*_STATUS_META` label tables (beyond Warranty's `badge`→`tone` field rename, §13), and every server action's transition logic are unchanged.
- No warranty semantic change — acknowledgement (not approval), no drawn signature, no new decline door, `isWarrantyEditable`'s confirmed-immutability lock, and the `version`/snapshot fields are all exactly as Workflow Phase 10 left them.
- No Three.js/viewer redesign — `HubModelViewer` untouched (§17).
- No Anime.js added.
- No Phase 8 global cleanup performed — only the specific hand-typed markup this phase's own routes superseded was removed (the invoice page's `Row` helper function, now dead after the `DocumentTotalRow` migration).

---

Phase 6 complete. Waiting for approval before Phase 7 — Roof viewer redesign.
