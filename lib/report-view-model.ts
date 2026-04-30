import {
  Measurement,
  Project,
  Proposal,
  RoofIssue,
  RoofSection,
} from "@prisma/client";

type ReportSection = {
  title: string;
  body: string;
};

type ParsedProposalPayload = {
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
    estimatedMaterialCost?: number;
    estimatedLaborCost?: number;
    estimatedAccessoryCost?: number;
    disposalCost?: number;
  };
  sections?: ReportSection[];
  plainTextScope?: string;
};

type ProjectReportInput = {
  project: Project;
  measurements: Measurement[];
  sections: RoofSection[];
  issues: RoofIssue[];
  proposals: Proposal[];
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

function parseProposal(proposal: Proposal | null): ParsedProposalPayload | null {
  if (!proposal?.scopeOfWork) return null;

  try {
    return JSON.parse(proposal.scopeOfWork);
  } catch {
    return null;
  }
}

//
// =======================
// 🧠 MAIN VIEW MODEL
// =======================
//

export function buildProjectReportViewModel({
  project,
  measurements,
  sections,
  issues,
  proposals,
}: ProjectReportInput) {
  const latestProposal = proposals[0] ?? null;
  const parsedProposal = parseProposal(latestProposal);

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
    parsedProposal?.sections ??
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
      title: `${project.name} Report`,
      subtitle: "Roof Measurement & Proposal Summary",
      projectName: project.name,
      clientName: project.clientName,
      address: `${project.addressLine1}, ${project.city}, ${project.province}${
        project.postalCode ? ` ${project.postalCode}` : ""
      }`,
      captureSource: project.captureSource,
      status: project.status,
    },

    measurementsSummary: {
      totalAreaDisplay,
      predominantPitch: pitchDisplay,
      totalFacets: parsedProposal?.summary?.totalFacets ?? null,
      ridgesHipsFt,
      valleysFt: valley,
      rakesFt: rake,
      eavesFt: eave,
      dripEdgeFt,
      wasteDisplay,
    },

    pricingSummary: {
      totalAmount: latestProposal?.totalAmount ?? null,
      materialCost:
        parsedProposal?.summary?.estimatedMaterialCost ?? null,
      laborCost:
        parsedProposal?.summary?.estimatedLaborCost ?? null,
      accessoryCost:
        parsedProposal?.summary?.estimatedAccessoryCost ?? null,
      disposalCost:
        parsedProposal?.summary?.disposalCost ?? null,
      suggestedSquares:
        parsedProposal?.summary?.suggestedSquares ?? null,
      shingleBundles:
        parsedProposal?.summary?.shingleBundles ?? null,
    },

    sections: sectionsData,
    issues,
    reportSections,
    latestProposal,
    totalAreaSqft: area,
  };
}