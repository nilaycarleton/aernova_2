@AGENTS.md

# Design Context

Before changing any user-facing UI, read `docs/PRODUCT.md` (strategy: who this is for and why) and `docs/DESIGN.md` (visual system: colors, type, components).

Aernova is a **product** surface on **web**, built for **non-technical small construction and trades business owners** — multi-trade (roofing, plumbing, lawn care, general contracting, and more), with roofing as one specialized module (drone capture, photogrammetric measurement), not the whole product. Trade-specific vocabulary belongs only inside that trade's own module, never in the shared core. Personality is **calm, clear, effortless**. Accessibility target is **WCAG 2.2 AA**.

# Documentation Organization

Roadmap documentation is grouped by initiative, each in its own folder alongside its main plan: Premium UI Redesign plan and phase records live under `docs/PREMIUM_UI_REDESIGN_PLAN/` (complete as of Phase 8 — there is no Phase 9; treat this roadmap as closed, not a place to add new phases); Aernova Project Workflow plan and phase records live under `docs/AERNOVA_PROJECT_WORKFLOW/`. Durable cross-cutting docs (`PRODUCT.md`, `DESIGN.md`, `AERNOVA_DESIGN_REFERENCE.md`, `PLAN-CRM.md`, `DEPLOYMENT.md`) stay at `docs/` root. Create new phase plan/implementation files beside their roadmap's main document, not in `docs/` root — never introduce a new numbered-phase roadmap without giving it the same folder treatment once it grows past a couple of files. Premium UI phases and Workflow phases are separate numbering systems; when either could be ambiguous, name the roadmap explicitly (e.g. "Workflow Phase 13", not just "Phase 13").
