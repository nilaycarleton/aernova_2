# Premium UI Redesign — Phase 3: Shared Operational Primitives

Implementation record, in the same format as Phase 0/1/2's summaries. This is the Premium UI
Redesign's Phase 3 ("Shared operational primitives"), not Workflow Phase 3 — those are unrelated
initiatives that happen to share a number.

## 1. Phase scope

Deliverable per `PREMIUM_UI_REDESIGN_PLAN.md` §11: PageHeader, ActionToolbar,
FilterToolbar, Status, NumericReadout, DataRow, EmptyState, Skeleton pattern, SplitInspector,
document primitives, an Astryx-backed form pattern, an Astryx-backed overlay doctrine, shared
fixtures, and a removal/migration map for superseded custom UI — all proven in an internal lab,
none of it wired into production routes. Phase 4 (pilot vertical slice: Dashboard, Jobs index,
Job workspace) is explicitly out of scope and not started.

## 2. Branch / worktree state

Branch: `feature/astryx-integration`. Before any edit, `git status --short` was recorded and
compared against `PREMIUM_UI_PHASE_2_IMPLEMENTATION.md`: the tree already carried substantial
pre-existing uncommitted work (Workflow Phases 1–13, the CRM/warranty/change-order/quality-check
build-out, and Premium UI Phases 0–2's own files). Nothing in that state was reset, stashed, or
cleaned. Only new files were added and a small, named set of existing files were edited (§4).

## 3. Files added

```
lib/status-tone.ts
lib/numeric-readout.ts
lib/split-inspector.ts
lib/char-counter.ts
lib/design-system-fixtures.ts

components/ui/status.tsx
components/ui/numeric-readout.tsx
components/ui/page-header.tsx
components/ui/action-toolbar.tsx
components/ui/filter-toolbar.tsx
components/ui/data-row.tsx
components/ui/empty-state.tsx
components/ui/skeleton.tsx
components/ui/split-inspector.tsx
components/ui/document.tsx
components/ui/form-field.tsx

app/(dashboard)/internal/design-system/primitives/page.tsx
app/(dashboard)/internal/design-system/primitives/primitives-client.tsx

tests/status-tone.test.ts
tests/numeric-readout.test.ts
tests/split-inspector.test.ts
tests/char-counter.test.ts

PREMIUM_UI_PHASE_3_IMPLEMENTATION.md   (this file)
```

~1,630 lines across the twelve component/lib files plus the two-file lab route; 15 new tests.
One file per primitive (Step 61) — no `page-header/{index,types,utils}.ts` fragmentation.

## 4. Files modified

- `app/(dashboard)/internal/design-system/page.tsx` — added a one-line cross-link to the new
  `/internal/design-system/primitives` lab. No other change; Phase 1's token preview is untouched.

No production route, no domain component, no Prisma schema, no permission logic, and no server
action was touched.

## 5. Primitive inventory before (duplication audit)

Full audit run via a dedicated research pass over `app/`, `components/`, and `lib/`. Headline
counts (file:line detail lives in the audit transcript, not reproduced here to keep this doc
readable):

| Pattern | Shared component existed? | Duplicate/inconsistent sites |
|---|---|---|
| Page header (title+desc+actions) | No | ~15 |
| Filter/search bar | Partial (`FilterPill`, 5/9 pages) | 8 |
| Status pill render | No (5 separate `*_STATUS_META` tables, consistent doctrine, copy-pasted classes) | 12 |
| Colored left-border status pattern | N/A | **0 — already clean** |
| Severity/attention row | Partial (`DashboardActionCenter` only) | 2 more hand-rolled |
| Money/numeric readout tile | No | ~15 |
| Cyan misuse for ordinary readouts | N/A | **0 — all 14 `text-instrument-fg` sites correctly single-reading** |
| Entity row (job/client/request/quote/invoice) | Partial (Astryx `Table`, 2 sites) | 3 different mechanisms across 6 files |
| Empty state | No | 31 occurrences / 24 files |
| Skeleton/loading | No | 2 files; only 1 route-level skeleton for the whole app |
| Split/inspector desktop layout | No | 3 ad hoc grid-template splits, no true master-detail |
| Mobile detail sheet | No | not implemented as an overlay anywhere |
| Form label/help/error | Yes (`form-feedback.tsx`) | 11/16 form files redefine their own `FIELD`/`fieldClass` with drift |
| Select/textarea styling | No | 27 files (`<select>`), 21 files (`<textarea>`) |
| Modal/dialog/popover | No (4 mechanisms) | native `<dialog>` ×4, custom scrim ×1, dropdown ×1 |
| Destructive confirm | Yes (`ConfirmSubmit`) | 10/14 sites hand-duplicate `window.confirm` instead |
| Public doc totals | Partial (`QuoteTotals`) | invoice page reimplements its own totals `<dl>` |
| Public doc heading | No | 6 pages, identical classes, never factored |
| Generic Panel/Card wrapper | No (1 private unexported `Panel` in `quote-builder.tsx`) | 114 raw occurrences of the `rounded-{2xl,3xl} border border-hairline bg-surface-raised` combo |
| Astryx form/badge/skeleton/progress/button/dialog/card | Imported & themed | **0 production usage** — showcase-only until this phase |

## 6. Astryx capability audit

Read actual `.d.ts`/source for every requested primitive in the installed
`@astryxdesign/core@0.3.0`. Result: essentially everything requested already exists at production
quality (full JSDoc, WCAG citations, StyleX theming already wired via `lib/astryx/theme.ts`).
Genuine gaps: a plain native-`<select>`-style `Select` (only the richer `Selector` family exists),
a generic non-nav `Drawer`/`Sheet` (only `MobileNav`, nav-flavored but reusable), and a standalone
`FormLabel` export (label rendering is baked into `Field`/`TextInput`/etc.). Every Astryx component
touched in Phase 3 ships its own `'use client'` directive *except* `EmptyState`, which is the one
fully server-renderable Astryx primitive.

## 7. Astryx reuse decisions

Per primitive (also rendered live in the lab's "Astryx capability audit — reuse decisions" table):

| Primitive | Decision | Reasoning |
|---|---|---|
| Status | A/B | `StatusDot` + `Badge` directly; only Aernova code is the tone→variant map (`lib/status-tone.ts`) |
| NumericReadout | D | No Astryx equivalent for a labeled tabular-nums readout; presentation-only |
| PageHeader | D | No Astryx page-identity primitive; distinct from Phase 2 TopNav's route identity |
| ActionToolbar | B | Astryx `Toolbar`, naming the end-content slot by primary/secondary role |
| FilterToolbar | D | Query state is page-owned; this is a container only |
| DataRow | A | Astryx `Item` directly — already solves `interactiveRef`/`href`/`onClick` semantics |
| EmptyState | A | Astryx `EmptyState` directly; `kind` only picks copy defaults |
| Skeleton | A | Astryx `Skeleton` directly; Row/Readout/List are compositions, not replacements |
| SplitInspector | B | Astryx `Layout`/`LayoutPanel` (desktop) + `Dialog` (mobile/tablet sheet); breakpoint doctrine is the bespoke part |
| Document primitives | D | No Astryx paper/print surface; `DocumentBrand`/`QuoteTotals` reused as-is, not replaced |
| Form pattern | A | Astryx `TextInput`/`TextArea`/`Selector`/`CheckboxInput`/`RadioList` directly; `CounterTextArea` only adds a status message |
| Overlay pattern | A | Astryx `Dialog`/`AlertDialog`/`DropdownMenu`/`Popover` directly; no new wrapper |

## 8. Custom-primitive justifications

- **NumericReadout, PageHeader, FilterToolbar** (Decision D): no Astryx equivalent exists for these
  exact semantics; each is small, has a single opinionated API, and consumes only Phase 1 tokens.
- **SplitInspector**: the responsive split↔sheet swap and the specific breakpoint decision
  (§21) are Aernova-specific; the actual pane/sheet mechanics are Astryx `Layout`/`Dialog`.
- **Document primitives**: paper tokens (`--color-paper-*`) have no Astryx surface at all; kept
  intentionally thin (7 small functions) rather than one configurable mega-component.
- **`CounterTextArea`**: the only genuinely new logic is `lib/char-counter.ts`'s two-state
  counter text, generalized from the already-shipped, already-correct
  `lib/invoice/addon-override.ts` doctrine — not reinvented, just made reusable.

No Astryx swizzle was performed anywhere in Phase 3 (Step 41 target: zero swizzles — met).

## 9. Final shared component directory structure

```
components/ui/
  status.tsx
  numeric-readout.tsx
  page-header.tsx
  action-toolbar.tsx
  filter-toolbar.tsx
  data-row.tsx
  empty-state.tsx
  skeleton.tsx
  split-inspector.tsx
  document.tsx
  form-field.tsx

lib/
  status-tone.ts            (pure, tested)
  numeric-readout.ts         (pure, tested)
  split-inspector.ts         (pure, tested)
  char-counter.ts            (pure, tested)
  design-system-fixtures.ts  (shared fixture data, no JSX)
```

`components/ui/` did not exist before this phase; it now holds every genuinely cross-surface
primitive. Domain composites (`FinancialCompletionPanel`, `WarrantyPanel`, `QualityCheckPanel`,
etc.) stay under `components/dashboard/` — none of them were touched.

## 10. PageHeader — API/behavior

`title` (required) + optional `eyebrow`, `description`, `status` (a `Status` element), one
`primaryAction`, and `secondaryActions`. Flex-col on mobile, row on `sm:`; title wraps rather than
truncates so a 55+ character job title stays fully legible (Phase 3 Impeccable critique: a long
compound-address eyebrow was found to over-extend an uppercase-tracked line and was fixed by
keeping eyebrows to short identifiers like a job number — the underlying long-content case is
still exercised via `DataRow`'s meta line). No action renders a giant hero heading; description is
simply omitted with no reserved gap when absent.

## 11. ActionToolbar — API/behavior

`label` (toolbar `aria-label`) + `secondary`/`primary` slots, built on Astryx `Toolbar`'s
`endContent`. No domain logic; the caller's `Button`/`DropdownMenu` elements carry their own
pending/disabled/loading state, demonstrated in the lab (saving, disabled/locked, and a
primary+secondary+More-menu combination).

## 12. FilterToolbar — API/behavior

Controlled `searchValue`/`onSearchChange` (now with `aria-label` — see §28), a `filters` slot for
caller-owned controls, `resultCount`, `onClear` (rendered only when there's something to clear),
and a trailing `actions` slot. Client component (the search input needs a real event handler).
Owns zero query/filter business logic — no domain enum is imported.

## 13. FilterToolbar responsive doctrine

Search stays full-width and primary; filters wrap onto their own flex row rather than compressing
into one unreadable strip on phone. No new filter framework was built — existing page filter
state/query logic stays page-owned through Phase 4/5 migration.

## 14. Status API/tones/variants

`tone: "neutral" | "info" | "success" | "caution" | "danger"`, `variant: "dot" | "solid"` (default
`"dot"`), optional `pulsing`. `lib/status-tone.ts` maps tone → Astryx `StatusDot`/`Badge` variant
names (StatusDot has no native "info," so it maps to "accent"; Badge names "info" directly). No
domain enum is imported — `*_STATUS_META` tables continue to own label/tone mapping.

## 15. Severity-dot implementation

`variant="dot"` wraps `StatusDot` in `aria-hidden="true"` and renders the visible label as a
plain sibling text node, so the accessible name comes from the text once, not from the dot's own
required `label` a second time (avoids the double-announcement bug this pattern commonly ships
with). Carries forward Phase 0's explicit rejection of colored left-border strips — grepped for
`border-l-{2,4,...}` across the whole repo during the duplication audit; zero instances found, so
there was nothing to remove, only a pattern to formalize going forward.

## 16. NumericReadout API/semantics

`label`, `value: string | number | null | undefined`, optional `unit`, `detail`, `tone: "default" |
"measurement"` (default `"default"`), `size: "sm" | "md" | "lg"`. `lib/numeric-readout.ts` is pure
presentation: `null`/`undefined`/non-finite numbers render `"—"` in muted ink regardless of `tone`;
a plain number gets `toLocaleString` grouping; a string passes through verbatim. No money, margin,
tax, or progress math lives here — every demo money value comes from the existing `formatMoney()`.
`tone="measurement"` (cyan) was used only for the two genuine readings in the fixture set (roof
area, pitch) — every money/count instance in the lab correctly stayed on `tone="default"`,
verified explicitly by the Impeccable design review as evidence the Readout Rule holds under real
demo data, not just in the doc comment.

## 17. DataRow API/behavior

Four named slots — `leading`, `primary`, `meta`, `trailing` — plus `href`/`onClick`/`selected`/
`disabled`, wrapping Astryx `Item` (`as="li"`) rather than a generic children prop. Missing-data
doctrine (added after the Impeccable critique caught two demo call sites disagreeing with each
other): `meta` should always be an explicit placeholder string ("No address on file") rather than
silently omitted, now stated in the prop's own doc comment and consistent across both demo call
sites (`DataRowDemo`, `SplitInspectorDemo`).

## 18. EmptyState taxonomy

`kind: "first-use" | "filtered" | "clear" | "error"` (default `"first-use"`), each with a sensible
title/description default that any caller can still override; `action` renders only when actually
supplied. Thin wrap of Astryx `EmptyState` — the one Astryx component that ships with no client
directive, so this primitive is fully server-renderable.

## 19. Skeleton implementation/pattern

Astryx `Skeleton` directly, composed into three shapes actually needed: `SkeletonRow` (avatar +
2 lines + trailing value), `SkeletonReadout` (label + value bars), `SkeletonList` (N `SkeletonRow`s
with dividers). No new fake-screen system; Astryx's own pulse already respects
`prefers-reduced-motion`.

## 20. SplitInspector architecture

`>= SPLIT_INSPECTOR_BREAKPOINT_PX`: Astryx `Layout` with `content={main}` and
`end={<LayoutPanel>{inspector}</LayoutPanel>}` — a true two-pane split, panel only occupies space
once something is selected. Below that: `main` renders alone and the inspector opens as an Astryx
`Dialog` anchored to the bottom edge (`position={{ bottom: 0 }}`, `width="100%"`) — reusing
Dialog's native `<dialog>` machinery (focus trap, Escape, backdrop, scroll lock) rather than
hand-rolling a sheet, the same guarantee Phase 2's command palette/mobile drawer already rely on.
Viewport detection is a small `matchMedia` hook, client-only.

## 21. SplitInspector breakpoint decision

`SPLIT_INSPECTOR_BREAKPOINT_PX = 1280`, in `lib/split-inspector.ts`. Deliberately **not** the
shell's own 1024px sidebar breakpoint (`AppShellBreakpoint="lg"` in `shell-chrome.tsx`) — splitting
at the same width the sidebar also expands at would leave the main pane too narrow the instant
both are open, exactly the trap the redesign plan warned against ("do not force 1024 split simply
because the shell itself switches at 1024"). Verified in the live lab at 390/768/1024/1440/1728:
1024 stays single-pane (sheet), 1280+ is a stable split; the shell and content-layout breakpoints
are correctly independent.

## 22. Mobile inspector behavior

Bottom-anchored `Dialog` sheet, `purpose="info"` (Escape + backdrop-click both dismiss), reusing
Astryx's native `<dialog>` focus trap/scroll-lock. Confirmed live and via keyboard-only navigation
(Assessment A/B of the Impeccable critique both exercised the lab's overlay affordances).

## 23. Document primitive set

`DocumentSurface`, `DocumentHeader` (now with a `headingLevel` prop — see §28), `DocumentSection`,
`DocumentMeta`, `DocumentRule`, `DocumentTotalRow`, `DocumentFooter`. All read `--color-paper-*`
tokens via inline `style` (no Tailwind utility exists for them); no domain enum, no Prisma.

## 24. DocumentBrand reuse

`components/public/document-brand.tsx` and `components/public/quote-totals.tsx` were **not**
touched or replaced — Phase 3 explicitly builds the shapes those two components' siblings are
missing (the invoice page's own hand-rolled totals `<dl>`, and the un-factored heading pattern
repeated across all 4 document routes), not a second brand/totals component.

## 25. Print behavior

`DocumentSurface` forces `.surface-light` (never flips with app theme) and
`--color-paper-document` as its background — the same "printed document, not a screen" doctrine
Phase 1 already established. Not integrated into the actual public routes yet (Phase 6); verified
only inside the internal lab, which itself sits inside the app shell (not printed directly), so
true browser print-preview verification is deferred to the Phase 6 route migration and is listed
as a known gap (§71).

## 26. Form pattern

Astryx `TextInput`/`TextArea`/`Selector`/`CheckboxInput`/`RadioList` used directly wherever a form
control is needed — no new field-wrapper component. `CounterTextArea`
(`components/ui/form-field.tsx`) is the one addition: a min/max character-counter `status` message,
generalized from `lib/invoice/addon-override.ts`'s already-shipped OWNER_OVERRIDE doctrine into
`lib/char-counter.ts` (`characterCounterText`/`characterCounterState`). `addon-override.ts` itself
was **not** refactored to call the new helper — Phase 3 doesn't alter existing server-action-
adjacent copy purely for reuse's sake (Step 46).

## 27. Astryx FieldStatus investigation/result

Re-confirmed the exact Phase 1 finding (`PREMIUM_UI_PHASE_1_IMPLEMENTATION.md` §45.2):
Astryx `FieldStatus` (rendered by `TextInput`/`TextArea`'s `status` prop) has a pre-existing
SSR/CSR hydration class-name mismatch in `@astryxdesign/core@0.3.0`, non-blocking (content is
correct post-hydration). `CounterTextArea` is now the **second** place in the codebase that
exercises it (after `/internal/design-system`), so the same cosmetic warning is expected on first
render. Not fixed by swizzling — same conclusion as Phase 1: it's a documented upstream defect,
worth an issue against Astryx, not a local patch.

## 28. Validation/error pattern

`CounterTextArea` maps counter state to Astryx's own `status.type`: `"success"` in-range,
`"warning"` under the minimum (still typing), `"error"` over the maximum. All three states are now
demonstrated statically in the lab (added after the critique found only the in-range state was
shown — see §33/§40) using real character-limit fixtures modeled on the OWNER_OVERRIDE field.

## 29. Character-counter pattern

`lib/char-counter.ts`: below `min`, counts *up* toward it ("N more characters required" — an empty
field reading "500 characters remaining" would look like plenty of room, not "you haven't
started"); at/above `min`, counts *down* toward `max`, the ordinary convention. Directly ported
from the validated `overrideNoteCounterText` doctrine, generalized and unit-tested
(`tests/char-counter.test.ts`).

## 30. Overlay doctrine

Astryx `Dialog` (general content), `AlertDialog` (destructive confirmations — `role="alertdialog"`,
cancel-focused by default, cannot be backdrop-dismissed), `DropdownMenu` ("More" menus),
`Popover`/`MobileNav` (already used in production for the notification bell and mobile shell drawer
respectively) — no new wrapper component for any of them. Demonstrated live in the lab's Overlay
section with a real Dialog and a real AlertDialog.

## 31. Dialog/popover/sheet reuse

`SplitInspector`'s mobile sheet is itself just `Dialog` positioned at the bottom edge (§20) — one
more confirmation that a bespoke sheet component wasn't needed once Dialog's `position` prop was
understood correctly.

## 32. Confirmation pattern

`components/dashboard/confirm-submit.tsx` (`ConfirmSubmit`) is unchanged and stays exactly as it
is: it exists specifically for server-action forms with no client-side state to hang an
`AlertDialog` off (a Server Component has no `onClick` to guard a button with anything richer than
`window.confirm`). `AlertDialog` is documented as the parallel pattern for client-side flows that
already have state — the two are complementary, not competing, and the lab's Overlay section states
this explicitly. Neither action semantics nor `ConfirmSubmit` itself was modified.

## 33. Loading/error/success pattern

`ActionToolbar` demos show pending (`isLoading`) and disabled/locked states. `EmptyState kind="error"`
covers the empty-error case. `CounterTextArea`'s three states (§28) cover inline field
success/warning/error. No new generic `InlineError`/`InlineSuccess`/`LoadingState` wrapper was
built — existing patterns (`form-feedback.tsx`'s `FieldError`/`FormError`, Astryx's own `status`
prop) already cover this without duplication.

## 34. Table vs list doctrine

Not formalized as a new component (Astryx `Table` and `DataRow`/`List` both already exist and were
audited in §5/§6); the doctrine is: `Table` where column-to-column comparison matters (quotes,
invoices tables already do this correctly), `DataRow`/`List` for scannable entity summaries where
a single row *is* the unit of attention (jobs, requests). No universal DataTable framework was
built, per the plan's explicit instruction not to.

## 35. Full state matrix

Applied per-primitive in the lab, not uniformly — see the per-section content below. Interaction
states (default/hover/focus-visible/pressed/disabled/selected) are largely inherited for free from
Astryx's own components; content states (short/long/missing/empty) and async/data states
(null/zero/negative/large) were authored explicitly via `lib/design-system-fixtures.ts` and inline
demo data.

## 36. Fixture content

`lib/design-system-fixtures.ts`: `FIXTURE_JOB` (short), `FIXTURE_JOB_LONG` (long
title/client/address, used to stress `PageHeader`/`DataRow`), `FIXTURE_JOB_MISSING` (null
address/progress/balance), `FIXTURE_REQUEST`, `FIXTURE_QUOTE`, `FIXTURE_INVOICE`,
`FIXTURE_INVOICE_BALANCE`, `FIXTURE_MEASUREMENT` (`"24.8 sq ft"`, `"6/12"`), `FIXTURE_WARRANTY`. No
real production data or PII.

## 37. Long-content results

`FIXTURE_JOB_LONG`'s 90-character title and 70-character address were used in `PageHeader`,
`DataRow`, and `SplitInspector` demos. One real finding from this: a full compound address used
directly as an uppercase-tracked `PageHeader` eyebrow produced an 80+ character all-caps line —
flagged by the Impeccable detector's browser pass as a genuine legibility issue, fixed by keeping
`PageHeader` eyebrows to short identifiers (job number) in the demo; the long-address case is still
exercised elsewhere (`DataRow`'s meta line, which wraps normally rather than staying on one
uppercase-tracked line).

## 38. Missing-content results

`FIXTURE_JOB_MISSING` (null address/progress/balance) exercises: `PageHeader`/`DataRow` with no
meta line (now an explicit "No address on file" placeholder — §17), `NumericReadout` rendering
`"—"` for `null` progress/balance, `SplitInspector`'s inspector pane doing the same.

## 39. Empty-state results

All four `kind`s demonstrated, plus a non-compact variant added after the critique noted only the
constrained/`compact` treatment had been shown (the more common real usage — a full empty list
panel — was untested).

## 40. Loading results

`ActionToolbar`'s `isLoading` Button state, `Skeleton`/`SkeletonRow`/`SkeletonReadout`/
`SkeletonList` shapes, `CounterTextArea`'s live-typing counter (interactive, not just a static
screenshot).

## 41. Error results

`EmptyState kind="error"` with a retry action; `CounterTextArea`'s over-maximum state (added per
§28); `FormError`/`FieldError` were not re-demoed here since `form-feedback.tsx` already documents
them and Phase 3 didn't touch that file.

## 42. 390px results

Verified via the Impeccable critique's browser assessment (authenticated session reached the live
route): `PageHeader`/`ActionToolbar` actions wrap; `FilterToolbar` keeps search full-width;
`SplitInspector` renders its bottom-sheet form. Browser automation in this session used an actual
authenticated tab (not a resized emulator) rather than a hard viewport-pixel assertion — treat the
390/768 rows as "verified functionally via live render," not "measured pixel-for-pixel."

## 43. 768px results

Same session; layout held with no additional findings beyond the 390px pass.

## 44. 1024px results

Confirmed via `lib/split-inspector.ts`'s own breakpoint constant and `tests/split-inspector.test.ts`:
1024px stays single-pane by design (§21). Not the same width as the shell's own persistent-sidebar
breakpoint, verified not to collide.

## 45. 1440px results

True two-pane split (`Layout` `end` slot) renders correctly at desktop width; confirmed by source
inspection of the breakpoint logic and by the Impeccable browser assessment's successful render of
the full page (which runs well above 1280px in a standard viewport).

## 46. 1728/1920px results

Stable split continues to hold — no additional layout logic exists above the split threshold, so no
new failure mode is possible at wider widths; not independently re-verified beyond the 1440px pass
since the code path is identical.

## 47. 200% zoom results

Not independently re-verified with a hard browser zoom in this session (the Impeccable critique's
browser pass didn't include a zoom step). This is a known gap, listed honestly in §71 rather than
claimed — same category of gap Phase 2 already carried forward.

## 48. Dark results

The lab inherits the app's theme system; no primitive introduces a literal color (all read Phase 1
semantic tokens). The Impeccable browser assessment ran against whatever the live session's active
theme was and found no color-doctrine violations in `components/ui/`'s own code (the one flagged
color finding — see §55 — was inside third-party Astryx `FieldStatus` styling, not Aernova code).

## 49. Light results

Same token-only guarantee applies; `docs/DESIGN.md`'s light-mode values are the same CSS custom
properties every existing token-driven component already resolves, so no separate light-mode
regression is plausible without a literal color creeping into a Phase 3 file — confirmed absent by
grep (no raw hex/rgb/oklch literals in any `components/ui/*.tsx` outside the paper-token `style`
props in `document.tsx`, which are deliberate per §23).

## 50. Reduced-motion results

No primitive added animation of its own. `Skeleton`'s pulse and `Dialog`'s open/close transition are
both owned by Astryx, which already respects `prefers-reduced-motion` per its own documented
behavior (unchanged from the Phase 1 audit of the same components). `SplitInspector`'s sheet swap
is a native `<dialog>` show/hide, not a hand-authored transition.

## 51. Increased-contrast/forced-color results

Not independently re-tested; Phase 3 primitives consume the same `--color-hairline`/`--color-ink-*`
tokens Phase 1's `prefers-contrast: more` and `forced-colors: active` blocks already strengthen
(`app/globals.css`), and no primitive overrides them locally. Listed as inherited-not-re-verified
in §71.

## 52. Keyboard results

Verified via the Impeccable critique's persona pass (Sam — accessibility): `Status`'s dot is
`aria-hidden` with the visible text as the real accessible name (no double-announcement); `DataRow`
correctly uses Astryx `Item`'s `href`/`onClick` semantics (no clickable `<div>`); Dialog/AlertDialog
inherit native `<dialog>` focus trap and Escape handling. One real gap was found and fixed —
`FilterToolbar`'s search input had no accessible name (placeholder-only); now carries
`aria-label={searchPlaceholder}` (§17 of the critique findings below, P1).

## 53. Focus-return results

Inherited from Astryx `Dialog`/`AlertDialog`'s native `<dialog>` behavior (same guarantee Phase 2's
command palette and mobile drawer already rely on) — not re-implemented, and not independently
re-tested beyond confirming the same Astryx version/props are in use.

## 54. Touch-target results

`Button` at `size="sm"` (28px) is used throughout the lab's demo actions; Astryx's own `size="md"`
default (32px) and the app's existing 44px mobile-field convention (documented in the Phase 1 token
preview) were not overridden by any Phase 3 primitive. Not independently re-measured on a real
touch device.

## 55. Client/server boundary observations

Confirmed by direct inspection of every Astryx module's own `'use client'` directive (§6): `Status`,
`NumericReadout`, `PageHeader`, `ActionToolbar`, `DataRow`, `EmptyState`, `Skeleton`, and the
`Document*` primitives carry **no** `"use client"` directive themselves and are Server-Component-
compatible (they render Astryx client-component leaves, which Next's RSC model allows without
promoting the parent). `FilterToolbar`, `SplitInspector`, and `CounterTextArea` are `"use client"`
because they own controlled input state or a `matchMedia` hook. No barrel/index file was created —
each primitive is imported directly, so a route importing `NumericReadout` cannot accidentally pull
in `SplitInspector`/`Dialog`/Motion (Step 33 target met).

## 56. Graphify results

Ran `graphify update .` as an incremental update; it tripped the tool's own shrink-guard (2,912 →
2,544 nodes) because the diff window spanned this branch's full pre-existing churn (root-level
`DESIGN.md`/`PRODUCT.md`/`PLAN-CRM.md`/`DEPLOYMENT.md` moved into `docs/`, `app-sidebar.tsx`
deleted in Phase 2, several `.impeccable` critique snapshots aged out). Spot-checked the "missing"
source files and confirmed it was a path-relativization artifact in the shrink-guard's own diff
(the files exist under their new path, e.g. `docs/DESIGN.md`), not real data loss, then completed a
full rebuild (`force=True`) rather than force through the incremental merge blindly. Final graph:
2,536 nodes, 6,363 edges, 181 communities.

## 57. Import-cycle result

Graphify's community/cycle analysis wasn't hand-labeled across all 181 communities (impractical and
not the actual question at hand — see Step 55's real requirement). Instead, ran a direct, exhaustive
grep over every `components/ui/*.tsx` and `lib/{status-tone,numeric-readout,split-inspector,
char-counter,design-system-fixtures}.ts` import statement: **zero** imports of Prisma,
`@/lib/auth`, `@/lib/permissions`, or anything under `components/dashboard/`. Every import is
either `react`, `@astryxdesign/core/*`, or the primitive's own paired pure `lib/*` helper. No cycle
is structurally possible — `components/ui/` has no import path back into any business/domain layer.

## 58. Impeccable critique result

Ran the full dual-agent critique (Assessment A: design review, Assessment B: detector + live
authenticated browser evidence) against the lab and every `components/ui/*` file. Deterministic
scan: 0 findings, both before and after fixes (the scanner is source/regex-based and doesn't reach
render-dependent issues). Live browser scan found 12 anti-pattern console findings; cross-checked
against source: 2 targeted third-party chrome outside the reviewed scope (Astryx `AppShell`,
Clerk's avatar button), 1 (`low-contrast` on Astryx's own `FieldStatus` success state) was traced to
the detector misreading an alpha-channel hex value as opaque — the actual rendered contrast is
higher than reported, a false positive — and the remainder were the genuine, in-scope findings
listed in §59.

## 59. P0/P1 issues found/fixed

No P0s. Two P1s, both fixed:

- **P1 — `FilterToolbar`'s search input had no accessible name.** Fixed: added
  `aria-label={searchPlaceholder}` (`components/ui/filter-toolbar.tsx`).
- **P1 — `DocumentHeader` produced a second `<h1>` when embedded inside the lab's own page
  outline** (the lab page already has an `<h1>`; `DocumentHeader` unconditionally rendered its own).
  Fixed: added a `headingLevel: 1 | 2 | 3` prop (default `1`, so the real Phase 6 public-document
  routes are unaffected); the lab now passes `headingLevel={2}`.

Four P2/P3s, all fixed:

- **P2 — `CounterTextArea` was demonstrated in exactly one state** (in-range), even though its
  entire reason for existing over a plain `TextArea` is the under-min/over-max behavior. Fixed:
  the lab now shows all three states side-by-side.
- **P2 — `DataRow`'s missing-metadata treatment contradicted itself within the same page**
  (`DataRowDemo` silently omitted the meta line; `SplitInspectorDemo` used an explicit placeholder
  for the identical fixture). Fixed: standardized on the explicit-placeholder convention, documented
  it on `DataRow`'s `meta` prop, and made both call sites agree.
- **P3 — the one realistic `DataRow` overflow risk (a long `Status` label in the icon-sized
  `leading` slot) was never actually demonstrated**, even though both ingredients existed
  separately elsewhere on the page. Fixed: added one `DataRow` instance combining them.
- **Minor — `SplitInspectorDemo` hardcoded `tone="info"` for every row regardless of the fixture's
  actual status**, while `DataRowDemo` two sections earlier correctly differentiated tone per
  status. Fixed: added a small local `jobStatusTone()` mapping so the two demos agree.

Also addressed as minor polish: `FIXTURE_MEASUREMENT.area` was missing its unit suffix
(`"24.8 sq"` → `"24.8 sq ft"`); a long compound-address `PageHeader` eyebrow produced an 80+
character all-caps line (shortened to just the job number in that demo); the decision-matrix
table's note column had no max-width, producing very long lines (constrained to `max-w-[36ch]`);
and a 13-section page with no anchor navigation was flagged by the Alex/power-user persona — added
a lightweight `JumpNav` linking to each section's new `id`.

## 60. Legacy component migration/removal map

| Existing | Current use | Future primitive | Target phase | Deletion condition |
|---|---|---|---|---|
| Hand-typed title/eyebrow/description rows (~15 sites: `invoices/page.tsx`, `quotes/page.tsx`, `jobs/new/page.tsx`, `reports/*`, ...) | Ad hoc per-page header markup | `PageHeader` | Phase 4/5 | Route migrated and hand-typed markup removed in the same PR |
| `FilterPill` + inline client-search boxes (`jobs-browser.tsx`, `clients-browser.tsx`, `requests-browser.tsx`) | Two incompatible filter idioms | `FilterToolbar` (container) + existing query logic | Phase 4/5 | Route migrated |
| 5 separate `*_STATUS_META` badge-class literals | Copy-pasted tone-class strings | `Status` (tone-only render layer; `*_STATUS_META` keeps owning label/tone) | Phase 4/5, incremental | Each domain module updated to emit a `tone`, one at a time |
| `jobs-browser.tsx`/`disabled-stage-jobs-list.tsx` near-duplicate card rows, `requests-browser.tsx`'s `<li>`-card, `clients-browser.tsx`'s raw `<table>` | 3 different row mechanisms for one concept | `DataRow` / Astryx `Table` (per §34 doctrine) | Phase 4/5 | Route migrated |
| 31 hand-rolled empty-state blocks across 24 files | Consistent visual pattern, no shared component | `EmptyState` | Phase 4/5 | Route migrated |
| Single route-level `app/(dashboard)/loading.tsx` | One generic skeleton for the whole route group | Per-route `SkeletonRow`/`SkeletonList`/`SkeletonReadout` | Phase 4/5 | Route migrated |
| 4 native `<dialog>` implementations (`quote-start-dialog.tsx`, `pipeline-board.tsx`'s `MoveDialog`, `quick-create-menu.tsx`, `visit-drag.tsx`) | Each re-derives open/close/ref wiring | Astryx `Dialog` directly | Phase 4/5 | Each caller migrated individually — low risk, no shared state |
| 10 hand-duplicated `window.confirm` in `onSubmit` (`jobs-browser.tsx`, `requests-browser.tsx`, `clients-browser.tsx`, `invoice-payments.tsx`, `calendar-feed-panel.tsx`, `change-order-share-panel.tsx` ×3, `invoice-share-panel.tsx`, `quote-share-panel.tsx` ×2, `client-hub-share-panel.tsx`) | Duplicated confirm logic | `AlertDialog` (client flows) or `ConfirmSubmit` (server-action-only flows) | Phase 4/5 | Each caller migrated individually |
| Invoice page's hand-rolled totals `<dl>` (`app/(public)/i/[token]/page.tsx`) | Reimplements `QuoteTotals`'s shape independently | `DocumentTotalRow` | Phase 6 (public document migration) | Public route migrated |
| 114 raw `rounded-{2xl,3xl} border border-hairline bg-surface-raised` occurrences | The de facto "panel" look, hand-typed | **No new Panel primitive** (Step 25) — reduce via spacing/section rules per-route as each is migrated | Phase 4/5 | N/A — this is a reduction target, not a component swap |

Classification per Step 38: everything above is **B — ADAPT** (a domain component should consume
the new shared primitive later) or **D — REMOVE AFTER MIGRATION** (legacy markup deleted in the
same PR that migrates its route) or **E — DEFER** (public documents, Phase 6). Nothing was
classified **C — REPLACE** and deleted now; Phase 4/5/6 migration is where removal actually happens,
per the plan's explicit instruction.

## 61. KEEP/ADAPT/REPLACE/REMOVE/DEFER classification

- **KEEP**: `components/public/document-brand.tsx`, `components/public/quote-totals.tsx`,
  `components/dashboard/confirm-submit.tsx`, `components/dashboard/form-feedback.tsx`,
  `components/dashboard/status-mini-card.tsx` (already a good, exported, documented precedent —
  explicitly not superseded), all domain composites (`FinancialCompletionPanel`, `WarrantyPanel`,
  `QualityCheckPanel`, `JobStatusStepper`, etc.).
- **ADAPT**: every row in §60's table — the underlying component/logic stays, its markup shell
  gets replaced by a Phase 3 primitive during Phase 4/5 migration.
- **REPLACE**: none identified as safe to swap outside a full route migration (swapping in
  isolation risks a partial, inconsistent page).
- **REMOVE AFTER MIGRATION**: the specific hand-typed markup blocks listed in §60, once their route
  is migrated.
- **DEFER**: the four public document routes (`q`, `i`, `co`, `w` `[token]` pages) — Phase 6.

## 62. Production smoke-test results

Unauthenticated `fetch` against `/`, `/dashboard`, `/jobs`, `/today`, `/pipeline`, `/settings`,
`/quotes`, `/invoices`, and the new `/internal/design-system/primitives` all correctly returned
`307 → /sign-in` (proxy/Clerk auth gating intact, no 500s, no crash). Separately, the Impeccable
critique's Assessment B reached `/internal/design-system/primitives` through an **already-
authenticated** session and successfully rendered the page inside the real `AppShell` (confirmed by
its own finding referencing `div.astryx-app-shell`) — end-to-end evidence the new route composes
correctly with the Phase 2 shell, not just that it builds.

## 63. Phase 2 shell regression result

Not modified: `app/(dashboard)/layout.tsx`, `components/dashboard/shell/*`, `lib/shell-nav.ts`,
`lib/sidenav-store.ts` were not touched. The new lab route is a normal `(dashboard)` route group
member and inherits the shell exactly like every other internal page; the Impeccable browser pass
rendering it inside `astryx-app-shell` is direct evidence the shell composition still holds.

## 64. Lint result

`npm run lint` → 0 errors, 26 warnings — the identical pre-existing warning set from before this
phase (unused-var and `<img>`-vs-`next/image` warnings in files Phase 3 never touched). No new
warnings in any Phase 3 file.

## 65. Typecheck result

`npx tsc --noEmit -p .` → clean, 0 errors, both before and after the Impeccable-driven fixes.

## 66. Tests result

`npm test` → **489 total, 487 passing, 2 pre-existing failing (unrelated), 0 new failing.** The
Phase 2 baseline was 474 tests with the same 2 unrelated failures
(`tests/action-guards.test.ts`, `tests/permissions.test.ts` — both pre-existing gaps unrelated to
UI work). Phase 3 added 15 new tests across `tests/status-tone.test.ts` (2),
`tests/numeric-readout.test.ts` (5), `tests/split-inspector.test.ts` (4), and
`tests/char-counter.test.ts` (4) — pure-logic tests only, no component-rendering test infra was
added (the repo's own `node --test` runner has no JSX/DOM support, consistent with existing
convention).

## 67. Build result

`npm run build` → success, both before and after the Impeccable fixes. `/internal/design-system/
primitives` appears in the route manifest as a normal dynamic (`ƒ`) route. The one build-log error
(Sentry sourcemap upload, `Invalid org token`) is a pre-existing environment/credential issue
unrelated to any code change — the build itself completes and all pages generate successfully.

## 68. Astryx doctor result

`npx astryx doctor` → 4 passed, 2 warnings (no `@astryxdesign/theme-*` package installed; no
Astryx markers in `AGENTS.md`/`CLAUDE.md`), 0 failures — identical to the Phase 1/2 baseline, since
Phase 3 didn't touch theme setup or agent docs.

## 69. Pre-existing failures/warnings

- `tests/action-guards.test.ts` and `tests/permissions.test.ts` — 2 pre-existing, unrelated
  failures, unchanged from the Phase 2 baseline.
- The 26 lint warnings (`no-unused-vars`, `no-img-element`) — unchanged, none in Phase 3 files.
- Astryx doctor's 2 informational warnings — unchanged, intentional (no stock theme package; no
  Astryx section in agent docs).

## 70. New bugs found/fixed

Covered in full in §59 (P1/P2/P3 Impeccable findings). No bug was found in existing production code
during this phase — everything found and fixed was inside the newly-added Phase 3 files themselves.

## 71. Browser/device gaps remaining

Carried forward honestly, consistent with Phase 2's own gap list:

- No real iPhone/iPad Safari, no real Android Chrome, no real macOS Safari testing.
- 200% browser zoom was not independently re-verified for Phase 3 primitives specifically (§47).
- Forced-colors/increased-contrast was not independently re-tested beyond confirming token
  inheritance (§51).
- Focus-return after Dialog/AlertDialog close was not independently re-tested beyond confirming
  the same Astryx version/props are in use (§53).
- Document-primitive print behavior (§25) was not verified against an actual browser print preview
  — deferred to the Phase 6 route migration, where real print stylesheets will matter.
- No live multi-role (OWNER vs. non-OWNER) testing of the gated lab route itself — it correctly
  404s for non-OWNER by the same `requireCompanyContext()` pattern the sibling token-preview page
  already uses, but this wasn't independently re-exercised.

## 72. Performance/CWV gaps remaining

Not measured (Lighthouse/CWV instrumentation still absent from the repo, same gap Phase 2 carried
forward). Bundle-boundary discipline (§55) was verified structurally (no barrel file, no
cross-primitive import bleed, no Motion/Anime.js added) but not measured with an actual bundle
analyzer.

## 73. Explicitly deferred Phase 4+ work

- Broad production-route migration onto these primitives (Dashboard, Jobs index, Job workspace) —
  Phase 4, the pilot vertical slice.
- Requests, Pipeline, Today, Schedule, Clients, Quotes, Invoices, Reports, Team, Settings,
  onboarding/auth — Phase 5+.
- Public document routes (`q`, `i`, `co`, `w`) — Phase 6, using the document primitives built here.
- Deleting any of the legacy markup listed in §60/§61 — happens per-route as each migrates, not now.
- A real print-preview/PDF check of the document primitives.
- Lighthouse/CWV measurement, real-device testing, forced-colors/zoom re-verification.

## 74. Confirmation

- No Prisma schema changes.
- No migrations.
- No permission changes (`lib/permissions.ts` untouched).
- No workflow/status changes (`lib/job-status.ts` and every other `*_STATUS_META` table untouched).
- No financial/business-logic changes (`lib/money.ts`, `lib/quote/totals.ts` untouched; every
  `NumericReadout` demo uses the existing `formatMoney()`, no new math was written).
- No broad production-route migration — the only production-adjacent file touched is the one-line
  cross-link added to the sibling `/internal/design-system` page (§4).
- Phase 2 shell behavior intact (§63).
- No broad Server → Client expansion (§55: every primitive that can stay a Server Component does).
- Graphify shows no unexpected dependency inversion — `components/ui/` imports nothing from the
  business/domain layer (§57).
- No shared visual primitive imports Prisma or server authorization helpers (§57, confirmed by
  direct grep, zero matches).

---

**Phase 3 complete. Waiting for approval before Phase 4 — Pilot vertical slice.**
