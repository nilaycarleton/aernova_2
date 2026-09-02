/**
 * Shared fixture data for the Phase 3 internal primitive lab
 * (app/(dashboard)/internal/design-system/primitives). One module so every
 * primitive demo reads the same short/long/missing/empty content instead of
 * each section inventing its own — Premium UI Redesign Phase 3, Step 26.
 * No real production data or PII; every name/address/number below is
 * invented for the lab.
 */

export const FIXTURE_JOB = {
  jobNumber: "JOB-1042",
  title: "Maple Street Roof Replacement",
  client: "Sarah Mitchell",
  address: "19 Maple Street, Ottawa, ON",
  status: "Scheduled",
  progress: 72,
  balanceDueCents: 425000,
};

export const FIXTURE_JOB_LONG = {
  jobNumber: "JOB-1108",
  title:
    "Dunmore Property Group — Unit 4B Re-Roof, Full Tear-Off and Standing-Seam Metal Replacement",
  client: "Dunmore Property Group",
  address: "88 Merivale Road Extension, Building C, Suite 400, Nepean, ON K2G 0E9",
  status: "In progress",
  progress: 34,
  balanceDueCents: 0,
};

export const FIXTURE_JOB_MISSING = {
  jobNumber: "JOB-1204",
  title: "Bathroom Vent Repair",
  client: "Tom Reyes",
  address: null as string | null,
  status: "Lead",
  progress: null as number | null,
  balanceDueCents: null as number | null,
};

export const FIXTURE_REQUEST = {
  name: "Sarah Mitchell",
  detail: "Kitchen renovation",
  status: "Contacted / Qualified",
};

export const FIXTURE_QUOTE = {
  number: "Q-0482",
  amountCents: 1600000,
  status: "Changes requested",
};

export const FIXTURE_INVOICE = {
  number: "INV-1048",
  amountCents: 342500,
  status: "Overdue",
};

export const FIXTURE_INVOICE_BALANCE = {
  number: "INV-1091",
  amountCents: 1877500,
  status: "Sent",
};

export const FIXTURE_MEASUREMENT = {
  area: "24.8 sq ft",
  pitch: "6/12",
};

export const FIXTURE_WARRANTY = {
  termMonths: 60,
  confirmedOn: "August 9, 2026",
};

export const FIXTURE_JOB_ROWS = [FIXTURE_JOB, FIXTURE_JOB_LONG, FIXTURE_JOB_MISSING];
