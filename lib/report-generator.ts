import { Measurement, Project } from "@prisma/client";

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

function inferWasteFactor(pitchValue: number, valleyFt: number, hipFt: number) {
  // EagleView-style reports show a waste recommendation table for asphalt shingles.
  // We are not copying their exact algorithm, but using a similar contractor-friendly idea:
  // steeper / more complex roofs -> more waste.
  let waste = 10;

  if (pitchValue >= 8) waste += 3;
  if (pitchValue >= 12) waste += 3;
  if (valleyFt > 40) waste += 2;
  if (valleyFt > 80) waste += 2;
  if (hipFt > 80) waste += 2;

  return Math.min(waste, 25);
}

export function generateRoofingReport(project: Project, measurements: Measurement[]): GeneratedReport {
  const roofAreaSqft =
    getValue(measurements, "AREA") ||
    0;

  const ridgeFt = getValue(measurements, "RIDGE");
  const hipFt = getValue(measurements, "HIP");
  const valleyFt = getValue(measurements, "VALLEY");
  const eaveFt = getValue(measurements, "EAVE");
  const rakeFt = getValue(measurements, "RAKE");
  const wasteFactorMeasured = getValue(measurements, "WASTE_FACTOR");
  const pitchValue = getValue(measurements, "PITCH");
  const facets = getValue(measurements, "FACET_COUNT") || null;

  const predominantPitch = pitchValue ? `${pitchValue}/12` : "Not provided";
  const ridgeOrHipFt = ridgeFt + hipFt;
  const dripEdgeFt = eaveFt + rakeFt;

  const wasteFactorPercent =
    wasteFactorMeasured > 0
      ? wasteFactorMeasured
      : inferWasteFactor(pitchValue, valleyFt, hipFt);

  const effectiveAreaSqft = roofAreaSqft * (1 + wasteFactorPercent / 100);
  const roofSquares = roundUpSquaresToThird(roofAreaSqft);
  const suggestedSquares = roundUpSquaresToThird(effectiveAreaSqft);

  const shingleBundles = roundUpBundles(effectiveAreaSqft);
  const underlaymentRolls = roundUpRolls(roofAreaSqft);
  const ridgeCapBundles = Math.ceil(ridgeOrHipFt / 33);
  const starterBundles = Math.ceil(eaveFt / 100);

  // Very simple MVP pricing assumptions
  const shingleBundleCost = 42;
  const underlaymentRollCost = 95;
  const ridgeCapBundleCost = 65;
  const starterBundleCost = 52;
  const dripEdgeCostPerFt = 3.5;
  const valleyLinerCostPerFt = 4.25;
  const disposalCost = roofAreaSqft > 0 ? 650 : 0;

  const estimatedMaterialCost =
    shingleBundles * shingleBundleCost +
    underlaymentRolls * underlaymentRollCost +
    ridgeCapBundles * ridgeCapBundleCost +
    starterBundles * starterBundleCost +
    dripEdgeFt * dripEdgeCostPerFt +
    valleyFt * valleyLinerCostPerFt;

  const laborRatePerSqft =
    pitchValue >= 12 ? 4.5 :
    pitchValue >= 8 ? 3.85 :
    3.2;

  const estimatedLaborCost = roofAreaSqft * laborRatePerSqft;
  const estimatedAccessoryCost = 375;
  const totalAmount =
    estimatedMaterialCost +
    estimatedLaborCost +
    estimatedAccessoryCost +
    disposalCost;

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
        `This is meant as a job-planning guide for asphalt shingle estimating, similar to the way roofing reports surface a measured-versus-suggested waste view. ` +
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
        `Estimated total: $${roundMoney(totalAmount).toLocaleString()}.`
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
      roofAreaSqft,
      roofSquares,
      wasteFactorPercent,
      suggestedSquares,
      shingleBundles,
      ridgeOrHipFt,
      starterEaveFt: eaveFt,
      valleyFt,
      rakeFt,
      dripEdgeFt,
      predominantPitch,
      totalFacets: facets || null,
      estimatedMaterialCost: roundMoney(estimatedMaterialCost),
      estimatedLaborCost: roundMoney(estimatedLaborCost),
      estimatedAccessoryCost: roundMoney(estimatedAccessoryCost),
      disposalCost: roundMoney(disposalCost),
    },
    sections,
  };
}