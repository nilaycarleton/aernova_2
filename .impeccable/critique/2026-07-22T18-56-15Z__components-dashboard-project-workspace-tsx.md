---
target: the project workspace
total_score: 36
p0_count: 0
p1_count: 0
timestamp: 2026-07-22T18-56-15Z
slug: components-dashboard-project-workspace-tsx
---
⚠️ DEGRADED: single-context (harness policy forbids spawning sub-agents unless the user explicitly asks)

# Critique — Project Workspace (re-run)

Target: components/dashboard/project-workspace.tsx + app/(dashboard)/projects/[projectId]/page.tsx (plus disclosure-panel, assistant-drawer, ai-summary, roof-assistant).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Sticky tablist + URL (?tab=), status stepper, streaming assistant, summary loading/error states |
| 2 | Match System / Real World | 4 | Pure trade language; last AI-jargon label ("AI Project Summary") retired |
| 3 | User Control and Freedom | 4 | URL tabs (refresh/back/share), disclosure toggles, drawer Esc/scrim/close+focus-return, undoable deletes |
| 4 | Consistency and Standards | 4 | Full ARIA tabs, reused disclosure/dialog patterns, tokens throughout; last raw-palette leak closed |
| 5 | Error Prevention | 4 | Tabs + disclosures + drawer stay mounted; smart defaults; flow-aware initialTab; undo toast |
| 6 | Recognition Rather Than Recall | 4 | Labels + hints always shown, count pills, assistant suggestion chips |
| 7 | Flexibility and Efficiency | 3 | Arrow/Home/End tab nav + deep links + Enter-to-send; no command palette / bulk actions |
| 8 | Aesthetic and Minimalist Design | 3 | Chat + 5-panel wall gone; tabs lead. Header status card partly echoes the stepper below it |
| 9 | Error Recovery | 3 | role=alert + retry + verbatim server errors in summary/assistant; not every deep panel audited |
| 10 | Help and Documentation | 3 | Hints + assistant chips act as contextual help; no searchable docs or guided first-run |
| **Total** | | **36/40** | **Excellent (threshold) — minor polish only** |

## Anti-Patterns Verdict: PASS
- LLM: Not AI-generated. Trade-language labels ("Scan & measure", "Structures & facets", "Project overview") are the opposite of the AI reflex; hierarchy is committed, not template.
- Detector: detect.mjs returned 0 findings across all six workspace files.
- Overlays: not attempted — Clerk-gated, preview browser cannot reach localhost. Fallback: source + detector review only.

## Overall Impression
The workspace has crossed from "acceptable" (22) into the excellent band. The spine is right: header → status stepper → three plain tabs → work, with all AI folded into a recessive drawer and hands-on tools behind disclosure. The remaining four points are genuine polish, not fixes.

## What's Working
- The three-tab reduction with a full, honest WAI-ARIA keyboard model (arrows/Home/End, roving tabindex, tabpanel wiring) — accessible AND efficient.
- Sequence discipline: nothing AI outranks the roof anymore. The assistant and the project overview both live behind one recessive drawer trigger.
- Disclosure that opens itself when it has content and stays mounted when collapsed — smart defaults plus zero work-loss.

## Priority Issues
No P0/P1/P2. The path from 36 → 40 is polish:

[P3] Header status card echoes the stepper (#8)
Where: page.tsx:99-104 status card ("Status: …") sits directly above ProjectStatusStepper.
Why: Mild redundancy — the one spot keeping #8 off a 4.
Fix: Let the stepper own status; reduce the header card to the quote figure + report link.
Command: /impeccable distill

[P3] No first-run / empty guidance (#10)
Why: A brand-new project drops the roofer straight into tabs with no "start here". Contextual hints help, but there's no activation moment.
Command: /impeccable onboard

[P3] No app-wide accelerators (#7)
Why: Tab-level keyboard nav is complete; there's no cross-workspace command palette or bulk action. Appropriate for the audience — low priority.

## Persona Red Flags
- Alex (Power User): Arrow-key tab nav + deep links land; no global shortcuts, but nothing blocks him.
- Sam (A11y): Tabs announce panel relationships, focus returns from the drawer, `inert` hides closed content, contrast holds (new signal-blue-deep clears 4.5:1). Clean run.
- Marco (non-technical roofer): Header → stepper → tabs on his phone; hints visible; refresh keeps his place; AI is opt-in behind the drawer. He gets the number without ever meeting the pipeline.

## Minor Observations
- ~9 components outside the workspace still use raw bg-blue-600; signal-blue-deep now exists to sweep them.
- Header carries three items (status card, quote, report link) + stepper — the densest remaining spot.

## Questions to Consider
- Should the header status card exist at all now that the stepper is the status spine?
- Is there an "empty project" state worth designing before the tabs appear?
