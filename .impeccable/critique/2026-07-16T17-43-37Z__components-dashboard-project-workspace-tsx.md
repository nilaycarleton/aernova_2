---
target: the project workspace
total_score: 22
p0_count: 0
p1_count: 3
timestamp: 2026-07-16T17-43-37Z
slug: components-dashboard-project-workspace-tsx
---
⚠️ DEGRADED: single-context (harness policy forbids spawning sub-agents unless the user explicitly asks)

# Critique — Project Workspace

Target: components/dashboard/project-workspace.tsx + app/(dashboard)/projects/[projectId]/page.tsx

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Sticky tablist shows location; no URL reflection |
| 2 | Match System / Real World | 4 | Plain trade labels, zero pipeline jargon |
| 3 | User Control and Freedom | 1 | Tab state dies on refresh; no back/undo; not linkable |
| 4 | Consistency and Standards | 2 | ARIA tabs half-implemented; one raw text-slate-800 |
| 5 | Error Prevention | 3 | Tabs stay mounted; switching never loses work |
| 6 | Recognition Rather Than Recall | 3 | Hints clear but hidden on mobile |
| 7 | Flexibility and Efficiency | 1 | No arrow-key nav, no shortcuts, no deep links |
| 8 | Aesthetic and Minimalist Design | 1 | 520px AI chat between user and work |
| 9 | Error Recovery | 2 | Inherited from panels only |
| 10 | Help and Documentation | 2 | Hints help; no contextual help |
| Total | | 22/40 | Acceptable — significant improvements needed |

## Anti-Patterns Verdict: PASS
LLM: Not AI-generated. Tab labels ("Scan & measure") are trade language, the opposite of the AI reflex.
Detector: detect.mjs returned 0 findings on both files.
Overlays: not attempted — no Clerk credentials, preview browser cannot reach localhost.

## Overall Impression
The tab structure is the best design decision in the codebase: ten panels reduced to three plain choices — "absorb the complexity" executed properly. The page then undoes it by stacking a header, stepper, AI summary and a 520px AI chat above the tabs.

## What's Working
- Three-tab reduction with plain-language labels.
- Tabs stay mounted deliberately so the 3D model survives switches; doubles as error prevention.
- initialTab is flow-aware (lands on Quote after proposal generation).

## Priority Issues

[P1] A 520px AI chat sits between the contractor and the roof
Where: page.tsx:113-117 (ProjectStatusStepper -> AiSummary -> RoofAssistant h-[520px]) all above ProjectWorkspace.
Why: Tabs are primary nav pushed below ~1000px of preamble; below the fold on laptop, far below on phone. "Calm is a function of sequence" — the sequence puts AI ahead of the job.
Fix: Move RoofAssistant/AiSummary into a tab or behind disclosure. Tabs first under the header.
Command: /impeccable layout

[P1] Tab state is invisible to the URL — refresh loses your place
Where: project-workspace.tsx:31 useState; no useRouter/useSearchParams.
Why: page.tsx:33-38 already READS ?tab= but the component never writes back. Refresh resets to scan; back doesn't undo; cannot share a tab link.
Fix: router.replace(`?tab=${key}`, {scroll:false}) on switch. Read side already built.
Command: /impeccable harden

[P1] ARIA tabs are half-built
Where: project-workspace.tsx:35-58. Has role=tablist/tab, aria-selected. Missing role=tabpanel, aria-controls, aria-labelledby, roving tabIndex, onKeyDown.
Why: Announces "tab" then provides no panel relationship; no arrow-key nav the pattern promises. Half a pattern is a broken pattern.
Fix: Add id/aria-controls/tabpanel pairs + arrow keys, or drop tab roles for honest buttons.
Command: /impeccable harden

[P2] The "Scan & measure" tab is a wall of five panels
Where: page.tsx:130-147 (PhaseSixWorkflow, RoofExtractionPanel, RoofSectionManager, MeasurementManager, ProjectIntelligence).
Why: Past the <=4 working-memory limit. The wall moved behind a tab rather than disappearing. quote has 4; inspect has 1.
Fix: Progressive disclosure for the four reference panels; open on the guided step.
Command: /impeccable distill

[P3] Tab hints vanish on mobile
Where: project-workspace.tsx:56 `hidden text-xs sm:block`. Hints disappear exactly where labels matter most.
Command: /impeccable clarify

## Persona Red Flags
Alex (Power User): No arrow-key tab movement; no deep links; scrolls past a 520px chat every visit.
Sam (A11y): Hears "tab ... selected" but no aria-controls target; arrow keys dead. Degrades to usable buttons (real <button>, native focus, panels correctly hidden) but the ARIA contract is broken.
Marco (non-technical roofer, project-derived): Phone in a driveway; scrolls past stepper + summary + chat to reach "Scan & measure"; hints invisible at that width; refresh after interruption dumps him back on Scan. He never asked the AI anything — he wanted the number.

## Minor Observations
- text-slate-800 at line 53 is the last raw palette utility here (7.98:1, passes, but inconsistent with tokens).
- Tab targets py-2.5 (~42px) mobile / sm:py-3 (~46px) desktop — under 44px exactly where it matters most. Inverted.
- initialTab defaults to scan, not inspect. Likely deliberate.

## Questions to Consider
- Does the AI assistant deserve to outrank the roof?
- If the tabs are the page's spine, why aren't they the first thing you see?
- What would the confident version look like? Header, tabs, work.
