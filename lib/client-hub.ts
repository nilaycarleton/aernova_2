/**
 * Item 44's Client Hub — one link showing a homeowner everything they're
 * allowed to see across every job they have with this company.
 *
 * Pure and free of `prisma`, same doctrine as `lib/pipeline.ts`: the *rule*
 * for what's safe to put on a public page should be testable without a
 * database, and it should live in exactly one place rather than being
 * re-derived by every query that touches client-facing data.
 *
 * **The rule this file exists to enforce**: a quote or invoice is shareable
 * once it has a `shareToken` — the same "has this been sent" test
 * `canDeleteQuote`/`sendQuoteEmailAction` already use — never a raw status
 * check, because a status list drifts and a missing token never does. And
 * money never reaches this file at all beyond a total: `lib/report-view-model.ts`'s
 * `pricingSummary` (material/labour/accessory/disposal cost) is deliberately
 * never imported here — that breakdown exists for the contractor's own
 * estimating reference, and "cost and margin are never client-visible under
 * any setting" (the quote builder's own rule) applies just as much to a link
 * with no login on it as it does to the builder itself.
 */
import type { MeasurementType } from "@prisma/client";
import { parsePhotogrammetryModelPackage } from "./photogrammetry-pipeline.ts";

export function shareableQuotes<T extends { shareToken: string | null }>(quotes: T[]): T[] {
  return quotes.filter((quote) => quote.shareToken !== null);
}

export function shareableInvoices<T extends { shareToken: string | null }>(invoices: T[]): T[] {
  return invoices.filter((invoice) => invoice.shareToken !== null);
}

/**
 * Which measurement types read as a fact about the roof a homeowner would
 * recognize, in the order they should appear. `DISTANCE` (a generic
 * hand-measured line with no fixed meaning) and `WASTE_FACTOR` (an
 * estimating input, not a fact about the building) are left out on purpose.
 */
const HUB_MEASUREMENT_ORDER: MeasurementType[] = [
  "AREA",
  "PITCH",
  "FACET_COUNT",
  "RIDGE",
  "HIP",
  "VALLEY",
  "EAVE",
  "RAKE",
];

export function hubMeasurements<T extends { type: MeasurementType; sortOrder?: number }>(
  measurements: T[]
): T[] {
  const byType = new Map<MeasurementType, T>();
  // First one wins per type — a job may carry more than one manual
  // measurement of the same kind over time, and the summary shows the fact,
  // not the history of edits behind it.
  for (const m of measurements) {
    if (!byType.has(m.type)) byType.set(m.type, m);
  }
  return HUB_MEASUREMENT_ORDER.map((type) => byType.get(type)).filter((m): m is T => m != null);
}

/**
 * The glb to load into the read-only viewer, or null if there isn't one yet
 * — a job mid-processing, or one with no `AERIAL_MEASUREMENT` work done at
 * all, simply has no model section on the hub. Same asset-preference order
 * `phase-six-workflow.tsx` uses for the authoring viewer: the lighter
 * `viewerGlb` first, the full textured model as a fallback.
 *
 * **Deliberately stricter than the authoring viewer's own check.** A stored
 * asset URL is one of two shapes: `/uploads/...` (`lib/storage.ts`'s local
 * driver — genuinely static, served with no auth check at all) or
 * `/api/jobs/[jobId]/processing/[imageryId]/download?...` (a proxy in front
 * of NodeODM/S3 that — like every other `/api/jobs/*` route — sits behind
 * the signed-in session Clerk's middleware requires). `phase-six-workflow.tsx`
 * only ever renders for a signed-in contractor, so accepting either shape
 * there is harmless; a public, token-only page never has that session, and
 * pointing `GLTFLoader` at the proxy path would just fail to load. Only the
 * `/uploads/` shape is ever safe to hand to this page.
 */
export function hubModelGlbUrl(imagery: { type: string; extractedJson: unknown }[]): string | null {
  const model = imagery.find((item) => item.type === "MODEL");
  if (!model) return null;
  const pkg = parsePhotogrammetryModelPackage(model.extractedJson);
  const glb = pkg?.assets?.viewerGlb ?? pkg?.assets?.texturedModelGlb ?? null;
  return glb && glb.startsWith("/uploads/") ? glb : null;
}
