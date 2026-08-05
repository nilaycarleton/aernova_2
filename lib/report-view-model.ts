import {
  Measurement,
  PhotoAsset,
  Job,
  ProjectImagery,
  Quote,
  QuoteLineItem,
  RoofComparison,
  RoofIssue,
  RoofSection,
} from "@prisma/client";
import {
  buildPitchBreakdown,
  buildWasteRecommendation,
} from "@/lib/roof-intelligence";
import type { CostTotals, LineItem } from "@/lib/report-generator";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, type JobLike } from "@/lib/job-identity";

type ReportSection = {
  title: string;
  body: string;
};

type ParsedQuotePayload = {
  summary?: {
    roofAreaSqft?: number;
    roofSquares?: number;
    wasteFactorPercent?: number;
    suggestedSquares?: number;
    shingleBundles?: number;
    ridgeOrHipFt?: number;
    starterEaveFt?: number;
    valleyFt?: number;
    rakeFt?: number;
    dripEdgeFt?: number;
    predominantPitch?: string;
    totalFacets?: number | null;
    complexity?: string;
    complexityScore?: number;
    laborMultiplier?: number;
    areaSource?: string;
    estimatedMaterialCost?: number;
    estimatedLaborCost?: number;
    estimatedAccessoryCost?: number;
    disposalCost?: number;
  };
  sections?: ReportSection[];
  lineItems?: LineItem[];
  totals?: CostTotals;
  plainTextScope?: string;
};

type JobReportInput = {
  // `JobLike` so the report reads the customer and address off the Client and
  // Property relations when the caller includes them, and off the job's own
  // deprecated columns when it doesn't.
  job: Job & JobLike;
  measurements: Measurement[];
  sections: RoofSection[];
  issues: RoofIssue[];
  photos: PhotoAsset[];
  imagery: ProjectImagery[];
  comparisons: RoofComparison[];
  /** Newest first, with their rows — see the lineItems note below. */
  quotes: (Quote & { lineItems?: QuoteLineItem[] })[];
};

//
// =======================
// 🔧 CORE HELPERS
// =======================
//

function measurementNumeric(
  measurements: Measurement[],
  type: string,
  fallback = 0
) {
  const match = measurements.find((m) => m.type === type);
  return match ? Number(match.value) : fallback;
}

function formatPitch(value: number) {
  if (!value) return "—";

  // Normal case: 6 → 6/12
  if (value <= 20) {
    return `${value}/12`;
  }

  // Fix broken values like 86 → 8.6 → 9/12
  const normalized = Math.round(value / 10);
  return `${normalized}/12`;
}

function formatMeasurement(value: number, type: string) {
  if (!value && value !== 0) return "—";

  switch (type) {
    case "AREA":
      return `${value.toLocaleString()} sq ft`;

    case "RIDGE":
    case "HIP":
    case "VALLEY":
    case "RAKE":
    case "EAVE":
      return `${value.toLocaleString()} ft`;

    case "WASTE_FACTOR":
      return `${value}%`;

    case "PITCH":
      return formatPitch(value);

    default:
      return value.toString();
  }
}

function money(value: number | null) {
  if (!value) return "—";
  return `$${value.toLocaleString()}`;
}

function parseQuote(quote: Quote | null): ParsedQuotePayload | null {
  if (!quote?.scopeOfWork) return null;

  try {
    return JSON.parse(quote.scopeOfWork);
  } catch {
    return null;
  }
}

//
// =======================
// 🧠 MAIN VIEW MODEL
// =======================
//

export function buildJobReportViewModel({
  job,
  measurements,
  sections,
  issues,
  photos,
  imagery,
  comparisons,
  quotes,
}: JobReportInput) {
  const latestQuote = quotes[0] ?? null;
  const parsedQuote = parseQuote(latestQuote);

  //
  // ===== RAW VALUES =====
  //

  const area = measurementNumeric(measurements, "AREA", 0);
  const pitch = measurementNumeric(measurements, "PITCH", 0);
  const ridge = measurementNumeric(measurements, "RIDGE", 0);
  const hip = measurementNumeric(measurements, "HIP", 0);
  const valley = measurementNumeric(measurements, "VALLEY", 0);
  const eave = measurementNumeric(measurements, "EAVE", 0);
  const rake = measurementNumeric(measurements, "RAKE", 0);
  const waste = measurementNumeric(measurements, "WASTE_FACTOR", 0);

  //
  // ===== SAFE TOTALS =====
  //

  const ridgesHipsFt = (ridge || 0) + (hip || 0);
  const dripEdgeFt = (eave || 0) + (rake || 0);

  //
  // ===== FORMATTED DISPLAY =====
  //

  const totalAreaDisplay = formatMeasurement(area, "AREA");
  const pitchDisplay = formatMeasurement(pitch, "PITCH");
  const wasteDisplay = waste ? `${waste}%` : "—";

  //
  // ===== SECTION FALLBACK =====
  //

  const sectionsData =
    sections.length > 0
      ? sections
      : [
          {
            id: "default",
            label: "Main Roof",
            pitchRatio: pitchDisplay,
            surfaceAreaSqft: area,
            ridgeLengthFt: ridge,
            hipLengthFt: hip,
            valleyLengthFt: valley,
            eaveLengthFt: eave,
            rakeLengthFt: rake,
          },
        ];

  //
  // ===== REPORT SECTIONS =====
  //

  const reportSections =
    parsedQuote?.sections ??
    [
      {
        title: "Roof Measurements Summary",
        body:
          `Total roof area: ${totalAreaDisplay}. ` +
          `Predominant pitch: ${pitchDisplay}. ` +
          `Ridges + hips: ${ridgesHipsFt} ft. ` +
          `Valleys: ${valley} ft. ` +
          `Rakes: ${rake} ft. ` +
          `Eaves/Starter: ${eave} ft.`,
      },
      {
        title: "Notes",
        body:
          "Measurements, quantities, and pricing should be field-verified before final ordering and installation.",
      },
    ];

  //
  // ===== FINAL VIEW MODEL =====
  //

  return {
    cover: {
      title: `${job.name} Report`,
      subtitle: "Roof Measurement & Quote Summary",
      jobName: job.name,
      clientName: jobClient(job).name,
      address: formatAddress(jobAddress(job)) ?? "",
      captureSource: job.captureSource,
      status: job.status,
    },

    measurementsSummary: {
      totalAreaDisplay,
      predominantPitch: pitchDisplay,
      totalFacets: parsedQuote?.summary?.totalFacets ?? null,
      ridgesHipsFt,
      valleysFt: valley,
      rakesFt: rake,
      eavesFt: eave,
      dripEdgeFt,
      wasteDisplay,
    },

    pricingSummary: {
      totalAmountCents: latestQuote?.totalAmountCents ?? null,
      materialCost:
        parsedQuote?.summary?.estimatedMaterialCost ?? null,
      laborCost:
        parsedQuote?.summary?.estimatedLaborCost ?? null,
      accessoryCost:
        parsedQuote?.summary?.estimatedAccessoryCost ?? null,
      disposalCost:
        parsedQuote?.summary?.disposalCost ?? null,
      suggestedSquares:
        parsedQuote?.summary?.suggestedSquares ?? null,
      shingleBundles:
        parsedQuote?.summary?.shingleBundles ?? null,
    },

    // Rows first, the legacy blob second. Generated quotes stopped storing
    // their line items in `scopeOfWork` when the document became real rows
    // (Phase 3); quotes written before that still carry theirs in the JSON, and
    // a printed report from last month must not come back blank.
    lineItems:
      latestQuote?.lineItems && latestQuote.lineItems.length > 0
        ? latestQuote.lineItems
            .filter((line) => line.kind !== "TEXT")
            .map((line) => ({
              description: line.name,
              quantity: line.quantity,
              unit: line.unit,
              unitCost: line.unitPriceCents / 100,
              amount: line.amountCents / 100,
            }))
        : (parsedQuote?.lineItems ?? []),
    totals: parsedQuote?.totals ?? null,

    sections: sectionsData,
    pitchBreakdown: buildPitchBreakdown(sections),
    wasteRecommendation: buildWasteRecommendation(measurements, sections),
    issues,
    photos,
    imagery,
    comparisons,
    reportSections,
    latestQuote,
    totalAreaSqft: area,
  };
}
