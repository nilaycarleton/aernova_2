import { Measurement, Project, RoofSection } from "@prisma/client";
import { defaultPricingTemplate } from "@/lib/pricing-template";
import {
  buildRoofSectionTotals,
  buildWasteRecommendation,
} from "@/lib/roof-intelligence";

type ReportSection = {
  title: string;
  body: string;
};

export type GeneratedReport = {
  title: string;
  totalAmount: number;
  scopeOfWork: string;
  summary: {
    roofAreaSqft: number;
    roofSquares: number;
    wasteFactorPercent: number;
    suggestedSquares: number;
    shingleBundles: number;
    ridgeOrHipFt: number;
    starterEaveFt: number;
    valleyFt: number;
    rakeFt: number;
    dripEdgeFt: number;
    predominantPitch: string;
    totalFacets: number | null;
    complexity: string;
    complexityScore: number;
    laborMultiplier: number;
    areaSource: string;
    estimatedMaterialCost: number;
    estimatedLaborCost: number;
    estimatedAccessoryCost: number;
    disposalCost: number;
  };
  sections: ReportSection[];
};

function getMeasurement(measurements: Measurement[], type: string) {
  return measurements.find((m) => m.type === type) ?? null;
}

function getValue(measurements: Measurement[], type: string) {
  const m = getMeasurement(measurements, type);
  return m ? Number(m.value) : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundUpBundles(areaSqft: number) {
  return Math.ceil(areaSqft / 100 * 3);
}

function roundUpRolls(areaSqft: number) {
  return Math.ceil(areaSqft / 400);
}

function roundUpSquaresToThird(areaSqft: number) {
  const rawSquares = areaSqft / 100;
  return Math.ceil(rawSquares * 3) / 3;
}

export function generateRoofingReport(
  project: Project,
  measurements: Measurement[],
  sectionsInput: RoofSection[] = []
): GeneratedReport {
  const sectionTotals = buildRoofSectionTotals(sectionsInput);
  const wasteRecommendation = buildWasteRecommendation(measurements, sectionsInput);
  const roofAreaSqft =
    sectionTotals.totalAreaSqft ||
    getValue(measurements, "AREA") ||
    0;

  const ridgeFt = sectionTotals.ridgeLengthFt || getValue(measurements, "RIDGE");
  const hipFt = sectionTotals.hipLengthFt || getValue(measurements, "HIP");
  const valleyFt = sectionTotals.valleyLengthFt || getValue(measurements, "VALLEY");
  const eaveFt = sectionTotals.eaveLengthFt || getValue(measurements, "EAVE");
  const rakeFt = sectionTotals.rakeLengthFt || getValue(measurements, "RAKE");
  const wasteFactorMeasured = getValue(measurements, "WASTE_FACTOR");
  const pitchValue = getValue(measurements, "PITCH");
  const facets = sectionTotals.facetCount || getValue(measurements, "FACET_COUNT") || null;

  const predominantPitch = pitchValue ? `${pitchValue}/12` : "Not provided";
  const ridgeOrHipFt = ridgeFt + hipFt;
  const dripEdgeFt = eaveFt + rakeFt;

  const wasteFactorPercent =
    wasteFactorMeasured > 0
      ? wasteFactorMeasured
      : wasteRecommendation.recommendedWaste;

  const effectiveAreaSqft = roofAreaSqft * (1 + wasteFactorPercent / 100);
  const roofSquares = roundUpSquaresToThird(roofAreaSqft);
  const suggestedSquares = wasteRecommendation.suggestedSquares || roundUpSquaresToThird(effectiveAreaSqft);

  const shingleBundles = roundUpBundles(effectiveAreaSqft);
  const underlaymentRolls = roundUpRolls(roofAreaSqft);
  const ridgeCapBundles = Math.ceil(ridgeOrHipFt / 33);
  const starterBundles = Math.ceil(eaveFt / 100);

  const pricing = defaultPricingTemplate;
  const disposalCost = roofAreaSqft > 0 ? pricing.disposalFee : 0;

  const estimatedMaterialCost =
    shingleBundles * pricing.shingleBundleCost +
    underlaymentRolls * pricing.underlaymentRollCost +
    ridgeCapBundles * pricing.ridgeCapBundleCost +
    starterBundles * pricing.starterBundleCost +
    dripEdgeFt * pricing.dripEdgeCostPerFt +
    valleyFt * pricing.valleyLinerCostPerFt;

  const laborRatePerSqft =
    pitchValue >= 12 ? pricing.laborRateComplex :
    pitchValue >= 8 ? pricing.laborRateNormal :
    pricing.laborRateSimple;

  const estimatedLaborCost = roofAreaSqft * laborRatePerSqft * wasteRecommendation.laborMultiplier;
  const estimatedAccessoryCost = 375;
  const subtotal =
    estimatedMaterialCost +
    estimatedLaborCost +
    estimatedAccessoryCost +
    disposalCost;
  const totalAmount = subtotal * (1 + pricing.markupPercent / 100);

  const scopeOfWork = [
    "Remove existing roofing materials where applicable.",
    "Inspect roof deck and replace damaged substrate as needed.",
    "Install synthetic underlayment and ice/water protection in required areas.",
    "Install new asphalt shingles based on measured roof area and waste allowance.",
    "Install ridge cap on ridges and hips.",
    "Install starter material along eaves.",
    "Install drip edge and valley protection where applicable.",
    "Complete debris removal and site cleanup."
  ].join(" ");

  const sections: ReportSection[] = [
    {
      title: "Roof Measurements Summary",
      body:
        `Total roof area: ${roofAreaSqft.toLocaleString()} sq ft. ` +
        `Predominant pitch: ${predominantPitch}. ` +
        `Ridges + hips: ${ridgeOrHipFt.toLocaleString()} ft. ` +
        `Valleys: ${valleyFt.toLocaleString()} ft. ` +
        `Rakes: ${rakeFt.toLocaleString()} ft. ` +
        `Eaves/starter: ${eaveFt.toLocaleString()} ft. ` +
        `Drip edge (eaves + rakes): ${dripEdgeFt.toLocaleString()} ft.`
    },
    {
      title: "Waste Recommendation",
      body:
        `Suggested waste factor: ${wasteFactorPercent}%. ` +
        `Complexity score: ${wasteRecommendation.complexityScore}/100 (${wasteRecommendation.complexity}). ` +
        `Primary factors: ${wasteRecommendation.reasons.join(", ")}. ` +
        `Measured roof squares: ${roofSquares.toFixed(2)}. ` +
        `Suggested ordering squares: ${suggestedSquares.toFixed(2)}.`
    },
    {
      title: "Material Estimate",
      body:
        `Estimated shingles: ${shingleBundles} bundles. ` +
        `Estimated underlayment: ${underlaymentRolls} rolls. ` +
        `Estimated ridge cap: ${ridgeCapBundles} bundles. ` +
        `Estimated starter: ${starterBundles} bundles.`
    },
    {
      title: "Pricing Summary",
      body:
        `Estimated material cost: $${roundMoney(estimatedMaterialCost).toLocaleString()}. ` +
        `Estimated labor cost: $${roundMoney(estimatedLaborCost).toLocaleString()}. ` +
        `Estimated accessories: $${roundMoney(estimatedAccessoryCost).toLocaleString()}. ` +
        `Estimated disposal: $${roundMoney(disposalCost).toLocaleString()}. ` +
        `Markup: ${pricing.markupPercent}%. ` +
        `Estimated total before tax: $${roundMoney(totalAmount).toLocaleString()}.`
    },
    {
      title: "Scope of Work",
      body: scopeOfWork,
    },
    {
      title: "Notes",
      body:
        "Measurements and waste recommendations should be field-verified before final ordering and installation. Final quantities can vary due to crew methods, salvage opportunities, accessory selections, and site conditions."
    }
  ];

  return {
    title: `${project.name} – Roofing Report & Proposal`,
    totalAmount: roundMoney(totalAmount),
    scopeOfWork,
    summary: {
      // Round display metrics so stored values don't carry float noise
      // (e.g. 3664.1000000000004 or 42.333333333333336).
      roofAreaSqft: Math.round(roofAreaSqft * 10) / 10,
      roofSquares: Math.round(roofSquares * 10) / 10,
      wasteFactorPercent,
      suggestedSquares: Math.round(suggestedSquares * 10) / 10,
      shingleBundles,
      ridgeOrHipFt,
      starterEaveFt: eaveFt,
      valleyFt,
      rakeFt,
      dripEdgeFt,
      predominantPitch,
      totalFacets: facets || null,
      complexity: wasteRecommendation.complexity,
      complexityScore: wasteRecommendation.complexityScore,
      laborMultiplier: wasteRecommendation.laborMultiplier,
      areaSource: wasteRecommendation.areaSource,
      estimatedMaterialCost: roundMoney(estimatedMaterialCost),
      estimatedLaborCost: roundMoney(estimatedLaborCost),
      estimatedAccessoryCost: roundMoney(estimatedAccessoryCost),
      disposalCost: roundMoney(disposalCost),
    },
    sections,
  };
}
