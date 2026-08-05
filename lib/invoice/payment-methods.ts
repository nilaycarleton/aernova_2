import { PaymentMethod } from "@prisma/client";

/**
 * How the money came in, in the words it is said in.
 *
 * Ordered by how often a Canadian roofing contractor is actually paid that way,
 * not alphabetically and not by what a payments processor would consider
 * important. E-transfer is first because it is the answer most of the time.
 */
const META: Record<PaymentMethod, { label: string; referenceLabel: string }> = {
  ETRANSFER: { label: "e-Transfer", referenceLabel: "Confirmation number" },
  CHEQUE: { label: "Cheque", referenceLabel: "Cheque number" },
  CASH: { label: "Cash", referenceLabel: "Reference" },
  CARD_OFFLINE: { label: "Card", referenceLabel: "Last 4 digits or receipt no." },
  BANK_TRANSFER: { label: "Bank transfer", referenceLabel: "Reference" },
  STRIPE: { label: "Paid online", referenceLabel: "Stripe payment" },
  OTHER: { label: "Other", referenceLabel: "Reference" },
};

/**
 * The methods a person may choose from — deliberately shorter than the enum.
 *
 * `STRIPE` is missing and that is the point: it means *paid through this
 * product*, and it only ever becomes true because a webhook said so. Offering
 * it on a form would let somebody hand-record a payment we never actually
 * processed, and the one distinction Phase 5b needs — collected online versus
 * collected in a driveway — would be worthless from day one.
 */
export const MANUAL_PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.ETRANSFER,
  PaymentMethod.CHEQUE,
  PaymentMethod.CASH,
  PaymentMethod.CARD_OFFLINE,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.OTHER,
];

export function paymentMethodLabel(method: PaymentMethod): string {
  return META[method]?.label ?? "Payment";
}

/**
 * What to call the reference field once a method is picked. "Cheque number" is
 * a question somebody can answer; "Reference" is one they have to interpret.
 */
export function paymentReferenceLabel(method: PaymentMethod): string {
  return META[method]?.referenceLabel ?? "Reference";
}

export function isManualPaymentMethod(value: string): value is PaymentMethod {
  return (MANUAL_PAYMENT_METHODS as string[]).includes(value);
}
