/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §14.4/§20/§23/§25 Phase 10 — pure display
 * and snapshot logic, kept out of the actions and components the same way
 * `lib/quote-status.ts`/`lib/invoice/status.ts` keep their own status
 * tables pure. A database enum never reaches a screen; that rule applies
 * here too.
 */
import type { WarrantyStatus } from "@prisma/client";
import type { StatusTone } from "@/lib/status-tone";

export function warrantyTermLabel(termMonths: number): string {
  if (termMonths > 0 && termMonths % 12 === 0) {
    const years = termMonths / 12;
    return `${years} ${years === 1 ? "year" : "years"}`;
  }
  return `${termMonths} ${termMonths === 1 ? "month" : "months"}`;
}

type WarrantyStatusMeta = {
  label: string;
  /** What it means, in the words a roofer would use. */
  hint: string;
  /** Feeds the shared Status primitive (components/ui/status.tsx) — this table still owns the mapping, per Phase 3's "*_STATUS_META continues to own label/tone" doctrine. */
  tone: StatusTone;
};

export const WARRANTY_STATUS_META: Record<WarrantyStatus, WarrantyStatusMeta> = {
  DRAFT: {
    label: "Draft",
    hint: "Not reviewed yet. Nobody but your office has seen this.",
    tone: "neutral",
  },
  REVIEWED: {
    label: "Reviewed",
    hint: "Reviewed internally. Ready to send.",
    tone: "info",
  },
  SENT: {
    label: "Sent",
    hint: "Sent. They haven't opened it yet.",
    tone: "info",
  },
  VIEWED: {
    label: "Opened",
    hint: "They've read it. No acknowledgement yet.",
    tone: "info",
  },
  CONFIRMED: {
    label: "Confirmed",
    hint: "They confirmed they received it.",
    tone: "success",
  },
};

export function warrantyStatusLabel(status: WarrantyStatus): string {
  return WARRANTY_STATUS_META[status]?.label ?? "Draft";
}

/**
 * §23's correction doctrine: a confirmed row is frozen, same as `Quote`
 * staying frozen post-approval. Phase 10's own documented deferral (see
 * `WORKFLOW_PHASE_10_IMPLEMENTATION.md`) means there is no "make a
 * corrected version" path yet — only this: once true, always true, and
 * every write path checks it before touching the row.
 */
export function isWarrantyEditable(status: WarrantyStatus): boolean {
  return status !== "CONFIRMED";
}

/** §20's linear flow: a warranty goes out only once the office has reviewed it, never straight from a draft. */
export function canSendWarranty(status: WarrantyStatus): boolean {
  return status === "REVIEWED";
}

export type CompanySnapshotFacts = {
  name: string;
  legalName: string | null;
  licenceNumber: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
};

/**
 * Frozen onto the `Warranty` row at creation — a real copy, not a live
 * join, same "pre-filled, then reviewed" doctrine `Quote`'s intro/body
 * fields already use. The document header's logo/name still reads the
 * live `Company` relation (see `DocumentBrand`'s own callers); this is the
 * free-text company-information block shown in the document body.
 */
export function buildCompanyInfoSnapshot(company: CompanySnapshotFacts): string {
  const lines: string[] = [company.legalName || company.name];
  if (company.licenceNumber) lines.push(`Licence #${company.licenceNumber}`);
  const address = [company.addressLine1, company.city, company.province, company.postalCode]
    .filter(Boolean)
    .join(", ");
  if (address) lines.push(address);
  if (company.phone) lines.push(company.phone);
  if (company.email) lines.push(company.email);
  return lines.join("\n");
}

export type CustomerSnapshotFacts = { name: string; email: string | null; phone: string | null };

export function buildCustomerInfoSnapshot(customer: CustomerSnapshotFacts): string {
  const lines: string[] = [customer.name];
  if (customer.phone) lines.push(customer.phone);
  if (customer.email) lines.push(customer.email);
  return lines.join("\n");
}
