"use client";

import { useEffect, useRef, useState } from "react";
import { updateInvoiceBillingAddressAction } from "@/app/(dashboard)/jobs/[jobId]/invoices/[invoiceId]/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

export type BillingAddressFields = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
};

/**
 * Item 34b. Checked by default, because most invoices are billed to the
 * property itself — that is what "no override on the invoice yet" means. A
 * real checkbox rather than a link, so its state is legible without reading
 * the fields beneath it: checked, this invoice follows the property; unchecked,
 * it has its own address as of the moment somebody typed one in.
 *
 * Unchecking starts the fields with the property's own address rather than
 * blank ones — most billing-address overrides are a small edit (add a suite
 * number, change one line for a property manager), not a fresh address typed
 * from nothing.
 */
export function InvoiceBillingAddress({
  jobId,
  invoiceId,
  property,
  propertyFormatted,
  override,
}: {
  jobId: string;
  invoiceId: string;
  property: BillingAddressFields;
  /** The property address, on one line, for display while the checkbox is checked. */
  propertyFormatted: string | null;
  override: BillingAddressFields | null;
}) {
  const [sameAsProperty, setSameAsProperty] = useState(override === null);
  const starting = override ?? property;

  // Same reasoning as the payments disclosure: a keyboard user who just
  // unchecked the box should land in the first field it revealed, not fall
  // off the document. `toggledByUser` keeps the initial render — which may
  // already start unchecked, if an override exists — from stealing focus
  // nobody asked for.
  const line1Ref = useRef<HTMLInputElement>(null);
  const toggledByUser = useRef(false);
  useEffect(() => {
    if (!sameAsProperty && toggledByUser.current) line1Ref.current?.focus();
  }, [sameAsProperty]);

  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-ink-secondary">
        <input
          type="checkbox"
          checked={sameAsProperty}
          onChange={(event) => {
            toggledByUser.current = true;
            setSameAsProperty(event.target.checked);
          }}
          className="h-4 w-4 rounded border-hairline accent-signal-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        />
        Same as the property address
      </label>

      <form action={updateInvoiceBillingAddressAction} className="mt-3 space-y-3">
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <input type="hidden" name="sameAsProperty" value={sameAsProperty ? "true" : "false"} />

        {sameAsProperty ? (
          <p className="text-sm text-ink-muted">
            {propertyFormatted ?? "No property address on file yet."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Address" className="sm:col-span-2">
              <input
                ref={line1Ref}
                name="addressLine1"
                defaultValue={starting.addressLine1}
                className={inputClass}
              />
            </Field>
            <Field label="Unit / suite" hint="Optional." className="sm:col-span-2">
              <input name="addressLine2" defaultValue={starting.addressLine2} className={inputClass} />
            </Field>
            <Field label="City">
              <input name="city" defaultValue={starting.city} className={inputClass} />
            </Field>
            <Field label="Province">
              <input name="province" defaultValue={starting.province} className={inputClass} />
            </Field>
            <Field label="Postal code">
              <input name="postalCode" defaultValue={starting.postalCode} className={inputClass} />
            </Field>
          </div>
        )}

        <SubmitButton
          pendingText="Saving…"
          className="rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
        >
          Save
        </SubmitButton>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue";

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-sm font-medium text-ink-secondary">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}
