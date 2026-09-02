---
target: the project workspace
total_score: 39
p0_count: 0
p1_count: 0
timestamp: 2026-07-23T03-17-11Z
slug: components-dashboard-project-workspace-tsx
---
⚠️ DEGRADED: single-context (harness policy forbids spawning sub-agents unless the user explicitly asks)

# Critique — Project Workspace (re-run after polish tasks 1–4)

Target: components/dashboard/project-workspace.tsx + app/(dashboard)/projects/[projectId]/page.tsx (plus disclosure-panel, assistant-drawer, ai-summary, proposal-generator-card, the create forms, and the deletable lists).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | URL-backed tabs, status stepper, streaming assistant, summary + form loading/error states |
| 2 | Match System / Real World | 4 | Pure trade language throughout; no pipeline jargon |
| 3 | User Control and Freedom | 4 | URL tabs, disclosure, drawer Esc/scrim/focus-return, undoable single + bulk deletes |
| 4 | Consistency and Standards | 4 | Full ARIA tabs, reused disclosure/dialog/bulk patterns, workspace tokens throughout |
| 5 | Error Prevention | 4 | Everything stays mounted; smart defaults; Quote CTA gated on real measurements |
| 6 | Recognition Rather Than Recall | 4 | Labels + hints always shown, count pills, assistant suggestions |
| 7 | Flexibility and Efficiency | 4 | Arrow/Home/End tabs + deep links + Enter-to-send + multi-select bulk delete |
| 8 | Aesthetic and Minimalist Design | 4 | Header no longer echoes the stepper; quote is a legible figure; tabs lead |
| 9 | Error Recovery | 3 | Create/summary/assistant/delete all recover + preserve work — but inline edit-in-place actions still throw |
| 10 | Help and Documentation | 4 | Guided Scan steps, Quote "measure first" prerequisite, contextual hints everywhere |
| **Total** | | **39/40** | **Excellent — one edit-path hole from full marks** |

## Anti-Patterns Verdict: PASS
- LLM: Not AI-generated. Trade-language labels, committed hierarchy, purpose-built empty states — the opposite of the AI reflex.
- Detector: detect.mjs returned 0 findings across all eleven workspace files.
- Overlays: not attempted — Clerk-gated; preview browser cannot reach localhost. Fallback: source + detector review.

## Overall Impression
The workspace is in the excellent band and reads as one system. The spine is right (header → status → three tabs → work), AI is recessive behind a drawer, hands-on tools sit behind disclosure, and destructive actions are uniformly undoable — now in bulk. The single remaining point is a real one: the inline edit forms (edit a facet / edit a measurement) still throw on a failed save, unmounting the form into the error boundary and taking the roofer's edits with it — the one path that doesn't yet meet the standard the create forms set.

## What's Working
- Uniform, recoverable destructive actions: single and bulk delete share one "Deleted — Undo" toast; a mis-tap on a 5-item select is as safe as deleting one.
- Sequence discipline: nothing AI outranks the roof; the Quote tab refuses to offer a hollow quote before measurements exist and points to Scan instead.
- The create forms preserve typed input on both validation and save failure — the pattern the edit forms should now inherit.

## Priority Issues

[P2] Inline edit actions still throw (#9)
Where: updateRoofSectionAction / updateMeasurementAction, invoked from the edit-in-place forms via plain `action={}` (deletable-section-list, measurement edit list).
Why: A failed save (bad number, DB, network) throws into the error boundary and wipes the roofer's edits — the exact failure the create forms were hardened against in the last pass. Inconsistent recovery contract.
Fix: Convert the edit forms to the useActionState + FormError pattern already built, returning fieldErrors/formError instead of throwing.
Command: /impeccable harden

[P3] Non-workspace token debt (#4)
Where: ~8 components outside this surface (new-project-form, projects-browser, imagery-upload-form, inspection-workflow, comparison-create-form, photo-annotation-studio, measurement-manager, dashboard/page) still use raw bg-blue-600.
Why: Doesn't affect this surface's score, but it's the same leak the workspace just closed; signal-blue-deep exists to sweep it.
Command: /impeccable polish

## Persona Red Flags
- Alex (Power User): Arrow-key tabs, deep links, and now multi-select bulk delete all land. No blockers.
- Sam (A11y): Tabs announce panels, focus returns from the drawer, bulk checkboxes are labeled and theme-tinted, contrast holds. The one risk: a thrown edit action drops them onto an error page mid-task.
- Marco (non-technical roofer): Lands on Scan with a guided first step; Quote sends him back to measure first; deleting three stray measurements is one action with an undo. He never meets the pipeline.

## Minor Observations
- deletable-section-list's "Save Facet" edit button is itself one of the raw bg-blue-600 leaks — fixing #9's edit path is a chance to tokenize it too.
- Bulk bar stays invisible until a row is checked — correct "accelerator invisible to novices" behavior.

## Questions to Consider
- Should edit-in-place inherit the create forms' recovery contract wholesale, so there's one save-failure story across the workspace?
- Is there any destructive action left that isn't undoable?
