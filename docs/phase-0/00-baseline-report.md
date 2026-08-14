# Phase 0 Baseline Report

Measured against `feature/astryx-integration` on 2026-08-12. This is a baseline snapshot, not a redesign log — durable decisions live in `docs/AERNOVA_DESIGN_REFERENCE.md`.

## Worktree state at start (preserved, not touched)

`git status` at the start of this session showed substantial pre-existing uncommitted work unrelated to this redesign — an in-flight "Workflow Phase 1–13" business-logic initiative (change orders, warranties, pre-construction checklists, quality checks, workflow customization, per-company workflow stages), including its own Prisma migrations, ~20 new components, ~15 new `lib/` modules, and ~10 new tests. `docs/`, `PRODUCT.md`, `DESIGN.md`, and `PREMIUM_UI_REDESIGN_PLAN.md` were also mid-move (root `PRODUCT.md`/`DESIGN.md`/`DEPLOYMENT.md`/`PLAN-CRM.md` show as deleted; equivalents already exist under `docs/`). None of this was reverted, reformatted, or touched by Phase 0. All Phase 0 changes are additive and isolated to `docs/phase-0/`, `docs/PREMIUM_UI_PHASE_0_IMPLEMENTATION.md`, and a new `app/(prototype)/phase-0/` route tree that does not import or modify any production route, layout, or shared token file.

## Tooling inventory

| Tool | Status | Notes |
| --- | --- | --- |
| Next.js | `16.2.4`, Turbopack | confirmed via `package.json` and build output |
| React | `19.2.4` | |
| Astryx core/CLI | `0.3.0` / `0.3.0`, in step | `npx astryx doctor` (offline, already installed — no network needed): 4 passed, 2 warnings (no `@astryxdesign/theme-*` package installed — expected, Aernova uses a hand-built `defineTheme` theme, not a stock theme; no Astryx section markers in `AGENTS.md`/`CLAUDE.md` — informational, not fixed in Phase 0), 0 failures |
| Impeccable | Already installed as a project skill (`.claude/skills/impeccable`) | `context.mjs` run successfully — resolves and prints `PRODUCT.md`/`DESIGN.md` correctly. No separate `npx impeccable install` was needed or run; the skill is already the project's installed copy. Existing `.impeccable/` artifacts (`design.json`, 5 prior `critique/` reports, `live/config.json`) were inspected and preserved, not overwritten. The design-hook fired on the first Phase 0 file write and flagged `.impeccable/design.json` as older than `DESIGN.md` (a pre-existing drift, unrelated to Phase 0 edits). Deliberately **not** refreshed here: the fix is `/impeccable document`, which regenerates `DESIGN.md` itself from code — running it now risks silently overwriting the reviewed Precision Workshop-pending `DESIGN.md` before Phase 1 exists to redo it properly. Left as a named Phase 1 to-do instead (see the decision record). |
| Graphify | Existing index from 2026-08-12 (`graphify-out/graph.json`), 447 files / 2,519 nodes / 6,107 edges / 188 communities, no import cycles | Queried directly (`graphify query "design theme component dashboard layout navigation motion"`) rather than re-run; index is same-day and covers the shell/theme files Phase 0 needs. Confirms `AppSidebar()`, `DashboardLayout()`, and the theme/provider chain (`astryx-theme-provider.tsx`, `lib/theme-store.ts`) as low-degree, contained nodes — consistent with `docs/AERNOVA_DESIGN_REFERENCE.md` §14's findings. |
| Playwright | Not installed (no devDependency, no global binary) | Screenshot/prototype validation done via the Claude-in-Chrome browser extension against the live dev server instead — see the responsive/browser-verification note below. |
| Lighthouse | Not installed (no devDependency, no global binary) | No CI/CLI Lighthouse run performed. Performance baseline below is limited to production build output, bundle inspection, and manual console/network checks; Core Web Vitals (LCP/INP/CLS) are **not directly measured** in this baseline and are marked as a Phase 0 gap, not a met target. |
| Existing dev-only route convention | `app/(dashboard)/internal/astryx-preview/` | Found during inventory: an existing pattern for an unlinked, `OWNER`-gated internal route nested in the `(dashboard)` group, used to preview the Astryx theme mapping. Phase 0's prototype follows the same gating convention (`requireCompanyContext()` + `role !== "OWNER"` → `notFound()`) but lives in a **new top-level route group**, `app/(prototype)/phase-0/`, sibling to `(dashboard)`/`(public)`/`(report)`, specifically so it does not inherit `app/(dashboard)/layout.tsx`'s shell — the prototype needs to demonstrate a different shell, which it cannot do while nested inside the current one. |
| `.impeccable` critique history | 5 prior reports (2026-07-16 through 2026-08-06), scoped to `project-workspace.tsx`, `jobs/[jobId]/page.tsx`, and one cross-page visual pass | Preserved. Not superseded by Phase 0 — those were critiques of the *current* system; Phase 0's own critique/audit work (Step 9–10 prototype validation) is new and additive. |

## Brand asset audit

- Approved source: `/Users/nilay/Downloads/Aernova.jpg` — confirmed JPEG/JFIF, RGB, 500×500px, 96 DPI, white four-petal symbol + serif "Aernova" wordmark on a fixed black background. Matches `docs/AERNOVA_DESIGN_REFERENCE.md` §5.1 exactly.
- **No SVG, vector, or transparent master exists anywhere in the repository or in adjacent local project folders.** Searched the full tree (`find . -iname "*aernova*"`) — the only hits are documentation references and the generated Astryx theme files (`lib/astryx/aernova.{css,js,d.ts}`, unrelated — those are the theme module, not the logo).
- **Current production brand surfaces do not use the approved mark at all.** `app/icon.png` (512×512), `app/apple-icon.png` (180×180), `public/icon-192.png`, `public/icon-512.png` all render a placeholder cyan capital "A" on Ink Navy — an older stand-in, not the geometric symbol + wordmark. `lib/brand-og-image.tsx` renders the same placeholder "A" tile treatment for Open Graph/Twitter cards.
- `app/favicon.ico` — valid multi-size ICO (16×16, 32×32), same placeholder-era styling implied.
- **Per the Phase 0 spec's own instruction, this is a documented blocker, not something to fake:** production asset generation (symbol-only SVG, horizontal lockup SVG, transparent white/dark-ink lockups, favicon/app-icon exports, OG composition) is **blocked pending an original vector or transparent master**. The 500px JPEG is sufficient for direction approval (used as a reference image in the concept seeds and prototype, never traced or retyped) but not for production export at arbitrary sizes without visible compression/edge artifacts. This blocker is unchanged from `docs/PREMIUM_UI_REDESIGN_PLAN.md` §19's own note and is not resolved in Phase 0.
- No wordmark reconstruction was attempted anywhere in Phase 0 output — every prototype/concept surface either shows the reference JPEG directly (image tag, not retyped) or a plain-text "Aernova" wordmark in the UI type family, clearly not presented as the brand lockup.

## Current design system / UX audit (grounded in the implementation, re-verified by grep)

| Pattern | `docs/AERNOVA_DESIGN_REFERENCE.md` claim | Re-measured (`grep -c`, `app/` + `components/`) |
| --- | ---: | ---: |
| `border-hairline` | 479 | 478 |
| `rounded-xl` | 293 | 293 (occurrences) / 101 files |
| `rounded-2xl` | 131 | 131 |
| `bg-surface-raised` | 184 | 184 |
| files using `transition-*` | 9 | 5 files (regex-narrowed; order-of-magnitude consistent) |
| files using `animate-*` | 9 | 2 files |
| `backdrop-blur` | 14 | 14 |
| files using `shadow-*` | 4 | 4 |
| `"use client"` files | 88 | 88 |
| total `.tsx` components | 109 | 109 |
| total pages (`page.tsx`) | 39 | 39 |

The counts hold up. Confirmed system-level issues, not opinion:

- **Equal-weight containment.** 101 distinct files reach for `rounded-xl`; there is no visual distinction in the codebase between "this is a repeated independent object" and "this is a page section" — both get a card.
- **Near-zero interaction feedback.** Only 5 files use any Tailwind `transition-*` utility across 109 components; state changes are color-only, which is also an accessibility gap (color-only state signaling is explicitly prohibited by `docs/DESIGN.md`'s own doctrine but not yet enforced anywhere in interaction code).
- **A stale, self-contradicting action-color rule.** `docs/DESIGN.md`'s Components section still lists `button-primary: backgroundColor: "{colors.instrument}"` (cyan fill) — but `lib/astryx/theme.ts`'s own code comment calls this "stale" and maps `--color-accent` to the ink-primary/ground inversion instead, citing the verified real pattern in `components/dashboard/quick-create-menu.tsx`. Two documents disagree about the single most-used component. This is exactly the "one authoritative token source" gap Phase 1 exists to close (`docs/PREMIUM_UI_REDESIGN_PLAN.md` §8.1); Phase 0 does not resolve it, only confirms it's real.
- **Shallow Astryx adoption.** `AppSidebar`, the dashboard header, and most forms are hand-built Tailwind, not Astryx primitives — confirmed by graphify (`AppSidebar()` has no incoming edges from any Astryx import) and by direct inspection of `components/dashboard/app-sidebar.tsx`, which is plain `<Link>` + Tailwind classes, no Astryx `SideNav`/`NavItem`.
- **Client-boundary reach is already narrow where it matters.** `app/(dashboard)/layout.tsx` is a Server Component; only `AppSidebar`, `ThemeToggle`, `QuickCreateMenu`, `NotificationBell`, and `UndoToastProvider` are client. This is a real strength worth preserving through Phase 2 — the shell replacement should not widen this.
- **What's already strong and should be preserved semantically:** the two-layer tonal elevation system, the single hairline rule, the constant Instrument Cyan across themes, and the `STATUS_META`-driven status badges (`lib/job-status.ts`) that already separate "in flight / complete / archived" by tone rather than a color rainbow — this tonal discipline is a real asset the redesign should extend, not discard.

## Performance / bundle baseline

Production build (`npm run build`, Turbopack): **succeeds, 0 build errors.** One pre-existing Turbopack warning (an NFT trace note on `next.config.ts` → `lib/roof-extraction-service.ts` → a dynamic API route — unrelated to UI, not touched). Sentry sourcemap upload fails with `Invalid org token (401)` — pre-existing infra config issue (stale `SENTRY_AUTH_TOKEN`), does not fail the build, not a Phase 0 regression.

35 routes generated (7 static, 28 dynamic/server-rendered). `.next/static/chunks` totals **2.9 MB** uncompressed across all routes combined (not per-route — Turbopack's production output in this Next version does not print the classic per-route "First Load JS" table; a true shared-shell gzip delta against a future Phase 2 build will need `@next/bundle-analyzer` or an equivalent, not yet installed). Largest individual chunks are in the 100–670 KB range uncompressed, consistent with the Three.js roof-viewer and PDF/report code paths, not the authenticated shell itself.

**Not measured in this baseline (documented gap, not a met target):**
- LCP / INP / CLS at the 75th percentile — no Lighthouse/Web Vitals tooling installed or run.
- Per-route First Load JS in kB gzip (Turbopack build output format doesn't emit this table the way the historical webpack output did).
- Hydration/layout-shift warnings from a real page load — folded into the browser-verification pass below once the extension is available.

These gaps carry forward as an explicit Phase 8 comparison risk: Phase 8's "bundle and Core Web Vitals comparison against Phase 0" needs either `@next/bundle-analyzer` added at that time or a Lighthouse CI run added before Phase 1 ships, whichever comes first — noted in the decision record.

## Accessibility baseline

No automated accessibility scanner (axe, Lighthouse a11y) is installed. Baseline accessibility posture is inferred from code + design doctrine rather than a scan:
- `docs/DESIGN.md` states a WCAG 2.2 AA contrast floor (Ink Muted ~7.6:1 dark / ~4.7:1 light) and documents it as enforced doctrine, not aspiration.
- `app/layout.tsx` provides a real skip-link (`#main-content`) present on every layout (dashboard, public, report, auth).
- Focus rings are explicitly styled (`outline-instrument`) rather than left to browser defaults.
- Known gap: interaction feedback is color-only in several places (see UX audit above) — this is a real AA-adjacent risk (WCAG 1.4.1, use of color) that pre-dates Phase 0 and is not fixed here, only logged.

## Screenshot baseline and browser/responsive verification

The Claude-in-Chrome browser extension was not connected at the start of the session; the user connected it and signed in to a real seeded account (`admin@aernova.ca`, "Nilay Sorathia's Company", the same seeded workspace `[[visual-review]]` memory describes) so verification could be genuine rather than skipped. All screenshots below are real captures against the running dev server, not descriptions.

### Current production UI (desktop 1440px, dark unless noted)

Captured: `/dashboard`, `/jobs`, a real job detail page (`/jobs/[jobId]`), `/today`, `/pipeline`, `/settings` (Company profile), an internal quote review/send screen (`/jobs/[jobId]/quotes/[quoteId]`), and the public quote document (`/q/[token]`, light/paper — confirmed no-logo-set correctly falls back to the company name in the header, matching `docs/PRODUCT.md`'s documented rule). `/dashboard` and `/today` were also captured in light theme via the real theme toggle. All render as expected for the current Field Notebook system — nested rounded panels, equal-weight dashboard tiles ("Open Quote Value" / "Needs attention" / "Revenue, last 30 days"), consistent with the pattern counts in the design-system audit above.

### A concrete, previously undocumented baseline finding

**At 390px (the primary required mobile width), the current production authenticated shell is not usable without first scrolling past the entire sidebar.** `app/(dashboard)/layout.tsx`'s grid is `grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]` — correct in principle (stack below `lg`), but because `<AppSidebar>` renders before `<main>` in DOM order and the sidebar has no mobile-specific collapse, a phone-width screenshot of `/dashboard` or `/today` shows only the "Aernova" header and the full ~13-item nav list, with zero page content visible until scrolling past all of it (confirmed by screenshot, then confirmed again by scrolling to reveal the actual dashboard content below). This is worse than a generic "desktop-derived mobile layout" complaint — it's a real first-paint usability gap on exactly the device class (`iPhone Safari`) the plan's own priority order puts first, and on exactly the routes (`/today`, dashboard) flagged as highest-value field surfaces. Recorded here as measured evidence, not fixed in Phase 0 (that's Phase 2's mobile shell work) — but it substantially strengthens the case for treating mobile nav as a genuine priority, not a nice-to-have, in Phase 2.

The Phase 0 prototype's mobile nav (bottom bar + drawer, content immediately visible) was captured at the same 390px width for direct comparison — see the prototype validation notes below.

### Phase 0 prototype and concept validation

- **Prototype** (`/phase-0/prototype`): captured at desktop 1440px (dashboard, dark and light) and mobile 390px (dashboard, job workspace, both nav states). Confirmed live: role switcher changes visible nav items and (for Crew) the whole view; clicking an action row opens the job workspace; the mobile "Job details" button opens a bottom sheet with a real slide-up transition; the sheet closes on Escape, on backdrop click, and via its own close button.
- **A real bug found and fixed during live testing:** closing the mobile sheet via Escape left keyboard focus stranded on the sheet's own (now-hidden) close button instead of returning it to the "Job details" trigger — a genuine violation of `docs/AERNOVA_DESIGN_REFERENCE.md` §17's "reliable focus return for dialogs, sheets, menus" requirement. Fixed in `app/(prototype)/phase-0/prototype/prototype-client.tsx` (both `MobileMenuSheet` and `JobInspectorSheet` now capture `document.activeElement` on open and restore it on close) and re-verified live — focus now visibly returns to the trigger button after Escape.
- **Keyboard tab order** (desktop, 1440px): six sequential Tabs from page load moved focus through Dashboard → Jobs (skipping the intentionally `disabled`, not-yet-wired nav placeholders, which correctly fall out of tab order) → the role `<select>` → `+ Create` → the theme toggle, with a visible focus ring at every stop. No focus trap issues, no skipped interactive elements.
- **Console:** zero errors or warnings across `/phase-0/prototype`, `/phase-0/typography`, and `/phase-0/concepts/b` on load.
- **Typography fixture** (`/phase-0/typography`): all four candidates rendered with visibly distinct letterforms — confirms `next/font/google` actually fetched and applied IBM Plex Sans Variable, Source Sans 3 Variable, and Geist Sans (network access to `fonts.gstatic.com` was verified reachable before building this page; the npm registry, needed for `npx impeccable install`/`npx playwright install`, was not, which is why those two paths were handled differently — see the tooling inventory above).
- **Concept B** (`/phase-0/concepts/b`, "Workbench"): renders as designed — split pane, stable inspector, grouped nav, severity-dot action rows (no border-stripe regression after the earlier hook-flagged fix).

### Not directly verified (documented gap, not a met target)

- **Safari (iPhone, iPad, macOS) and Android Chrome**: no real device or Safari/Android browser was available in this environment; all verification above used desktop Chrome via the Claude-in-Chrome extension, including window-resize emulation for the 390px mobile width. This satisfies the "genuinely verify what's available" instruction but does not substitute for real Safari/WebKit or Android checks — those remain a manual follow-up before Phase 2 ships anything mobile-facing.
- **200% browser zoom**: not automated in this pass (no zoom control exposed by the available browser tools); the typography and prototype fixtures use `rem`-based Tailwind sizing throughout specifically so a manual 200%-zoom pass remains valid, but that manual pass itself was not performed here.
- **`prefers-reduced-motion` at the OS level**: not toggled live (no OS-media-feature emulation available through the connected tools). Verified instead by code inspection — every transition in the prototype (`prototype-client.tsx`) carries a `motion-reduce:transition-none motion-reduce:duration-0` pair, which is the correct mechanism, but an OS-level toggle-and-observe pass is still a manual follow-up.
- **Lighthouse / Core Web Vitals**: unchanged from the earlier note — no tooling installed, not run.
