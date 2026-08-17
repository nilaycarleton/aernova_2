# Premium UI Redesign — Final Completion Audit

**This is not Phase 9.** Phases 0–8 are complete and closed; this document is an independent, evidence-based verification of that closure, not a continuation of the roadmap. Nothing in it authorizes further phases.

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
