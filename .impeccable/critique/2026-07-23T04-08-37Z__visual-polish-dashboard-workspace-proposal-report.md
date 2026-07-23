---
target: Aernova app-wide visual polish (dashboard, workspace, proposal, report)
total_score: 35
p0_count: 0
p1_count: 2
timestamp: 2026-07-23T04-08-37Z
slug: visual-polish-dashboard-workspace-proposal-report
---
Method: single-context (degraded — no explicit sub-agent request this turn)

## Design Health Score
| # | Heuristic | Score |
|---|-----------|-------|
| 1 | Visibility of System Status | 4 |
| 2 | Match System / Real World | 4 |
| 3 | User Control and Freedom | 4 |
| 4 | Consistency and Standards | 3 |
| 5 | Error Prevention | 4 |
| 6 | Recognition Rather Than Recall | 3 |
| 7 | Flexibility and Efficiency | 4 |
| 8 | Aesthetic and Minimalist Design | 2 |
| 9 | Error Recovery | 3 |
| 10 | Help and Documentation | 4 |
| Total | | 35/40 |

## Priority Issues
[P1] Accent color split between Instrument Cyan and generic blue on primary buttons — dilutes the "one hero color" doctrine.
[P1] Every kind of data (pricing defaults, pipeline counts, roof measurements) renders as the same identical card grid.
[P2] Two-layer tonal system (5%/10% white) too subtle to read as separation without a shadow.
[P2] Every panel repeats the same eyebrow -> headline -> description shape with no variation by importance.
[P3] 3D roof viewer (signature surface) renders as a near-empty canvas in several screenshots — needs verification, may be a sparse test project rather than a design issue.

## Persona Red Flags
Jordan (first-timer): flat, template-like UI undercuts trust in a $12k+ number, even though usability is fine.
Sam (comparing to existing tools): repeated card grids + dual-blue buttons read as unfinished.

## Minor Observations
- Pricing Template panel: 11 identical cards, densest instance of the card-grid issue.
- Dashboard PROPOSAL VALUE styled identically to TOTAL PROJECTS despite being the most important number on the page.
- Report page "Print / Save as PDF" button is a third distinct button color beyond the cyan/blue split.
