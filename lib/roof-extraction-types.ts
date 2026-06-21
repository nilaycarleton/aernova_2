// Shared, dependency-free types for the roof mesh extraction feature.
//
// These live apart from the service (which imports Prisma/fs) and the "use server"
// actions module so client components can type action inputs/outputs without
// pulling server-only modules through the server-action boundary.

export type PlanPreview = {
  width: number;
  height: number;
  /** Mesh X/Y bounds (metres) the preview maps onto; used to convert ROI px -> mesh coords. */
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  /** Base64 grayscale elevation grid, row-major, top row = max Y (north up). */
  elevationGrid: string;
  baseElevationM: number;
  topElevationM: number;
};

export type RoofExtractionSummary = {
  facetCount: number;
  totalSurfaceAreaSqft: number;
  totalProjectedAreaSqft: number;
  roofSquares: number;
  predominantPitchRatio: string;
  pitchBreakdown: { pitch: string; areaSqft: number; percent: number }[];
  diagnostics: {
    trianglesInRoi: number;
    trianglesSegmented: number;
  };
  sectionsCreated: number;
};
