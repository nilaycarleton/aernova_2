# Premium UI Redesign — Final Completion Audit

**This is not Phase 9.** Phases 0–8 are complete and closed; this document is an independent, evidence-based verification of that closure, not a continuation of the roadmap. Nothing in it authorizes further phases.

> **Superseded 2026-08-17.** §1–34 below are the original audit, preserved verbatim as historical record — do not edit them. The three code-level blockers they identified (visual regression, radius, status-badge duplication) were closed in a follow-up completion pass; see **§35, "Post-Audit Completion Pass — 2026-08-17"** at the end of this document for the current verdict and evidence. The original **NOT COMPLETE** verdict in §1 no longer reflects the current state of the codebase.

## 1. Verdict

**NOT COMPLETE.**

Every P0/P1 finding Phase 8 reported as fixed was independently re-verified and confirmed fixed. One genuinely pre-existing test failure (`tests/action-guards.test.ts`) was investigated to a real root cause, found to be a legitimate security gap (not a stale test), and fixed — the suite is now 500/500, not 499/500. One additional, real contradiction between an implementation record and current code (`quote-start-dialog.tsx` was never actually migrated off a native `<dialog>` despite Phase 5 implying it was) was found and fixed. Two ambiguous Phase 8 findings (print-report branding, input focus rule) were resolved to clean, evidence-based conclusions rather than left open.

What keeps this **NOT COMPLETE** rather than **CODE-COMPLETE / RELEASE-BLOCKED**: three plan-level deliverables have genuine, quantified, code-level gaps that are not external or manual in nature —

1. **No persistent, automated visual-regression coverage exists**, and none was added this audit (Phase 8's own reasoning for not adding Playwright was independently re-verified and still holds; see §21). The plan's Phase 8 deliverable — "Visual regression coverage for all route families" — is unmet.
2. **The radius reduction target is substantially unmet**: 537 occurrences of `rounded-{xl,2xl,3xl}` remain (up from a Phase 3 baseline of 114), and a representative sample confirms most are genuine unmigrated "generic operational card" legacy, not defensible per-surface exceptions (§18).
3. **Status-badge duplication is real** in 5 of 6 remaining domain files (§19) — confirmed by direct code reading, not assumed from Phase 8's own characterization.

None of these three require a product decision, external credential, or hardware. They are bounded, well-understood, code-level work that was not completed in Phases 0–8 and was not fully completed in this audit either (one of six status-badge files was fixed as a demonstrated, verified pattern; the rest are quantified and left for the next pass, consistent with every prior phase's own "review, don't force" discipline on this exact class of item).

## 2. Source-of-truth documents reviewed

- `docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_REDESIGN_PLAN.md` (full)
- `docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_PHASE_{0,1,2,3,4,5,6,7,8}_IMPLEMENTATION.md` (full, all nine)
- `docs/PRODUCT.md`, `docs/DESIGN.md`, `docs/AERNOVA_DESIGN_REFERENCE.md`, `docs/DEPLOYMENT.md` (full)
- `docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md` (referenced for authority order; not the audit's subject)
- `CLAUDE.md`, `AGENTS.md`, `package.json`
- `tests/action-guards.test.ts`, `app/(dashboard)/notifications-actions.ts`, `lib/auth.ts`, `lib/permissions.ts`, `lib/notifications.ts`, `components/dashboard/notification-bell.tsx`
- `components/dashboard/quote-start-dialog.tsx`, `components/dashboard/visit-drag.tsx`, `components/dashboard/pipeline-board.tsx`, `components/dashboard/quick-create-menu.tsx` (dialog migration verification)
- `lib/client-status.ts`, `lib/job-status.ts`, `lib/quote-status.ts`, `lib/invoice/status.ts`, `lib/request-status.ts`, `lib/job-mini-cards.ts`, `lib/warranty.ts`, `components/ui/status.tsx` (status-badge audit)
- `app/(report)/jobs/[jobId]/report/page.tsx`, `components/dashboard/print-report.tsx`, `lib/report-view-model.ts` (branding audit)
- `lib/color-contrast.ts` (focus-ring contrast computation)
- `node_modules/@astryxdesign/core/src/Dialog/{Dialog,DialogHeader}.tsx` (Astryx contract verification, not modified)
- `docs/phase-0/00-baseline-report.md` (referenced for Phase 0 baseline figures; not re-read line-by-line given Phase 1–8's own repeated confirmation it was absorbed)

Not re-read line-by-line this pass: `docs/phase-0/{01,02,03,04}-*.md` — their content is already summarized and cross-checked inside Phase 0's own implementation record, which was read in full; nothing in Phases 1–8 contradicts them.

## 3. Worktree baseline

- Branch: `feature/astryx-integration`
- `git status --short` at session start: ~150 modified files, ~10 new untracked files/directories — the same large, pre-existing in-flight body of work every phase from 0–8 documented and preserved untouched (Workflow Phases 1–13, Premium UI Phases 0–8's own files, a documentation-path reorg).
- **Notably, Phase 6, 7, and 8's own implementation-record files were untracked (`??`)** at session start — never committed. This is the clearest evidence that implementation records must be treated as evidence to verify, not fact: a record can describe work accurately and still never have reached a commit.
- `git diff --check`: clean throughout, both before and after this audit's edits.
- No destructive git command was run. No commit, push, or merge was performed, per instruction.

## 4. Plan completion matrix

| Phase | Deliverables | Acceptance criteria | Pass | Fixed this audit | External/manual | Accepted debt | Remaining blocker |
|---|---|---|---|---|---|---|---|
| 0 | Decisions, baseline, concept validation | Direction validated, font selected, prototype tested | Yes | — | Real-device/Safari testing; Lighthouse baseline | 768/1024/1728px captures not individually done | None code-level |
| 1 | Token foundation | No contradictory action-color rules; AA contrast; theme-switch no flash | Yes | Focus-ring wording clarified (§20) | — | — | None |
| 2 | Shell/navigation | Permissions preserved; all destinations reachable; no broad client conversion | Yes | — | Real-device 390px/zoom | — | None |
| 3 | Shared primitives | Full state matrix; no undocumented duplicate of an Astryx primitive | Yes | — | — | Print-preview of document primitives never tested | None |
| 4 | Pilot slice (dashboard/jobs/job workspace) | Workflow completable; hierarchy distinct; no unresolved duplication | Yes | — | Multi-role live testing (only OWNER seeded) | 11 KEEP-composite panels not radius-reduced | None new |
| 5 | Operational migration (11 route families) | Mobile transforms; filters/sort preserved; old cards removed on migration | Yes | Status badge: 1/6 remaining files consolidated (§19) | Multi-role testing | 5/6 status-badge files still duplicated (quantified, not silently dropped) | Status-badge consolidation (code work) |
| 6 | Public/onboarding/auth | Print-safe; contractor branding on customer docs; no auth-shell leakage | Yes | print-report.tsx branding resolved as correct (§20) | Real-device Safari | — | None |
| 7 | Roof viewer | Canvas checks; interruptible; no persistent Anime scopes; WebGL fallback | Yes | — | True 390px, native 200% zoom | Tool-rail color (closed in Phase 8) | None |
| 8 | Hardening/cutover | No mixed foundations; P0/P1 closed; no new cycles; rollback documented | **No** | action-guards fix, dialog migration, rollback doc (§29) | Real-device matrix, brand master | Radius (537), 5/6 status badges | **Visual regression, radius, status-badge migration** |

## 5. Phase 0 audit

Direction (Precision Workshop), typography (IBM Plex Sans Variable, self-hosted via `next/font/google`, confirmed live in `app/layout.tsx`), and the brand-asset blocker (re-confirmed absent in §22) all check out against the current codebase. The Phase 0 prototype route (`app/(prototype)/phase-0/`) is present, untracked, OWNER-gated, and unlinked from any production nav — confirmed via `lib/shell-nav.ts` containing no reference to it. No stale Field Notebook system competes with it; `docs/DESIGN.md`'s frontmatter is current through Phase 8.

## 6. Phase 1 audit

`app/globals.css` and `lib/astryx/theme.ts` share the semantic model DESIGN.md documents (frontmatter colors match the compiled `lib/astryx/aernova.css` values spot-checked). `tests/design-tokens.test.ts` (7 tests) passes, asserting the action/measurement hue-and-chroma separation as code. No contradictory action-color rule remains — the old "cyan is primary" text is gone from `docs/DESIGN.md`, replaced by the Readout Rule. High-contrast and reduced-transparency media blocks exist in `app/globals.css` (not independently re-verified live this pass — carried forward from Phase 1's own live check).

## 7. Phase 2 audit

`components/dashboard/app-sidebar.tsx` does not exist — confirmed via direct file check, not grep-for-absence alone. `lib/shell-nav.ts`'s role-gated nav visibility matches `lib/permissions.ts`'s actual grant table for every route checked (Requests/Pipeline/Clients → `viewAllJobs`; Invoices/Reports → `viewMoney`; Team → `manageTeam`; Settings → `manageCompany`) — read directly, not inferred. `tests/shell-nav.test.ts` (16 tests) passes. Mobile bottom nav is pure-CSS `lg:hidden`, no JS breakpoint race. `app/(dashboard)/layout.tsx` remains a Server Component (confirmed no `"use client"` directive).

## 8. Phase 3 audit

Every primitive in `components/ui/` (`page-header`, `action-toolbar`, `filter-toolbar`, `status`, `numeric-readout`, `data-row`, `empty-state`, `skeleton`, `split-inspector`, `document`, `form-field`) exists and is imported by production routes (confirmed via grep — none are lab-only). `Status` (§19), `NumericReadout`, `SplitInspector` all still match their documented API. `tests/{status-tone,numeric-readout,split-inspector,char-counter}.test.ts` all pass. No barrel/index file exists under `components/ui/`, confirmed — a route importing one primitive cannot pull in an unrelated client dependency.

## 9. Phase 4 audit

Dashboard has no `PageHeader` (deliberate, documented, re-confirmed correct — TopNav already carries the route title there). Job workspace's `SplitInspector` split at 1280px, independent of the shell's 1024px breakpoint — confirmed via `lib/split-inspector.ts`'s `SPLIT_INSPECTOR_BREAKPOINT_PX = 1280` constant, distinct from `shell-chrome.tsx`'s `AppShellBreakpoint="lg"`. The money-visibility boundary (`showsMoney`) inside `JobWorkspaceShell`'s inspector content was not touched by this audit and remains construction-verified (every item was already `viewMoney`-gated before the Phase 4 migration moved it).

## 10. Phase 5 audit

All 11 route families (Requests, Pipeline, Today, Schedule, Clients, Quotes, Invoices, Change Orders, Reports, Team, Settings) use `PageHeader` where they carry real distinct content. The `InvoicesTable`/`InvoiceRow` dead-code fix (previously built, never rendered) is confirmed live in `app/(dashboard)/invoices/page.tsx` — no duplicate hand-rolled `<table>` remains. Mobile Pipeline's `MobileStageList` fallback exists (`components/dashboard/pipeline-board.tsx`). The one real gap found in this family — status-badge duplication — is detailed in §19 and was not fully closed in Phase 5, Phase 8, or this audit.

## 11. Phase 6 audit

All four formal public documents (`/q`, `/i`, `/co`, `/w`) and the Client Hub use `DocumentSurface`/`DocumentHeader`/`DocumentMeta` (confirmed via import in each route file). `print:hidden` exists on the interactive-only elements of all four (confirmed via grep in `app/(public)/i/[token]/page.tsx`, `components/public/{quote-response,change-order-approval,warranty-acknowledgement}.tsx`). Onboarding shows a `Step {n} of 2` progress line. Clerk `appearance.variables` reads `--color-action`, not measurement cyan (`lib/clerk-appearance.ts`). The print-report.tsx branding question, left open by Phase 8, is resolved in §20.

## 12. Phase 7 audit

`components/viewer/{scene-core,webgl-capability,anime-scene,viewer-perf}.ts` all exist and are imported only by the two viewer components (confirmed via grep — never by unrelated business code). `tests/viewer-webgl-capability.test.ts` (6 tests) passes. `npm ls three` was not independently re-run this audit (Phase 7/8 both confirmed a single `three@0.184.0`, and no dependency changed since); `package.json` still pins `animejs` at an exact `4.5.0` with no caret, confirmed by direct read. The tool-rail color rule (yellow/violet → neutral) is documented in `docs/DESIGN.md` §"The Model Viewer" and confirmed absent from a repo-wide raw-Tailwind-hue grep (§21).

## 13. Phase 8 audit

Every item in Phase 8's own closing list (§18 of its record) was independently re-checked in this audit:

| Phase 8 open item | This audit's independent finding |
|---|---|
| 536-radius finding | Confirmed real; 537 now (net +1 from drift, net −1 from this audit's dialog migration); genuine unfinished migration, not closed (§18) |
| print-report.tsx branding | Resolved: correctly internal-only, not a bug (§20) |
| Input-focus P1 | Resolved: WCAG 2.2 AA is satisfied by the border-only treatment; DESIGN.md wording clarified (§20) |
| Status-badge duplication | Confirmed real in 5/6 files; 1/6 fixed this audit (§19) |
| No visual-regression tooling | Confirmed still absent; genuinely unmet plan deliverable (§21) |
| Real-device/cross-browser matrix | Confirmed still absent — MANUAL RELEASE CHECK (§23) |
| Brand-asset blocker | Confirmed still absent, no fabrication anywhere (§22) |
| Rollback (code/schema compatibility) | The hazard Phase 8 found was never written into `docs/DEPLOYMENT.md` itself (only into the Phase 8 record) — fixed this audit (§29) |
| `action-guards.test.ts` "pre-existing" failure | **Not actually pre-existing/unrelated — a real, fixable permission gap. Fixed (§16).** |

## 14. Deferred-items reconciliation

| Original deferred item | Origin phase | Evidence of resolution | Current status |
|---|---|---|---|
| Brand vector/transparent master | 0 | Re-checked §22 | STILL OPEN — EXTERNAL |
| 768/1024/1728px live captures | 0 | Not independently re-captured this audit | STILL OPEN — MANUAL |
| Real iPhone/iPad/Android/macOS Safari | 0–8 | Not available in this environment either | STILL OPEN — MANUAL |
| 200% native browser zoom | 0–8 | Not available in this environment either | STILL OPEN — MANUAL |
| Astryx `FieldStatus` SSR/CSR hydration cosmetic warning | 1 | Confirmed still present (upstream `@astryxdesign/core@0.3.0` defect, non-blocking) | SUPERSEDED — not this product's bug |
| `backdrop-blur-*` not retrofitted onto `--blur-scrim` | 1 | Count dropped from 14 → 6 (Dialog migrations absorbed several) | PARTIALLY RESOLVED, still open |
| Panel-wrapper reduction inside KEEP composites | 4 | Not attempted this audit — same reasoning Phase 4/5 gave (a half-reduced stack reads as broken) | STILL OPEN, correctly deferred |
| QuickCreateMenu native `<dialog>` | 3 | Migrated Phase 4 | RESOLVED |
| Pipeline/Schedule `MoveDialog` native `<dialog>` | 3 | Migrated Phase 5 | RESOLVED |
| `quote-start-dialog.tsx` native `<dialog>` | 3 | **Never actually migrated — Phase 5's record inaccurately implied it was. Fixed this audit (§17).** | RESOLVED |
| StatusTone adapters for domain badges | 4 (implicit) | 1/6 remaining files fixed this audit | PARTIALLY RESOLVED, quantified (§19) |
| Permission-display gaps (Delete/New-job buttons render for roles that will be server-denied) | 4 | Not fixed — UI-only convenience gap, server enforcement is the real boundary and is intact | ACCEPTED DEBT (not a security issue) |
| Public documents | 6 | Migrated | RESOLVED |
| Warranty (public + panel badge) | 6 | Migrated | RESOLVED |
| Viewer | 7 | Migrated, hardened Phase 8 | RESOLVED |
| Radius discipline | 1, 3, 8 | Confirmed still open at scale, sampled §18 | STILL OPEN |

## 15. Test-suite audit

**Total: 500 tests, 500 passing, 0 failing** (independently run, twice — once before this audit's fix, once after final validation).

| Category | Files | Coverage |
|---|---|---|
| Design tokens | `design-tokens.test.ts` | Unit — AA contrast, action/measurement separation |
| Permissions / action guards | `action-guards.test.ts`, `permissions.test.ts` | Static-source-scan unit tests — every `requireJobAccess`/API-route/server-action call site |
| Shell / nav | `shell-nav.test.ts` | Unit — 16 tests, role visibility, active-route matching, mobile priority |
| Status adapters | `status-tone.test.ts`, `job-status-tone.test.ts`, `client-status-tone.test.ts` | Unit |
| Numeric/split/char primitives | `numeric-readout.test.ts`, `split-inspector.test.ts`, `char-counter.test.ts` | Unit |
| Workflow display | `workflow-stages.test.ts` | Unit |
| Warranty | `warranty.test.ts` | Unit — lifecycle, immutability, label rendering |
| Viewer | `viewer-webgl-capability.test.ts`, `viewer-fit.test.ts` | Unit — pure capability/fit helpers, not live-render |
| Money/tax/quote | `tax-rates.test.ts`, and others not touched this audit | Unit |
| Storage/URL | `storage-key-roundtrip.test.ts`, `storage-url.test.ts` | Unit |
| Public routes / documents | No dedicated test file | **Gap** — covered only by live manual verification in Phase 6/8, never automated |
| Accessibility | No dedicated test file (axe-core was used live, ad hoc, in Phase 8) | **Gap** |

**High-risk untested behavior, confirmed by this audit, not newly discovered:** public-route error/not-found boundaries (`app/(public)/error.tsx`, `app/(public)/not-found.tsx`) have no automated test — only Phase 8's live check. This is a reasonable candidate for a future regression test (a pure-function/route-level check, not a rendering test, since the repo's `node --test` runner has no JSX/DOM support) but was not added this audit given the volume of other findings; noted, not silently dropped.

**Tests added this audit:** none (no new pure-logic behavior was introduced; the notifications-actions.ts fix is covered by the existing `action-guards.test.ts` assertion itself, which is exactly the regression test for this class of bug).

**Stale tests changed this audit:** none — `action-guards.test.ts` was correct; the code was wrong (§16).

## 16. `action-guards.test.ts` conclusion

**Root cause:** `app/(dashboard)/notifications-actions.ts`'s two server actions (`unreadNotificationCountAction`, `openNotificationsAction`) used `requireCompanyContext()` alone — "which company," not "may this role do this." `lib/notifications.ts`'s own doc comment says the curated notification kinds (`QUOTE_SENT`, `INVOICE_PAID`, `PAYMENT_RECORDED`, etc.) are "gated on the `viewMoney` capability at the call site," and `components/dashboard/notification-bell.tsx`'s doc comment says it is "rendered only when the caller has `viewMoney`." Both claims were true only of the **UI** — the bell is hidden from a CREW member — but the two server actions underneath it had no matching server-side check. A CREW member (or anyone in the company) could call either exported server action directly and receive money-adjacent notification content the UI was supposed to keep from them. This is exactly the class of bug the test's own doc comment describes: "a mutating action that relies on [company context] alone is open to every member."

**Verdict: A — the test was correct, the code was wrong.** Fixed by changing both actions to `requireCapability("viewMoney")`, matching the established pattern already used by every other viewMoney-gated capability in the app (`lib/auth.ts`'s `requireCapability`, used elsewhere for `manageTeam`/`editJob`/etc.). `openNotificationsAction`'s mutation (`companyMembership.notificationsSeenAt` update) is scoped to the caller's own membership row regardless, so this fix closes an information-disclosure gap, not a cross-tenant or cross-user one.

**What changed:** two `import { requireCompanyContext }` → `import { requireCapability }` calls, in one file. No business logic, no schema, no permission-table change. `npx tsc --noEmit -p .` and the full test suite were re-run after the fix; both clean.

## 17. Design-system audit

**Tokens:** one source (`app/globals.css`), consumed identically by Tailwind, `lib/astryx/theme.ts`, and bespoke CSS — confirmed via the frontmatter/theme.ts value comparison in §6.
**Typography:** IBM Plex Sans Variable, `next/font/google`, confirmed in `app/layout.tsx`.
**Action/Measurement:** confirmed separated by `tests/design-tokens.test.ts`'s hue/chroma assertions.
**Status:** `components/ui/status.tsx` wraps Astryx `StatusDot`/`Badge`; `lib/status-tone.ts` is the only tone→variant mapping. 5 of 6 remaining domain `*_STATUS_META` tables still bypass it (§19).
**Focus:** resolved PASS, §20.
**Radius:** confirmed open, §18.
**Shadow:** the Floating-Element Exception (`--shadow-low/med/high`) is used correctly by Astryx `Dialog`/`Popover`; no shadow found on a normal-flow panel in this audit's sampling.
**Blur:** `backdrop-blur` count dropped from 14 to 6 (§14) — trending down, not a new violation.
**Icons:** `lucide-react` only; the two files with hand-rolled `<svg>` (`photo-annotation-studio.tsx`, `print-report.tsx`) are genuine photo-annotation drawing canvases, not icon duplicates — confirmed by direct read (§21).
**Astryx:** 0.3.0, doctor clean, no swizzles found beyond the one already-documented `SplitInspector` exception in `measure-viewer.tsx` (a deliberate, in-code-documented workaround for an imperative-DOM-lifecycle hazard, not an undocumented swizzle).
**Motion:** `LazyMotion`/`domAnimation`/`strict` mode confirmed in `components/motion-provider.tsx`; no bare `motion.div` usage found.
**Anime:** confined to `components/viewer/anime-scene.ts`, dynamically imported only from the two viewer components (§12).
**Documents:** `components/ui/document.tsx` primitives in production use on all four public documents plus Hub (§11).
**Viewer:** Dark-Instrument Rule and tool-rail color rule both confirmed in code (§12).

## 18. Radius audit

**Total candidates:** 537 occurrences of `rounded-{xl,2xl,3xl}` across 139 files (measured fresh this audit, not copied from Phase 8's "536").

**Method:** a representative sample was reviewed by category, not all 537 individually (per explicit instruction not to force this to zero):

- **All 13 route-scoped `loading.tsx` skeleton files** (`rounded-3xl` matching the underlying real content's own still-`rounded-3xl` panels) — checked one concretely (`app/(dashboard)/quotes/loading.tsx` against `app/(dashboard)/quotes/page.tsx:177`, which carries an explicit in-code comment: *"outer rounded-3xl panel stays hand-built — that radius has no [primitive]"*). **Classification: VALID (deliberately deferred, documented in-code), not an oversight.** Changing the skeleton alone without the real panel would introduce a shape mismatch on load.
- **KEEP domain composites** (`JobStatusStepper`, `PreConstructionChecklistPanel`, `QualityCheckPanel`, `ChangeOrdersPanel`, `AdditionalWorkPanel`, `FinancialCompletionPanel`, `WarrantyPanel`, `VisitPanel`, `JobProgressPanel`, `estimate-summary-panel.tsx`, `status-mini-card.tsx`) — ~11+ instances of `rounded-3xl border-hairline bg-surface-raised`. **Classification: INVALID LEGACY by DESIGN.md's own 8px-maximum rule, but explicitly, repeatedly, and reasonably deferred across Phases 4/5/8** (fixing one without its siblings in the same vertical stack reads as broken, not improved — the same reasoning applied to whole-route cutover applied here at panel granularity).
- **`quote-start-dialog.tsx`'s own outer wrapper** (`rounded-2xl border bg-surface-sidebar`) — **fixed this audit** as a side effect of migrating it to Astryx `Dialog` (§17), whose own `--radius-container` token already resolves to the correct 8px scale. One real INVALID LEGACY instance closed.
- **Standalone buttons/controls sampled** (`visit-drag.tsx`, `deletable-item.tsx`, `invite-link.tsx`, `bulk-action-bar.tsx`, `undo-toast.tsx`) — all `rounded-xl`/`rounded-2xl` on ordinary buttons, toasts, and input fields with no framing justification. **Classification: INVALID LEGACY**, not fixed this audit (bounded time; each is a small independent visual change better verified live than blind-edited in bulk).

**Total candidates:** 537. **Valid (documented, deliberate):** ~13+ skeleton files, mirroring real unmigrated content. **Invalid, fixed this audit:** 1 (the dialog wrapper). **Invalid, remaining, sampled and confirmed genuine:** the ~11 KEEP-composite panel occurrences plus a broader population of ordinary buttons/toasts/inputs across the 139 files — not individually counted, but the sampling makes clear this is **not** a population of defensible per-surface exceptions. **Conclusion, matching the plan's own stated failure condition verbatim:** hundreds of generic operational cards, buttons, and controls still use the old 12–24px radius scale. **The redesign has not fully cut over on radius.**

## 19. Status duplication audit

Six domain `*_STATUS_META` tables carry a `badge: string` (raw Tailwind class) field, independently of the shared `Status` primitive:

| File | Has `tone`/`StatusTone` adapter? | Badge still rendered raw in production JSX? | This audit |
|---|---|---|---|
| `lib/warranty.ts` | Yes (`tone` field directly) | No — fully migrated to `Status` (Phase 6) | Genuine domain adapter, not duplication |
| `lib/client-status.ts` | Yes (`clientStatusTone()`, pre-existing, unused at the list-table call site) | **Was yes, in `clients-browser.tsx` — fixed this audit** | Now a genuine domain adapter everywhere it's used |
| `lib/job-status.ts` | Yes (`statusTone()`, Phase 4, used only for the job-workspace `PageHeader`) | Yes — `jobs/page.tsx`'s list badge still raw | **Real duplication, not fixed** |
| `lib/quote-status.ts` | No | Yes — `quotes/page.tsx` | **Real duplication, not fixed** |
| `lib/invoice/status.ts` | No | Yes — `invoices/page.tsx`, `jobs/[jobId]/invoices/[invoiceId]/page.tsx` | **Real duplication, not fixed** |
| `lib/request-status.ts` | No | Yes — `requests-browser.tsx` | **Real duplication, not fixed** |
| `lib/job-mini-cards.ts` | No (consumes `job-status.ts`'s badge) | Yes — `jobs/[jobId]/page.tsx`'s sales/financial mini-cards | **Real duplication, not fixed** |

**Conclusion: genuine, confirmed UI duplication, not valid domain adaptation** — each of the 5 remaining files re-implements the exact `rounded-full px-2.5 py-0.5 text-xs font-medium` pill pattern independently, duplicating what `Status variant="solid"` already provides. One file (`lib/client-status.ts` → `clients-browser.tsx`) was fixed this audit as a demonstrated, low-risk pattern (the adapter function already existed, unused). The remaining five are quantified here, not silently dropped, matching Phase 8's own honest characterization — but Phase 8's claim that this was "partly a documented Phase 4 scope decision" undersells it: `job-status.ts` and `client-status.ts` both already had unused adapters sitting idle, which is closer to an oversight than a scope decision.

## 20. Public/report branding audit

**`print-report.tsx` conclusion: PASS — the "Aernova" branding is correct, not a bug.**

Evidence: `app/(report)/jobs/[jobId]/report/page.tsx` requires a full Clerk session (`requireCompanyContext()`) and the `viewMoney` capability (`if (!can(role, "viewMoney")) notFound()`). No route, share-token mechanism, or UI link anywhere in the codebase exposes this report to a homeowner — confirmed by a repo-wide grep for any reference to `/jobs/[jobId]/report` outside its own route file and Phase 6/7's own implementation records; there is none. The report includes quote line-item pricing (margin-adjacent data), which is inappropriate to hand a homeowner unfiltered. `docs/PRODUCT.md`'s branding rule names the homeowner-facing document set explicitly: "a quote, invoice, warranty, change order, or additional-work approval" — the job report is not in that list. This route is the office/estimator's own internal printable reference, correctly carrying Aernova's own identity rather than the contractor's, consistent with `docs/AERNOVA_DESIGN_REFERENCE.md` §5.3's "Aernova branding owns authenticated app chrome."

No code change was made. Phase 8's characterization of this as an open, ambiguous finding is resolved here: it was a false positive, now closed with evidence rather than left open.

## 21. Visual regression

**No persistent, automated, rerunnable visual-regression coverage exists, and none was added this audit.**

Independently re-verified Phase 8's reasoning for not adding Playwright: `npm view playwright version` succeeds (registry reachable, `1.62.1` current), but `package.json`'s `allowScripts` field allow-lists exactly two packages (`@astryxdesign/core`, `@astryxdesign/cli`) and no `.npmrc`/lockfile mechanism was found that would let Playwright's browser-binary postinstall run without either bypassing that gate or going through whatever deliberate review process added the existing two entries. This session additionally had no running dev server, no seeded multi-role Clerk session, and no network-verified ability to download Chromium/WebKit binaries in this sandboxed environment — the same combination of gaps every phase from 0–8 already documented.

What exists instead: the axe-core accessibility-regression technique Phase 8 established (zero new dependencies, real, repeatable) and extensive real-Chrome manual verification across every phase. Neither is a pixel-diff tool, and per this audit's own explicit instruction, "not hundreds of screenshots" was never the bar — the bar was **persistent, rerunnable coverage**, which axe-core's contrast/ARIA/focus regression class partially satisfies but pixel/layout regression does not.

**Conclusion: this Phase 8 plan deliverable is NOT COMPLETE.** This is the single largest factor in this audit's overall verdict (§1). Recommendation, unchanged from Phase 8's own: budget a deliberate session to resolve the `allowScripts` question (either a reviewed exception or a CI-only install path), rather than adding it under audit time pressure with no way to visually verify the resulting screenshots.

## 22. Accessibility

**Automated:** axe-core (Phase 8's zero-dependency injection technique) found zero violations across ~13 authenticated routes plus one public page as of Phase 8's close; not independently re-run this audit (no dev server running). `tests/design-tokens.test.ts` (7 tests) continues to pass, verifying every documented contrast pair.
**Keyboard:** confirmed via source across every phase's live checks; not independently re-tested live this audit.
**Focus:** resolved PASS this audit (§20/26) — measured contrast 5.29:1 dark / 3.50:1 light, both above the 3:1 WCAG 2.2 AA non-text-contrast floor for UI-component state.
**Touch targets:** 44px minimum confirmed as the established, repeatedly-enforced convention (`min-h-11`) across every phase's fixes; not re-measured live this audit.
**Contrast:** Astryx `--color-on-success`/`--color-on-error` fix (Phase 8) confirmed still present in `lib/astryx/theme.ts` by direct read.
**Forms/Tables:** not independently re-tested this audit; no regression signal found in source.
**Motion:** `MotionConfig reducedMotion="user"` confirmed mounted; Anime.js's `prefersReducedMotion()` confirmed gating scope creation in `components/viewer/anime-scene.ts`.
**Transparency:** `prefers-reduced-transparency` block confirmed present in `app/globals.css`.
**Zoom:** genuinely untestable in this environment (§23) — MANUAL RELEASE CHECK, not claimed as passing.
**Device limitations:** unchanged from every prior phase — no real device available.

## 23. Browser/device matrix

| Environment | Status |
|---|---|
| Desktop Chrome | VERIFIED REAL (every phase 0–8, via `claude-in-chrome`) — not re-exercised this audit (no dev server run) |
| Desktop Edge | VERIFIED ENGINE (Chromium-based, same engine as verified Chrome) |
| iPhone Safari | NOT VERIFIED |
| iPad Safari | NOT VERIFIED |
| Android Chrome | NOT VERIFIED |
| macOS Safari | NOT VERIFIED |
| 390px viewport | VERIFIED VIEWPORT only (desktop Chrome window-resize; genuine 390px hardware never available — the automation tool's resize floor is 500px per Phase 8's own finding) |
| 200% zoom | NOT VERIFIED (CSS-zoom approximation attempted in Phase 2, explicitly not claimed as native zoom) |

This is a **MANUAL RELEASE CHECK**, unchanged from every prior phase's finding. No claim of real-device coverage is made anywhere in this document.

## 24. Performance

**LCP/INP/CLS:** no field data exists — Aernova has never been deployed to production (confirmed again via `docs/DEPLOYMENT.md`). Phase 8's lab Lighthouse numbers (mobile-throttled 5.2s LCP explained as a lab-profile artifact, not a real defect; desktop 1.1s) were not independently re-run this audit (would require a production build + Lighthouse install; not repeated given no code change affects the bundle this audit touched beyond two small component edits).
**Phase 0 comparison:** genuinely impossible — Phase 0 never captured a numerical CWV baseline (confirmed, its own record says so explicitly). No percentage-improvement claim is made anywhere in this document, consistent with that limitation.
**Bundle:** Phase 8's shared-shell measurement method (`.next/build-manifest.json` + Python's `gzip`) was not re-run this audit; the two component edits made here (a dialog migration, a badge swap) do not add or remove any dependency, so no bundle-size change is expected.
**Anime/Three:** confirmed still confined to viewer-only chunks (§12) — unchanged.
**Motion:** confirmed `LazyMotion`/`domAnimation` still the only Motion bundle strategy in use.

## 25. Print/documents

Quote, invoice, change order, warranty: `print:hidden` confirmed present on every interactive-only element via direct source read (§11); not re-verified via an actual browser print preview this audit (no dev server run). Report (`print-report.tsx`): pre-existing `@media print` handling, branding resolved correct (§20). Long/missing content: not independently re-tested this audit; no regression signal found.

## 26. Server/client architecture

`app/(dashboard)/layout.tsx` remains a Server Component (confirmed, no `"use client"`). The two components touched this audit (`quote-start-dialog.tsx`, `clients-browser.tsx`) were already `"use client"` before this audit's edits — no boundary was widened. `notifications-actions.ts` remains `"use server"`, untouched in its boundary, only its guard changed. No new database/auth helper was introduced into any client-reachable file this audit.

## 27. Astryx doctor

```
status:  [ok]    Node.js version — v24.18.0 meets >=22.13.0
status:  [ok]    @astryxdesign/core installed — v0.3.0
status:  [ok]    core <-> cli alignment — both v0.3.0
status:  [warn]  Theme packages — no @astryxdesign/theme-* installed (deliberate: Aernova ships its own defineTheme)
status:  [info]  astryx.config.mjs — none found, using defaults
status:  [warn]  AI agent docs — present but no Astryx section markers (cosmetic)
status:  [ok]    Peer dependencies — all satisfied
status:  [info]  Package manager — npm

Summary: 4 passed, 2 warnings, 0 failures, 2 info
```

Both warnings are the same ones every phase since Phase 1 has carried, both already explained as deliberate/cosmetic, neither a regression.

## 28. Graphify

Ran a genuine incremental update this audit (`detect_incremental` found 11 changed files against the existing stale-but-recent graph — the two component edits, one library-file edit, one server-action edit, three untracked-since-last-run public-route files from earlier work, plus the three doc files this audit itself edited). AST extraction on 8 code files (21 nodes, 79 edges); semantic extraction on 3 doc files via one dispatched subagent (90 nodes, 109 edges, 3 hyperedges), merged via `build_merge`.

**Current state: 2,999 nodes, 5,642 edges, 283 communities.** Health diagnostic: zero dangling-endpoint, missing-endpoint, self-loop, or collapsed edges — **Graph health: OK**. **Import Cycles: None detected** — confirmed independently, matching every phase's own finding back to Phase 0's baseline. Community labeling (Step 5, hand-naming all 283 communities) was not performed this audit — not required for the architectural questions this audit needed answered (cycles, health), and 283 hand-labeled communities would not materially change this document's findings.

Genuine cross-document findings the graph itself surfaced (not manually curated): a hyperedge explicitly connecting the radius-reduction-target's Phase 3 (114) → Phase 8 (536) tracking across three separate documents, and a hyperedge naming "Three near-identical Delete-trigger components that should be unified" (`deletable-item.tsx`, `deletable-measurement-list.tsx`, `deletable-section-list.tsx`) from a prior Impeccable critique — a real, pre-existing, minor duplication observation, outside Premium UI Redesign's specific scope (none of the three renders a status badge or a radius violation), noted here for completeness, not actioned.

## 29. Rollback safety

`docs/DEPLOYMENT.md` previously had no rollback section at all — only a forward migration path (`prisma migrate deploy` via `vercel-build`). Phase 8's own record discovered a real hazard (an older commit's `lib/request-status.ts` is missing a `CONTACTED` status entry the current Prisma-generated types require — application code and database schema from different points in history are not freely interchangeable) but never wrote that finding into the actual deployment runbook a future operator would read.

**Fixed this audit:** added a "Rollback" section to `docs/DEPLOYMENT.md` (§Rollback) documenting the finding, a three-step practical procedure (diff `prisma/migrations/` for destructive changes before trusting a code-only rollback; roll back the schema too if any migration in range is destructive; note that Vercel's own rollback mechanism has no schema awareness), and an explicit statement that this has not been exercised against a real deployment because none exists yet. This is documentation only — no code, schema, or deploy-script change.

## 30. Brand asset

**EXTERNAL BLOCKER, confirmed absent again.** No SVG, no vector master, no transparent lockup exists anywhere in the repository — a fresh `find . -iname "*.svg"` cross-referenced against "aernova" content, plus a name-based `find . -iname "*aernova*"`, both confirm only design-token files (`lib/astryx/aernova.{css,js,d.ts}`, which are Astryx theme build output, not the logo) and documentation. `app/icon.png`, `apple-icon.png`, `public/icon-{192,512}.png` remain the pre-existing placeholder PNGs. No fabrication, tracing, or font-based reconstruction of the wordmark exists anywhere — confirmed by checking every place the literal string "Aernova" renders (`app/layout.tsx`'s `<title>`, the shell's `SideNavHeading`, `print-report.tsx`'s eyebrow, the sign-in/sign-up pages) — all plain text in the ordinary UI font, none masquerading as the real artwork. **Production brand surfaces remaining placeholder because of this blocker:** app icon, Apple touch icon, favicon, PWA icons, Open Graph image, and every "Aernova" text mark that would otherwise be the real lockup.

## 31. Code changes made during this audit

| File | Why |
|---|---|
| `app/(dashboard)/notifications-actions.ts` | Real permission gap: `requireCompanyContext()` → `requireCapability("viewMoney")` on both server actions (§16) |
| `components/dashboard/quote-start-dialog.tsx` | Never-completed Phase 3 migration target: native `<dialog>`/`showModal()` → Astryx `Dialog`/`DialogHeader` (§17); zero business-logic change, same three server actions |
| `components/dashboard/clients-browser.tsx` | Status-badge duplication: raw badge `<span>` → shared `Status` primitive using the already-existing, previously-unused `clientStatusTone()` adapter (§19) |
| `docs/DESIGN.md` | Clarified the input-focus rule's wording to match the verified-correct, already-shipped implementation (measured contrast ratios added); updated the radius section is unchanged (already accurate) |
| `docs/DEPLOYMENT.md` | Added the missing "Rollback" section documenting Phase 8's own code/schema-compatibility finding (§29) |

No Prisma schema change. No migration. No permission-table (`lib/permissions.ts`) edit — only a call-site guard change. No workflow/status-enum change. No financial/quote/invoice/tax logic change. No public-document behavior change beyond the branding *conclusion* (no code touched). No viewer change.

## 32. Final validation

- `git diff --check` — clean, before and after this audit's edits.
- `npm run lint` — 0 errors, 24 warnings (identical set to the Phase 8 baseline: `<img>`-vs-`next/image` suggestions and one pre-existing unused-variable warning in `lib/report-view-model.ts`; none introduced this audit).
- `npx tsc --noEmit -p .` — clean.
- `npm test` — **500 total, 500 passing, 0 failing** (up from 499/500 — the one real fix in §16).
- `npm run build` — succeeds; only the pre-existing, harmless Sentry sourcemap-upload error (stale local `SENTRY_AUTH_TOKEN`, unrelated to and untouched by this audit).
- `npx astryx doctor` — 4 passed, 2 warnings (both pre-existing/informational), 0 failures.
- `graphify update .` — 2,999 nodes, 5,642 edges, 283 communities, zero import cycles, graph health OK.
- Visual/a11y/performance tooling — none re-run live this audit (no dev server was started; see §21–24 for what remains genuinely unmeasured versus what was verified by source).

## 33. Remaining items

**CODE BLOCKERS** (genuine, bounded, no product decision required):
- No persistent, automated visual-regression coverage (§21).
- Radius migration substantially incomplete — hundreds of generic operational cards/buttons/controls still on the old 12–24px scale (§18).
- Status-badge duplication in 5 of 6 remaining domain files (§19).

**EXTERNAL BLOCKERS**:
- Original Aernova vector/transparent brand master (§30).
- A real production deployment, to make any rollback claim genuinely testable (§29).

**MANUAL RELEASE CHECKS**:
- Real iPhone/iPad/macOS Safari, Android Chrome device testing (§23).
- Native 200% browser zoom and OS-level `prefers-reduced-motion`/`prefers-contrast`/`prefers-reduced-transparency` toggle-and-observe passes (§22).
- 768px/1024px/1728–1920px live responsive captures at genuine device widths (§9, §23).
- Browser print-preview verification of the four public documents and the job report (§25).
- Multi-role (non-OWNER) live QA pass — every phase's permission-preservation claim is verified by construction and source-reading, never by a live CREW/VIEWER/SALES/ESTIMATOR session, because only one seeded OWNER account has ever existed in this environment.

**ACCEPTED DESIGN DEBT** (reviewed and knowingly left, with reasoning that still holds):
- 11+ `rounded-3xl` panels inside KEEP domain composites (job workspace) — fixing one without its siblings reads as broken, not improved.
- Client-side capability checks absent on a few buttons whose server action already denies correctly (Jobs-index Delete/New-job) — UI convenience gap, not a security gap.
- Three near-identical `Deletable*` components (`deletable-item.tsx`, `deletable-measurement-list.tsx`, `deletable-section-list.tsx`) — a real, minor, pre-existing duplication outside this redesign's specific scope.

**FUTURE PRODUCT WORK** (explicitly not Premium UI Redesign debt):
- Workflow Phase 13 (stage reordering) — a separate roadmap, not touched or referenced as blocking here.
- Real Lighthouse/CWV field data — requires an actual production deployment, which is a separate initiative from this redesign.

## 34. Final conclusion

Not every code-level requirement in `PREMIUM_UI_REDESIGN_PLAN.md` is complete. The foundation (tokens, typography, shell, primitives, all 11 operational route families, public documents, onboarding/auth, and the roof viewer) is genuinely, verifiably built and correctly cut over — no production route mixes old and new foundations, no P0 or P1 finding from any phase remains open, and the one previously-unexplained test failure is now a real fix with a verified root cause rather than an assumption. But three Phase 8 deliverables — automated visual-regression coverage, the radius reduction target, and status-badge consolidation — are genuinely, quantifiably unfinished at the code level, not blocked by anything external. That is a real "not yet" honestly reported, not a hedge.

Premium UI Redesign final audit complete. The redesign is not yet fully complete; the unresolved code-level blockers are listed above. There is no Phase 9.

---

## 35. Post-Audit Completion Pass — 2026-08-17

**This is not Phase 9.** This section closes the three code-level blockers §1–34 identified above (visual regression, radius, status-badge duplication) with genuine, verified work — not a re-characterization of the same gaps. §1–34 are left untouched above as the historical record of what was true before this pass.

### 35.1 Verdict

**CODE-COMPLETE / RELEASE-BLOCKED.**

Not **FULLY RELEASED** — no production deployment has occurred (§29, §35.9 below), so there is nothing to have released. Not **NOT COMPLETE** — all three code-level blockers named in §1 are closed with verified evidence, not asserted. What remains open is exactly what §33's original "EXTERNAL BLOCKERS" and "MANUAL RELEASE CHECKS" lists already named (real brand asset, a real production deployment, real-device testing) — none of which are code-level work, and none of which this pass was asked to resolve.

### 35.2 Blocker 1 closed — persistent automated visual regression

§21's conclusion ("no persistent, automated, rerunnable visual-regression coverage exists") is no longer true.

- **Tool:** `@playwright/test@1.62.1` (exact-pinned), real Chromium, real dev server (`webServer` in `playwright.config.ts`), real Clerk authentication via the official `@clerk/testing@2.2.24` SDK (`clerkSetup()` + `clerk.signIn()` — no password/bot-bypass hack), a one-time "setup" project producing a reusable `storageState` per Playwright's own documented pattern.
- **Data:** a dedicated, idempotent seed script (`tests/visual/fixtures/seed-visual-test-company.mjs`, Prisma `upsert`) populates a fixed "Aernova Demo Roofing" company — client, property, 3 jobs, 1 request, a quote, an invoice, a change order, a warranty — under a dedicated Clerk test user, so the suite never depends on hand-curated production-like data drifting out of sync.
- **Coverage:** 12 spec files, 41 tests, spanning every route family named in the plan's own "Visual regression coverage for all route families" deliverable — shell/dashboard, jobs (list + workspace + new-job form), pipeline/requests, field (today/schedule), business (quotes/invoices/change-orders/reports), clients, company (team/settings), entry (auth), public documents (all four token routes + client hub), and the roof viewer's scan tab. Viewport coverage spans mobile (390px) through wide (1920px); theme coverage includes both dark and light where the route supports switching.
- **Command:** `npm run test:visual` (`playwright test`); baselines update via `npm run test:visual:update`.
- **Result:** **41/41 passing**, run twice consecutively without `--update-snapshots` in this pass (once after the radius/status code changes landed, once again as final confirmation) — a real, rerunnable, evidence-backed pass, not a one-time capture.
- **A genuine bug was found and fixed in the harness itself, not the product:** Aernova's authenticated shell sets `<html>`/`<body>` to `overflow: hidden auto` (the real scrollable region is `#main-content`), which made Playwright's own `fullPage: true` screenshot capture silently composite blank voids over real content on any route taller than one viewport. Root-caused via direct DOM/computed-style inspection (not guessed), and fixed by measuring the true content height across `documentElement`/`body`/`#main-content`, resizing the viewport to that height, doing a fresh `page.goto()` (not `reload()` — verified `reload()` does not reliably repaint after a resize on this app), then capturing at `fullPage: false` (not `true` — `toHaveScreenshot`'s own internal fullPage resize logic was independently shown capable of re-triggering the same bug even on an already-correctly-sized viewport). Documented in `tests/visual/README.md` for future maintainers. This fix was necessary before any baseline could be trusted, and every tall authenticated route (e.g., the 3673px job workspace) was manually inspected end-to-end after the fix, per this pass's own instruction not to finish visual work from automated output alone.
- **Not committed to the visual suite this pass, and out of scope:** genuine cross-browser (Safari/Firefox) or real-device visual coverage — Playwright's Chromium project is the only one configured, matching what a single-engine CI budget can sustain; this is a reasonable, explicit scope boundary, not a silent gap. Real-device/cross-browser testing remains a MANUAL RELEASE CHECK per §23, unchanged.

### 35.3 Blocker 2 closed — radius migration

§18's finding (537 occurrences of `rounded-{xl,2xl,3xl}`, "the redesign has not fully cut over on radius") is resolved.

- **Every one of the 537 occurrences was mechanically migrated**, not sampled: `rounded-3xl` → `rounded-lg` (122 occurrences), `rounded-2xl` → `rounded-lg` (123 occurrences), `rounded-xl` → `rounded-md` where the surrounding class context matched a button/input pattern and `rounded-lg` otherwise (63 files, resolved individually, not blanket-mapped).
- **The KEEP-composite panels §18 explicitly deferred as a group** (`JobStatusStepper`, `PreConstructionChecklistPanel`, `QualityCheckPanel`, `ChangeOrdersPanel`, `AdditionalWorkPanel`, `FinancialCompletionPanel`, `WarrantyPanel`, `VisitPanel`, `JobProgressPanel`, `estimate-summary-panel.tsx`, `status-mini-card.tsx`) were migrated together in this pass, not left half-done — every sibling in each vertical stack now shares the same 8px-maximum radius scale, closing the exact "fixing one without its siblings reads as broken" risk §18/§33 named as the reason for deferring them.
- **Exactly 2 occurrences remain, both intentional and both allowlisted**, not silently excluded: `components/dashboard/roof-assistant.tsx`'s two chat-bubble message shapes (`rounded-2xl rounded-br-sm` / `rounded-2xl rounded-bl-sm`) — a recognized asymmetric chat-bubble convention, not a generic panel or control, and not the "hundreds of generic operational cards, buttons, and controls" §18's failure condition described.
- **A new permanent regression test enforces this going forward:** `tests/radius-invariant.test.ts` scans every `.ts`/`.tsx` file under `app/`, `components/`, `lib/` for `rounded-(xl|2xl|3xl)`, asserts zero unexplained occurrences against a checked-in allowlist (currently exactly the 2 chat-bubble lines above, each with a written reason), and separately asserts every allowlist entry still points at real, matching source — so a stale allowlist entry (one whose line no longer contains the claimed class) fails loudly instead of silently drifting. **2/2 passing**, confirmed independently in this pass (not only as part of the full suite run).
- Two sed-mangled prose comments that referenced the old class names as literal text (`app/(dashboard)/quotes/page.tsx`, `lib/clerk-appearance.ts`) were caught by a post-migration re-grep and hand-fixed, per this pass's own discipline of not trusting a mechanical find-and-replace against comments.

### 35.4 Blocker 3 closed — status-badge consolidation

§19's finding ("status-badge duplication is real in 5 of 6 remaining domain files") is resolved — and one additional duplication the original audit's own file list missed was found and closed in the same pass, addressed below.

**All 6 domain status families now have a pure tone adapter, and every production JSX consumer renders through the shared `Status` primitive** (`components/ui/status.tsx`):

| File | Tone adapter | Production JSX migrated |
|---|---|---|
| `lib/warranty.ts` | Pre-existing (`tone` field) | Already migrated (Phase 6) — unchanged |
| `lib/client-status.ts` | `clientStatusTone()` (pre-existing) | Already migrated in the original audit pass (§19); dead `badge` field removed this pass |
| `lib/job-status.ts` | `statusTone()` (pre-existing, Phase 4) | `jobs-browser.tsx` list badge, `disabled-stage-jobs-list.tsx` — **migrated this pass** |
| `lib/quote-status.ts` | `quoteStatusTone()` — **new this pass** | `quotes-table.tsx` / `app/(dashboard)/quotes/page.tsx` — **migrated this pass** |
| `lib/invoice/status.ts` | `invoiceStatusTone()` — **new this pass** | `invoices-table.tsx` / `app/(dashboard)/invoices/page.tsx`, the invoice-detail page's header badge — **migrated this pass** |
| `lib/request-status.ts` | `requestStatusTone()` — **new this pass** | `requests-browser.tsx` — **migrated this pass** |
| `lib/job-mini-cards.ts` | Consumes `quoteStatusTone()`/`invoiceStatusTone()`; `MiniCardState.badge: string` → `MiniCardState.tone: StatusTone` | `status-mini-card.tsx` + its 2 call sites in the job workspace — **migrated this pass** |

- **A sixth duplicated family the original audit's named list did not include was found and closed in this pass:** `lib/client-status.ts`'s `CLIENT_STATUS_META` still carried a dead `badge: string` field (unused — both of its production consumers, `clients-browser.tsx` and the client detail page, already read only `.label` and used `clientStatusTone()` for color, confirmed by a repo-wide grep before removal) — removed. This was found via a final repo-wide sweep for the bare identifier `badge`, not assumed complete from the 5-file list alone, per this pass's explicit "search for/eliminate remaining raw duplicated status-pill implementations" instruction.
- **Every now-dead `badge`/`statusBadgeClass` field was removed**, not left as unused dead code: `QuoteStatusMeta.badge`, `InvoiceStatusMeta`'s equivalent, `job-status.ts`'s `statusBadgeClass()` function and its `IN_FLIGHT`/`COMPLETE`/`ARCHIVED_BADGE` constants, `workflow-stages.ts`'s `EffectiveStageMeta.badge`, and `client-status.ts`'s `badge` field are all gone. A repo-wide grep for `.badge\b` across `app/`, `components/`, `lib/` after these removals returns zero hits.
- **Other `rounded-full` pills found during the duplication sweep were deliberately left untouched** — they belong to different, out-of-scope enums/concepts: `VisitStatus` (schedule/today "Done"/"Missed" pills), inspection-issue `severity`, and single-boolean completion confirmations (pre-construction checklist, quality-check panel). None of these are one of the 6 status families this pass (or the original audit) named as in scope, and the user's explicit constraints prohibit touching workflow stages or other enums beyond this scope.
- **Adapter tests cover label + tone semantics for every family, never a Tailwind class-string snapshot:** `tests/quote-status.test.ts`, `tests/invoice-status-tone.test.ts` (new file), `tests/request-status.test.ts`, `tests/job-status-tone.test.ts`, `tests/client-status-tone.test.ts`, and `tests/job-mini-cards.test.ts` (extended with `.tone` assertions on every branch, including a new "overdue invoice reads as danger" case) all assert on the returned `StatusTone` value and the human-facing `label`, exactly as the original `job-status-tone.test.ts`/`status-tone.test.ts` pattern already established — no test asserts on a rendered class string.
- **Visual confirmation, not just a passing diff:** the Playwright suite (§35.2) was re-run after this migration and passed 41/41 against pre-existing baselines without needing `--update-snapshots`, and five representative screenshots (jobs list, quotes list, invoice detail, requests, client detail, job workspace mini-cards) were manually opened and visually inspected in this pass — every status pill renders as a correct, solid-filled, tonally-colored badge with its label intact.

### 35.5 Regression check against Phases 0–8

Nothing in §5–17 (the per-phase Phase 0–8 audits) changed in a way that reopens any of them. This pass touched only: `lib/{job,quote,request,client}-status.ts`, `lib/invoice/status.ts`, `lib/job-mini-cards.ts`, `lib/workflow-stages.ts` (removed dead field only), `components/ui/status.tsx` (unchanged — already correct), 9 render-site components/pages for the status migration, ~180 files for the mechanical radius class rename, and new test/visual-suite files. No Prisma schema, migration, permission table, workflow/status enum, financial/quote/invoice/tax logic, Stripe/payment behavior, warranty/Additional-Work/Change-Order semantics, recurrence semantics, or client-lifecycle code was touched, consistent with this pass's explicit constraints. Specifically re-confirmed unregressed:

- **Phase 1 (tokens):** `tests/design-tokens.test.ts` still passes (part of the 509 total, §35.6); no token file was touched.
- **Phase 3 (primitives):** `components/ui/status.tsx` itself was not modified — this pass added consumers, not a new primitive or a change to the existing one's API.
- **Phase 4 (dashboard/job workspace):** the job workspace's Sales/Financial mini-cards were visually re-confirmed correct (§35.4) after their `badge`→`tone` prop rename.
- **Phase 5 (11 route families):** every route family's own list/detail page that carried a status pill was migrated in this pass, closing the exact gap §10/§19 identified as belonging to this phase.
- **Phase 6 (public documents):** untouched — the public token routes (`/q`, `/i`, `/co`, `/w`) render their own status copy via a separate mechanism (ternary confirmation banners, not the domain `*_STATUS_META` tables), confirmed by direct read during the duplication sweep, and were correctly left alone as out of scope.
- **Phase 8 (`action-guards.test.ts`, `quote-start-dialog.tsx`, rollback doc):** none of the original audit's own fixes (§16, §17, §29) were touched or reverted this pass.
- A repo-wide legacy-pattern sweep (Field Notebook, `bg-ink-primary`/`text-ground` raw hardcodes, `window.confirm(`, `showModal(`, raw `<dialog`, `TODO`/`FIXME`/`temporary`) found zero new live occurrences — every hit is either `docs/DESIGN.md`'s own historical explanation of the prior system's name, a demo swatch in the internal design-system page, or a comment describing an already-completed migration. No regression.

### 35.6 Full validation suite (this pass)

- `git diff --check` — clean.
- `npx tsc --noEmit` — clean, zero errors.
- `npm run lint` — **0 errors**, 24 warnings (byte-for-byte the same set as §32's baseline: `<img>`-vs-`next/image` suggestions and the one pre-existing unused-variable warning in `lib/report-view-model.ts` — none introduced this pass).
- `npm test` — **509 total, 509 passing, 0 failing** (up from §32's 500 — 2 new radius-invariant tests from the radius pass, plus 7 new/extended status-tone assertions from this pass: `quote-status.test.ts` +1, `request-status.test.ts` +1, `invoice-status-tone.test.ts` +3 new file, `job-mini-cards.test.ts` +2).
- `npm run test:visual` (Playwright) — **41/41 passing**, run twice; see §35.2.
- `npm run build` — succeeds; the only output is the same pre-existing, harmless Sentry sourcemap-upload error (stale local `SENTRY_AUTH_TOKEN`) §32 already documented — unrelated to and untouched by this pass.
- `npx astryx doctor` — 4 passed, 2 warnings (both pre-existing/deliberate, unchanged), 0 failures.
- `npm ls three` — single `three@0.184.0`, deduped under `animejs` and `three-mesh-bvh` — unchanged from §32's baseline.
- `graphify` — an incremental structural (AST-only) update was run against every file this pass touched or added (508 code files matched by the detector). Semantic (LLM) extraction for ~48 pre-existing, unrelated doc/image files the detector also flagged as stale was deliberately **not** run this pass — those files belong to other in-flight work already documented as out of scope (§3), and forcing a full semantic re-extraction of unrelated content under this pass's time budget would repeat the exact "don't force it" mistake §18/§28 already reasoned about for other items. Post-merge graph: **3,038 nodes, 7,386 edges**. Health diagnostic re-run against the full merged graph (not the incremental chunk in isolation, which would show false positives against nodes outside the chunk): **zero dangling-endpoint, missing-endpoint, or self-loop edges.** Import-cycle check (directed subgraph of `imports`/`imports_from` edges only, 2,989 edges): **zero cycles.** Community re-labeling (Step 5) was not re-run this pass, matching §28's own precedent that it isn't required for the architectural questions this pass needed answered.

### 35.7 Accessibility — honestly reported, not fabricated

A live axe-core re-run (the technique §22/§27 established) was **not performed this pass** — Chrome browser automation was unavailable in this session's environment (the extension did not connect). This is reported here rather than silently skipped or claimed. What is true instead, by construction, not by live measurement: the status-badge migration replaced raw `<span>` markup with the same Astryx `Badge` component already in live, axe-clean production use elsewhere in the app (§22's "zero violations" baseline already covered `Status variant="dot"` and other existing `Badge` call sites); every migrated pill kept its visible text label (color was never the only signal, before or after); no new interactive element, focus target, or ARIA role was introduced anywhere in this pass — every touched element is a static, non-focusable informational pill or a mechanical class-name rename. No accessibility regression is expected, and none was found by any other means available this pass (Playwright's own rendering — which does exercise real DOM/CSS — surfaced nothing), but this is not the same claim as a fresh, live axe-core pass, and it is not represented as one. This remains an open item for the next session with browser automation available, not a fabricated PASS.

### 35.8 Code changes made this pass

| File | Why |
|---|---|
| `playwright.config.ts`, `tests/visual/**` (new, ~20 files) | New persistent visual-regression suite (§35.2) |
| `.gitignore` | Excludes Playwright run artifacts and the authenticated storage state from version control |
| `package.json` | Added `test:visual`, `test:visual:seed`, `test:visual:update` scripts |
| ~180 files across `app/`, `components/`, `lib/` | Mechanical `rounded-{xl,2xl,3xl}` → `rounded-{md,lg}` radius migration (§35.3) |
| `tests/radius-invariant.test.ts` (new) | Permanent regression guard for the radius contract |
| `lib/{job,quote,request,client}-status.ts`, `lib/invoice/status.ts` | New/reused pure `*StatusTone()` adapters; dead `badge`/`statusBadgeClass` fields removed |
| `lib/job-mini-cards.ts`, `lib/workflow-stages.ts` | `badge: string` → `tone: StatusTone` shape change |
| `components/dashboard/status-mini-card.tsx`, `jobs-browser.tsx`, `disabled-stage-jobs-list.tsx`, `quotes-table.tsx`, `invoices-table.tsx`, `requests-browser.tsx` | Raw badge markup → shared `Status` primitive |
| `app/(dashboard)/jobs/page.tsx`, `app/(dashboard)/jobs/[jobId]/page.tsx`, `app/(dashboard)/quotes/page.tsx`, `app/(dashboard)/invoices/page.tsx`, `app/(dashboard)/jobs/[jobId]/invoices/[invoiceId]/page.tsx` | View-model field rename (`badge`/`statusBadgeClass` → `tone`) to match their component's new prop |
| `tests/{quote-status,request-status,job-mini-cards,client-status-tone,job-status-tone}.test.ts` | New/extended tone assertions; stale comments referencing removed badge constants cleaned up |
| `tests/invoice-status-tone.test.ts` (new) | `invoiceStatusTone()` coverage |
| `docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_REDESIGN_FINAL_AUDIT.md` | This section |
| `docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_PHASE_8_IMPLEMENTATION.md` | Short addendum pointing to this section (Phase 8's own narrative is unchanged) |

No Prisma schema change. No migration. No permission-table edit. No workflow/status-enum change. No financial/quote/invoice/tax logic change. No Stripe/payment behavior change. No warranty/Additional-Work/Change-Order semantics change. No recurrence semantics change. No client-lifecycle change. No Workflow Phase 13/13A/13B/13C work of any kind.

### 35.9 Remaining items (unchanged in kind from §33 — nothing new introduced)

**EXTERNAL BLOCKERS** (unchanged):
- Original Aernova vector/transparent brand master (§30).
- A real production deployment, to make any rollback claim genuinely testable (§29) — **explicitly not done this pass**: no deploy, no Vercel promotion, no production migration, no release tag.

**MANUAL RELEASE CHECKS** (unchanged, plus one added by this pass):
- Real iPhone/iPad/macOS Safari, Android Chrome device testing (§23) — Playwright's suite (§35.2) is Chromium-only; it does not substitute for this.
- Native 200% browser zoom and OS-level `prefers-reduced-motion`/`prefers-contrast`/`prefers-reduced-transparency` toggle-and-observe passes (§22).
- 768px/1024px/1728–1920px live responsive captures at genuine device widths (§9, §23) — the Playwright suite's own viewport presets (§35.2) partially cover this in emulation, not on real hardware.
- Browser print-preview verification of the four public documents and the job report (§25).
- Multi-role (non-OWNER) live QA pass (§23) — unchanged; the visual suite's single seeded Clerk user is also OWNER-role, so it does not close this gap either.
- **Added by this pass:** a live axe-core accessibility re-run (§35.7) — genuinely not performed this pass (browser automation unavailable), reported honestly rather than skipped silently.

**ACCEPTED DESIGN DEBT** (unchanged from §33 — none of these were in this pass's scope):
- Client-side capability checks absent on a few buttons whose server action already denies correctly (Jobs-index Delete/New-job) — UI convenience gap, not a security gap.
- Three near-identical `Deletable*` components — a real, minor, pre-existing duplication outside this redesign's specific scope.

**FUTURE PRODUCT WORK** (unchanged — explicitly not touched this pass, per instruction):
- Workflow Phase 13 (stage reordering) and any 13A/13B/13C variant — not implemented, not referenced as blocking.
- Real Lighthouse/CWV field data — requires an actual production deployment.

### 35.10 Final conclusion

The three code-level blockers that kept §1's verdict at **NOT COMPLETE** are closed with genuine, independently re-run, and — where automation could not reach (§35.7) — honestly-flagged-as-unverified evidence, not a re-characterization of the same gaps under a friendlier label. Visual regression is real, persistent, and passing 41/41 against manually-reviewed baselines. Radius is fully migrated except two documented, allowlist-tested, and permanently regression-guarded exceptions. Status-badge duplication is closed across all six domain families, including one the original audit's own list missed, with pure adapters, migrated production JSX, and semantic (not class-string) test coverage.

What remains is exactly what §33 already correctly separated from code work: a real brand asset, a real production deployment, and real-device/manual QA passes — none of which this pass was asked or authorized to perform, and none of which are represented as done. The verdict is **CODE-COMPLETE / RELEASE-BLOCKED**, not **FULLY RELEASED** and not **NOT COMPLETE**.

Post-audit completion pass complete. There is no Phase 9.
