---
target: job/project workspace page
total_score: 35
p0_count: 1
p1_count: 1
timestamp: 2026-08-06T00-21-23Z
slug: app-dashboard-jobs-jobid-page-tsx
---
Method: dual-agent (A: design-review sub-agent · B: detector/browser-evidence sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Status stepper, processing poller, pending states, aria-live booking feedback all present |
| 2 | Match System / Real World | 3 | AI capture drawer names the model by vendor ("Claude drafts a job name…") — a technical detail a roofer wouldn't say |
| 3 | User Control and Freedom | 4 | Drawer Esc/scrim/focus-return, disclosure, capture-sheet "Start over," deletable costs all intact |
| 4 | Consistency and Standards | 2 | Native unstyled file input (Inspect) vs. custom dropzone (Scan); Title-Case buttons on Inspect vs. sentence-case elsewhere; light-mode contrast failure in the measure-viewer toolbar breaks the Dark-Instrument Rule |
| 5 | Error Prevention | 4 | Confirm-before-delete, smart defaults, constrained selects, capture-sheet review-before-save all hold |
| 6 | Recognition Rather Than Recall | 4 | Labels/hints/suggested-prompts still lead everywhere |
| 7 | Flexibility and Efficiency | 4 | AI capture is a genuine new fast-path; deep-linked tabs still work |
| 8 | Aesthetic and Minimalist Design | 2 | QuoteGeneratorCard's prose block duplicates clean tiles above it in dense unstructured text |
| 9 | Error Recovery | 4 | Improved from baseline's 3 — the inline edit-in-place fix from the last critique is verified live |
| 10 | Help and Documentation | 4 | Guided 3-step Scan flow, contextual hints, assistant suggestions unchanged |
| **Total** | | **35/40** | **Good — down from 39 (Excellent); the drop concentrates in surfaces added since the last critique** |

## Anti-Patterns Verdict

**LLM assessment (Assessment A, product register):** Largely passes the "earned familiarity" bar — trade language, restrained color, flat elevation, no gratuitous motion. Two real seams: the Inspect tab's bare native `<input type="file">` sitting one tab over from the Scan tab's polished custom dropzone doing the identical job, and the Quote tab's dense, colon-separated report-prose block that reads like unedited machine output pasted into an otherwise hand-built page.

**Deterministic scan (Assessment B):** `detect.mjs --json` against all 10 target files returned **zero findings, exit 0** — verified not a no-op by running the same detector against a synthetic file with obvious anti-patterns (correctly caught 2 findings there). The static scanner's rule set is narrow (color-drift-focused for `.tsx`), so a clean static result means "no static-source-detectable issues in this rule set," not "no anti-patterns of any kind."

**Visual overlays (browser injection succeeded):** The in-page detector found 69 anti-pattern hits on the default tab view alone: 31 `low-contrast`, 22 `nested-cards`, 6 `line-length`, 6 `repeated-section-kickers`, 4 `clipped-overflow-container`. **The 31 low-contrast hits are flagged as a likely false positive** — all report white-on-white or white-on-near-white, but the screenshot evidence shows clearly legible light text on the dark navy ground; the checker most likely resolves an element's own (transparent/unset) background rather than the painted ancestor, a common failure mode with CSS custom-property/oklch tokens. Not verified pixel-by-pixel, flagged for awareness rather than counted as a scored finding. The `nested-cards` and `repeated-section-kickers` counts are plausible and worth a follow-up pass. The overlay was only injected once (default tab); Inspect/Quote/Costs/Assistant were not separately re-scanned.

## Overall Impression

The surface is still fundamentally sound — the Readout Rule, the Two-Layer elevation doctrine, and the plain-language voice hold up under live inspection in both themes, and a real prior bug (inline-edit throwing on save failure) is confirmed fixed. But the score genuinely dropped, and not from noise: a P0 accessibility failure was introduced in the measure-viewer toolbar (invisible controls in light mode, on the exact screen where a roofer measures the roof they're about to bid on), and the newest tab (Quote) buries its own clean data under a wall of unedited report prose — the one place on this surface that now contradicts DESIGN.md's central premise that "the numbers are the content."

## What's Working

1. **The Readout Rule holds under live inspection, in both themes** — the $10,494.25 quote figure and pitch-distribution bars are cyan and only cyan, verified across a full theme toggle.
2. **VisitPanel and the review-request panel are exemplary plain-language design** — "Book it in," "Called off," "The job's done — worth asking," with correct absent-not-disabled treatment for capabilities that don't exist yet.
3. **Error recovery genuinely improved** — the inline-edit throw bug flagged in the 39/40 critique is fixed and now matches the create-forms' recoverable pattern.

## Priority Issues

**[P0] Light-mode contrast failure breaks the primary measuring tool**
Where: `components/dashboard/measure-viewer.tsx:961-963` ("Auto-detect roof") and `:970-972` ("Edit points").
Why it matters: screenshot-confirmed live — "Edit points" renders as pale-lavender text on pale-lavender background, functionally invisible in light theme; this is the exact failure DESIGN.md's Dark-Instrument Rule names by title. Root cause: the non-fullscreen toolbar wrapper doesn't carry its own `bg-ground` and its buttons use raw, un-themed Tailwind classes instead of app tokens. Fails PRODUCT.md's stated WCAG 2.2 AA baseline on the tool a roofer uses to measure the roof they're bidding on.
Fix: give the non-fullscreen toolbar an explicit dark background (or extend `.surface-dark` to wrap it), independent of ambient theme.
Suggested command: `/impeccable harden`

**[P1] Quote tab buries and duplicates structured data in unedited report prose**
Where: `components/dashboard/quote-generator-card.tsx:133-158`, sourced from `lib/report-generator.ts:200-246`.
Why it matters: waste %, squares, complexity, and labor factor appear twice — once as clean tiles, again inside six dense paragraphs. Directly contradicts "the numbers are the content, and everything around them is there to keep them readable."
Fix: restructure into the same tile/label-value pattern used above it, or move behind a `DisclosurePanel` since it's reference material, not primary content.
Suggested command: `/impeccable clarify`

**[P2] Money-formatting bug in the same report block**
Where: `lib/report-generator.ts:232-235` — raw `toLocaleString()` with no fraction-digit options drops trailing zeros; confirmed live as "Tax (13%): $1,207.3" instead of "$1,207.30," inconsistent with every other dollar figure on the same page.
Fix: route through `lib/money.ts`'s `formatMoney`, same as everywhere else on this page.
Suggested command: `/impeccable harden`

**[P2] Inspect tab's upload control and button voice diverge from the rest of the surface**
Where: `components/dashboard/inspection-workflow.tsx` — bare native `<input type="file">` vs. Scan tab's custom dropzone for the identical action; Title Case buttons ("Upload Photo," "Add Issue," "Save Photo Details") vs. sentence case everywhere else in the app.
Fix: rebuild the Inspect photo upload on the same custom-dropzone pattern as `ImageryUploadForm`; lowercase the three button labels.
Suggested command: `/impeccable polish`

**[P3] "Claude" named in AI capture copy**
Where: `components/dashboard/capture-sheet.tsx:67, 147` — "Claude drafts a job name…" / "What Claude saw."
Why it matters: PRODUCT.md's anti-reference is explicit that pipeline/vendor machinery shouldn't surface to the contractor; this is the first jargon-adjacent leak found on this surface, and matches the UI code-review agent's independent finding of the same issue.
Fix: replace "Claude" with product-voice language ("We drafted…", "What we saw…").
Suggested command: `/impeccable clarify`

## Persona Red Flags

**Sam (Accessibility-dependent user):** the sharpest finding of this review. In light theme, "Edit points" fails contrast so completely the label isn't perceivable at all — not an annoyance, an invisible control, on the one screen where the core task (measure the roof) happens.

**Alex (Power User):** would stumble at the raw native file input on Inspect — an unfinished-feeling corner in an otherwise polished tool that erodes trust by association. The AI capture flow is a genuine efficiency win, but the "Claude" copy is a small tell that this corner is less considered than the rest.

**Marco (non-technical roofer, project-specific):** the Quote tab's "Ridges + hips: 0 ft. Valleys: 0 ft…" prose wall is a register break from the "Book it in" / "Called off" voice everywhere else — the one moment the product sounds like a machine again. The Costs tab's "$0.00 Quoted cost" beside a job quoted at over $10k could plausibly read as the app being broken rather than a cost-vs-price distinction he was never taught.

## Minor Observations

- Three near-identical `Delete` trigger implementations (`deletable-item.tsx`, `deletable-measurement-list.tsx`, `deletable-section-list.tsx`) with slightly different styling — should be one shared component.
- Scan tab's "Material Estimate" panel heading reads "Complex roof complexity" — likely a `${complexityLabel} roof complexity` template producing redundant phrasing.
- The 3D model canvas for this job renders mostly empty/black with small disconnected fragments rather than a continuous surface — flagged for awareness (may be a data/reconstruction issue, not a UI defect), not scored.
- Detector overlay count discrepancy: console group header said "63 anti-patterns found" but 69 discrete log lines were present — worth a look at `detect.js`'s own counting logic.

## Questions to Consider

- Now that Costs exists as its own tab, should "Quoted cost" explain the cost-vs-price distinction inline, or get the same honest-empty "None yet" treatment the Quote tile already uses instead of a bare $0.00 that reads like an error?
- Was the report-narrative block in QuoteGeneratorCard meant to be read on this live tab at all, or is it print-report content that leaked into the workspace and belongs behind disclosure?
- Should the 3D-viewer toolbar get a standing light-mode screenshot check before any future `measure-viewer.tsx` work ships, given DESIGN.md's explicit "light theme is not a fallback" framing?
