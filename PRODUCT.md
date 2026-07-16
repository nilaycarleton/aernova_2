# Product

## Register

product

## Platform

web

## Users

Roofing contractors, working without a technical background. They are not photogrammetrists, estimators, or CAD operators — they are people who need to know how much roof there is and what to charge for it. Their context is a job in progress: a property to quote, a homeowner waiting, and no appetite for learning a 3D toolchain to get there. The job to be done is turning a set of drone photos into measurements they trust enough to put their name on, and then into a proposal they can hand over.

## Product Purpose

Aernova takes drone imagery of a roof and carries it the whole way to a priced proposal: photos in, photogrammetric reconstruction, roof measurement, estimate out. Success is a contractor completing that chain without understanding — or being shown — what happened in the middle. The reconstruction, facet detection, and edge classification are means, not the product. The measurement a roofer can act on is the product.

## Positioning

Drone-to-proposal in one place. Everything from capture to the priced document lives in a single tool, with no stitching together of separate photogrammetry, measurement, and estimating vendors.

## Brand Personality

Calm, clear, effortless. Aernova does something genuinely hard and does not make that the user's problem. The voice is plain and unhurried — it states what is known, states it in the words a roofer would use, and does not perform its own sophistication. Effortless is the outcome, not the aesthetic: it is earned by absorbing complexity, not by hiding controls the user actually needs.

## Anti-references

CAD and engineering complexity. Exposed technical controls, dense parameter panels, and jargon surfaced into the UI. The pipeline underneath is legitimately technical; none of that vocabulary — facets, normals, meshes, RANSAC, tolerances — belongs in front of a contractor.

## Design Principles

**Absorb the complexity, don't relocate it.** Every technical decision the system can make on the user's behalf is one the user should not be asked to make. When a choice must be surfaced, surface it in outcomes ("this section looks steeper than the rest"), not in parameters.

**Numbers earn their trust by being legible, not by being decorated.** The measurement is the thing a contractor stakes a bid on. It should be easy to read, easy to sanity-check, and never dressed up in a way that implies more or less certainty than the system actually has.

**Speak the trade's language.** If a word would not be said on a roof, it does not belong on the screen. This is a vocabulary constraint on copy, labels, and errors alike.

**Calm is a function of sequence.** A user should always know what just happened, what is happening now, and what comes next. Most of the felt difficulty in this product is pipeline latency and multi-step state — clarity there does more for "effortless" than any visual treatment will.

**Be honest about uncertainty.** Photogrammetry produces estimates with real error bars. Communicating confidence plainly is a trust feature; a number presented with false precision is a liability the contractor absorbs, not us.

## Accessibility & Inclusion

WCAG 2.2 AA. Contrast, visible focus states, keyboard navigation, and reduced-motion support are the baseline target.
