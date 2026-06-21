import { Measurement, RoofSection } from "@prisma/client";

export type PitchBreakdownRow = {
  pitch: string;
  area: number;
  percent: number;
};

export type WasteRecommendation = {
  measuredSquares: number;
  suggestedSquares: number;
  recommendedWaste: number;
  measuredWaste: number | null;
  complexity: "simple" | "normal" | "complex";
  complexityScore: number;
  laborMultiplier: number;
  areaSource: "facets" | "measurements";
  totalAreaSqft: number;
  totalLineLengthFt: number;
  valleyHipFt: number;
  reasons: string[];
};

export type RoofSectionTotals = {
  totalAreaSqft: number;
  projectedAreaSqft: number;
  ridgeLengthFt: number;
  hipLengthFt: number;
  valleyLengthFt: number;
  eaveLengthFt: number;
  rakeLengthFt: number;
  facetCount: number;
};

function getMeasurementValue(measurements: Measurement[], type: string) {
  return Number(measurements.find((measurement) => measurement.type === type)?.value ?? 0);
}

function roundSquares(areaSqft: number) {
  return Math.ceil((areaSqft / 100) * 3) / 3;
}

function parsePitchRise(pitchRatio: string | null) {
  if (!pitchRatio) return 0;
  const [rise] = pitchRatio.split("/");
  const value = Number(rise);
  return Number.isFinite(value) ? value : 0;
}

export function buildRoofSectionTotals(sections: RoofSection[]): RoofSectionTotals {
  return sections.reduce(
    (totals, section) => ({
      totalAreaSqft: totals.totalAreaSqft + Number(section.surfaceAreaSqft ?? 0),
      projectedAreaSqft: totals.projectedAreaSqft + Number(section.projectedAreaSqft ?? 0),
      ridgeLengthFt: totals.ridgeLengthFt + Number(section.ridgeLengthFt ?? 0),
      hipLengthFt: totals.hipLengthFt + Number(section.hipLengthFt ?? 0),
      valleyLengthFt: totals.valleyLengthFt + Number(section.valleyLengthFt ?? 0),
      eaveLengthFt: totals.eaveLengthFt + Number(section.eaveLengthFt ?? 0),
      rakeLengthFt: totals.rakeLengthFt + Number(section.rakeLengthFt ?? 0),
      facetCount: totals.facetCount + 1,
    }),
    {
      totalAreaSqft: 0,
      projectedAreaSqft: 0,
      ridgeLengthFt: 0,
      hipLengthFt: 0,
      valleyLengthFt: 0,
      eaveLengthFt: 0,
      rakeLengthFt: 0,
      facetCount: 0,
    }
  );
}

export function buildPitchBreakdown(sections: RoofSection[]) {
  const grouped = new Map<string, number>();

  for (const section of sections) {
    const pitch = section.pitchRatio ?? "Unspecified";
    const area = Number(section.surfaceAreaSqft ?? section.projectedAreaSqft ?? 0);
    grouped.set(pitch, (grouped.get(pitch) ?? 0) + area);
  }

  const totalArea = Array.from(grouped.values()).reduce((sum, area) => sum + area, 0);

  return Array.from(grouped.entries())
    .map(([pitch, area]) => ({
      pitch,
      area,
      percent: totalArea > 0 ? Math.round((area / totalArea) * 100) : 0,
    }))
    .sort((a, b) => b.area - a.area);
}

export function buildWasteRecommendation(
  measurements: Measurement[],
  sections: RoofSection[]
): WasteRecommendation {
  const area = getMeasurementValue(measurements, "AREA");
  const sectionTotals = buildRoofSectionTotals(sections);
  const totalAreaSqft = sectionTotals.totalAreaSqft || area;
  const areaSource = sectionTotals.totalAreaSqft > 0 ? "facets" : "measurements";
  const measuredWaste = getMeasurementValue(measurements, "WASTE_FACTOR") || null;
  const valleyFt = sectionTotals.valleyLengthFt || getMeasurementValue(measurements, "VALLEY");
  const hipFt = sectionTotals.hipLengthFt || getMeasurementValue(measurements, "HIP");
  const ridgeFt = sectionTotals.ridgeLengthFt || getMeasurementValue(measurements, "RIDGE");
  const eaveFt = sectionTotals.eaveLengthFt || getMeasurementValue(measurements, "EAVE");
  const rakeFt = sectionTotals.rakeLengthFt || getMeasurementValue(measurements, "RAKE");
  const steepestFacetPitch = sections.reduce(
    (max, section) => Math.max(max, parsePitchRise(section.pitchRatio)),
    0
  );
  const pitchValue = steepestFacetPitch || getMeasurementValue(measurements, "PITCH");
  const facetCount = sectionTotals.facetCount || getMeasurementValue(measurements, "FACET_COUNT");
  const totalLineLengthFt = ridgeFt + hipFt + valleyFt + eaveFt + rakeFt;
  const valleyHipFt = valleyFt + hipFt;
  const lineDensity = totalAreaSqft > 0 ? totalLineLengthFt / (totalAreaSqft / 100) : 0;

  const reasons: string[] = [];
  let recommendedWaste = 10;
  let complexityScore = 25;

  if (pitchValue >= 8) {
    recommendedWaste += 3;
    complexityScore += 12;
    reasons.push("steeper pitch");
  }

  if (pitchValue >= 10) {
    recommendedWaste += 2;
    complexityScore += 8;
    reasons.push("very steep sections");
  }

  if (valleyFt > 40) {
    recommendedWaste += 2;
    complexityScore += 10;
    reasons.push("additional valley cutting");
  }

  if (hipFt > 70) {
    recommendedWaste += 2;
    complexityScore += 8;
    reasons.push("hip and ridge accessory complexity");
  }

  if (facetCount >= 8) {
    recommendedWaste += 3;
    complexityScore += 14;
    reasons.push("multiple roof facets");
  }

  if (lineDensity > 9) {
    recommendedWaste += 2;
    complexityScore += 8;
    reasons.push("high edge and accessory density");
  }

  const complexity =
    complexityScore >= 70 || facetCount >= 10
      ? "complex"
      : complexityScore >= 45 || facetCount >= 5
        ? "normal"
        : "simple";

  const laborMultiplier =
    complexity === "complex" ? 1.22 : complexity === "normal" ? 1.08 : 1;

  return {
    measuredSquares: roundSquares(totalAreaSqft),
    suggestedSquares: roundSquares(totalAreaSqft * (1 + recommendedWaste / 100)),
    recommendedWaste: Math.min(recommendedWaste, 25),
    measuredWaste,
    complexity,
    complexityScore: Math.min(complexityScore, 100),
    laborMultiplier,
    areaSource,
    totalAreaSqft,
    totalLineLengthFt,
    valleyHipFt,
    reasons: reasons.length ? reasons : ["standard asphalt shingle replacement"],
  };
}
