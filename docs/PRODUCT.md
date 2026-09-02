---
description: Multi-trade project workflow platform for small construction and trades businesses; roofing is a specialized module, not the whole product.
---

# Product

## Register

product

## Platform

web

## Users

Small construction and trades business owners, and the people who work for them — office staff, estimators, and crew — working without a technical background. They are not photogrammetrists, CAD operators, or software people; they are people who need to move a job from a phone call to a paid invoice with as little administrative overhead as possible. Their context is a business in progress: a handful of jobs at different stages, a customer waiting on an answer, and no appetite for learning project-management software to get one.

This spans several trades on purpose — roofing, plumbing, lawn care, general contracting, and others as the product grows — because the underlying job is the same one in every trade: turn a lead into priced, scheduled, completed, paid work, with as much of that turned into a review instead of a form as Aernova can manage. A roofing contractor and a plumber should recognize the same product under different, trade-appropriate language.

## Product Purpose

Aernova carries a job the whole way from first contact to paid invoice: request in, estimate, quote, schedule, production, invoice, paid. Success is a business owner completing that chain by reviewing what Aernova already prepared and confirming it, not by re-entering the same information at every stage or learning a new tool's vocabulary for each one.

Roofing is Aernova's most fully built-out module: drone imagery in, photogrammetric reconstruction, roof measurement, estimate out — a real technical pipeline that a roofing contractor never has to see or understand. It is not the definition of the product. The core workflow — client and property records, requests, quotes, scheduling, invoicing, payments — is trade-agnostic, and roofing's measurement/capture/processing tools sit on top of it as a gated module, the way a future plumbing- or lawn-care-specific tool would sit on top of the same core rather than beside a different one.

## Positioning

**Aernova is a multi-trade workflow platform for small construction and trades businesses. Roofing is one specialized module, not the whole product.**

The core — clients, properties, requests, quotes, jobs, scheduling, invoicing, payments — works the same way for a roofer, a plumber, a lawn-care company, or a general contractor. On top of that core, roofing gets a real premium capability the others don't (yet): drone-to-measurement aerial capture, with photogrammetry as its engine. That module is additive and optional, gated per company, not a precondition for using the rest of the product. A plumbing company should be able to sign up, pick a plumbing-shaped workflow, and never see a roofing term.

Everything from first contact to the priced, scheduled, invoiced document lives in one tool — no stitching together of separate CRM, scheduling, and estimating vendors, whichever trade is using it.

**Every document a homeowner actually sees carries the contractor's identity, not Aernova's.** A quote, invoice, warranty, change order, or additional-work approval is the business owner's own paperwork, sent under their own name and, when they've set one, their own logo — top-left of the document, inside a modest fixed branding box (roughly 40–48px tall, 160–220px wide, transparent by default so the document's own background shows through) that the logo fits within with its aspect ratio always preserved, never stretched, that stays consistent from one document type to the next — reviewed and confirmed by the owner before it goes out, never auto-sent. A subtle neutral fill behind the logo is used only when a specific document template is deliberately designed with a branded header treatment — never as a default every document gets, and never a per-company setting to switch on. A business owner who wants that look for their own documents can request it; requests like that are how Aernova decides what to design into future templates, not something a company turns on for itself. When no logo has been uploaded yet, the company name renders in that same top-left position instead, never a blank header — a business shouldn't look unfinished on its very first sent document. This is what "professional" means in practice here: not a heavier visual treatment, but a document a homeowner would trust came from the person standing in their driveway.

## Brand Personality

Calm, clear, effortless. Aernova does something genuinely hard in at least one of its modules (photogrammetry) and does not make that the user's problem, and it applies the same standard everywhere else even where nothing underneath is technically hard — a scheduling conflict, a tax calculation, an overdue invoice should all feel equally absorbed, not just the roofing pipeline. The voice is plain and unhurried — it states what is known, states it in the words the trade in front of it would use, and does not perform its own sophistication. Effortless is the outcome, not the aesthetic: it is earned by absorbing complexity, not by hiding controls the user actually needs.

## Anti-references

CAD and engineering complexity. Exposed technical controls, dense parameter panels, and jargon surfaced into the UI — most visibly in the roofing module, where photogrammetry vocabulary (facets, normals, meshes, RANSAC, tolerances) must never reach a screen, but the same discipline applies everywhere: no trade's module should surface its own internal machinery as controls the owner has to operate.

A second anti-reference, specific to being a multi-trade product: **a fixed workflow the business owner has to adapt to.** Aernova should not force a plumber through roofing-shaped stages, or force any owner through stages that don't match how they actually talk about their own work. The workflow adapts to the business; the business does not adapt to the workflow.

## Design Principles

**Absorb the complexity, don't relocate it.** Every technical decision the system can make on the user's behalf is one the user should not be asked to make. When a choice must be surfaced, surface it in outcomes ("this section looks steeper than the rest"), not in parameters.

**Numbers earn their trust by being legible, not by being decorated.** A measurement, a price, a balance due — whatever the number is, it's the thing a business owner stakes a decision on. It should be easy to read, easy to sanity-check, and never dressed up in a way that implies more or less certainty than the system actually has.

**Speak the trade's language.** If a word would not be said on the job — a roof, a job site, a lawn — it does not belong on the screen. This is a vocabulary constraint on copy, labels, and errors alike, and it now explicitly varies by trade: a roofing company's screen and a plumbing company's screen should each read as if it were built only for them, even though it's the same underlying workflow.

**Aernova adapts to the business, not the other way around.** Onboarding asks what kind of trade business this is and offers a workflow that already looks close to right for it — pre-built templates, stages the company doesn't use hidden rather than shown-and-ignored, labels in the company's own words. This is a first-class product principle now, not a nice-to-have: forcing every business into one fixed sequence of stages is exactly the "complicated construction ERP software" feeling Aernova exists to avoid.

**Calm is a function of sequence.** A user should always know what just happened, what is happening now, and what comes next. Most of the felt difficulty in a project-management product is multi-step state, not any single step's complexity — clarity there does more for "effortless" than any visual treatment will.

**Be honest about uncertainty.** Photogrammetry produces estimates with real error bars, and this applies wherever else Aernova produces a system-generated number a business owner is about to act on. Communicating confidence plainly is a trust feature; a number presented with false precision is a liability the owner absorbs, not us.

**Nothing customer-facing leaves the building unreviewed.** Aernova drafts quotes, invoices, warranties, and every other document a homeowner will read — pre-filled, branded with the company's own logo when set, ready to go — but the business owner always reviews and confirms before it sends. Automation prepares the document; a person still stands behind it.

## Accessibility & Inclusion

WCAG 2.2 AA. Contrast, visible focus states, keyboard navigation, and reduced-motion support are the baseline target, across every trade's surface — the crew field surface in particular, used outdoors, one-handed, in variable light.
