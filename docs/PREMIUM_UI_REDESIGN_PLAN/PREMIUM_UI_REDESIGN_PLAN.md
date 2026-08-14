# Aernova Premium UI Redesign Plan

**Status:** Approved direction and implementation plan
**Prepared:** 2026-08-12
**Approved direction:** Precision Workshop
**Scope:** Authenticated application, onboarding, public documents, and roof measurement workspace

**Evergreen reference:** [`docs/AERNOVA_DESIGN_REFERENCE.md`](./AERNOVA_DESIGN_REFERENCE.md)

## 1. Executive Summary

Aernova should not receive a cosmetic reskin. The current interface needs a new visual system, navigation model, component vocabulary, and motion language while preserving the product's workflows, permissions, data model, and domain terminology.

The approved direction is **Precision Workshop**: a quiet, materially precise work surface for contractors and office teams. Its intended balance is approximately **85% calm precision and 15% sophisticated material character**. It should feel expensive through hierarchy, typography, responsiveness, purposeful motion, and exceptional states rather than through decorative glass, oversized cards, gradients, or page-load effects.

The implementation should use the supplied repositories in distinct roles:

| Repository | Role in Aernova | Runtime dependency? |
| --- | --- | --- |
| Impeccable | Redesign process, critique, audits, and design-system extraction | No |
| Apple Design skill | Interaction principles, motion behavior, material hierarchy, accessibility | No |
| Astryx | Component primitives, application shell, navigation, forms, overlays, states | Already installed |
| Motion | Primary React animation and gesture engine | Add |
| Anime.js | Imperative choreography for the Three.js roof viewer and rare SVG/canvas sequences | Add only for the viewer phase |

The two animation libraries must not compete for the same elements. Motion owns React UI. Anime.js owns isolated imperative scenes. CSS owns simple hover, focus, and color transitions.

The redesign should be delivered in vertical slices, beginning with an internal prototype and design-token foundation, then the application shell, a representative job workflow, operational pages, financial/public documents, and finally the roof viewer. The final cutover should avoid leaving users in a visibly mixed old/new system.

## 2. Product Constraints

The redesign must preserve these facts from Aernova's product documentation and codebase:

- Aernova is a multi-trade workflow platform for small contractors.
- Primary users include owners, office staff, estimators, and field crews.
- Users are often nontechnical, time-constrained, and working on mobile devices or in field conditions.
- Jobs, requests, estimates, quotes, schedules, invoices, warranties, and company administration are operational tools, not marketing content.
- Roofing measurement is a premium optional module, not the visual model for every screen.
- Public quotes, invoices, change orders, reports, and warranty pages carry contractor branding and must remain printable and trustworthy.
- Aernova's geometric symbol and serif wordmark remain the recognizable product identity; the old application styling is not protected.
- Cyan remains reserved for measurement and technical truth where appropriate. Green means success, amber means caution or attention, and red means error or destructive action.
- Dark is the primary authored and default direction. Light is a first-class launch mode, especially for outdoor use, and must be designed from the same foundation rather than added later.
- Permissions and company context are cross-cutting behavior and must not change during a visual migration.
- Accessibility target remains WCAG 2.2 AA.

### Non-goals

- Rewriting business logic, authorization, Prisma models, or workflow state machines.
- Copying an Apple product, a stock Astryx theme, or Impeccable's own visual identity.
- Adding animation to every element.
- Turning dense operational screens into marketing-style card layouts.
- Introducing two permanent design systems.
- Making all Server Components into Client Components.
- Using translucency, blur, or 3D as decoration without an interaction purpose.

## 3. Research Snapshot

The research was pinned to the following upstream revisions so implementation decisions remain reproducible:

| Source | Reviewed revision | Version observed | License | Primary contribution |
| --- | --- | --- | --- | --- |
| [Impeccable](https://github.com/pbakaus/impeccable/tree/89368a24306d359507941274d046a8e186893540) | `89368a2` | Repository workflow | Apache-2.0 | Replacement-world redesign method, critique, audit, extraction |
| [Apple Design skill](https://github.com/emilkowalski/skills/tree/78761e1b57f97dce65b983d640c70a68f39e8163/skills/apple-design) | `78761e1` | Skill instructions | MIT | Direct manipulation, interruptible springs, functional materials |
| [Astryx](https://github.com/facebook/astryx/tree/f85aedc20770d6d4b8ac45a10e963d5899d1c537) | `f85aedc` | `0.3.0` | MIT | React component and theme infrastructure |
| [Anime.js](https://github.com/juliangarnier/anime/tree/01b81be1df6843ccfe0a71c0699a746bf740dd77) | `01b81be` | `4.5.0` | MIT | Scoped timelines, layout utilities, Three.js adapter |
| [Motion](https://github.com/motiondivision/motion/tree/adaf7a4e5368d704ea350669f6ac674fb26ff270) | `adaf7a4` | `13.1.0` | MIT | React presence, layout, gestures, reduced-motion support |

Before implementation, recheck the latest stable releases and changelogs. Astryx is early in its release lifecycle, so upgrades must be isolated and verified rather than applied casually.

## 4. Current Aernova Baseline

### 4.1 Technology and structure

- Next.js `16.2.4`
- React `19.2.4`
- Tailwind CSS `4`
- Prisma `6.19.3`
- Clerk `7.2.3`
- Astryx core and CLI `0.3.0`
- StyleX `0.19`
- Three.js `0.184`
- 109 TSX components and 39 pages
- 88 TSX files currently declare `use client`

The relevant Next.js `16.2.4` documentation in `node_modules/next/dist/docs/` must be consulted during implementation. In particular, client boundaries should stay narrow, browser-only animation libraries should be dynamically loaded from Client Components, and global styling should remain deliberate.

### 4.2 Graphify findings

The Graphify index covers 447 files, 2,519 nodes, 6,107 edges, and 188 communities with 98% extraction. It found no import cycles.

The highest-connectivity nodes are business and permission utilities such as `requireJobAccess`, `formatMoney`, `recordActivity`, `requireCapability`, and `SubmitButton`. These are behavioral infrastructure, not presentation dependencies, and should remain untouched by the redesign.

Targeted dependency analysis found:

- `AppSidebar()` is imported only by the authenticated dashboard layout. Replacing the shell is therefore a contained architectural change.
- `DashboardLayout()` depends on company context and permissions but has low graph degree. Its visual structure can change without moving authorization logic.
- `JobWorkspace()` is reached by the job page and delegates tab interpretation. It is a strong vertical-slice candidate because visual composition can change while job behavior remains stable.
- Public quote, invoice, change-order, warranty, and report routes share document infrastructure and should migrate as one coherent family.

Graphify should be rerun after the shell migration and after shared component extraction. Any unexpected growth in client-component reach or shared-node degree is a regression signal.

### 4.3 Existing design language

The current design documentation describes a dark navy and cyan "Field Notebook" system with flat tonal surfaces, frequent hairlines, restrained shadows, and system typography. The implementation has accumulated a visually repetitive vocabulary:

| Pattern | Approximate occurrences |
| --- | ---: |
| `border-hairline` | 479 |
| `rounded-xl` | 293 |
| `rounded-2xl` | 131 |
| `bg-surface-raised` | 184 |
| `transition-*` | 9 |
| `animate-*` | 9 |
| `backdrop-blur` | 14 |
| `shadow-*` | 4 |

The result is structurally tidy but visually dated: many equally weighted rounded panels, insufficient hierarchy between primary work and supporting information, weak state continuity, and almost no interaction feedback beyond color changes.

There is also an action-color inconsistency. An older design rule describes cyan primary buttons while `lib/astryx/theme.ts` explicitly treats that rule as stale and maps Astryx accents to ink inversion. The new system must establish one authoritative semantic token model.

### 4.4 Existing Astryx adoption

Aernova already has a sound integration seam:

- `components/astryx-theme-provider.tsx` synchronizes the Aernova theme store with Astryx.
- `lib/astryx/theme.ts` maps Aernova semantic values to an Astryx custom theme.
- Generated theme outputs live under `lib/astryx/`.
- Astryx tables, lists, timestamps, popovers, buttons, cards, and dialogs are used selectively.

Adoption is currently shallow. The application shell, sidebar, most forms, tabs, empty states, and repeated operational panels remain custom. The redesign should expand Astryx use rather than create another primitive library beside it.

### 4.5 Prior critique evidence

Existing `.impeccable` critique artifacts show improvement on isolated screens, but they repeatedly identify systemic issues:

- identical card grids across unrelated workflows;
- repeated eyebrow, headline, and description structures;
- insufficient tonal separation;
- inconsistent action emphasis;
- viewer contrast problems;
- long public-document content walls.

These are system-level problems. Page-by-page polishing will not resolve them without first changing the foundation and shell.

## 5. What Each Repository Contributes

### 5.1 Impeccable: process and quality gates

Impeccable should govern the redesign workflow, not ship in the browser.

Apply these principles:

- Preserve product truth, content, functionality, and constraints while replacing the visual world.
- Treat the old visual language as an anti-reference; do not blend old and new aesthetics into a compromise.
- Run one focused discovery round before design work.
- Produce a direction brief and concept seed before updating design documentation.
- Prioritize task completion, scanability, consistency, and native expectations on operational screens.
- Define complete states and responsive behavior before component implementation.
- Use critique, audit, polish, harden, and extract as recurring gates, not a final cleanup step.

Recommended build loop for every vertical slice:

1. Shape the workflow and enumerate states.
2. Implement against the approved foundation.
3. Critique at desktop and mobile sizes.
4. Audit accessibility, responsiveness, performance, and theme behavior.
5. Extract any pattern repeated three or more times.
6. Polish only after structural issues are resolved.

### 5.2 Apple Design skill: behavior, not imitation

Adopt the interaction rules without copying Apple's chrome:

- A pressed control responds on pointer-down.
- Dragged objects track the pointer directly where feasible.
- Spring animations are interruptible and preserve velocity.
- Default interface springs should be critically damped or nearly so.
- Entry and exit are symmetric, and overlays originate from their source when useful.
- Motion uses transform and opacity whenever possible.
- Translucency communicates hierarchy or content flow; it is not decoration.
- Layers of blur must not stack.
- Reduced motion, reduced transparency, increased contrast, keyboard access, and text scaling are first-class states.
- Familiar controls and clear agency take priority over novelty.

### 5.3 Astryx: the component contract

Astryx `0.3.0` offers more than 150 components, CSS-variable theming, React 19 support, templates, component documentation, swizzling, upgrade tools, and diagnostics.

Use it for:

- `AppShell`, `SideNav`, `MobileNav`, `TopNav`, and `NavItem`;
- buttons, icon buttons, menus, tooltips, popovers, dialogs, and drawers;
- inputs, select controls, segmented controls, form layouts, and validation;
- tables, lists, tabs, toolbars, skeletons, progress, toasts, and empty states;
- theme, radius, type, and motion scales.

Do not:

- copy one of the stock themes as Aernova's brand;
- swizzle a component before verifying tokens and composition cannot solve the requirement;
- adopt canary chart packages for critical workflows;
- bypass Astryx state APIs with arbitrary local variants.

Run the Astryx CLI's documentation, theme build, doctor, and upgrade workflow in a controlled branch. Record every swizzled component and the reason it could not remain upstream-compatible.

### 5.4 Motion: primary React interaction layer

Use Motion for:

- `AnimatePresence` for drawers, dialogs, contextual panels, and state replacement;
- layout continuity for compact filters, selected rows, and rearranged dashboard modules;
- shared layout only where it clarifies origin and destination;
- drag gestures in user-controlled UI when they are domain-appropriate;
- scroll-linked chrome behavior in small, carefully measured areas;
- animated numerical or progress feedback when the value change matters;
- reduced-motion integration via `MotionConfig` and `useReducedMotion`.

Bundle strategy:

- Add `MotionConfig reducedMotion="user"` in a small Client Component provider.
- Use `LazyMotion`, `m`, and `domAnimation` for the normal application shell.
- Load `domMax` only on routes that need advanced gestures or layout features.
- Prefer `motion/react-client` where a client entry can remain leaf-level.
- Avoid animating large tables or wrapping the root layout in unnecessary client state.

Motion's official guidance notes that `reducedMotion="user"` disables transform and layout animation while retaining opacity and color transitions. This is the correct base behavior for Aernova.

### 5.5 Anime.js: isolated scene choreography

Anime.js `4.5.0` provides scoped animations, timelines, layout utilities, WAAPI support, and a Three.js adapter. Its React integration uses `createScope()` with cleanup through `.revert()`.

Use it only for:

- roof model reveal and measurement-state transitions;
- camera, light, material, shader uniform, and annotation choreography in the Three.js viewer;
- rare SVG or canvas sequences that cannot be expressed clearly through Motion.

Implementation requirements:

- Dynamically import Anime.js from the viewer's Client Component.
- Create one scope per mounted scene and always revert it on cleanup.
- Confirm Anime and the viewer share the same Three.js instance.
- Avoid animating shared materials unless every mesh should change.
- Mark materials transparent before animating opacity.
- Do not use Anime.js for menus, dialogs, tabs, navigation, forms, or React list transitions.

## 6. Approved Visual Direction: Precision Workshop

### 6.1 Design premise

Precision Workshop combines the legibility of a technical instrument with the calm of a premium productivity tool. The app should look made for skilled work: exact, tactile, and durable.

Premium means:

- a decisive hierarchy rather than more decoration;
- fewer containers with stronger composition;
- precise type and numeric alignment;
- excellent empty, loading, error, success, and disabled states;
- motion that explains state changes;
- materials used only to establish depth or scrolling context;
- contractor documents that look credible when printed or opened on a phone.

### 6.2 Brand identity and supplied logo

The approved Aernova identity is the supplied monochrome lockup: a four-petal geometric symbol paired with a high-contrast serif wordmark.

Source reviewed on 2026-08-12:

- `/Users/nilay/Downloads/Aernova.jpg`
- JPEG, RGB, 500 by 500 pixels, 96 DPI
- White horizontal lockup on a fixed black square background

The supplied image is an identity reference, not a production-ready master. Phase 0 must obtain or produce approved source assets without altering the mark:

- vector symbol and horizontal lockup in SVG or equivalent source format;
- transparent white and dark-ink lockups;
- transparent high-resolution PNG fallbacks;
- symbol-only square icon and favicon/app-icon exports;
- minimum-size, clear-space, background, and misuse rules.

Do not reconstruct the wordmark using an approximate font. The wordmark is artwork. UI typography is a separate decision. Public contractor documents continue to show the contractor's logo or company name, not the Aernova lockup.

### 6.3 Approved semantic color direction

Exact values remain a Phase 0 prototype decision, but the meanings and theme priority are approved.

| Role | Light mode intention | Dark mode intention | Usage |
| --- | --- | --- | --- |
| Canvas | Porcelain/mineral white | Neutral graphite | Main work surface |
| Surface | Clean white or cool stone | Raised neutral charcoal | Menus, inspectors, dialogs |
| Ink | Near-black graphite | Warm white | Primary text and primary actions |
| Muted | Zinc/steel | Nickel | Secondary text and inactive controls |
| Brand signal | Restrained verdigris/alpine | Clearer luminous variant | Selection, focus, active state |
| Attention | Safety amber | Warm amber | Warnings and pending states |
| Destructive | Signal red | Accessible red | Destructive states only |
| Measurement | Technical cyan or approved replacement | High-contrast equivalent | Roof geometry only |

This removes dark navy and cyan as a mandatory app-wide treatment without erasing Aernova's recognizable identity. Technical cyan remains available for measurements, readings, and technical truth, but it must not also mean "primary action." Green, amber, and red retain their approved success, caution, and destructive meanings.

Dark mode is authored first and is the default presentation. Every semantic token must nevertheless be designed and reviewed in dark and light together. Light mode is not a mechanical inversion: it is an outdoor-capable working surface with its own tested materials, contrast, elevation, and measurement colors.

### 6.4 Typography

- Use one UI type family by default.
- Prefer a high-quality system or variable sans with optical sizing and strong numeral forms.
- Keep type sizes on a fixed `rem` scale; do not scale them with viewport width.
- Use tabular numerals for money, measurements, dates, and counts.
- Use weight, size, and whitespace for hierarchy before color.
- Reserve large display type for true identity moments, not dashboards or compact panels.
- Keep public documents conservative and printable; contractor branding may override limited display attributes.
- Load any non-system family through `next/font` to self-host and avoid layout shift.
- Use only open-source or properly bundled free fonts for v1.
- Compare IBM Plex Sans Variable, Source Sans 3 Variable, Geist Sans, and the current system stack using real Aernova tables, forms, monetary values, measurements, and mobile screens.
- Select on numeric legibility, compact operational performance, small-size rendering, heading/body distinction, and mobile readability rather than fashion or mockup novelty.

A font decision should be made during Phase 0. IBM Plex Sans Variable is the leading design-exploration candidate because it was designed for UI use and has an industrial/technical character that can complement the serif logo; this is a hypothesis to validate, not a preselected outcome. Do not add a commercial font in v1.

### 6.5 Spacing, radii, and containment

Proposed foundation:

- Base spacing unit: 4px.
- Dense controls: 32px where pointer precision is expected and an adjacent 44px touch treatment exists.
- Standard controls: 40px.
- Primary mobile controls and touch targets: minimum 44px.
- Compact radius: 4px.
- Standard radius: 6px.
- Large container radius: 8px maximum unless an existing Astryx component requires otherwise.
- Pills only for tags, statuses, segmented selection, or genuinely circular controls.

Reduce visual containers by composing full-width sections, tables, split panes, rows, and toolbars. Cards should represent repeated independent objects or framed tools, not every page section.

### 6.6 Elevation and material

- Use borders for separators, not as outlines around every section.
- Use low, neutral shadows only for overlays and genuinely elevated surfaces.
- Allow translucent top or side chrome only where content scrolls behind it.
- Provide solid material fallbacks for reduced-transparency and increased-contrast preferences.
- Never stack translucent panels.
- Give the roof viewer a full-bleed or unframed stage with a stable inspector, not a card containing a canvas.

### 6.7 Iconography and controls

- Adopt a single icon library compatible with Astryx and React; use familiar symbols before text-heavy controls.
- Every unfamiliar icon-only control must have a tooltip and accessible name.
- Sidebar items should use icon plus label, with label-free collapsed mode.
- Binary choices use checkboxes or switches.
- Modes use segmented controls or tabs.
- Numeric adjustments use inputs, steppers, or sliders according to precision needs.
- Option sets use selects or menus.
- Text buttons remain for clear commands.
- Remove hand-authored one-off SVG controls where the shared icon library has an equivalent.

## 7. Information Architecture and Shell

### 7.1 Desktop shell

Replace the current custom 260px sidebar grid with Astryx `AppShell` and `SideNav`.

Recommended behavior:

- Persistent side navigation on desktop.
- Collapsible width with icon-only mode.
- Resizable only if user testing shows real benefit; otherwise use deterministic widths.
- Sticky company/workspace control in the side-nav header.
- User, theme, and support actions in the footer.
- Compact top bar for page identity, global search/command, contextual actions, and notifications.
- Main content uses route-appropriate density rather than one universal padded canvas.

Proposed navigation groups:

| Group | Destinations |
| --- | --- |
| Work | Dashboard, Jobs, Today, Schedule |
| Pipeline | Pipeline and stage-oriented sales work |
| Relationships | Requests, Clients |
| Business | Invoices/Financials, Reports |
| Company | Team, Settings, integrations, and administration |

"New job" becomes a prominent global `+ Create` command rather than a permanent navigation destination. Permission-filtered options may include New client, New request, New job, and context-appropriate quote or invoice creation. Creation must remain reachable from relevant local workflows as well as the global command.

### 7.2 Mobile shell

- Use Astryx `MobileNav` or a purpose-built bottom navigation plus drawer based on route count and testing.
- Keep the top three or four field tasks one tap away.
- Put secondary administration destinations in a drawer or overflow menu.
- Preserve browser and safe-area insets.
- Ensure drawers and sheets are interruptible and return focus correctly.
- Do not shrink desktop tables into unreadable grids; transform them into prioritized rows or detail lists.
- Give `/today`, schedule, job workspace, and crew actions the most aggressive mobile validation because they are the highest-value field surfaces.

### 7.3 Command and search

A command palette is appropriate if it provides real cross-product navigation and creation actions. It should not be added as a visual flourish.

Candidate commands:

- Find job, client, quote, or invoice.
- Create request, job, quote, or invoice.
- Jump to recent work.
- Change company or workspace.

Keyboard shortcuts must be discoverable through normal menus and never be the only access path.

## 8. Design-System Architecture

### 8.1 Single source of truth

Create one semantic token source that generates or feeds:

- Tailwind utilities;
- Astryx theme values;
- CSS custom properties for bespoke surfaces;
- Motion timing and spring presets;
- print and public-document variables.

Do not maintain separate color meanings in `globals.css`, Tailwind classes, and `lib/astryx/theme.ts`.

Suggested token families:

```text
color.canvas.*
color.surface.*
color.ink.*
color.border.*
color.brand.*
color.status.{info,success,warning,danger}.*
color.measurement.*
space.*
radius.*
shadow.*
type.{family,size,weight,lineHeight,numeric}
motion.{duration,easing,spring,distance}
material.{solid,translucent,elevated}
```

### 8.2 Motion tokens

Provisional values to validate in interactive prototypes:

| Token | Value | Intended use |
| --- | ---: | --- |
| Instant | 100ms | Press feedback, tiny state acknowledgment |
| Fast | 160ms | Hover, focus, selection indicator |
| Standard | 220ms | Menu, popover, compact state replacement |
| Deliberate | 360ms | Drawer, inspector, meaningful layout change |
| Focal maximum | 500-700ms | Rare viewer reveal only |

Spring presets:

- Control: critically damped, response about 0.3 seconds.
- Panel: critically damped, response about 0.4 seconds.
- Direct manipulation: preserve input velocity and settle without decorative bounce.
- Momentum: only for draggable or scroll-adjacent surfaces.

The final values must live in the theme and Motion presets, not be repeated in components.

### 8.3 Component ownership

| Need | Preferred owner | Customization rule |
| --- | --- | --- |
| Shell and navigation | Astryx | Compose first, swizzle last |
| Buttons, inputs, overlays | Astryx | Token-driven variants only |
| Data display | Astryx Table/List plus domain wrappers | Domain wrapper may format data and states |
| Layout and page composition | Aernova | Use unframed structural components |
| React presence and layout animation | Motion | Shared presets, leaf Client Components |
| Simple hover/focus | CSS | Theme variables only |
| Three.js choreography | Anime.js | Viewer-local scope |
| Business state and permissions | Existing Aernova code | No visual-layer ownership |

### 8.4 Required state matrix

Every shared interactive component must define and verify:

| State category | Required states |
| --- | --- |
| Interaction | default, hover, active/pressed, focus-visible, disabled |
| Data | loading, empty, populated, partial, stale where relevant |
| Validation | neutral, pending, valid, warning, invalid |
| Network | optimistic, submitting, success, retryable error, terminal error |
| Permission | available, read-only, hidden, blocked with explanation |
| Theme | light, dark, high contrast, reduced transparency |
| Motion | normal, reduced motion |
| Viewport | narrow mobile, wide mobile, tablet, desktop, wide desktop |

### 8.5 Transition ownership

Use one owner for each transition:

- CSS owns hover, focus, pressed-color, and other local style feedback.
- Motion owns React presence, layout continuity, gestures, and component state transitions.
- Anime.js owns viewer-local Three.js, SVG, canvas, and imperative timeline properties.
- Native or React View Transitions are deferred during the initial redesign. Reassess them only for cross-route continuity after the Motion system is stable.

Do not combine Motion layout animation with a View Transition on the same visual change. A later View Transition pilot must follow the bundled Next.js `16.2.4` documentation, define browser fallbacks, and demonstrate a measurable benefit over the established Motion behavior.

## 9. Component Migration Map

| Existing pattern | Target pattern | Notes |
| --- | --- | --- |
| Custom `AppSidebar` | Astryx `AppShell` + `SideNav` + `NavItem` | Replace shell in one controlled step |
| Custom mobile navigation behavior | Astryx `MobileNav` or tested bottom-nav composition | Validate field workflows first |
| Repeated bordered section cards | Unframed page sections, split panes, rows, or Astryx lists | Preserve cards only for independent objects |
| One-off headers | Shared page header with title, context, actions, and optional tabs | No descriptive marketing copy on operational pages |
| Custom tabs | Astryx tab primitives | Stable dimensions; keyboard complete |
| Ad hoc filters | Shared filter toolbar and compact filter summary | Responsive, resettable, URL-aware where existing behavior allows |
| Custom form field wrappers | Astryx form layout and input components | Preserve server actions and validation contracts |
| Loading text/spinners | Skeletons or progress based on duration and certainty | Fixed dimensions to prevent layout shift |
| Bespoke empty panels | Astryx empty state with domain-specific action | Avoid generic illustrations unless useful |
| Native confirmation patterns | Astryx dialog/alert pattern | Focus trap and destructive hierarchy required |
| Hand-coded popovers/menus | Astryx popover/menu/tooltip | Preserve keyboard and collision behavior |
| Status-colored badges | One semantic status component | Text plus color, never color alone |
| Money/count presentation | Shared numeric readout | Tabular, aligned, screen-reader label where needed |
| Public document sections | Shared document primitives | Print-safe; contractor brand variables |

## 10. Route-by-Route Redesign Plan

### 10.1 Dashboard

- Replace the repeated-card overview with a task-prioritized operational dashboard.
- Lead with items requiring action, then today's schedule, pipeline/financial signals, and recent activity.
- Use rows, grouped lists, and compact numeric summaries rather than equal-weight tiles.
- Animate only meaningful changes such as an item resolving or moving between states.
- Preserve direct links to the underlying job, request, quote, or invoice.

### 10.2 Jobs index

- Make the default view highly scannable with status, client, address, owner, next action, and recency.
- Use a responsive table on desktop and prioritized list rows on mobile.
- Keep filters compact, persistent in the URL if already supported, and easy to reset.
- Provide dense and comfortable display modes only if user evidence justifies both.

### 10.3 Job workspace

- Treat this as the primary vertical slice after the shell.
- Establish a stable job identity header with address, client, state, ownership, and highest-priority actions.
- Use tabs or a segmented workspace navigation with stable dimensions.
- Compose details, activity, documents, financials, and measurement content according to task hierarchy.
- Use a desktop split inspector where it reduces context switching; collapse it to a sheet on mobile.
- Keep permission checks and server data flow unchanged.

### 10.4 Requests and pipeline

- Make stage and next action more prominent than decorative summaries.
- If a board view remains, implement accessible keyboard alternatives and a list/table fallback.
- Use Motion for stage continuity only after server mutation succeeds or an existing optimistic contract is confirmed.
- Avoid drag-and-drop unless it genuinely improves the workflow and supports touch, keyboard, cancellation, and error recovery.

### 10.5 Today and schedule

- Prioritize temporal scanning, travel/context cues, ownership, and completion state.
- Use stable time columns and strong current-time/current-day indicators.
- Mobile should use an agenda, not a compressed desktop calendar.
- Animations may clarify rescheduling but must never delay confirmation.

### 10.6 Clients

- Center the relationship between a client, properties, jobs, documents, and outstanding actions.
- Use contact actions appropriate to the device.
- Avoid duplicating job detail surfaces inside client pages.

### 10.7 Quotes, invoices, and change orders

- Standardize editing, preview, status, totals, and sending patterns.
- Keep monetary hierarchy extremely clear and use tabular numerals.
- Provide a stable two-mode editing/preview experience where both are needed.
- Use dialogs and progress states for sending, payment, and destructive actions.
- Retain Astryx tables and extend them through domain wrappers rather than restyling each screen independently.

### 10.8 Warranty and reports

- Treat these as formal records with clear lifecycle and ownership.
- Use document-oriented hierarchy rather than dashboard cards.
- Ensure attachments, signatures, status, and dates remain understandable when printed.

### 10.9 Team, company, and settings

- Use calm, compact settings forms with clear section navigation.
- Separate personal, company, billing, integration, and access concerns.
- Explain irreversible and permission-gated actions at the point of action.
- Avoid a card per setting section; use full-width grouped forms and dividers.

### 10.10 Onboarding and authentication

- Keep these flows focused and brand-forward without becoming a landing page.
- Use one primary task per step, visible progress, resilient validation, and clear recovery.
- Preserve Clerk integration boundaries.
- Test browser autofill, password managers, keyboard navigation, mobile viewport behavior, and slow network states.

### 10.11 Public documents and share routes

- Create a distinct but related contractor-document system.
- Keep contractor logo and identity as the primary brand on customer-facing material.
- Use a warm, print-safe paper surface, graphite type, restrained Aernova chrome, and clear totals/actions.
- Avoid app-shell navigation on public documents.
- Verify PDF/print layout, long line items, absent logos, long company names, long addresses, expired tokens, invalid tokens, and mobile viewing.
- Do not apply app translucency or animated entry sequences to printable content.

### 10.12 Roof measurement viewer

- Make the Three.js stage full-bleed or visually unframed.
- Use a stable tool rail and inspector rather than floating decorative cards.
- Preserve strong contrast for geometry, measurements, selection, and edit handles.
- Keep measurement color semantics independent from application action colors.
- Use Anime.js for scene-local camera, model, material, light, and annotation transitions.
- Use Motion for React-owned drawers, toolbars, and inspector panels around the canvas.
- Never let both libraries animate the same DOM node or scene property.
- Support reduced motion with direct state changes or short opacity transitions.
- Test blank/error/loading WebGL states and a non-WebGL fallback.

## 11. Implementation Phases

### Phase 0: Decisions, baseline, and concept validation

**Goal:** Convert the approved direction into tested tokens, assets, and an interactive concept before production components are changed.

Deliverables:

- Install or update Impeccable through its documented `npx impeccable install` workflow, then run its initialization and doctor checks without overwriting Aernova's reviewed shared artifacts.
- Prepare the approved Aernova symbol and wordmark asset set from a proper vector or transparent master; do not trace the supplied JPEG when an original source is available.
- Current-state screenshots at agreed desktop and mobile viewports for all route families.
- Baseline Lighthouse/Core Web Vitals, bundle, accessibility, and key task timing measurements.
- A one-page redesign brief following Impeccable's shape workflow.
- Two or three visual concept seeds using real Aernova data and states.
- One interactive prototype covering shell, dashboard, job workspace, and a mobile sheet transition.
- A typography comparison using IBM Plex Sans Variable, Source Sans 3 Variable, Geist Sans, and the current system stack with real numeric and operational content.
- Browser checks in current and previous major versions of Safari, Chrome, and Edge, including iPhone Safari, iPad Safari, Android Chrome, macOS Safari, and desktop Chrome/Edge.
- Responsive checks at approximately 390px, 768px, 1024px, 1440px, and 1728/1920px.
- A written direction decision with rejected alternatives and reasons.

Acceptance criteria:

- The approved Precision Workshop direction is validated against real operational content, not a mood board alone.
- Dark is demonstrably the primary authored direction, while light is complete and outdoor-usable in the same prototype.
- The selected font is open-source/free, self-hostable, and justified against the evaluation criteria rather than visual trend.
- Interaction prototypes have been tested with mouse, keyboard, and touch-sized viewports.
- Final visual approval is recorded by the Aernova owner after review of Owner/Admin, Office/Estimator, relevant Sales, and Crew workflows.

### Phase 1: Foundation and token architecture

**Goal:** Establish one design source of truth without changing business behavior.

Likely files:

- `docs/DESIGN.md`
- `app/globals.css`
- `lib/astryx/theme.ts`
- generated files under `lib/astryx/`
- `components/astryx-theme-provider.tsx`
- a new motion provider and preset module

Deliverables:

- Approved semantic colors for light, dark, high-contrast, print, and contractor-brand contexts.
- Type, spacing, radius, shadow, material, and motion scales.
- Astryx theme rebuilt from the same semantic model.
- A token preview page containing every semantic state.
- Motion provider using user reduced-motion preference.
- Reduced-transparency and increased-contrast fallbacks.

Acceptance criteria:

- No contradictory action-color rules remain.
- Theme switching does not flash or shift layout.
- Tokens meet WCAG 2.2 AA for their documented uses.
- Tailwind, Astryx, bespoke CSS, and Motion consume the same semantics.

### Phase 2: Application shell and navigation

**Goal:** Replace the highest-leverage visual structure while containing risk.

Likely files:

- `app/(dashboard)/layout.tsx`
- `components/dashboard/app-sidebar.tsx`
- new shell, navigation, mobile navigation, and command components

Deliverables:

- Astryx `AppShell` integration.
- Grouped side navigation with icons, active state, collapse behavior, and tooltips.
- Mobile navigation validated against top field tasks.
- Top bar with page identity, context actions, search/command entry, and notifications.
- Correct focus restoration and reduced-motion behavior.

Acceptance criteria:

- Permissions and company switching behave exactly as before.
- Every authenticated destination remains reachable at desktop and mobile sizes.
- The shell does not convert Server Component pages into a broad client bundle.
- No overlap occurs at supported sizes, 200% zoom, or long translated/test strings.
- Graphify shows no unexpected dependency expansion.

### Phase 3: Shared operational primitives

**Goal:** Build the reusable vocabulary before migrating many routes.

Deliverables:

- Page header, action toolbar, filter toolbar, status, numeric readout, data row, empty state, skeleton, split inspector, and document primitives.
- Astryx-backed form and overlay patterns.
- Shared state and responsive test fixtures.
- Removal plan for superseded custom primitives.

Acceptance criteria:

- Every primitive passes the full state matrix.
- No custom primitive duplicates an Astryx primitive without a recorded reason.
- Representative real content covers short, long, missing, loading, and error data.

### Phase 4: Pilot vertical slice

**Goal:** Prove the system on the hardest representative workflow before broad migration.

Scope:

- Authenticated shell and navigation in their production composition
- Dashboard
- Jobs index
- Job workspace
- Core forms, overlays, and create/navigation workflows used by the slice

Deliverables:

- End-to-end restyle with real permissions and data.
- Motion behavior for navigation, state replacement, panel entry, and optimistic feedback where already supported.
- Mobile, tablet, desktop, wide desktop, dark, light, and reduced-motion validation.
- Impeccable critique and audit reports with P0/P1 issues resolved.

Acceptance criteria:

- A user can complete the current workflow without additional steps.
- Visual hierarchy is clearly different from the old system and coherent across every surface in the authenticated pilot.
- Performance remains within the provisional budgets in Section 13.
- The pilot produces no unresolved architectural duplication.

### Phase 5: Operational workflow migration

**Goal:** Migrate the remaining authenticated operational, commercial, financial, and administrative surfaces.

Scope:

- Requests
- Pipeline
- Today
- Schedule
- Clients
- Quotes
- Invoices
- Change orders
- Reports
- Team
- Settings
- Remaining job tabs and supporting workflows

Acceptance criteria:

- Lists/tables have useful mobile transformations.
- Filters, sorting, selection, bulk actions, and pagination preserve behavior.
- Keyboard and touch alternatives exist for any gesture.
- Old cards and page-local variants are removed as routes migrate.

### Phase 6: Public, onboarding, and authentication surfaces

**Goal:** Complete customer-facing documents and entry flows after the authenticated system is stable.

Scope:

- Warranties
- Onboarding and authentication
- All public share/document routes

Acceptance criteria:

- Print and PDF output are stable across long and missing data cases.
- Currency, totals, status, signatures, and payment actions are unambiguous.
- Contractor branding remains primary on customer-facing documents.
- Public routes do not inherit authenticated chrome or unnecessary JavaScript.

### Phase 7: Roof viewer redesign

**Goal:** Create Aernova's signature premium instrument without destabilizing core workflows.

Deliverables:

- Full-bleed viewer composition and responsive inspector.
- Unified React/Three ownership boundaries.
- Dynamically loaded Anime.js scene choreography.
- Viewer-specific loading, error, empty, and fallback states.
- Reduced-motion behavior and performance instrumentation.

Acceptance criteria:

- Canvas pixel checks confirm a nonblank, correctly framed scene on desktop and mobile.
- Model, annotations, and referenced assets render without overlap.
- Interaction remains responsive during animation and can be interrupted.
- No persistent Anime.js timers, scopes, or listeners remain after unmount.
- WebGL failure does not strand the user.

### Phase 8: Hardening, cleanup, and cutover

**Goal:** Remove migration scaffolding and release one coherent system.

Deliverables:

- Complete Impeccable critique, audit, harden, and polish passes.
- Bundle and Core Web Vitals comparison against Phase 0.
- Visual regression coverage for all route families.
- Removed legacy tokens, unused styles, duplicate components, and temporary flags.
- Updated `docs/DESIGN.md` and contributor guidance.
- Astryx `doctor` output reviewed and upgrade procedure documented.
- Graphify report refreshed and architectural deltas reviewed.

Acceptance criteria:

- No production route mixes old and new foundations.
- P0 and P1 audit findings are closed.
- No new import cycles or unexplained shared client dependencies exist.
- The release rollback path is documented and tested.

## 12. File-Level Impact Map

| Area | Current location | Expected change |
| --- | --- | --- |
| Product direction | `docs/PRODUCT.md` | Update only if product behavior or audience decisions change |
| Design system | `docs/DESIGN.md` | Replace Field Notebook visual rules after direction approval |
| Global tokens | `app/globals.css` | Consolidate semantic variables and preference fallbacks |
| Authenticated shell | `app/(dashboard)/layout.tsx` | Adopt Astryx shell while preserving server-side context and permissions |
| Sidebar | `components/dashboard/app-sidebar.tsx` | Replace with grouped Astryx navigation or remove after migration |
| Astryx provider | `components/astryx-theme-provider.tsx` | Keep client boundary narrow; add approved preferences only |
| Astryx mapping | `lib/astryx/theme.ts` | Rebuild from authoritative semantic tokens |
| Generated theme | `lib/astryx/*` | Regenerate through CLI, never hand-edit generated outputs |
| Motion infrastructure | new focused provider/preset files | Shared config, springs, variants, and reduced-motion behavior |
| Domain components | `components/**` | Migrate by vertical slice and remove duplicates |
| Route composition | `app/(dashboard)/**` | Change structure and presentation without moving business logic |
| Public layouts | public/share route groups | Introduce document theme and print-safe composition |
| Roof viewer | existing viewer components | Separate React chrome from Three scene choreography |
| Critique artifacts | `.impeccable/**` | Refresh after each approved vertical slice |
| Architecture index | `graphify-out/**` | Refresh at major dependency milestones |

## 13. Performance and Bundle Budgets

Capture the current baselines in Phase 0, then finalize numerical budgets. Use these provisional release gates:

- LCP at or below 2.5 seconds at the 75th percentile on measured production-like mobile conditions.
- INP at or below 200 milliseconds at the 75th percentile.
- CLS at or below 0.1.
- No more than 20 KB gzip growth in the shared authenticated shell without a reviewed exception.
- Motion's normal feature bundle loaded once through `LazyMotion`.
- Advanced Motion gesture features loaded only on routes that need them.
- Anime.js and its Three adapter absent from non-viewer route chunks.
- No page-level animation that blocks interaction or delays useful content.
- Transform and opacity are the default animated properties.
- Large tables, long lists, filters, and text layout do not receive continuous layout animation.
- Every dynamic component has stable dimensions to avoid layout shift.

Use bundle analysis and real route traces rather than package size estimates alone. Verify the production build because development behavior is not representative.

## 14. Accessibility and Preference Requirements

- Meet WCAG 2.2 AA in both themes.
- Maintain visible focus for every interactive element.
- Keep touch targets at least 44 by 44 CSS pixels where practical; document any tightly packed data-grid exception and provide equivalent access.
- Ensure color is never the only status signal.
- Preserve logical tab order and focus return for dialogs, sheets, menus, and route changes.
- Provide accessible names for icon-only controls and tooltips for unfamiliar symbols.
- Respect `prefers-reduced-motion` through Motion configuration, CSS, and viewer logic.
- Provide reduced-transparency and increased-contrast material fallbacks.
- Verify text at 200% zoom and with increased browser text size.
- Avoid hover-only information and pointer-only reordering.
- Announce asynchronous success, failure, and significant state change when visual feedback alone is insufficient.
- Keep print output readable without color or background graphics.

## 15. Verification Strategy

### Automated checks

- Existing unit and integration tests.
- Type checking, linting, and production build.
- Focused tests for any new domain wrapper or state adapter.
- Accessibility scans on representative routes in each route family.
- Visual snapshots for light, dark, mobile, desktop, loading, empty, error, and long-content states.
- Bundle comparison and route-chunk inspection.
- Graphify dependency report after shell and shared-component milestones.

### Browser verification matrix

| Dimension | Required coverage |
| --- | --- |
| Viewports | approximately 390px mobile, 768px tablet, 1024px small desktop/tablet landscape, 1440px desktop, and 1728/1920px wide office display |
| Browsers | current and previous major iPhone/iPad/macOS Safari, Android Chrome, desktop Chrome, and desktop Edge |
| Themes | light, dark, increased contrast where supported |
| Preferences | normal motion, reduced motion, normal transparency, reduced transparency |
| Input | mouse, keyboard, touch-sized pointer |
| Content | empty, typical, maximum realistic, missing optional fields, error |
| Roles | owner/admin, office, estimator, field/limited access, public visitor |
| Documents | screen, print preview, generated PDF where applicable |
| Field-critical routes | `/today`, schedule, job workspace, and crew actions receive additional mobile interaction and outdoor-legibility passes |

Older office environments should remain functionally usable when they run a reasonably current browser, but the design must not be weakened to support obsolete engines indefinitely.

For the Three.js viewer, capture Playwright screenshots and perform canvas-pixel checks at desktop and mobile sizes. Confirm that the canvas is nonblank, correctly framed, interactive, and free of UI overlap.

### Review cadence

- Run critique after each visual slice.
- Run accessibility and responsive audit before merging each route family.
- Run hardening, bundle, and full workflow checks before cutover.
- Do not defer all cleanup to the final phase; remove replaced styles and components as ownership changes.

## 16. Rollout Strategy

Use a dedicated redesign branch and an internal preview surface for foundation and component work. Avoid maintaining two complete themes in production.

Recommended sequence:

1. Build tokens and prototypes under a temporary scoped `data-design="v2"` preview.
2. Validate the shell and pilot vertical slice with real data and roles.
3. Promote the new foundation to the authenticated shell only when shared primitives are ready.
4. Migrate route families in short-lived branches while using compatibility wrappers for unmigrated content.
5. Perform an intentional cutover once no production route visibly mixes systems.
6. Remove the preview scope, compatibility wrappers, old tokens, and feature scaffolding.

If production feature flags already exist, use that infrastructure for staff preview. Do not introduce a bespoke client-side flag system solely for this redesign.

## 17. Risks and Mitigations

| Risk | Consequence | Mitigation |
| --- | --- | --- |
| Astryx API churn | Rework or broken theme/components | Pin versions, use CLI doctor, minimize swizzles, schedule upgrades |
| Two animation engines overlap | Conflicting transforms, lifecycle bugs, larger bundles | Enforce ownership table; Anime only in viewer-local scopes |
| Broad client boundaries | Larger bundles and lost server benefits | Keep providers small; dynamically load browser-only features |
| Mixed token sources | Theme drift and contradictory states | One semantic source; generated Astryx output; token lint/review |
| Visual redesign changes workflow | User confusion or lost efficiency | Preserve task order and domain language; validate vertical slices with real tasks |
| Overuse of premium effects | Poor field readability and performance | Restrained material rules; no nested glass; preference fallbacks |
| Public-document regressions | Lost trust, print/PDF failures | Separate document system and dedicated long-content/print fixtures |
| Roof viewer regression | Blank canvas or unusable measurement tool | Viewer-local rollout, pixel checks, WebGL fallback, performance instrumentation |
| Font licensing or loading issues | Legal risk, layout shift, offline inconsistency | Confirm license; use `next/font`; retain system fallback |
| Mobile table compression | Unreadable field workflows | Purpose-built list/agenda transformations rather than scaled desktop UI |
| Dirty or concurrent worktree changes | Accidental overwrite or merge conflict | Keep commits scoped, inspect diffs, and never revert unrelated work |
| Excessive redesign duration | Permanent mixed interface | Vertical milestones, explicit cutover criteria, remove legacy code continuously |

## 18. Implementation References

The implementation team should review these primary sources at the start of the relevant phase:

- [Impeccable installation and command index](https://github.com/pbakaus/impeccable/blob/89368a24306d359507941274d046a8e186893540/README.md)
- [Impeccable replacement-world workflow](https://github.com/pbakaus/impeccable/blob/89368a24306d359507941274d046a8e186893540/skill/reference/new-work.md)
- [Impeccable operational UI guidance](https://github.com/pbakaus/impeccable/blob/89368a24306d359507941274d046a8e186893540/skill/reference/operate.md)
- [Impeccable animation guidance](https://github.com/pbakaus/impeccable/blob/89368a24306d359507941274d046a8e186893540/skill/reference/animate.md)
- [Impeccable audit guidance](https://github.com/pbakaus/impeccable/blob/89368a24306d359507941274d046a8e186893540/skill/reference/audit.md)
- [Apple Design skill](https://github.com/emilkowalski/skills/blob/78761e1b57f97dce65b983d640c70a68f39e8163/skills/apple-design/SKILL.md)
- [Astryx repository and core documentation](https://github.com/facebook/astryx/tree/f85aedc20770d6d4b8ac45a10e963d5899d1c537)
- [Astryx component sandbox](https://facebook.github.io/astryx/sandbox/)
- [Anime.js React integration](https://animejs.com/documentation/getting-started/using-with-react/)
- [Anime.js timelines](https://animejs.com/documentation/timeline/)
- [Anime.js Three.js adapter](https://animejs.com/documentation/adapters/threejs-adapter/)
- [Motion React accessibility](https://motion.dev/docs/react-accessibility)
- [Motion `MotionConfig`](https://motion.dev/docs/react-motion-config)
- [Motion `LazyMotion`](https://motion.dev/docs/react-lazy-motion)
- The checked-in Next.js `16.2.4` guides under `node_modules/next/dist/docs/`, especially Server/Client Components, lazy loading, CSS, fonts, and View Transitions.

## 19. Approved Decision Record

1. **Character:** Precision Workshop is approved at approximately 85% calm precision and 15% sophisticated material character. Clarity, responsiveness, and polish create the premium impression.
2. **Identity and color:** Preserve the supplied Aernova symbol and wordmark. Keep cyan for measurement/technical truth, green for success, amber for caution/attention, and red for error/destructive. The current navy/cyan interface treatment may change substantially. Contractor branding remains primary on customer documents.
3. **Themes:** Dark is the primary authored/default direction. Light is a first-class launch mode designed from the foundation for outdoor use.
4. **Release sequence:** Pilot with shell, dashboard, jobs, job workspace, and core forms/navigation. Follow with authenticated operational, commercial, financial, and settings routes. Then migrate public documents, onboarding, and authentication. Redesign the roof viewer last. All major families must be complete before the redesign is called fully launched.
5. **Platform support:** Prioritize iPhone Safari, desktop Chrome/Edge, iPad Safari, Android Chrome, and macOS Safari in that order. Support current and previous major mainstream browser versions rather than obsolete engines.
6. **Information architecture:** Navigation restructuring is approved. Stable work areas belong in navigation; `+ Create` globally exposes permission-filtered creation actions. Workflow behavior and authorization remain unchanged.
7. **Typography licensing:** Use open-source or properly bundled free fonts for v1. Compare candidates with real product content and choose on operational performance, not fashion. No commercial-font dependency is planned.
8. **Approval:** Final visual approval belongs to the Aernova owner. The pilot should be reviewed against Owner/Admin, Office/Estimator, relevant Sales, and Crew workflows, preferably with representative users before full cutover.

The remaining brand-production input is an original vector or transparent master of the supplied logo, if one exists. The 500px JPEG is sufficient for direction approval but not for a complete responsive, light/dark, print, favicon, and app-icon asset set.
