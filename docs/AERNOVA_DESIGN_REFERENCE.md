# Aernova Design and Frontend Reference

**Status:** Authoritative reference for new Aernova interface work
**Established:** 2026-08-12
**Approved direction:** Precision Workshop
**Companion plan:** [`docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_REDESIGN_PLAN.md`](./PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_REDESIGN_PLAN.md)

## 1. Purpose

Use this document whenever designing or building a new Aernova feature, route, component, public document, or animated interaction. It records:

- approved product and brand decisions;
- the intended visual and interaction character;
- exact upstream repositories and guidance;
- component, motion, icon, and font ownership;
- platform and responsive requirements;
- a repeatable feature-design and implementation workflow;
- quality gates that apply before work is considered complete.

This is a durable reference, not a redesign task list. The phased migration sequence lives in `docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_REDESIGN_PLAN.md`.

## 2. Authority Order

When sources disagree, resolve them in this order:

1. Current approved product behavior and domain rules in `docs/PRODUCT.md` and `docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md`.
2. This reference and the approved decision record in `docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_REDESIGN_PLAN.md`.
3. The current `docs/DESIGN.md`, once rewritten for Precision Workshop.
4. Existing tested behavior, permission rules, and server contracts.
5. Astryx component contracts and theme capabilities.
6. Impeccable and Apple Design guidance.
7. Motion and Anime.js implementation guidance.
8. Page-local precedent.

An older screenshot or component is not authoritative merely because it already exists. The old Field Notebook styling is an anti-reference during the redesign, while its valid product semantics remain binding.

## 3. Product Design Contract

Aernova is a multi-trade workflow platform for small construction and trades businesses. Roofing measurement is a specialized module, not the model for every page.

The interface must work for:

- Owner/Admin users making business and workflow decisions.
- Office/Estimator users handling schedules, clients, documents, and detailed review.
- Sales users working with requests, pipeline, quotes, and follow-up.
- Crew users completing focused field tasks on mobile devices.
- Customers opening contractor-branded documents and approval/payment flows.

Core product behavior:

- Save the user time by turning work into clear review and decision steps.
- Keep domain language familiar to contractors.
- Preserve permissions and company context.
- Make the next meaningful action obvious.
- Take users directly to the work behind an alert or summary.
- Prefer accurate, legible information over visual novelty.
- Adapt density and layout to the workflow and device.

## 4. Approved Design Direction

### 4.1 Precision Workshop

The approved balance is approximately:

- **85% calm precision**
- **15% sophisticated material character**

Aernova should feel expensive because it is exceptionally clear, responsive, coherent, and polished. It should not rely on luxury decoration.

Desired characteristics:

- quiet but decisive hierarchy;
- exact typography and numeric alignment;
- restrained, tactile feedback;
- stable layouts and predictable navigation;
- fewer containers with stronger composition;
- complete loading, empty, error, permission, and success states;
- functional material depth where it clarifies scrolling or hierarchy;
- mobile workflows that feel designed for the field rather than adapted from desktop.

### 4.2 Anti-patterns

Do not introduce:

- marketing-style heroes inside the application;
- nested cards or a card around every section;
- excessive rounded rectangles;
- gradients, decorative blur, bokeh, or floating color shapes;
- glass applied to static content without a hierarchy purpose;
- cyan as a generic brand flourish or primary-action color;
- decorative page-load choreography;
- multiple icon families;
- layout animation on large tables and long lists;
- desktop tables compressed into unreadable mobile grids;
- type that scales with viewport width;
- a fashion-driven display font in compact operational UI;
- app branding that competes with contractor identity on customer documents.

## 5. Aernova Identity

### 5.1 Supplied mark

The approved identity supplied on 2026-08-12 is a monochrome horizontal lockup:

- a four-petal geometric symbol;
- the word `Aernova` in a high-contrast serif wordmark;
- white artwork shown on black.

Reviewed source:

| Property | Value |
| --- | --- |
| Local source | `/Users/nilay/Downloads/Aernova.jpg` |
| Format | JPEG/JFIF |
| Dimensions | 500 by 500 pixels |
| Color space | RGB |
| Metadata resolution | 96 DPI |
| Background | Fixed black square |

The JPEG is a visual source, not a complete production asset.

### 5.2 Required production asset set

Before product implementation, obtain or create from an approved master:

- symbol-only SVG;
- horizontal symbol-and-wordmark SVG;
- transparent white lockup;
- transparent dark-ink lockup;
- high-resolution PNG fallbacks;
- square app icon and mask-safe variant;
- favicon exports at required sizes;
- social/Open Graph composition;
- minimum-size and clear-space guidance;
- approved backgrounds and prohibited treatments.

Do not approximate or typeset the wordmark with a substitute font. The wordmark is artwork. Do not stretch, crop, add effects, recolor individual petals, or put the lockup in a decorative tile unless an approved context requires one.

### 5.3 Product versus contractor branding

- Aernova branding owns authenticated app chrome, authentication, onboarding, product icons, and product share imagery.
- Contractor branding owns customer-facing quotes, invoices, change orders, warranties, reports, and related public documents.
- Public documents render `Company.logoUrl` in the established top-left document slot.
- When a contractor logo is absent, show the company name in that slot.
- Do not place the Aernova lockup where it competes with the contractor's identity.
- Keep the existing `components/public/document-brand.tsx` behavior and its contain/no-crop principle unless a documented product decision changes it.

### 5.4 Existing product-brand surfaces

Review these during the brand asset migration:

- `app/icon.png`
- `app/apple-icon.png`
- `app/favicon.ico`
- `public/icon-192.png`
- `public/icon-512.png`
- `lib/brand-og-image.tsx`
- authenticated shell branding
- authentication and onboarding branding

The current Open Graph implementation uses a placeholder `A` tile and legacy navy/cyan styling. It should be updated only during the approved brand implementation phase.

## 6. Color and Theme Contract

### 6.1 Theme priority

- Dark is the primary authored and default direction.
- Light is a first-class launch mode, designed simultaneously from semantic tokens.
- Light mode must support outdoor and high-ambient-light field use.
- Neither theme is a simple inversion of the other.
- Every component must be reviewed in both themes before completion.

### 6.2 Semantic meanings

| Semantic role | Approved meaning | Prohibited use |
| --- | --- | --- |
| Cyan/measurement | Measurement, reading, technical truth, geometry | Generic links, primary actions, decoration |
| Green/success | Completed, healthy, paid, valid success | Neutral selection or brand flourish |
| Amber/attention | Caution, pending attention, warning | Destructive or ordinary informational state |
| Red/destructive | Error, failure, destructive action, critical exception | Decoration or routine negative variance |
| Brand/action | Approved neutral-ink or future brand signal | Reusing measurement cyan by default |

Color must never be the only status signal. Pair it with text, iconography, position, or shape appropriate to the context.

### 6.3 Provisional material palette

Exact values are established through Phase 0 prototypes. The intended roles are:

| Role | Dark direction | Light direction |
| --- | --- | --- |
| Canvas | Neutral graphite, not blue slate | Porcelain/mineral white |
| Surface | Controlled charcoal elevation | Clean white or cool stone |
| Primary ink | Warm white | Near-black graphite |
| Secondary ink | Nickel | Zinc/steel |
| Border | Low-contrast neutral separator | Cool neutral separator |
| Brand signal | Restrained, accessible signal | Restrained, accessible signal |
| Measurement | High-contrast technical cyan | Outdoor-visible technical cyan |

Avoid a one-note palette dominated by navy, cyan, purple, beige, brown, or slate.

### 6.4 Preference variants

Support:

- `prefers-color-scheme` through the existing explicit theme system;
- `prefers-reduced-motion`;
- reduced transparency where the platform exposes it or through an app fallback;
- increased contrast or forced-color compatibility;
- print styles that do not rely on background graphics.

## 7. Typography Reference

### 7.1 Rules

- Use one primary UI family.
- Keep type on a fixed `rem` scale.
- Use tabular numerals for money, measurements, dates, times, and counts.
- Use weight, size, and spacing before color for hierarchy.
- Keep compact controls and panels typographically restrained.
- Reserve display-scale type for genuine identity moments.
- Self-host through `next/font` to avoid external requests and layout shift.
- Use open-source or properly bundled free fonts for v1.
- Do not infer the UI font from the serif logo artwork.

### 7.2 Evaluation set

Only install the selected family. Prototype these candidates against the current system stack first:

| Candidate | Official source | License | Why evaluate | Watch for |
| --- | --- | --- | --- | --- |
| IBM Plex Sans Variable | [IBM/plex](https://github.com/IBM/plex) | SIL OFL 1.1 | Designed for UI, strong technical/industrial character, broad family | Ensure it does not feel overly institutional; measure compact-table width |
| Source Sans 3 Variable | [adobe-fonts/source-sans](https://github.com/adobe-fonts/source-sans) | SIL OFL 1.1 | Purpose-built UI family, clear small sizes, neutral tone | May need stronger brand expression from layout and materials |
| Geist Sans | [vercel/geist-font](https://github.com/vercel/geist-font) | SIL OFL 1.1 | Contemporary geometry, variable delivery, clear Next.js integration path | Validate body and numeric performance; avoid choosing it for trend alone |
| System UI stack | Existing Aernova implementation | Platform fonts | Fastest and native on every target platform | Cross-platform metrics differ; may not create enough identity |

### 7.3 Selection fixture

Compare each candidate using the same real-content fixture:

- dashboard action center;
- jobs table with long client names and addresses;
- quote/invoice totals and line items;
- measurement values and units;
- schedule times and dates;
- form labels, help, validation, and buttons;
- mobile `/today` and crew actions;
- dark and light themes;
- normal and 200% zoom.

Evaluate numeric legibility, compact width, small-size rendering, heading/body distinction, mobile readability, loading behavior, and tone. Record the selected files, version, license, axes, subsets, weights, and `next/font` configuration in this section when approved.

## 8. Layout, Shape, and Material

### 8.1 Spacing and dimensions

- Base spacing unit: 4px.
- Dense desktop control: 32px only when context supports precise pointing and an accessible alternative.
- Standard control: 40px.
- Mobile/field target: at least 44px.
- Compact radius: 4px.
- Standard radius: 6px.
- Large framed-tool radius: 8px maximum unless Astryx requires otherwise.
- Pills are reserved for statuses, tags, segmented modes, or circular controls.
- Fixed-format elements need stable dimensions or aspect ratios.

### 8.2 Containment

Prefer:

- full-width page bands;
- unframed sections;
- structured rows;
- tables and lists;
- split panes;
- toolbars;
- stable inspectors;
- cards only for repeated independent objects, modals, or genuinely framed tools.

Do not put cards inside cards or make every page section float.

### 8.3 Elevation and translucency

- Borders separate; they do not outline everything.
- Shadows belong to overlays and genuinely elevated surfaces.
- Translucency belongs to navigation, toolbars, or sheets when content moves behind them.
- Do not stack translucent layers.
- Provide solid fallbacks for reduced transparency and increased contrast.
- Avoid large animated blur regions.

## 9. Information Architecture

### 9.1 Stable navigation

| Group | Areas |
| --- | --- |
| Work | Dashboard, Jobs, Today, Schedule |
| Pipeline | Pipeline and stage-oriented sales work |
| Relationships | Requests, Clients |
| Business | Invoices/Financials, Reports |
| Company | Team, Settings, integrations, administration |

Labels may be refined through testing, but the distinction between stable destinations and creation actions is approved.

### 9.2 Global creation

Use a persistent `+ Create` action. Permission and context determine the available commands:

- New client
- New request
- New job
- New quote
- New invoice
- other approved domain creation actions

Creation remains available locally where users naturally begin the task. The global command is an accelerator, not the only path.

### 9.3 Shell behavior

- Use Astryx `AppShell`, `SideNav`, `MobileNav`, `TopNav`, and `NavItem` where their contracts fit.
- Support a persistent desktop side navigation and an intentional mobile model.
- Collapsed desktop navigation uses recognizable icons with tooltips.
- Company/workspace context remains visible and permission-safe.
- Top chrome contains page identity, relevant actions, search/command entry, and notifications.
- Do not put descriptive feature marketing copy into operational chrome.

## 10. Component and Icon Ownership

### 10.1 Astryx first

Use Astryx for standard UI primitives before creating or retaining custom equivalents:

- application shell and navigation;
- buttons and icon buttons;
- form inputs and validation;
- tabs and segmented controls;
- dialogs, alert dialogs, menus, popovers, tooltips, and mobile navigation;
- tables, lists, metadata, pagination, skeletons, progress, toasts, and empty states;
- command palette and toolbars where product behavior justifies them.

Compose before swizzling. Record every swizzle and why theme tokens or composition could not solve the requirement.

### 10.2 Domain wrappers

Aernova-owned wrappers may:

- format domain data;
- apply permissions;
- bind server actions;
- define route-specific empty or error states;
- adapt desktop tables into mobile rows;
- combine multiple Astryx primitives into a stable workflow pattern.

They should not reimplement focus management, keyboard navigation, overlays, or primitive styling already provided by Astryx.

### 10.3 Icons

Order of preference:

1. Astryx semantic icon registry for built-in component semantics.
2. [`lucide-react`](https://github.com/lucide-icons/lucide) for navigation and domain actions not covered by Astryx.
3. Approved custom SVG only for the Aernova identity or a genuinely domain-specific symbol.

Rules:

- Do not mix multiple general-purpose icon families.
- Pass external icon components through Astryx `Icon`/`IconButton` where appropriate.
- Use familiar symbols instead of rounded text buttons when the symbol is unambiguous.
- Give icon-only controls accessible names.
- Give unfamiliar icon-only controls tooltips.
- Decorative icons remain hidden from assistive technology.
- Keep icon dimensions stable across loading, hover, and selected states.

Lucide is not currently installed. Add and pin it only when the shell implementation begins and after confirming Astryx's registry does not cover the required navigation set.

## 11. Motion Architecture

### 11.1 Ownership

| Transition type | Owner |
| --- | --- |
| Hover, focus, pressed color, tiny local feedback | CSS |
| React presence, layout continuity, overlays, gestures | Motion |
| Three.js, viewer-local SVG/canvas, imperative timelines | Anime.js |
| Cross-route native View Transitions | Deferred; separate future evaluation |

Never let two systems animate the same element or property.

### 11.2 Motion for React

Official source: [motiondivision/motion](https://github.com/motiondivision/motion)
Pinned research revision: [`adaf7a4`](https://github.com/motiondivision/motion/tree/adaf7a4e5368d704ea350669f6ac674fb26ff270)
Reviewed version: `13.1.0`
License: MIT

Implementation rules:

- Import React APIs from `motion/react` or the documented client entry.
- Use a small `MotionConfig reducedMotion="user"` provider.
- Use `LazyMotion` and `m` with `domAnimation` for normal application UI.
- Load advanced gesture/layout features only on routes that require them.
- Keep animation Client Components at leaf boundaries.
- Preserve interaction during animation and allow interruption.
- Do not animate large tables or delay usable content.

Primary docs:

- [React accessibility](https://motion.dev/docs/react-accessibility)
- [`MotionConfig`](https://motion.dev/docs/react-motion-config)
- [`LazyMotion`](https://motion.dev/docs/react-lazy-motion)

### 11.3 Anime.js for the viewer

Official source: [juliangarnier/anime](https://github.com/juliangarnier/anime)
Pinned research revision: [`01b81be`](https://github.com/juliangarnier/anime/tree/01b81be1df6843ccfe0a71c0699a746bf740dd77)
Reviewed version: `4.5.0`
License: MIT

Use only for:

- roof model reveal and measurement transitions;
- camera, light, material, shader, and annotation choreography;
- isolated SVG/canvas sequences with a real imperative-timeline requirement.

Rules:

- Dynamically import from the viewer Client Component.
- Use `createScope()` and clean up with `.revert()`.
- Load `animejs/adapters/three` only for the viewer.
- Ensure one compatible Three.js instance.
- Do not animate shared materials unintentionally.
- Set material transparency correctly before opacity animation.
- Provide reduced-motion direct-state behavior.

Primary docs:

- [Using Anime.js with React](https://animejs.com/documentation/getting-started/using-with-react/)
- [Timeline](https://animejs.com/documentation/timeline/)
- [Three.js adapter](https://animejs.com/documentation/adapters/threejs-adapter/)
- [Three.js adapter gotchas](https://animejs.com/documentation/adapters/threejs-adapter/threejs-adapter-common-gotchas/)

### 11.4 Timing reference

| Timing | Provisional value | Use |
| --- | ---: | --- |
| Instant | 100ms | Press response and tiny acknowledgment |
| Fast | 160ms | Hover, focus, selection indicator |
| Standard | 220ms | Menu, popover, compact replacement |
| Deliberate | 360ms | Drawer, inspector, meaningful layout change |
| Focal maximum | 500-700ms | Rare viewer reveal only |

Use critically damped or nearly critically damped springs for controls and panels. Decorative bounce is not the default.

## 12. Upstream Repository Catalog

### 12.1 Impeccable

Repository: [pbakaus/impeccable](https://github.com/pbakaus/impeccable)
Pinned research revision: [`89368a2`](https://github.com/pbakaus/impeccable/tree/89368a24306d359507941274d046a8e186893540)
License: Apache-2.0
Runtime dependency: No

Purpose:

- replacement-world redesign process;
- direction shaping and concept seeds;
- critique and deterministic audit;
- extraction of repeated components and tokens;
- polish and hardening gates.

Setup reference:

```sh
npx impeccable install
```

Then initialize through the installed Impeccable command in the coding environment. Aernova already contains `.impeccable` artifacts; inspect and preserve reviewed shared files before reinstalling or updating.

Core references:

- [Command index and installation](https://github.com/pbakaus/impeccable/blob/89368a24306d359507941274d046a8e186893540/README.md)
- [Replacement-world workflow](https://github.com/pbakaus/impeccable/blob/89368a24306d359507941274d046a8e186893540/skill/reference/new-work.md)
- [Operational UI](https://github.com/pbakaus/impeccable/blob/89368a24306d359507941274d046a8e186893540/skill/reference/operate.md)
- [Shape](https://github.com/pbakaus/impeccable/blob/89368a24306d359507941274d046a8e186893540/skill/reference/shape.md)
- [Extract](https://github.com/pbakaus/impeccable/blob/89368a24306d359507941274d046a8e186893540/skill/reference/extract.md)
- [Animate](https://github.com/pbakaus/impeccable/blob/89368a24306d359507941274d046a8e186893540/skill/reference/animate.md)
- [Audit](https://github.com/pbakaus/impeccable/blob/89368a24306d359507941274d046a8e186893540/skill/reference/audit.md)

Recommended slice loop:

1. Shape the workflow and states.
2. Implement against approved foundations.
3. Critique desktop and mobile.
4. Audit accessibility, responsiveness, theme, and performance.
5. Extract patterns repeated three or more times.
6. Polish after structural findings are resolved.

### 12.2 Apple Design skill

Repository: [emilkowalski/skills](https://github.com/emilkowalski/skills)
Exact skill: [`skills/apple-design/SKILL.md`](https://github.com/emilkowalski/skills/blob/78761e1b57f97dce65b983d640c70a68f39e8163/skills/apple-design/SKILL.md)
Pinned research revision: `78761e1`
License: MIT
Runtime dependency: No

Apply:

- response on pointer-down;
- direct manipulation and velocity continuity;
- interruptible, critically damped springs;
- symmetric entry/exit and source-aware origins;
- functional translucency and material hierarchy;
- transform/opacity for smoothness;
- reduced motion, reduced transparency, increased contrast, and type scaling;
- purpose, agency, familiarity, flexibility, simplicity, craft, and restrained delight.

Do not copy Apple's visual chrome or product identity.

### 12.3 Astryx

Repository: [facebook/astryx](https://github.com/facebook/astryx)
Pinned research revision: [`f85aedc`](https://github.com/facebook/astryx/tree/f85aedc20770d6d4b8ac45a10e963d5899d1c537)
Reviewed/installed version: `0.3.0`
License: MIT
Runtime dependency: Already installed

Use for component primitives, themes, shell, navigation, forms, data display, overlays, states, and accessibility behavior.

References:

- [Repository and core documentation](https://github.com/facebook/astryx)
- [Component sandbox](https://facebook.github.io/astryx/sandbox/)
- installed component documentation through the Astryx CLI
- `lib/astryx/theme.ts`
- `components/astryx-theme-provider.tsx`
- generated theme files under `lib/astryx/`

Governance:

- Pin upgrades and read migration notes.
- Run Astryx doctor before and after significant adoption or upgrades.
- Generate theme outputs; do not hand-edit generated files.
- Compose before swizzling.
- Avoid canary packages on critical workflows.

### 12.4 Anime.js

See Section 11.3. Add it only for the roof-viewer phase or another explicitly approved imperative scene. It is not a general UI dependency.

### 12.5 Motion

See Section 11.2. It is the primary React motion layer and should be added during foundation work.

## 13. Local Skills and Framework Guides

Use these installed references when the task matches:

| Reference | Local source | Use |
| --- | --- | --- |
| Frontend Design | `/Users/nilay/.agents/skills/frontend-design/SKILL.md` | Distinctive production frontend design and visual quality |
| Web Design Guidelines | `.agents/skills/web-design-guidelines/SKILL.md` | UI, UX, and accessibility review |
| Vercel React Best Practices | `.agents/skills/vercel-react-best-practices/SKILL.md` | React/Next performance and component implementation |
| Vercel Composition Patterns | `.agents/skills/vercel-composition-patterns/SKILL.md` | Reusable component API design and composition |
| Vercel React View Transitions | `.agents/skills/vercel-react-view-transitions/SKILL.md` | Only for a later, separately approved View Transition evaluation |

Next.js is `16.2.4` and differs from older assumptions. Read the relevant checked-in guides in `node_modules/next/dist/docs/` before implementation. Prioritize the guides for Server/Client Components, lazy loading, CSS, fonts, and View Transitions.

## 14. Architecture and Graphify Reference

The Graphify baseline reviewed on 2026-08-12 contains:

- 447 files;
- 2,519 nodes;
- 6,107 edges;
- 188 communities;
- 98% extraction;
- no import cycles.

Important findings:

- `AppSidebar()` is imported only by the dashboard layout, so shell replacement is contained.
- `DashboardLayout()` retains company-context and permission dependencies without requiring business-logic movement.
- `JobWorkspace()` is a suitable vertical-slice boundary.
- Public document routes share infrastructure and should remain a coherent family.
- High-degree business nodes such as `requireJobAccess`, `formatMoney`, `recordActivity`, and `requireCapability` must not be casually moved into presentation code.

Useful commands:

```sh
graphify update .
graphify query "design theme component dashboard layout navigation motion"
graphify query "logo brand identity wordmark contractor document"
graphify affected "AppSidebar()" --depth 3
graphify explain "DashboardLayout()"
graphify explain "JobWorkspace()"
```

Run Graphify after shell migration and shared-component extraction. Investigate unexpected client-boundary reach, high-degree presentation nodes, or new import cycles.

## 15. Route Design Modes

### 15.1 Operate mode

Applies to dashboard, jobs, requests, pipeline, clients, schedule, today, invoices, settings, and most authenticated routes.

- Task first.
- Dense but organized.
- Restrained color and motion.
- Familiar navigation and controls.
- Lists/tables/rows over decorative cards.
- Complete keyboard and mobile behavior.

### 15.2 Document mode

Applies to public quotes, invoices, change orders, warranties, reports, and printable records.

- Contractor identity first.
- Warm, print-safe paper surface.
- Conservative typography and clear totals.
- No authenticated shell.
- Minimal Aernova chrome.
- No entry choreography.
- Stable print/PDF output.

### 15.3 Instrument mode

Applies to the roof measurement viewer.

- Full-bleed or unframed 3D stage.
- Stable tool rail and inspector.
- High-contrast geometry and measurements.
- Cyan reserved for technical truth.
- Anime.js inside the scene; Motion around the React chrome.
- Reduced-motion and WebGL-failure paths.

### 15.4 Focused entry mode

Applies to authentication and onboarding.

- Aernova identity is a first-viewport signal.
- One primary task per step.
- Clear progress and recovery.
- Autofill, password-manager, keyboard, and slow-network support.
- No marketing landing page inside the task flow.

## 16. Platform and Responsive Matrix

Priority order:

1. iPhone Safari for field and crew use.
2. Modern desktop Chrome/Edge for office and owner use.
3. iPad Safari for estimators and on-site review.
4. Android Chrome for field support.
5. macOS Safari for normal desktop support.

Target the current and previous major mainstream browser versions. Older office environments should remain functionally usable on a reasonably current browser, but obsolete engines do not define the design system.

Required layout checks:

| Width | Intended coverage |
| ---: | --- |
| ~390px | modern phone/mobile field workflow |
| ~768px | tablet portrait and large mobile behavior |
| ~1024px | tablet landscape/small desktop |
| 1440px | primary desktop composition |
| 1728/1920px | wide office display and maximum content behavior |

Give `/today`, schedule, job workspace, and crew actions additional mobile testing. Test safe areas, virtual keyboards, address bars, long content, text zoom, touch targets, and orientation changes.

## 17. Accessibility Contract

- WCAG 2.2 AA in dark and light themes.
- Visible focus for all interactive elements.
- Minimum 44 by 44 CSS pixel touch targets where practical.
- Logical keyboard order and reliable focus return.
- No color-only state communication.
- Accessible names for icon-only controls.
- Tooltips for unfamiliar icons.
- No hover-only information.
- Keyboard/touch alternatives for drag interactions.
- Reduced-motion behavior in CSS, Motion, and Anime.js.
- Reduced-transparency and increased-contrast fallbacks.
- Text and layout validation at 200% zoom.
- Live announcements for important asynchronous results.
- Print readability without required background colors.

## 18. Performance Contract

Provisional gates until production baselines are recorded:

- LCP at or below 2.5 seconds at the 75th percentile.
- INP at or below 200 milliseconds at the 75th percentile.
- CLS at or below 0.1.
- No more than 20 KB gzip shared-shell growth without reviewed justification.
- Preserve Server Components and narrow client boundaries.
- Load Motion once through the selected lazy feature set.
- Keep Anime.js and its Three adapter out of non-viewer chunks.
- Use transform and opacity as default animated properties.
- Keep dynamic content dimensions stable.
- Inspect a production build and route chunks, not development behavior alone.

## 19. New Feature Workflow

Use this sequence for every new Aernova feature.

### 19.1 Understand

1. Read `docs/PRODUCT.md`, this reference, and the relevant domain plan.
2. Use Graphify to identify route, component, permission, and shared-data dependencies.
3. Read the exact Next.js guide for any API or boundary being changed.
4. Identify the user role, job to be done, proof of success, and failure cost.

### 19.2 Shape

1. Enumerate states, permissions, data ranges, and responsive transformations.
2. Select Operate, Document, Instrument, or Focused Entry mode.
3. Find the closest Astryx primitives and templates.
4. Decide whether motion clarifies feedback, state, or continuity.
5. Confirm contractor-versus-Aernova brand ownership.

### 19.3 Design

1. Use real Aernova content, including long and missing values.
2. Design mobile and desktop structures, not just scaled versions.
3. Verify dark and light simultaneously.
4. Specify loading, empty, partial, error, success, disabled, and read-only states.
5. Define keyboard, focus, touch, and reduced-motion behavior.

### 19.4 Build

1. Preserve server and permission boundaries.
2. Use Astryx primitives and semantic tokens.
3. Add a domain wrapper only for real domain behavior or reusable composition.
4. Use CSS, Motion, or Anime.js according to the ownership table.
5. Keep feature-specific JavaScript route-scoped.

### 19.5 Verify

1. Run type checking, linting, relevant tests, and production build.
2. Test the required roles, themes, preferences, browsers, and viewports.
3. Run an Impeccable critique and audit.
4. Check accessibility and performance.
5. Capture visual evidence for representative states.
6. Refresh Graphify at architecture milestones.

### 19.6 Extract and document

1. Extract any pattern repeated three or more times when it has a stable contract.
2. Remove superseded page-local components and tokens.
3. Update this reference only for durable decisions.
4. Update the migration plan only for redesign sequencing or status.

## 20. Definition of Done for New UI

A new interface is not complete until:

- it preserves the intended workflow and permissions;
- it uses the approved route mode and visual system;
- it has all relevant interaction, data, network, permission, theme, motion, and viewport states;
- it works with keyboard and target touch devices;
- it passes dark, light, reduced-motion, and 200% zoom checks;
- it does not introduce an unnecessary component, icon family, token source, or animation owner;
- it has no incoherent overlap or text overflow at required sizes;
- it meets performance gates or records an approved exception;
- customer-facing material preserves contractor brand priority;
- its source and design decisions are documented where future work can find them.

## 21. Decision Log

| Date | Decision | Status |
| --- | --- | --- |
| 2026-08-12 | Adopt Precision Workshop at approximately 85% precision/15% material character | Approved |
| 2026-08-12 | Preserve the supplied symbol and serif wordmark | Approved |
| 2026-08-12 | Keep cyan for measurement/technical truth and retain green/amber/red semantics | Approved |
| 2026-08-12 | Author dark first and ship light as a first-class mode | Approved |
| 2026-08-12 | Reorganize navigation around stable work areas and use global `+ Create` | Approved |
| 2026-08-12 | Use open-source/free typography for v1; select through real-content comparison | Approved |
| 2026-08-12 | Use Astryx for primitives, Motion for React UI, Anime.js for isolated viewer scenes | Approved |
| 2026-08-12 | Complete the roof viewer last because it has the highest interaction and regression risk | Approved |
| 2026-08-12 | Final visual approval belongs to the Aernova owner after representative workflow review | Approved |

Future changes to an approved decision should include a date, reason, affected surfaces, and migration implication rather than silently editing the rule.
