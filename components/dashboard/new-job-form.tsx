"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createJobAction, type NewJobState } from "@/app/(dashboard)/jobs/new/actions";
import { ClientPicker, type ClientSelection } from "@/components/dashboard/client-picker";
import { SubmitButton } from "@/components/dashboard/submit-button";

const FIELD =
  "w-full rounded-xl border bg-ground/50 px-4 py-3 text-ink-primary outline-none transition placeholder:text-ink-muted";

/** Red stroke on the field itself, so the problem is visible without reading. */
function fieldClass(error?: string) {
  return `${FIELD} ${error ? "border-danger focus:border-danger" : "border-hairline focus:border-signal-blue"}`;
}

type Address = {
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
};

const EMPTY_ADDRESS: Address = { addressLine1: "", city: "", province: "", postalCode: "" };

export function NewJobForm() {
  const [state, formAction] = useActionState<NewJobState, FormData>(createJobAction, {});
  const errors = state.fieldErrors ?? {};
  const errorCount = Object.keys(errors).length;
  // Echoed back so reporting a problem never costs someone what they typed.
  const was = (key: string) => state.values?.[key] ?? "";

  const [selection, setSelection] = useState<ClientSelection | null>(null);
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  // Once someone edits the address themselves it stops being ours to overwrite.
  const [addressTouched, setAddressTouched] = useState(false);
  const [addressFromClient, setAddressFromClient] = useState(false);

  function onSelectionChange(next: ClientSelection | null) {
    setSelection(next);

    // Repeat work should need no address typed at all: picking a client whose
    // building we already know fills it in. Never over an address someone typed
    // themselves — a second roof for the same customer is a different building,
    // and the person entering it is the one who knows that.
    if (next?.kind === "existing" && next.client.defaultProperty && !addressTouched) {
      const property = next.client.defaultProperty;
      setAddress({
        addressLine1: property.addressLine1 ?? "",
        city: property.city ?? "",
        province: property.province ?? "",
        postalCode: property.postalCode ?? "",
      });
      setAddressFromClient(true);
      return;
    }

    // Clearing the client clears an address that only arrived because of them.
    if (addressFromClient && !addressTouched) {
      setAddress(EMPTY_ADDRESS);
      setAddressFromClient(false);
    }
  }

  function addressField(key: keyof Address) {
    return {
      value: address[key],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        setAddress((current) => ({ ...current, [key]: event.target.value }));
        setAddressTouched(true);
        setAddressFromClient(false);
      },
    };
  }

  const isNewClient = selection?.kind === "new";

  return (
    <form action={formAction} className="rounded-3xl border border-hairline bg-surface-raised p-6">
      {errorCount > 0 ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger-fg"
        >
          {errorCount === 1
            ? "One thing needs fixing before we can save this job."
            : `${errorCount} things need fixing before we can save this job.`}{" "}
          Nothing you typed has been lost.
        </div>
      ) : null}

      {/* The decision, not the keystrokes: what the picker settled on is what
          the server reads, so a half-typed name can never become a client. */}
      <input
        type="hidden"
        name="clientId"
        value={selection?.kind === "existing" ? selection.client.id : ""}
      />
      <input
        type="hidden"
        name="clientName"
        value={selection?.kind === "new" ? selection.name : ""}
      />
      <input
        type="hidden"
        name="clientIsBusiness"
        value={selection?.kind === "new" && selection.isBusiness ? "true" : ""}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* The client comes first, and it is the only required field on the
            page. Everything below it is something you fill in when you have it. */}
        <div className="md:col-span-2">
          <ClientPicker
            initialQuery={was("clientName")}
            error={errors.client}
            onSelectionChange={onSelectionChange}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="new-job-name" className="mb-2 block text-sm font-medium text-ink-secondary">
            Job name <span className="text-ink-muted">(optional)</span>
          </label>
          <input
            id="new-job-name"
            name="name"
            type="text"
            defaultValue={was("name")}
            placeholder={
              selection
                ? `Job for ${selection.kind === "new" ? selection.name : selection.client.displayName}`
                : "Maple Street full replacement"
            }
            className={fieldClass()}
            aria-describedby="new-job-name-hint"
          />
          {/* A name you have to invent is a name nobody searches for later, and
              inventing one is the last thing standing between a phone call and a
              written-down job. */}
          <p id="new-job-name-hint" className="mt-2 text-xs text-ink-muted">
            Leave it blank and we&rsquo;ll call it{" "}
            {selection
              ? `“Job for ${selection.kind === "new" ? selection.name : selection.client.displayName}”`
              : "“Job for” whoever it’s for"}
            .
          </p>
        </div>

        {/* Only for a client who doesn't exist yet. An existing one already has
            these on file, and re-asking for them is how a one-field form turns
            back into a five-field one. */}
        {isNewClient ? (
          <>
            <div>
              <label
                htmlFor="new-job-clientEmail"
                className="mb-2 block text-sm font-medium text-ink-secondary"
              >
                Email <span className="text-ink-muted">(optional)</span>
              </label>
              <input
                id="new-job-clientEmail"
                name="clientEmail"
                type="email"
                autoComplete="email"
                defaultValue={was("clientEmail")}
                placeholder="client@example.com"
                className={fieldClass()}
              />
            </div>

            <div>
              <label
                htmlFor="new-job-clientPhone"
                className="mb-2 block text-sm font-medium text-ink-secondary"
              >
                Phone <span className="text-ink-muted">(optional)</span>
              </label>
              <input
                id="new-job-clientPhone"
                name="clientPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                defaultValue={was("clientPhone")}
                placeholder="555-123-4567"
                className={fieldClass()}
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="new-job-leadSource"
                className="mb-2 block text-sm font-medium text-ink-secondary"
              >
                How they found you <span className="text-ink-muted">(optional)</span>
              </label>
              <input
                id="new-job-leadSource"
                name="leadSource"
                type="text"
                list="lead-source-suggestions"
                defaultValue={was("leadSource")}
                placeholder="Referral, Google, sign on the truck…"
                className={fieldClass()}
              />
              {/* A datalist, not a select: the list is a shortcut, and a company
                  whose best source is "the hockey rink board" must be able to say so. */}
              <datalist id="lead-source-suggestions">
                <option value="Referral" />
                <option value="Repeat customer" />
                <option value="Google" />
                <option value="Facebook" />
                <option value="Truck or sign" />
                <option value="Door knock" />
                <option value="Home show" />
              </datalist>
            </div>
          </>
        ) : null}

        <div className="md:col-span-2">
          <p className="text-sm font-medium text-ink-secondary">Where the work is</p>
          <p className="mt-1 text-xs text-ink-muted">
            {addressFromClient
              ? "Filled in from this client’s address on file — change it if this job is somewhere else."
              : "Add it later if you don’t have it — you’ll need it before this job can be booked in."}
          </p>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="new-job-addressLine1"
            className="mb-2 block text-sm font-medium text-ink-secondary"
          >
            Address
          </label>
          <input
            id="new-job-addressLine1"
            name="addressLine1"
            type="text"
            autoComplete="address-line1"
            placeholder="145 Maple Street"
            className={fieldClass()}
            {...addressField("addressLine1")}
          />
        </div>

        <div>
          <label htmlFor="new-job-city" className="mb-2 block text-sm font-medium text-ink-secondary">
            City
          </label>
          <input
            id="new-job-city"
            name="city"
            type="text"
            autoComplete="address-level2"
            placeholder="Brampton"
            className={fieldClass()}
            {...addressField("city")}
          />
        </div>

        <div>
          <label
            htmlFor="new-job-province"
            className="mb-2 block text-sm font-medium text-ink-secondary"
          >
            Province
          </label>
          <input
            id="new-job-province"
            name="province"
            type="text"
            autoComplete="address-level1"
            placeholder="ON"
            className={fieldClass()}
            {...addressField("province")}
          />
        </div>

        <div>
          <label
            htmlFor="new-job-postalCode"
            className="mb-2 block text-sm font-medium text-ink-secondary"
          >
            Postal code
          </label>
          <input
            id="new-job-postalCode"
            name="postalCode"
            type="text"
            autoComplete="postal-code"
            placeholder="L6X 0A1"
            className={fieldClass()}
            {...addressField("postalCode")}
          />
        </div>

        <div>
          <label
            htmlFor="new-job-captureSource"
            className="mb-2 block text-sm font-medium text-ink-secondary"
          >
            Capture source
          </label>
          <select
            id="new-job-captureSource"
            name="captureSource"
            defaultValue={was("captureSource") || "MANUAL"}
            className={fieldClass()}
          >
            <option value="MANUAL">Manual</option>
            <option value="DRONE">Drone</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="new-job-notes" className="mb-2 block text-sm font-medium text-ink-secondary">
            Notes
          </label>
          <textarea
            id="new-job-notes"
            name="notes"
            rows={5}
            defaultValue={was("notes")}
            placeholder="What the customer said, roof condition, anything worth remembering…"
            className={fieldClass()}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <SubmitButton
          pendingText="Creating…"
          className="rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-40"
        >
          Create job
        </SubmitButton>

        <Link
          href="/jobs"
          className="rounded-xl border border-hairline bg-surface-raised px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
