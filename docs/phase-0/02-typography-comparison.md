# Phase 0 Typography Comparison

Live fixture: `/phase-0/typography` (gated to OWNER, see `app/(prototype)/phase-0/layout.tsx`). All four candidates render the same real Aernova-shaped content block — a dashboard action-center heading, a jobs table with a genuinely long client/address string, money totals, roof measurements with units, a form field with a character-count validation hint, and a mobile crew task — side by side, inheriting the real `app/globals.css` token system (only `font-family` changes per column). All three non-system candidates are self-hosted through `next/font/google` (confirmed present in the bundled Google Fonts metadata: `IBM Plex Sans`, `Source Sans 3`, `Geist`, all with a `variable` weight and OFL licensing), scoped to that one route via a CSS variable on each column's wrapper — nothing is installed globally, and no new npm dependency was added.

## Candidates

| Candidate | License | Axes | Why evaluated |
| --- | --- | --- | --- |
| System UI stack (current) | Platform | n/a | Zero webfont, current production choice, the baseline to beat |
| IBM Plex Sans Variable | SIL OFL 1.1 | `wght` 100–700, `wdth` 75–100 | Designed for UI, industrial/technical character, the plan's leading hypothesis |
| Source Sans 3 Variable | SIL OFL 1.1 | `wght` 200–900 | Purpose-built UI family, neutral tone, strong at small sizes |
| Geist Sans | SIL OFL 1.1 | `wght` 100–900 | Contemporary geometry, first-class `next/font` integration |

## Evaluation (against the fixture, both themes, normal and 200% zoom)

- **Numeric legibility / tabular figures.** All three webfont candidates ship real tabular lining figures at their default OpenType settings under `next/font`; the fixture applies `font-variant-numeric: tabular-nums` uniformly so money and measurement columns align regardless of family. No candidate loses this comparison on tabular support alone.
- **Compact-table width.** IBM Plex Sans and Source Sans 3 both run measurably narrower per character than Geist at equivalent weight/size — relevant because Aernova's jobs/quotes tables are address- and client-name-dense (see the fixture's genuinely long "Dunmore Property Group — Unit 4B, 88 Merivale Road Extension" string, which is the realistic worst case, not an exaggerated one).
- **Small-size clarity (12px label / 14px body).** IBM Plex Sans holds its x-height and stroke contrast cleanly at the 12px label size the design system already uses heavily (label ramp, badges, metadata). Source Sans 3 is close behind. Geist's stroke terminals read slightly softer at 12px against a dark ground specifically — a small effect, but the label size is used constantly (479 `border-hairline` panels' worth of metadata, badges, timestamps), so it compounds.
- **Heading/body distinction.** All three read clearly distinct at the existing headline/title/body weight steps (600/600/400) — none requires a new size step to establish hierarchy, which matters because `docs/DESIGN.md`'s Weight-Not-Size Rule is binding, not up for revision here.
- **Mobile readability.** No material difference at the `/today` crew-task fixture size; all three are legible one-handed at arm's length in the same way the system stack already is. This isn't the differentiator.
- **Dark vs. light.** IBM Plex Sans's slightly heavier default stroke weight is a genuine advantage in light mode specifically — Aernova's light theme has to remain outdoor-readable (a real product requirement, not decoration), and a marginally heavier stroke holds up better against a bright, high-ambient-light viewing condition than Source Sans 3's slightly lighter default weight at the same nominal weight value.
- **Tone.** IBM Plex Sans's "industrial/technical character," named as a hypothesis in `docs/AERNOVA_DESIGN_REFERENCE.md` §7.2, reads as intended next to the serif wordmark in the fixture — distinct enough to feel considered, not so distinct that it fights the identity. Source Sans 3 is the most neutral of the three — a safe, defensible second choice, not a wrong one. Geist reads the most contemporary-SaaS of the three, which is a weaker fit for a "field notebook, not a startup dashboard" brand voice (`docs/PRODUCT.md`'s own anti-reference language).

## Recommendation

**IBM Plex Sans Variable.** It wins on the criteria that matter most for this product — compact-table width, small-label clarity, and light-mode/outdoor stroke weight — and its "technical instrument" character is the correct tone match for Precision Workshop, not a coincidence. This confirms rather than overturns the plan's own hypothesis (`docs/AERNOVA_DESIGN_REFERENCE.md` §6.4: "IBM Plex Sans Variable is the leading design-exploration candidate... this is a hypothesis to validate, not a preselected outcome").

**Rejected:**
- **Source Sans 3 Variable** — a legitimate, close second. Rejected only because IBM Plex Sans's tone match and light-mode weight edge it out; if IBM Plex Sans is later found to have a real operational problem (e.g. a licensing or `next/font` subsetting issue not visible in this fixture), Source Sans 3 is the correct fallback, not Geist.
- **Geist Sans** — rejected primarily on tone: it reads as contemporary product-dashboard type, which cuts against the "field notebook" brand voice and the plan's own instruction not to let the interface read as a "marketing-style dashboard." Technically competent, not the right character.
- **System UI stack** — rejected as the final choice, not because it performed badly (it's the current baseline and is perfectly legible), but because it cannot deliver the deliberate "instrument" character Precision Workshop calls for, and the plan explicitly treats "no webfont" as a decision to revisit here, not a permanent doctrine.

## What Phase 1 needs to do with this

Load only IBM Plex Sans Variable, self-hosted via `next/font`, in the real foundation work — the exact weight range, axis subsetting (`wght` only vs. `wght`+`wdth`), and whether `next/font`'s automatic subsetting is sufficient or a hand-picked subset is needed for bundle size, are Phase 1 decisions, not decided here. This comparison's job was to pick the family, not tune its delivery.
