---
target: Phase 7 roof viewer (measure-viewer.tsx + hub-model-viewer.tsx)
total_score: 29
p0_count: 1
p1_count: 3
timestamp: 2026-08-16T21-49-54Z
slug: components-dashboard-measure-viewer-tsx
---
Method: dual-agent (A: general-purpose design-review sub-agent · B: `detect.mjs` deterministic scan, inline — live browser overlay skipped because this session already gathered extensive live-browser evidence of the same surface earlier in Phase 7's own verification pass; noted as a scope reduction, not a silent degrade)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Fullscreen chrome hides with no status cue it can be recalled |
| 2 | Match System / Real World | 4 | n/a |
| 3 | User Control and Freedom | 3 | "Clear all" has no confirmation |
| 4 | Consistency and Standards | 2 | Ad hoc yellow/violet/rose hues beside the token system |
| 5 | Error Prevention | 3 | No confirm gate on bulk destructive clear |
| 6 | Recognition Rather Than Recall | 4 | n/a |
| 7 | Flexibility and Efficiency | 3 | No keyboard path to un-hide fullscreen chrome |
| 8 | Aesthetic and Minimalist Design | 2 | 11 simultaneous toolbar controls before disclosure |
| 9 | Error Recovery | 3 | Load error message is generic |
| 10 | Help and Documentation | 2 | Tooltips on only a few buttons |
| **Total** | | **29/40** | **Good — address weak areas, solid foundation** |

## Anti-Patterns Verdict

Not AI-generated/generic. Real, hand-earned engineering: a documented remount/leak postmortem, a StrictMode double-invoke guard with an explained failure mode, per-pointer-type tap/drag disambiguation, and an OrbitControls-damping interaction worked out at the internals level. The one generic-feeling seam: ad hoc per-tool Tailwind hues instead of routing through the reserved palette.

Deterministic scan (`detect.mjs` on both viewer files): 0 findings — expected, the detector's ruleset targets rendered HTML/CSS anti-patterns (gradient text, side-stripes, etc.) and found none in this source.

## Overall Impression

A genuinely well-engineered instrument with real field-use care (touch thresholds, reduced motion, interruptible camera moves). The gap is that the surface's own confirmed numbers — the entire reason the viewer exists — don't yet wear the color DESIGN.md reserves for exactly that.

## What's Working

1. The `isSplit` remount fix: composing Astryx `Layout`/`Dialog` directly instead of `SplitInspector` keeps the canvas host in one stable DOM position, closing a real WebGLRenderer/RAF leak.
2. Progressive disclosure matches the actual persona — Auto-detect + Edit points lead, hand tools wait behind "More tools."
3. Touch/field-use care: separate tap-vs-drag thresholds, 44px vs 14px handle-grab radius by pointer type, camera-flight cancel-on-touch.

## Priority Issues

**[P0] Confirmed measurement values never render in Instrument Cyan** — `LABEL_CLASS` and the inspector list's value span both rendered readouts in plain ink. DESIGN.md: "confirmed values in Instrument Cyan." **Fix:** applied — both now use `text-instrument-fg tabular-nums`. **Status: FIXED this phase.**

**[P1] Toolbar hardcodes non-token colors (yellow/violet/rose) beside the one reserved amber.** Pre-existing from before Phase 7, not introduced by it. **Status: DEFERRED** — redesigning tool-identity colors is a real design decision (what replaces yellow/violet) beyond a bounded accessibility/token fix, and risks scope creep this late in the phase. Documented for a future pass.

**[P1] Fullscreen chrome had no keyboard escape hatch; hidden controls stayed in tab order while invisible.** **Fix:** applied — `focusin` now reveals chrome alongside `mousemove`, `onFocus`/`onBlur` mirror the hover pair, and `inert` removes the hidden chrome from tab order/AT traversal entirely. **Status: FIXED this phase.**

**[P1] Unit toggle (ft/m) had no `aria-pressed`, inconsistent with every other toggle in the file.** **Fix:** applied — `aria-pressed={units === u}` added. **Status: FIXED this phase.**

**[P2] "Clear all" has no destructive-action confirmation.** Undo exists but isn't surfaced at the point of the action. **Status: DEFERRED** — P2, real but not blocking; a future pass should wrap it in Astryx `AlertDialog` or pair it with an explicit-Undo toast.

## Persona Red Flags

**Jordan (first-timer, non-technical trades owner — primary persona):** Sees 11 simultaneous controls before touching anything, with no single button using the system's actual primary-action treatment despite the flow being "start with Auto-detect." Auto-detect results previously rendered in the same plain ink as any other text — no visual signal that "the machine is confident in this number" (now fixed to Instrument Cyan). Risk of an accidental "Clear all" tap remains (P2, deferred).

**Sam (accessibility/keyboard user):** Entering fullscreen and driving by keyboard previously left the toolbar hiding itself after 2.5s of keyboard-only activity with no way to bring it back, and the ft/m toggle announced as two undifferentiated buttons. Both now fixed this phase.

## Minor Observations

1. `window.prompt("Marker label", "Note")` is a raw browser dialog, jarring against the composed surface — left as-is (pre-existing, low-risk, out of Phase 7's viewer-composition scope).
2. The roof-line-type `<select>` is a bare native element where Astryx `Selector` is the house pattern — pre-existing, deferred.
3. Iconography mixes emoji, unicode glyphs, and text labels with no single icon language — pre-existing, deferred (Phase 7 did not introduce new icon usage in the tool rail beyond what already existed).
