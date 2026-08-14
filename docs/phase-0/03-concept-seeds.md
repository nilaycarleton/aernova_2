# Phase 0 Visual Concept Seeds

Three directions inside the approved Precision Workshop envelope (`docs/phase-0/01-redesign-brief.md`). Live at `/phase-0/concepts/{a,b,c}` (gated to OWNER). All three use the same real fixture data (`app/(prototype)/phase-0/_fixtures.ts`) and the same underlying tokens — they differ in density, containment, and navigation treatment, not in unrelated branding or color. Each concept page ends with its own in-page "where this works / where it breaks down" note; this document is the comparison and the decision.

## Concept A — "Ledger"

**Core idea:** maximum density, table-first, almost no containers. A 44px icon-only nav rail (labels via tooltip/aria-label), one toolbar, a full-width data table.

**Strengths:** the fastest possible multi-row scan; nothing competes visually with the data itself; scales cleanly to many jobs without more scrolling per row.

**Weaknesses:** icon-only nav has a real memorability cost for infrequent users (Sales, occasional Crew desktop use) even with tooltips — this is the one place the concept works against the "familiar controls" principle in `docs/AERNOVA_DESIGN_REFERENCE.md` §5.3. Doesn't shrink gracefully below 768px; the rail has to disappear entirely on mobile rather than collapse, which means the concept is really two different navigation systems stitched together, not one responsive one.

**Where it's preferred:** Estimator/Office doing a fast morning pass across many jobs. Not preferred as the *only* shell, because it under-serves first-open orientation and Sales' lower-frequency usage pattern.

## Concept B — "Workbench"

**Core idea:** a stable split pane — job list on the left, a persistent inspector on the right — with grouped, labeled navigation matching the approved IA groups (`docs/AERNOVA_DESIGN_REFERENCE.md` §9.1).

**Strengths:** directly matches the plan's own instruction for the job workspace ("a desktop split inspector where it reduces context switching," §10.3); browsing and inspecting happen without losing place, which is the actual daily task shape for Office/Estimator and Owner. Labeled nav keeps the product legible to every role, not just power users.

**Weaknesses:** the two-column layout needs a real breakpoint decision, not a reflow — below ~1024px it has to become a single pane with the inspector as a sheet, or it degrades into an uncomfortably narrow third column. Doesn't suit Crew's single-task mobile view at all, but that's expected: Crew's mobile surface should look nothing like a desktop split pane regardless of which concept wins.

**Where it's preferred:** the job workspace specifically, and any Office/Estimator task that means comparing several jobs while keeping one open.

## Concept C — "Dossier"

**Core idea:** grouped, document-like sections with generous vertical rhythm and section rules instead of boxes; top-anchored nav; paced for a slower, higher-stakes read.

**Strengths:** the calmest of the three, and the best fit for a genuine daily-digest read or a single high-stakes review (a quote about to be sent, a warranty about to go out) where document-like pacing is the point.

**Weaknesses:** too much scrolling for Office/Estimator's actual daily task of comparing many jobs; top-tab nav doesn't scale to the full approved IA group count without an overflow mechanism, and it competes for the same horizontal real estate a global `+ Create`/search command would want.

**Where it's preferred:** Owner's daily digest; single-document review moments. Not a good fit as the primary operational shell.

## Selected direction: Concept B — "Workbench," extended with A's density discipline and C's severity-dot pattern

None of the three should ship as a pure, unmodified direction — that was never the point of building three (`docs/PREMIUM_UI_REDESIGN_PLAN.md`'s Phase 0 goal is validation, not a vote between finished products). **Concept B's split-pane/stable-inspector structure is the selected foundation** because it is the direction the plan's own route-by-route guidance most directly calls for (§10.3's job workspace requirement) and because Phase 4's pilot slice is explicitly Dashboard + Jobs + Job workspace — the exact surface B is strongest at.

Two deliberate borrowings carry into the interactive prototype (Step 10):
- **A's density discipline** for the jobs table itself — B's own job *list* (in its left pane) is closer to A's compact row treatment than to C's document spacing, because list density and inspector stability are not in tension with each other.
- **The severity-dot pattern** (a small tonal dot + text, never a colored border stripe) used in both A and, after a fix during this session, B — this became the standard because the alternative (a `border-l-2` accent stripe) was flagged as a real defect by both the Impeccable design hook and `docs/DESIGN.md`'s own "One Rule Rule" (no colored left-border stripes). Recorded here because it's a concrete pattern decision, not just a comparison note — it should carry into the real Phase 3 primitive for an "action row."

**Rejected as the primary shell, not deleted:** Concept A's icon-rail density remains valuable as a *collapsed* state of the same nav (Astryx `SideNav` already supports a collapsed icon-only mode per `docs/PREMIUM_UI_REDESIGN_PLAN.md` §7.1) rather than a separate concept — Phase 2 should treat "collapsed Workbench nav" and "Ledger" as the same control, not two different navigation systems. Concept C's document pacing remains the correct model for public documents (already its own approved "Document mode," §15.2 of the design reference) and is a candidate for a future Owner daily-digest view, but not for the operational shell.
