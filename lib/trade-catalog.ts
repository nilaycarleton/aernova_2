/**
 * What a company starts with: a service catalog for its trade, and the taxes it
 * charges where it works.
 *
 * These are *starting points a contractor edits*, not settings the product
 * enforces. `lib/pricing-template.ts` — one shingle price, one labour rate and
 * one 13% tax for every company in the country — is what this replaces. Every
 * number below lands in that company's own `Service` and `TaxRate` rows the
 * first time they sign in, and from that moment it is theirs.
 *
 * Roofing is filled out because it is the trade being sold to first. Plumbing
 * and lawn care are deliberately thin: they exist to prove the product carries
 * no roofing assumptions — one trade whose work happens once, one whose work
 * repeats — and a real plumber would price them again on day one.
 */
import { Trade } from "@prisma/client";
// Relative, with the extension, like lib/reconstruction.ts: this file is
// covered by a node --test suite, which cannot resolve the "@/" alias.
import { percentToMicros, type RateMicros } from "./money.ts";

export type CatalogService = {
  name: string;
  description?: string;
  /** What the client pays per unit, in cents. */
  unitPriceCents: number;
  /** What it costs the contractor per unit, in cents. Omitted when it varies. */
  unitCostCents?: number;
  unit: string;
  category: string;
  taxable?: boolean;
};

/**
 * A roofing catalog priced per square (100 sq ft), which is the unit the trade
 * quotes and estimates in, so a measured roof multiplies straight into a quote.
 */
const ROOFING: CatalogService[] = [
  {
    name: "Tear-off — existing shingles",
    description: "Remove existing layer, protect landscaping, magnet sweep.",
    unitPriceCents: 12_500,
    unitCostCents: 7_000,
    unit: "square",
    category: "Tear-off & disposal",
  },
  {
    name: "Disposal & bin",
    description: "Bin rental and dump fees.",
    unitPriceCents: 75_000,
    unitCostCents: 55_000,
    unit: "each",
    category: "Tear-off & disposal",
  },
  {
    name: "Architectural shingles — supply & install",
    unitPriceCents: 47_500,
    unitCostCents: 30_000,
    unit: "square",
    category: "Roofing",
  },
  {
    name: "Synthetic underlayment",
    unitPriceCents: 6_500,
    unitCostCents: 3_800,
    unit: "square",
    category: "Roofing",
  },
  {
    name: "Ice & water shield",
    description: "Eaves, valleys and penetrations, per code.",
    unitPriceCents: 9_500,
    unitCostCents: 5_800,
    unit: "square",
    category: "Roofing",
  },
  {
    name: "Starter strip",
    unitPriceCents: 450,
    unitCostCents: 260,
    unit: "linear ft",
    category: "Roofing",
  },
  {
    name: "Ridge cap shingles",
    unitPriceCents: 950,
    unitCostCents: 580,
    unit: "linear ft",
    category: "Roofing",
  },
  {
    name: "Drip edge",
    unitPriceCents: 650,
    unitCostCents: 350,
    unit: "linear ft",
    category: "Flashing & trim",
  },
  {
    name: "Valley liner",
    unitPriceCents: 850,
    unitCostCents: 425,
    unit: "linear ft",
    category: "Flashing & trim",
  },
  {
    name: "Chimney flashing — re-flash",
    unitPriceCents: 65_000,
    unitCostCents: 28_000,
    unit: "each",
    category: "Flashing & trim",
  },
  {
    name: "Plywood sheathing replacement",
    description: "Priced per sheet, billed only for what is replaced.",
    unitPriceCents: 12_500,
    unitCostCents: 7_500,
    unit: "sheet",
    category: "Deck repair",
  },
  {
    name: "Roof vent — install",
    unitPriceCents: 14_500,
    unitCostCents: 6_500,
    unit: "each",
    category: "Ventilation",
  },
  {
    name: "Ridge vent",
    unitPriceCents: 1_850,
    unitCostCents: 900,
    unit: "linear ft",
    category: "Ventilation",
  },
  {
    name: "Roof repair — labour",
    unitPriceCents: 12_500,
    unitCostCents: 6_500,
    unit: "hour",
    category: "Repairs",
  },
  {
    name: "Roof inspection",
    description: "Site visit, photos and a written condition report.",
    unitPriceCents: 25_000,
    unit: "each",
    category: "Repairs",
  },
];

/** A one-off trade: nothing here repeats on a schedule. */
const PLUMBING: CatalogService[] = [
  {
    name: "Service call",
    description: "Diagnosis and first hour on site.",
    unitPriceCents: 18_500,
    unitCostCents: 7_500,
    unit: "each",
    category: "Service",
  },
  {
    name: "Labour — journeyman",
    unitPriceCents: 13_500,
    unitCostCents: 6_800,
    unit: "hour",
    category: "Service",
  },
  {
    name: "Drain clearing — snake",
    unitPriceCents: 32_500,
    unit: "each",
    category: "Drains",
  },
  {
    name: "Faucet replacement — supply & install",
    unitPriceCents: 42_500,
    unitCostCents: 18_000,
    unit: "each",
    category: "Fixtures",
  },
  {
    name: "Water heater — supply & install",
    unitPriceCents: 195_000,
    unitCostCents: 120_000,
    unit: "each",
    category: "Fixtures",
  },
  {
    name: "After-hours call-out",
    unitPriceCents: 27_500,
    unit: "each",
    category: "Service",
  },
];

/** A recurring trade: most of this is sold as a season, not as a visit. */
const LAWN_CARE: CatalogService[] = [
  {
    name: "Lawn mowing — standard lot",
    description: "Cut, trim, edge and blow. Priced per visit.",
    unitPriceCents: 5_500,
    unitCostCents: 2_200,
    unit: "visit",
    category: "Maintenance",
  },
  {
    name: "Lawn mowing — large lot",
    unitPriceCents: 8_500,
    unitCostCents: 3_400,
    unit: "visit",
    category: "Maintenance",
  },
  {
    name: "Spring cleanup",
    unitPriceCents: 27_500,
    unitCostCents: 11_000,
    unit: "each",
    category: "Seasonal",
  },
  {
    name: "Fall cleanup — leaf removal",
    unitPriceCents: 32_500,
    unitCostCents: 13_000,
    unit: "each",
    category: "Seasonal",
  },
  {
    name: "Fertilizer application",
    unitPriceCents: 9_500,
    unitCostCents: 3_800,
    unit: "visit",
    category: "Treatments",
  },
  {
    name: "Hedge trimming",
    unitPriceCents: 8_500,
    unitCostCents: 3_500,
    unit: "hour",
    category: "Maintenance",
  },
];

const CATALOGS: Record<Trade, CatalogService[]> = {
  [Trade.ROOFING]: ROOFING,
  [Trade.PLUMBING]: PLUMBING,
  [Trade.LAWN_CARE]: LAWN_CARE,
  // A general contractor gets no assumed prices. An empty catalog is honest;
  // an invented one is a number they might send to a customer by accident.
  [Trade.GENERAL]: [],
};

export function catalogForTrade(trade: Trade): CatalogService[] {
  return CATALOGS[trade] ?? [];
}

/** Plain-language labels for the closed `Trade` set — /onboarding and Settings both render this list. */
export const TRADE_OPTIONS: { value: Trade; label: string }[] = [
  { value: Trade.ROOFING, label: "Roofing" },
  { value: Trade.PLUMBING, label: "Plumbing" },
  { value: Trade.LAWN_CARE, label: "Lawn care" },
  { value: Trade.GENERAL, label: "General contracting" },
];

export type CatalogTaxRate = {
  name: string;
  rateMicros: RateMicros;
  /** True for the rate applied to new quotes and invoices by default. */
  isDefault?: boolean;
};

const GST: CatalogTaxRate = { name: "GST", rateMicros: percentToMicros(5), isDefault: true };

/**
 * What a contractor charges, by the province they work in. Correct as of the
 * 2025 rates — Nova Scotia's HST came down to 14% in April 2025 — and every one
 * of them is editable, because a tax table baked into a build is a tax table
 * that goes stale between releases.
 *
 * Provinces with a PST get two rows rather than one combined 12%, because the
 * two taxes have different registration numbers, different remittances, and in
 * some trades different exemptions. A contractor's accountant needs them apart.
 */
export const TAX_RATES_BY_PROVINCE: Record<string, CatalogTaxRate[]> = {
  AB: [GST],
  NT: [GST],
  NU: [GST],
  YT: [GST],
  BC: [GST, { name: "PST", rateMicros: percentToMicros(7) }],
  SK: [GST, { name: "PST", rateMicros: percentToMicros(6) }],
  MB: [GST, { name: "RST", rateMicros: percentToMicros(7) }],
  QC: [GST, { name: "QST", rateMicros: percentToMicros(9.975) }],
  ON: [{ name: "HST", rateMicros: percentToMicros(13), isDefault: true }],
  NB: [{ name: "HST", rateMicros: percentToMicros(15), isDefault: true }],
  NL: [{ name: "HST", rateMicros: percentToMicros(15), isDefault: true }],
  PE: [{ name: "HST", rateMicros: percentToMicros(15), isDefault: true }],
  NS: [{ name: "HST", rateMicros: percentToMicros(14), isDefault: true }],
};

/** Every code `TAX_RATES_BY_PROVINCE` knows, with the full name /onboarding and Settings show — English order Canada Post itself uses. */
export const PROVINCE_OPTIONS: { value: string; label: string }[] = [
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "YT", label: "Yukon" },
];

/**
 * Normalize whatever was typed into a two-letter province code. Contractors
 * write "Ontario", "ON", "ont." — all of which mean HST 13.
 */
export function provinceCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim().toLowerCase().replace(/\./g, "");
  const names: Record<string, string> = {
    alberta: "AB",
    "british columbia": "BC",
    bc: "BC",
    manitoba: "MB",
    "new brunswick": "NB",
    "newfoundland and labrador": "NL",
    newfoundland: "NL",
    "nova scotia": "NS",
    "northwest territories": "NT",
    nunavut: "NU",
    ontario: "ON",
    ont: "ON",
    "prince edward island": "PE",
    quebec: "QC",
    québec: "QC",
    saskatchewan: "SK",
    yukon: "YT",
  };
  if (names[value]) return names[value];
  const upper = value.toUpperCase();
  return upper in TAX_RATES_BY_PROVINCE ? upper : null;
}

/**
 * The taxes to start a company with. An unknown province falls back to GST
 * alone — it is the one tax every Canadian contractor charges, so it is right
 * everywhere and complete nowhere, which is the safe direction to be wrong in.
 */
export function taxRatesForProvince(province: string | null | undefined): CatalogTaxRate[] {
  const code = provinceCode(province);
  return (code && TAX_RATES_BY_PROVINCE[code]) || [GST];
}
