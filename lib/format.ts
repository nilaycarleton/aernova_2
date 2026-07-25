export function currency(value: number | null | undefined) {
  return `$${(value ?? 0).toLocaleString()}`;
}

/**
 * Database enums are not words a roofer would say, and `replaceAll("_", " ")`
 * doesn't fix that — it just turns READY_FOR_QUOTE into shouting. Every enum that
 * reaches a screen (or the printed proposal a homeowner reads) comes through here
 * first. Unknown values fall back to sentence case rather than throwing, so a new
 * enum member degrades to something readable instead of blank.
 */
function sentenceCase(value: string) {
  const words = value.replaceAll("_", " ").toLowerCase().trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "";
}

const IMAGERY_TYPE: Record<string, string> = {
  DRONE: "Drone photo",
  ORTHOMOSAIC: "Overhead map",
  MODEL: "3D model",
  BEFORE: "Before photo",
  AFTER: "After photo",
};

const PROCESSING_STATUS: Record<string, string> = {
  UPLOADED: "Uploaded",
  QUEUED: "Waiting to start",
  PROCESSING: "Building",
  READY: "Ready",
  NEEDS_REVIEW: "Needs another look",
  FAILED: "Didn't finish",
};

const MEASUREMENT_TYPE: Record<string, string> = {
  AREA: "Area",
  DISTANCE: "Length",
  RIDGE: "Ridge",
  HIP: "Hip",
  VALLEY: "Valley",
  EAVE: "Eave",
  RAKE: "Rake",
  PITCH: "Pitch",
  WASTE_FACTOR: "Waste factor",
  FACET_COUNT: "Roof faces",
};

export function imageryTypeLabel(value: string) {
  return IMAGERY_TYPE[value] ?? sentenceCase(value);
}

export function processingStatusLabel(value: string) {
  return PROCESSING_STATUS[value] ?? sentenceCase(value);
}

export function measurementTypeLabel(value: string) {
  return MEASUREMENT_TYPE[value] ?? sentenceCase(value);
}

/** Project lifecycle labels live with the flow itself — see lib/project-status. */
export function enumLabel(value: string) {
  return sentenceCase(value);
}