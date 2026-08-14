export function currency(value: number | null | undefined) {
  return `$${(value ?? 0).toLocaleString()}`;
}

/**
 * Database enums are not words a roofer would say, and `replaceAll("_", " ")`
 * doesn't fix that — it just turns READY_FOR_QUOTE into shouting. Every enum that
 * reaches a screen (or the printed quote a homeowner reads) comes through here
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

const MEASUREMENT_UNIT: Record<string, string> = {
  SQFT: "sq ft",
  FT: "ft",
  DEGREES: "degrees",
  RATIO: "pitch ratio (x/12)",
  COUNT: "count",
  PERCENT: "%",
  SQUARES: "squares",
};

const MEASUREMENT_SOURCE: Record<string, string> = {
  MANUAL: "Measured by hand",
  DRONE: "From the 3D model",
};

export function measurementUnitLabel(value: string) {
  return MEASUREMENT_UNIT[value] ?? sentenceCase(value);
}

export function measurementSourceLabel(value: string) {
  return MEASUREMENT_SOURCE[value] ?? sentenceCase(value);
}

/**
 * The option lists both measurement forms render. Shared because they were
 * duplicated in two files with the enum name as the visible label — the roofer
 * picking a metric saw "WASTE_FACTOR" and "SQFT". The `value` stays the enum
 * (it is the form contract the server action parses); only the label changes.
 */
function options(values: string[], label: (value: string) => string) {
  return values.map((value) => ({ value, label: label(value) }));
}

export const MEASUREMENT_TYPE_OPTIONS = options(
  ["AREA", "RIDGE", "PITCH", "WASTE_FACTOR", "EAVE", "VALLEY", "HIP"],
  measurementTypeLabel
);

export const MEASUREMENT_UNIT_OPTIONS = options(
  ["SQFT", "FT", "RATIO", "PERCENT"],
  measurementUnitLabel
);

export const MEASUREMENT_SOURCE_OPTIONS = options(
  ["MANUAL", "DRONE"],
  measurementSourceLabel
);

const JOB_EXPENSE_CATEGORY: Record<string, string> = {
  MATERIALS: "Materials",
  LABOUR: "Labour",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

export function jobExpenseCategoryLabel(value: string) {
  return JOB_EXPENSE_CATEGORY[value] ?? sentenceCase(value);
}

export const JOB_EXPENSE_CATEGORY_OPTIONS = options(
  ["MATERIALS", "LABOUR", "EQUIPMENT", "OTHER"],
  jobExpenseCategoryLabel
);

/** §19.2 — why office/internal confirmation was used instead of the default homeowner review. */
const ADD_ON_REVIEW_OVERRIDE_REASON: Record<string, string> = {
  HOMEOWNER_CONTACT_MISSING: "No contact info on file",
  VERBAL_APPROVAL: "Already approved verbally",
  OWNER_OVERRIDE: "Owner override",
};

export function addOnReviewOverrideReasonLabel(value: string) {
  return ADD_ON_REVIEW_OVERRIDE_REASON[value] ?? sentenceCase(value);
}

export const ADD_ON_REVIEW_OVERRIDE_REASON_OPTIONS = options(
  ["HOMEOWNER_CONTACT_MISSING", "VERBAL_APPROVAL", "OWNER_OVERRIDE"],
  addOnReviewOverrideReasonLabel
);

/** Job lifecycle labels live with the flow itself — see lib/job-status. */
export function enumLabel(value: string) {
  return sentenceCase(value);
}