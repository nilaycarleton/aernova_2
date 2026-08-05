/**
 * Where an invoice's bill goes, when that isn't where the work was done.
 *
 * Six nullable columns on `Invoice`, all null in the common case: null means
 * "use the property address", the same idiom `Property.taxRateId` already
 * uses for "use the company default", rather than a boolean sitting beside a
 * copy of the address it agrees with. A column gets set only once a
 * contractor unchecks "Same as the property address" on the invoice, and from
 * then on it is what's billed against — the property moving afterwards must
 * not silently redirect where a cheque addressed to it gets mailed.
 */
import { formatAddress, type AddressParts } from "../client-matching.ts";

export type BillingAddressColumns = {
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingCity: string | null;
  billingProvince: string | null;
  billingPostalCode: string | null;
};

export type FullAddressParts = AddressParts & { addressLine2?: string | null };

/** True once the invoice has its own address, distinct from the property's. */
export function hasBillingOverride(invoice: BillingAddressColumns): boolean {
  return (
    invoice.billingAddressLine1 != null ||
    invoice.billingAddressLine2 != null ||
    invoice.billingCity != null ||
    invoice.billingProvince != null ||
    invoice.billingPostalCode != null
  );
}

/** The address this invoice is actually billed to: its own, or the property's. */
export function effectiveBillingAddress(
  invoice: BillingAddressColumns,
  property: FullAddressParts
): FullAddressParts {
  if (!hasBillingOverride(invoice)) return property;
  return {
    addressLine1: invoice.billingAddressLine1,
    addressLine2: invoice.billingAddressLine2,
    city: invoice.billingCity,
    province: invoice.billingProvince,
    postalCode: invoice.billingPostalCode,
  };
}

/**
 * One line, unit included. `formatAddress` drops `addressLine2` outright — it
 * was never load-bearing for a work-site address — but a billing address is
 * the one place a suite or unit number is often the difference between an
 * envelope reaching a property manager and reaching an empty mailbox.
 */
export function formatBillingAddress(parts: FullAddressParts): string | null {
  return formatAddress({
    ...parts,
    addressLine1: [parts.addressLine1, parts.addressLine2].filter(Boolean).join(", ") || null,
  });
}
