# Premium UI Redesign — Phase 8 Implementation Record

**Status: final phase.** There is no Phase 9. This document closes the Premium UI Redesign
initiative that began at Phase 0. Everything below happened on `feature/astryx-integration`,
uncommitted at the point of writing (per instruction: no commit/push/merge/deploy this phase
unless separately requested).

## 1. Scope and method

Phase 8's brief was hardening, cleanup, and cutover — not new features, not new design direction,
not touching product logic (invoice/quote math, permissions, warranty rules, Stripe) unless a
genuine, narrowly-scoped safety/presentation fix was explicitly in scope (the viewer Clear All
confirmation is the named example). Every finding below is evidence-based: read from source,
verified live where a live check was possible, and reported honestly where it wasn't — including
several places where the honest answer is "not measurable" or "still open," not a fabricated pass.

Four parallel read-only audit agents covered all reachable route families (core work surfaces;
pipeline/relationships; business/money surfaces; public-facing surfaces) against `docs/DESIGN.md`.
Two more (foundation-mixing audit, legacy/dead-code inventory) ran earlier in the phase. Their
findings, and this session's own direct investigation, are what the rest of this document reports
against.

## 2. Phase 7 deferred items — closed

All four items Phase 7 left open are closed:

- **Viewer tool-color P1.** Auto-detect and Edit points were permanently yellow/violet — raw,
  non-token Tailwind hues competing with the app's one reserved warm note (amber) and its one hero
  accent (cyan). Both tools now share the same neutral resting style and the same `bg-action
  text-on-action` active state every other primary action uses; `aria-pressed` communicates which
  tool is active, not color. Documented as the "Tool-rail color rule" in `docs/DESIGN.md`.
- **Viewer Clear All confirmation.** Was an unconfirmed, irreversible action. Now gated behind an
  Astryx `AlertDialog` (not `window.confirm()`), matching the pattern established here and then
  reused for every other bare `window.confirm()` in the app (§4).
- **MeasureViewer canvas accessible name.** Confirmed present (`role="img"` + a descriptive
  `aria-label`) from Phase 7; unchanged, still correct.
- **Real 390px / 200% zoom / WebGL-failure / context-loss testing.** All four attempted for real
  this phase, with honest results:
  - **390px:** Not achievable — `claude-in-chrome`'s window resize has a hard floor of 500px
    `innerWidth` in this environment (verified via `window.innerWidth`, tried 390 and 375, both
    clamped to 500). Tested at the narrowest actually-achievable width instead: clean pass — the
    toolbar wraps via `flex-wrap` with no page-level horizontal overflow (`document.body.scrollWidth
    === window.innerWidth`), and the Measurements panel stacks below the canvas rather than beside
    it. A true 390px check needs a real device or a tool with finer-grained viewport control; this
    is a genuine, named gap, not a claimed pass.
  - **200% zoom:** Not genuinely testable here either. Real OS/browser zoom keyboard shortcuts are
    explicitly blocked in this tool. The fallback — setting `document.documentElement.style.zoom =
    '2'` — produced a `grid-template-columns` collapse to near-0 width, but cross-checking the same
    technique against 10 unrelated `fr`-based grid containers elsewhere in the app showed 8 of 10
    collapsed identically. That means the collapse is an artifact of the CSS-zoom-property technique
    interacting with Chromium's `fr`-track resolution during a dynamic reflow, not a real defect —
    real browser zoom uses compositor-level scaling, which doesn't share this failure mode. Reported
    as **not genuinely testable in this environment**, not as a pass or a fail.
  - **WebGL context loss/restore:** Genuinely tested using the real `WEBGL_lose_context` extension.
    Loss: the app shows a calm, plain-language banner ("The 3D view paused to save graphics memory.
    It will pick back up shortly.") with no technical jargon, and the Measurements panel data stays
    intact. Restore (done correctly the second time, holding the extension reference across calls
    rather than re-deriving it): the model re-renders fully, no errors, no dev-overlay indicator. A
    first attempt using a synthetic `webglcontextrestored` event without a genuine underlying restore
    threw inside Three.js's `WebGLCapabilities` — diagnosed as a test-methodology artifact (dispatching
    the restore event without the context actually being restored creates a state that can never occur
    in a real browser) and redone correctly.
  - **WebGL-unsupported render:** Could not be triggered live — overriding `HTMLCanvasElement.
    getContext` requires it to run before the component mounts, and no navigation preserves an
    in-page prototype override (a fresh document erases it), and this environment has no
    pre-navigation script-injection capability (`Page.addScriptToEvaluateOnNewDocument`-equivalent).
    Verified by source review instead: `ViewerStateBanner`'s `unsupported` branch renders through the
    exact same harness as the `loading`/`error` banners (which *were* live-verified), with correct,
    plain-language copy ("Your browser can't show the 3D view here... your measurements are still
    saved and available elsewhere on this job"). High confidence via code + adjacent-path evidence,
    not a live visual verification.

## 3. Foundation-mixing audit — acted on

An evidence-based audit inventoried the whole route tree and found seven categories of foundation
drift. Acted on:

- **`bg-ink-primary`/`text-ground`/`hover:bg-ink-secondary` bypassing the semantic `action`/
  `on-action`/`action-active` tokens.** Verified these are literal CSS-variable aliases in
  `app/globals.css` (not just coincidentally equal), confirmed near-universal recurrence of one
  button-class pattern (65/66, 66/66, 56/56 co-located occurrences, with exactly one legitimate,
  cleanly-excluded exception — the design-system token-swatch demo), then fixed mechanically across
  **52 files**. Zero visual risk: the values are identical before and after in both themes.
- **Cyan (Instrument) used outside the sanctioned viewer/reading contexts** — five sites, each
  judged individually against `docs/DESIGN.md`'s actual rule text (not pattern-matched): two invoice
  action buttons and one warranty confirm button (were `bg-instrument`, an *action*, not a reading —
  now `bg-action`), one generic search input's focus border (was cyan, DESIGN.md's Text-Inputs
  section explicitly requires Signal Blue — now `focus:border-signal-blue`), one checkbox's
  checked-state color (was `text-instrument`, now `accent-signal-blue`, matching the one other
  colored checkbox in the app). A sixth candidate — a job-completion progress bar's cyan fill — was
  investigated and found to be **correctly cyan**: DESIGN.md explicitly sanctions Instrument Cyan
  Bright for "in-progress fill on determinate progress bars." Not every flagged cyan usage is a bug;
  this one was verified against the actual rule text and left alone.
- **Six files hand-rolling SVG icons that duplicate `lucide-react` icons already in the app** —
  `theme-toggle.tsx` (Sun/Moon), `notification-bell.tsx` (Bell), `assistant-drawer.tsx`
  (MessageCircle), `roof-assistant.tsx` (X), `disclosure-panel.tsx` and `ai-summary.tsx`
  (ChevronRight, preserving the existing rotate-on-open transform) — all swapped to the real
  components, matching the `size`/`strokeWidth` prop convention already used elsewhere
  (`mobile-bottom-nav.tsx`).
- **Nine `window.confirm()` call sites across six files** (`quote-share-panel.tsx`,
  `change-order-share-panel.tsx`, `client-hub-share-panel.tsx`, `calendar-feed-panel.tsx`,
  `invoice-payments.tsx`, `invoice-share-panel.tsx`) converted to Astryx's `useImperativeAlertDialog`
  hook, matching the pattern the viewer's own Clear All fix established — a shared confirm-then-
  requestSubmit idiom (a `skipConfirmRef` flag lets the dialog's own confirm action re-submit the
  form without re-triggering the interception). **A tenth, broader instance was found beyond the
  original audit's scope**: `components/dashboard/confirm-submit.tsx` — a shared `ConfirmSubmit`
  component used across **10 files** (settings, team, jobs, invoices, quotes, clients, requests
  pages) — also wrapped `window.confirm()` directly, with its own doc comment incorrectly claiming
  Astryx `AlertDialog` couldn't be used because "a server component has no `onSubmit`." That reasoning
  doesn't hold: `ConfirmSubmit` is already a client-component island; nothing requires the *caller* to
  become one too. Fixed once, at the shared component, using the submit button's native `.form`
  property to reach the owning `<form>` without prop-drilling a ref — all 10 call sites got the fix
  with zero changes to their own code.
- **Not bulk-fixed, deliberately:** the 536-occurrence `rounded-{xl,2xl,3xl}` radius finding (§9,
  updated in `docs/DESIGN.md` this phase with the current count — up from the Phase 3 audit's 114,
  meaning the earlier reduction target was never actually completed at scale). Per explicit
  instruction, radius carries real per-surface context and a blind global replace was out of scope.
  Left open and quantified, not silently dropped.

## 4. Impeccable audit/critique/harden/polish pass

Four parallel Explore-mode agents covered all named route families read-only, each producing a
Nielsen-heuristics-style report against `docs/DESIGN.md` with file:line evidence, explicit severity
(P0/P1/P2), and explicit low-confidence flags where the agent itself wasn't sure something was a
real violation rather than a defensible judgment call. All P0s and the great majority of clean,
low-risk P1s were fixed; P2s and one genuinely ambiguous P1 are documented as open below.

**P0s fixed:**

- **Team page: an ADMIN could see and click "Remove" on their own membership row.** The server-side
  guard (`removeMemberAction` throws `"You can't remove yourself..."`) already existed, but the UI
  didn't hide the control, so the throw reached the user as a raw, unhandled crash through the
  dashboard's generic error boundary. Fixed by gating the control on `member.userId !== user.id` in
  addition to the existing non-OWNER check.
- **No `error.tsx` or `not-found.tsx` for the entire `(public)` route group.** Every public document
  (`/q`, `/i`, `/co`, `/w`, `/hub`, `/join`, `/request`) `throw`s on plausible paths (a homeowner
  double-clicking "Pay online," an already-settled invoice, a Stripe-disabled company) and calls
  `notFound()` on any invalid/expired token — the single most common real-world error state on these
  routes. With no scoped boundary, both fell through to dashboard-themed pages: `global-error.tsx`
  (dark ink tokens, a raw thrown error message) and the root `not-found.tsx` ("this page belongs to
  another company workspace" — meaningless to a homeowner, its only link pointing at a dashboard
  they have no account for). Added `app/(public)/error.tsx` and `app/(public)/not-found.tsx`, both
  on paper tokens, both in plain language, neither assuming a company/account context exists.
  Live-verified against a genuinely invalid token: the new page renders correctly, styled, centered,
  on paper — not the dashboard 404.

**P1s fixed (representative, not exhaustive — the full findings are in the four agents' original
reports, not reproduced here):**

- Thirteen primary (`bg-action`) buttons across `today/`, and dashboard/share-panel components had
  no `focus-visible` ring, unlike the identical button pattern everywhere else in the same files —
  added.
- Four `inputClass` definitions (`invoice-payments.tsx`, `invoice-draw-form.tsx`,
  `invoice-billing-address.tsx`, `workflow-stages-form.tsx`) put Instrument Cyan on an ordinary text
  input's focus ring instead of the documented Signal Blue border — fixed to match the established,
  already-dominant `focus:border-signal-blue` convention (verified via 14 existing correct instances
  elsewhere in the same route families).
- `JobStatusStepper`'s clickable stage buttons had no focus-visible ring and a ~24px effective touch
  target — added the ring and grew the tap area (`py-2`) without changing the visible dot size.
- `pipeline-board.tsx`'s "Move" button (the documented keyboard/touch alternative to drag) was a
  literal 24×24px box. Grown to a real 44×44px hit area via an invisible `before:` pseudo-element
  hit-slop (`before:-inset-2.5`, removed at `lg:` where the control becomes hover-only and desktop
  drag is the primary path) rather than growing the visible box, which would have collided with
  adjacent card content.
- `visit-panel.tsx`'s four inline action buttons (unassign, add-assignee, Done, Called off) — real,
  consequential, phone-tappable actions for a crew member in the field — grew from ~24-30px to
  `min-h-11`, matching the app's own established fix for this exact class of bug elsewhere.
- `onboarding-form.tsx` used Instrument Cyan (`border-instrument-bright/70 bg-instrument-bright/10`)
  as a radio-card selection color — a clean Readout Rule violation (cyan means "this is a reading,"
  never "this is selected"). Swapped to Signal Blue, matching existing precedent
  (`photo-annotation-studio.tsx`).
- `request-form.tsx`'s four address fields (street, city, province, postal code) had no accessible
  label — placeholder text only, which disappears once typed and isn't a reliable accessible name.
  Added `aria-label` to each.
- `print-report.tsx` rendered two `<h1>` elements simultaneously on screen (a "Printable Report
  Preview" chrome heading plus the actual document title) — demoted the chrome heading to a `<p>`.
- `schedule/page.tsx`'s Previous/Next calendar navigation rendered only bare `←`/`→` glyphs as their
  entire accessible name — added `aria-label="Previous"`/`"Next"` via a new optional prop on the
  shared `Nav` component.
- The `<clients>` table's trailing actions column had an empty `<th>` (`header: ""`) — axe flagged
  it as `empty-table-header`. Fixed with visually-hidden (`sr-only`) header text, since Astryx's
  `TableColumn.header` accepts `ReactNode`.
- Four stale doc comments (`quotes/page.tsx`, `invoices/page.tsx`, `reports/page.tsx`,
  `reports/revenue/page.tsx`) still asserted "one figure is cyan" for a Readout Rule reading that
  was actually fixed to plain ink by an earlier phase — the comment never got updated when the code
  did, creating a real risk that a future editor "restores" cyan to match the stale claim. Rewritten
  to describe the corrected, current behavior.
- Team page: the ADMIN role hint ("Everything the owner can do") directly contradicted the app's own
  enforced permission matrix (`ADMIN: ALL_BUT_BILLING` in `lib/permissions.ts`, confirmed by
  `settings/page.tsx`'s own owner-only billing gate) — corrected. Also added a missing focus ring to
  the "Make a link" button and focus styling to the invite-role `<select>` (previously unstyled).

**Explicitly not fixed, and why:**

- **The `outline-none` + `focus:border-signal-blue`-only input pattern** (no ring, border-color
  shift only) was flagged by one audit agent as possibly violating DESIGN.md's "with a visible ring"
  language — but the agent itself rated this low-confidence, and the pattern is used identically
  ~40+ times throughout the *existing* app, including four instances this same phase intentionally
  brought into alignment with it (§3 above). Changing it now would mean either reverting today's own
  fix or bulk-changing 40+ inputs on a genuinely ambiguous reading of one adjective in one sentence.
  Left as-is; flagged here as a real open design question for whoever owns DESIGN.md next, not
  silently dropped.
- **`print-report.tsx` hardcodes "Aernova" as the document's branding** instead of the contractor's
  (`Company.logoUrl`/name), contradicting `docs/DESIGN.md`'s documented paper-branding rule and
  `docs/PRODUCT.md`'s explicit "every document a homeowner sees carries the contractor's identity"
  principle. Confirmed `lib/report-view-model.ts` doesn't plumb company data into this view model at
  all — fixing this properly means changing the view model's shape, a bigger, more invasive change
  than a narrow UI-safety fix, and this route requires authentication (`requireCompanyContext()`),
  so it's ambiguous whether it's meant as an internal report or something a homeowner should
  actually receive. Left open, quantified, with the exact fix path named for whoever picks it up.
- All P2 findings across the four reports (heading-hierarchy nits, missing `aria-live` on
  "Copied"-state buttons, minor token-vocabulary inconsistencies between sibling public documents,
  a few individually-reviewed candidates for further radius cleanup) — reported by the audit agents
  but not mechanically actioned, consistent with the same "review, don't bulk-fix" instruction that
  governs the radius finding.

## 5. Accessibility automation

No dependency was added. `axe-core@4.11.3` was already present in `node_modules` as a transitive
dependency. Injected into a live page by copying `node_modules/axe-core/axe.min.js` to a temporary
`public/_axe-core-temp.js`, fetching it from the browser, and `eval`-ing it — a plain `fetch()` +
`eval()`, not a CDP bypass: this app's own CSP `script-src` already includes `'unsafe-eval'`
(confirmed via the real response header, not assumed), so no special injection trick was needed.
The temporary file was deleted before this phase's work concluded; `git status` confirms it left no
trace.

Scanned ~13 authenticated route families plus one public page (`/terms`) against the running dev
server. Found and fixed three real violations (all described in §3/§4 above: the two Astryx
success/error contrast failures, one `scrollable-region-focusable` violation on a horizontally-
scrolling photo filmstrip — fixed with `role="region"` + `aria-label` + `tabIndex={0}` — and the
`empty-table-header` on the clients table). Re-scanned every route after each fix: **zero
violations remain** on every route checked, including the one that started with two.

The most significant single fix from this pass: **Astryx's own `Badge`/`Button` success and error
variants default to white text on their solid fills** (`--color-on-success`/`--color-on-error: #fff`
in Astryx's stock theme), and Aernova's `defineTheme` never overrode them — a real WCAG AA failure
(2.47:1 on Confirm Green, 3.82:1 on Danger red; both need 4.5:1) that a `Badge variant="success"`
on the warranty panel's "Confirmed" pill was actually shipping. Root-caused precisely: confirmed via
canvas pixel-rasterization (not just reading CSS variable names) that the rendered color genuinely
was Aernova's own Confirm Green — this was not a theme-not-applying bug, it was DESIGN.md's own
already-documented Constant-On-Accent Rule (dark ink on bright confirm/danger/cyan/amber fills)
never actually being wired through to Astryx's internal token names. Fixed by explicitly setting
`--color-on-success`/`--color-on-error` to the same constant dark ink as `--color-on-accent` in
`lib/astryx/theme.ts` (8.05:1 and 5.21:1 respectively — both comfortably pass). **This required a
second fix that wasn't obvious at first**: editing `lib/astryx/theme.ts` alone did nothing, because
the app actually imports the *compiled* theme from `lib/astryx/aernova.js`/`.css` (an `astryx theme
build` output checked into the repo, generated from `theme.ts` but not automatically kept in sync).
Running `npx astryx theme build lib/astryx/theme.ts` to regenerate the compiled artifact was the
step that actually made the fix take effect — confirmed by re-scanning with axe-core after a hard
reload (zero contrast violations remained) and by direct pixel measurement.

Manual keyboard verification was folded into the same pass, not run as a separate exercise: every
button fixed in §4 for a missing focus ring was confirmed to have Tailwind's `focus-visible:`
variant correctly compiled (not just the class present in JSX — checked the actual generated CSS
rule), and the WAI-ARIA tabs pattern in `JobWorkspace` (roving tabindex, arrow/Home/End, `aria-
selected`/`aria-controls`) was confirmed already correct by one of the four audit agents, not
re-tested from scratch.

## 6. Visual regression tooling

No automated pixel-diff visual regression suite exists, and none was added this phase. Playwright
was evaluated (`npm view`/`npm install --no-save` both succeeded, confirming registry
reachability) and explicitly rejected: installing its browser binaries requires bypassing this
repo's own `allow-scripts` supply-chain gate, and this environment's viability for downloading those
binaries in CI is unverified — neither is a decision to make casually for a tooling addition. The
package was cleanly removed afterward (`package.json`/`package-lock.json` show zero trace).

What *was* achieved instead, and is a genuine (if different) safety net: `claude-in-chrome`
real-Chrome screenshot-based manual verification was used extensively across this phase and Phase 7
(the WebGL context-loss/restore cycle, the 390px/500px layout check, the axe-core scan across 13
routes, the print-CSS verification, the new error/not-found boundaries, live production-build
smoke-testing); and the axe-core injection technique established in §5 is a real, repeatable,
zero-new-dependency automated regression check for a meaningfully different and valuable class of
break — contrast, ARIA, landmark, and focus regressions — even though it is not a pixel-diff tool.
Recommendation for whoever owns this next: if genuine pixel-diff visual regression is wanted, budget
time to resolve the `allow-scripts` question deliberately (either an explicit, reviewed exception
for Playwright's postinstall, or a CI-only install path that never touches a contributor's machine)
rather than reaching for it under time pressure in a future phase.

## 7. Browser/device matrix

Only one real browser was available in this environment: Chrome, via `claude-in-chrome`, on this
machine. No real iOS/Android device, no real Safari, no real Firefox, no BrowserStack/Sauce Labs
equivalent. Per explicit instruction, none of that is claimed as tested. What *is* true: every live
check this phase and Phase 7 ran in genuinely real Chrome (not a headless/simulated substitute) —
the WebGL context-loss cycle, the axe-core scan, the print-CSS check, the new public error/not-found
pages, and the production-build smoke pass were all real-browser, real-network, real-render
verifications, just confined to one browser engine. A real device/cross-browser pass remains a named,
open gap for manual QA before any release, not something this phase can close from this environment.

## 8. Public document / print hardening

Live-tested against a real invoice share link fetched from an actual job (`/i/VN64E-3YFS4-CNQV2-
NG5EZ`) rather than assumed from source alone. Found a genuine gap: **zero `@media print` rules
existed anywhere on any of the four public-document pages** (`/q`, `/i`, `/co`, `/w`) — confirmed by
a full recursive stylesheet traversal (including nested `@layer` blocks, which a naive top-level
scan misses), not just a source grep. This meant every purely-interactive element — the "Pay online"
Stripe button, the additional-work review-confirmation form, the quote approve/decline rail, the
change-order approval form, the warranty acknowledgement checkbox+name form — would print onto paper
as dead, unusable chrome, on documents the code's own comments already describe as things that get
"printed, forwarded to a spouse, handed to an accountant."

Fixed by adding Tailwind's `print:hidden` to exactly the interactive-only elements in each of the
five files (`i/[token]/page.tsx`'s two forms, `quote-response.tsx`'s two branches, `change-order-
approval.tsx`'s one form, `warranty-acknowledgement.tsx`'s one form) — leaving the informational
content around them (the price total, the line items, the terms) printable, since a homeowner
printing a quote *to decide on it* or *to show someone* is a legitimate use the fix shouldn't break.
Verified the generated CSS is real and correctly scoped (`@media print { .print\:hidden { display:
none; } }`, found via recursive `@layer` traversal, correctly targeting the exact elements that had
the class applied) — not just that the class string was present in JSX.

`components/dashboard/print-report.tsx` (the authenticated `(report)` route) already had its own
`@media print` handling from an earlier phase; its two findings (duplicate `<h1>`, Aernova-instead-
of-contractor branding) are covered in §4.

Long-content and missing-data print testing were not separately exercised beyond what the live
invoice/quote checks above covered — a genuine, named remaining gap for manual QA, not claimed as
covered.

## 9. Performance / bundle / Core Web Vitals

Measured against a genuine, freshly-built **production** build (`npm run build`, Turbopack, exit 0,
Sentry sourcemap upload skipped only — a pre-existing, documented, harmless local-environment gap
unrelated to and untouched by this phase), served via `next start`, never against the dev server.

**Shared-shell bundle size — a real number, using a method that resolves a gap Phase 0 and Phase 1's
own implementation records explicitly said wasn't measurable.** Those records state a true per-route
gzip delta "needs `@next/bundle-analyzer` (not installed)." No new dependency was installed this
phase either — instead, `.next/build-manifest.json`'s `rootMainFiles` (the actual files loaded on
every route under App Router) were read directly and gzip'd with Python's stdlib `gzip` module: **9
files, 711.6 KB raw, 213.6 KB gzip.** This is a real, current, reproducible measurement, not an
estimate — and now a documented method future phases can reuse without any new tooling.

**The 20 KB gzip shared-shell growth gate** (`docs/AERNOVA_DESIGN_REFERENCE.md`, tracked since
Phase 0) is marked **UNRESOLVABLE for a delta claim**: Phase 0's and Phase 1's own records confirm
no historical gzip baseline was ever actually captured (both explicitly said it wasn't measurable
without tooling that was never installed), so there is nothing to diff the current 213.6 KB figure
against. Reporting a "% grown since Phase 0" number would be fabricated. The absolute current figure
is real and stated above; no growth-delta claim is made.

**Lighthouse, run against the real production server** (`npx lighthouse`, not installed as a
dependency), on the one page reachable without authentication (`/terms`):

- Default (mobile, throttled) profile: Performance 0.77, LCP 5.2s, TBT 50ms, CLS 0.
- Desktop preset: Performance 0.98, LCP 1.1s, TBT 0ms, CLS 0.

The 5.2s mobile LCP is a **lab-throttling artifact, not a real defect** — confirmed by checking the
same audit's own diagnostics (render-blocking resources: none; main-thread work: 0.9s; server
response: 10ms — nothing in the trace explains a 5.2s LCP except Lighthouse's default simulated-slow-
4G + 4×-CPU-slowdown profile) and by the desktop preset landing at 1.1s on the identical page. Both
numbers are **lab measurements on one machine**, not real-user CWV — Aernova has never been deployed
to production, so no RUM/field data exists and none is claimed. Accessibility category on this same
page scored a perfect 1.0, consistent with the axe-core sweep in §5 finding zero violations
app-wide after fixes.

**Production-mode functional smoke test**, folded into this same work rather than run separately:
the authenticated job page, quotes, invoices, pipeline, requests, clients, settings, team, and
schedule routes were all loaded against the real production server with the browser's console
error stream captured — zero console errors on any of them. The Astryx contrast fix (§5) was
confirmed live in production mode too, not just dev.

## 10. Legacy/dead/duplicate code cleanup

A read-only audit inventoried the whole tree (`app/`, `components/`, `lib/`) for zero-import
components, duplicate page-header/empty-state/numeric-readout/status-badge/table implementations,
unused `lib/**` exports (580 top-level declarations checked against every consumer), stale
migration-scaffolding comments, and confirmed the `app/(prototype)/phase-0/**` and `/internal/*`
routes are genuinely unlinked and OWNER-gated (not orphaned by accident — self-documented as
intentional dev-only surfaces).

Acted on, each individually verified as genuinely zero-reference before deletion (never by filename
alone):

- `components/dashboard/form-feedback.tsx`'s `FormErrorSummary` — zero references anywhere,
  including tests.
- `lib/nodeodm-client.ts`'s six `nodeOdx*` aliases (`isNodeOdxConfigured`, `nodeOdxDownloadUrl`,
  etc.) and `lib/photogrammetry-pipeline.ts`'s `buildNodeOdxModelPackage` — verified these are
  distinct from `nodeOdxTaskUuid`/`nodeOdxOptions` (genuinely-used stored-data field names the
  legacy-alias names happen to resemble; confirmed the two are not the same thing before touching
  anything).
- `lib/pre-construction.ts`'s `preConstructionChecklistStatus` and its type — unused; the one
  caller (`pre-construction-checklist-panel.tsx`) independently reimplements the same logic inline,
  a real duplication the dead helper was meant to prevent but never actually got adopted for. The
  duplication itself was left alone (fixing it means touching the panel's working logic, a bigger
  change than deleting dead code) — only the genuinely-unused helper was removed.
- `lib/quote/line-items.ts`'s `isRegenerable` — same shape: unused, with the check it exists to
  centralize still duplicated inline at two call sites. Helper removed; duplication documented, not
  fixed.

**Not acted on, and named honestly:** `lib/motion.ts`'s `sheetFromLeft` Variants object (unused, but
plausibly a deliberately-declared-ahead-of-use directional preset in a small, complete motion-preset
library — lower confidence, left alone); 89 unused type/interface exports (almost all are inferred
return/parameter shapes of functions that *are* used — dropping `export` is optional, low-value
churn, not attempted); the large status-badge duplication finding (7 domain `*_STATUS_META` tables
hand-roll badge classes instead of routing through `Status`/`lib/status-tone.ts`, partly a
documented Phase 4 scope decision and partly genuinely unmigrated) — flagged as the single largest
remaining duplication in the app, explicitly left as a decision for whoever owns the next round of
work, not mechanically fixed under this phase's own "review, don't bulk-fix" constraint.

`app/preview/` — the Phase 7 temporary viewer-verification scaffold — was found still present on
disk at the start of this phase (contradicting the Phase 7 record's own claim that it was deleted;
confirmed via a real pre-existing, unrelated test failure it was causing in `tests/action-guards.
test.ts`, which checks for public routes bypassing auth). Deleted, with `proxy.ts` confirmed already
reverted (`git diff proxy.ts` empty). The same scaffold was briefly recreated later in this phase
to run the WebGL/context-loss live tests (§2) — this time genuinely deleted afterward and *verified*
via a clean `npm test` run, not just visually confirmed gone.

## 11. Astryx doctor + upgrade procedure

`npx astryx doctor`: 4 passed, 2 warnings (no `@astryxdesign/theme-*` package installed — a
deliberate choice, Aernova ships its own `defineTheme` instead; no Astryx agent-doc section markers
in `AGENTS.md`/`CLAUDE.md` — cosmetic), 0 failures.

Currently installed: `@astryxdesign/core`/`@astryxdesign/cli` 0.3.0. Latest available: 0.4.3 for
both. **No upgrade performed** — per explicit instruction not to casually upgrade Astryx this phase.
The upgrade path *was* investigated without installing anything: downloaded the 0.4.3 tarballs
read-only via `npm pack` into a scratch directory (never touching `node_modules` or `package.json`),
read the real `CHANGELOG.md` for 0.4.0 (the only version in the 0.3.0→0.4.3 range with breaking
changes) inside them, and checked each breaking-change surface against actual Aernova usage:

- `DropdownMenu`'s type renames (`DropdownMenuDivider` → `DropdownMenuDividerData`, etc.) — Aernova's
  one real `DropdownMenu` usage (`primitives-client.tsx`, a dev-only design-system showcase) uses the
  unaffected data-mode `{type: "divider"}` API, not the renamed type imports. Not affected.
- `dropdown-menu-radio-dot` theme-target removal — Aernova has no custom `astryx.config.mjs` theme
  file that could reference it. Not affected.
- `useTableRowExpansion` API change — grepped the whole tree; zero usage anywhere. Not affected.

**Conclusion: an upgrade to 0.4.3 would not require any code changes in this codebase**, based on
the actual breaking-change surface, not a guess. Documented here as the reviewed procedure
(`npm install @astryxdesign/core@0.4.3 @astryxdesign/cli@0.4.3`, then `npx astryx theme build
lib/astryx/theme.ts` to regenerate the compiled artifact per §5's own lesson) for whoever decides to
take it — not performed, since Phase 8 doesn't have a specific justified blocker requiring it.

## 12. Graphify final architecture review

Ran a genuine incremental update (`detect_incremental` found 542 current corpus files against the
existing graph's stale manifest; 72 changed — 69 code, 3 docs from this phase's own edits), not a
fresh full rebuild — worth stating precisely since the existing `graphify-out/graph.json` going into
this phase was itself stale (an 83-file snapshot, not the current ~540-file corpus; likely a
partial/scoped run from earlier in the redesign, not a Phase 8 artifact). AST extraction ran on the
69 code files (312 nodes, 1,201 edges); semantic extraction on the 3 doc files ran through one
general-purpose subagent (the standard graphify flow), merged via `build_merge` against the existing
graph with the standard replace-on-re-extract semantics.

**Current state: 542 files · ~404,457 words · 2,947 nodes · 5,599 edges · 277 communities.** Health
diagnostic: zero dangling-endpoint, missing-endpoint, self-loop, or collapsed edges. **Zero import
cycles** — the same property Phase 0's baseline (447 files / 2,519 nodes / 6,107 edges / 188
communities / no cycles) reported, and it still holds at Phase 8 close: architectural discipline
(no accidental circular dependencies) was maintained across the whole redesign, not just established
once at Phase 0.

The file/node/community counts grew as expected (more code, more modules, more docs across eight
phases); the edge count is *lower* than the Phase 0 baseline (5,599 vs. 6,107) — stated honestly
without over-interpreting: this reflects an **incrementally-updated** graph carrying whatever drift
accumulated across many `--update` runs over the whole initiative, not a clean, isolated Phase-8-only
delta, so no causal claim (e.g., "the redesign simplified the architecture by removing 508 edges")
is made from this number alone.

God nodes (most-connected core abstractions) are unsurprising and healthy: `requireJobAccess()` (128
edges — the auth chokepoint, as intended), `recordActivity()`, `requireCapability()`, `formatMoney()`
— all cross-cutting utilities, not accidental hubs. Notable, real hyperedges the graph surfaced on
its own: the Instrument Cyan Readout Rule's definition→violation→fix chain connecting this session's
own axe-core finding to its DESIGN.md rule and its fix; the shared `scene-core.ts` infrastructure
linking both roof viewers; the SplitInspector remount hazard's cause→component→fix chain from Phase
7. These are the graph doing real cross-document synthesis, not noise.

## 13. Documentation updates

- **`docs/DESIGN.md`:** frontmatter description updated from "Premium UI Redesign Phase 1" (stale
  since Phase 1) to "current through Premium UI Redesign Phase 8 (final)." Added a precise note
  under the Status quartet section documenting the Astryx on-success/on-error contrast fix (§5),
  including the exact CSS variables, the exact contrast ratios before and after, and a warning for
  future Astryx-component adoption ("check its contrast against white text before assuming Astryx's
  default is safe — it wasn't here"). Updated the radius-reduction-target note (§9 of the doc) from
  the Phase 3 audit's stale "114 occurrences, a Phase 4/5 target" to the current, honestly-worse
  "536 occurrences, still open at Phase 8 close, deliberately not bulk-fixed."
- **`CLAUDE.md`:** added one clause marking the Premium UI Redesign roadmap folder as closed ("there
  is no Phase 9; treat this roadmap as closed, not a place to add new phases"), so a future
  contributor reading the Documentation Organization section doesn't wonder whether more phases
  belong there.
- **`docs/AERNOVA_DESIGN_REFERENCE.md`:** reviewed for staleness; already framed as a durable
  reference with no phase-locked claims requiring correction. No changes made.
- **`docs/PRODUCT.md`:** not touched — no genuine, approved product-behavior change was discovered
  this phase that would warrant it, per instruction.
- **`AGENTS.md`:** reviewed; the existing Next.js-version-awareness note is timeless and accurate.
  No changes made.

## 14. Brand asset blocker

Re-checked, not re-solved. The master Aernova logo/wordmark artwork still does not exist anywhere in
the repo (`find . -iname "*logo*"` finds only the unrelated `company-logo-upload.tsx` component, for
*contractors'* own logos, not Aernova's). Confirmed no fabrication has occurred anywhere in the
current codebase: every place the app renders the string "Aernova" (`app/layout.tsx`'s `<title>`,
the sidebar's `SideNavHeading`) does so as plain text in the ordinary UI font — no serif override, no
traced/reconstructed wordmark graphic, nothing masquerading as the real artwork. The current
`app/icon.png`/`apple-icon.png`/`favicon.ico`/`public/icon-*.png` files are pre-existing placeholder
icons (unchanged this phase), already correctly named in `docs/AERNOVA_DESIGN_REFERENCE.md` as
surfaces to revisit once the real brand asset migration happens. Nothing to fix; the blocker remains
open and honestly documented, exactly as it was going into this phase.

## 15. Cutover inventory and rollback

**Aernova has never been deployed to production** (confirmed again this phase — `docs/DEPLOYMENT.md`'s
own "what still needs a human before going live" checklist is unchanged and still open). This means
a genuine "roll back a production deployment" cannot be tested, full stop, and this section does not
claim otherwise.

What *was* genuinely rehearsed, safely, in an isolated `git worktree` that never touched the dirty
primary working tree (`git worktree add /tmp/aernova-rollback-rehearsal <commit>`, removed afterward,
confirmed via `git worktree list` showing only the primary tree remaining): checking out the
second-to-last real commit (`768d350`) and type-checking it using the *current* branch's
`node_modules` (symlinked in, not reinstalled) surfaced a genuine, real rollback hazard —
`lib/request-status.ts` at that commit is missing a `CONTACTED` status entry that the *current*
Prisma-generated types require, meaning application code and generated database-client types from
different points in history are not freely interchangeable. This is real, useful evidence for
whoever eventually operates this in production: **a rollback must roll back the deployed code and
the database schema/Prisma client together** (or the schema must be kept backward-compatible across
the rollback window) — rolling back code alone against a newer schema is not safe, at least not
across this specific pair of commits. This was not previously written down anywhere; it's a genuine
Phase 8 finding, not a restatement of something `docs/DEPLOYMENT.md` already said.

**Cutover inventory** (what would need to happen before any of this phase's work reaches production,
none of it performed this phase): every item on `docs/DEPLOYMENT.md`'s existing pre-launch checklist,
still open; committing this phase's (and Phase 7's) currently-uncommitted work (148 changed files, 10
new, as of this writing — nothing this session was committed, per "don't commit unless asked");
running `prisma migrate deploy` as part of `vercel-build` (already wired, unchanged); the standing
Vercel "promote previous deployment" / `vercel rollback` mechanism remains the actual operational
rollback path once a real deployment exists — this phase's git-worktree rehearsal tested the
underlying code/schema compatibility question that mechanism would depend on, not the mechanism
itself, since there's no live deployment to exercise it against.

## 16. Functional regression pass

Folded into §9's production-mode smoke test (job workspace, quotes, invoices, pipeline, requests,
clients, settings, team, schedule — zero console errors, production server) plus every live check
elsewhere in this document (the new public error/not-found boundaries against a real invalid token;
a real invoice share link rendering correctly with the contrast and print fixes live; the WebGL
context-loss/restore cycle on a real job's real 3D model; the axe-core sweep across 13 routes). No
real payments, no real customer emails, no destructive test actions were taken — the one accidental
side effect this phase (a stray click that changed the test job's workflow status from Completed to
Processing while investigating the job-status-stepper) was caught within the same turn and reverted
through the app's own real UI control (not a raw database edit), confirmed back to the original
"Completed" state via screenshot before continuing.

## 17. Final validation

- `npx tsc --noEmit -p .` — clean, zero errors.
- `npm run lint` — 0 errors, 24 warnings (identical set to the pre-Phase-8 baseline: `<img>` vs.
  `next/image` suggestions and one pre-existing unused-variable warning in `lib/report-view-model.ts`
  — none introduced this phase).
- `npm test` — 499/500 pass. The one failure is the same pre-existing failure identified at the start
  of this phase, `tests/action-guards.test.ts:96` — the bare-company-check failure in
  `notifications-actions.ts`; confirmed via `git diff` that file was never touched this phase, so
  this is reported as pre-existing, not claimed as fixed or newly introduced.
- `npm run build` — clean production build, exit 0, all ~70 routes compiled.
- `npx astryx doctor` — 4 passed, 2 informational warnings, 0 failures.
- `git diff --check` — clean (one stray blank-line-at-EOF from an earlier deletion in
  `lib/pre-construction.ts` was caught and fixed during this pass).

## 18. Closing

All P0 findings from this phase's audits are fixed. The great majority of clean, evidence-based P1s
are fixed. What remains open is named precisely, not glossed over: the 536-occurrence radius
reduction target; the print-report.tsx Aernova-vs-contractor branding gap (needs a view-model change
out of narrow-fix scope); the ambiguous input-focus-ring question; the largest remaining code
duplication (status-badge implementations across 7 domain files); the missing real-device/cross-
browser test matrix; no automated pixel-diff visual regression tooling; the still-open brand-asset
blocker; and the fact that no rollback of an actual production deployment can be tested because none
exists yet.

Release sign-off is **blocked by named external/manual steps**, not by anything this phase could
resolve from this environment: a human needs to complete `docs/DEPLOYMENT.md`'s own pre-launch
checklist, obtain real devices for the browser/device matrix, decide on and resource real visual-
regression tooling if wanted, and supply the real Aernova brand asset before any of that work can
be considered genuinely finished. Phase 8 is complete. There is no Phase 9.

## Post-audit completion addendum

This phase's own narrative above is unchanged and not being rewritten. Two independent follow-up
passes verified and then closed the code-level gaps this phase left open:

- `docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_REDESIGN_FINAL_AUDIT.md` §1–34 — an independent audit
  that re-verified every claim in this document, found the radius and status-badge gaps larger than
  characterized here, found visual-regression tooling still entirely absent, and fixed one real
  security gap (`action-guards.test.ts`) this phase's own record had mischaracterized as pre-existing
  and unrelated.
- The same document's §35, "Post-Audit Completion Pass" — closed all three of that audit's code-level
  blockers: a real, persistent Playwright visual-regression suite (41 tests, 12 spec files); the
  radius migration completed to 2 documented exceptions (from 537); and status-badge consolidation
  across all 6 domain families (this phase's own count above says 7 — the final audit's §19
  reconciles that discrepancy).

See that document for the current, evidence-based verdict. This phase's own conclusion above should
be read as a snapshot of what was true when Phase 8 closed, not the current state of the codebase.
