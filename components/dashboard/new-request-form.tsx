"use client";

import { useActionState, useState } from "react";
import { createRequestAction, type NewRequestState } from "@/app/(dashboard)/requests/actions";
import { ClientPicker, type ClientSelection } from "@/components/dashboard/client-picker";
import { SubmitButton } from "@/components/dashboard/submit-button";

const FIELD =
  "w-full rounded-lg border bg-ground/50 px-4 py-3 text-ink-primary outline-none transition placeholder:text-ink-muted";

function fieldClass(error?: string) {
  return `${FIELD} ${error ? "border-danger focus:border-danger" : "border-hairline focus:border-signal-blue"}`;
}

/**
 * The same shape as the job form, deliberately: same picker, same echo-back on
 * error, same "everything below the fold is optional". Somebody who has taken
 * one phone call in this product should not have to learn a second form to
 * take the next one.
 *
 * The one difference is which field is required. A job can be nameless — "Job
 * for Dave Chen" is a usable name. A request cannot: "Dave Chen wants
 * something" tells you nothing you didn't know from the missed call.
 */
export function NewRequestForm() {
  const [state, formAction] = useActionState<NewRequestState, FormData>(
    createRequestAction,
    {}
  );
  const errors = state.fieldErrors ?? {};
  const errorCount = Object.keys(errors).length;
  const was = (key: string) => state.values?.[key] ?? "";

  const [selection, setSelection] = useState<ClientSelection | null>(null);
  const isNewClient = selection?.kind === "new";

  return (
    <form action={formAction} className="rounded-lg border border-hairline bg-surface-raised p-6">
      {errorCount > 0 ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger-fg"
        >
          {errorCount === 1
            ? "One thing needs fixing before we can save this."
            : `${errorCount} things need fixing before we can save this.`}{" "}
          Nothing you typed has been lost.
        </div>
      ) : null}

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
        <div className="md:col-span-2">
          <ClientPicker
            initialQuery={was("clientName")}
            error={errors.client}
            onSelectionChange={setSelection}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="new-request-title" className="mb-2 block text-sm font-medium text-ink-secondary">
            What do they want?
          </label>
          <input
            id="new-request-title"
            name="title"
            type="text"
            defaultValue={was("title")}
            placeholder="Leak over the kitchen after the storm"
            className={fieldClass(errors.title)}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? "new-request-title-error" : undefined}
          />
          {errors.title ? (
            <p id="new-request-title-error" className="mt-2 text-sm text-danger-fg">
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="new-request-description"
            className="mb-2 block text-sm font-medium text-ink-secondary"
          >
            Anything else they said <span className="text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="new-request-description"
            name="description"
            rows={4}
            defaultValue={was("description")}
            placeholder="Two-storey, been up there himself, wants it looked at before the weekend…"
            className={fieldClass()}
          />
        </div>

        <div>
          <label htmlFor="new-request-source" className="mb-2 block text-sm font-medium text-ink-secondary">
            How it came in <span className="text-ink-muted">(optional)</span>
          </label>
          <input
            id="new-request-source"
            name="source"
            type="text"
            list="request-source-suggestions"
            defaultValue={was("source")}
            placeholder="Phone, referral, website…"
            className={fieldClass()}
          />
          {/* A datalist, not a select — same reason as the job form's lead
              source: a company whose best source is the hockey rink board has
              to be able to say so. */}
          <datalist id="request-source-suggestions">
            <option value="Phone" />
            <option value="Text" />
            <option value="Email" />
            <option value="Referral" />
            <option value="Website" />
            <option value="Repeat customer" />
            <option value="Door knock" />
          </datalist>
        </div>

        <div>
          <label
            htmlFor="new-request-requestedAt"
            className="mb-2 block text-sm font-medium text-ink-secondary"
          >
            When they asked <span className="text-ink-muted">(optional)</span>
          </label>
          <input
            id="new-request-requestedAt"
            name="requestedAt"
            type="date"
            defaultValue={was("requestedAt")}
            className={fieldClass(errors.requestedAt)}
            aria-invalid={errors.requestedAt ? true : undefined}
            aria-describedby="new-request-requestedAt-hint"
          />
          {/* A voicemail left Saturday and typed in Monday is a two-day-old
              request, and how long someone has been waiting is the only urgent
              thing on the requests page. */}
          <p id="new-request-requestedAt-hint" className="mt-2 text-xs text-ink-muted">
            {errors.requestedAt ?? "Leave blank for today. Backdate it if the message sat over a weekend."}
          </p>
        </div>

        {isNewClient ? (
          <>
            <div>
              <label
                htmlFor="new-request-clientPhone"
                className="mb-2 block text-sm font-medium text-ink-secondary"
              >
                Phone <span className="text-ink-muted">(optional)</span>
              </label>
              <input
                id="new-request-clientPhone"
                name="clientPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                defaultValue={was("clientPhone")}
                placeholder="555-123-4567"
                className={fieldClass()}
              />
            </div>

            <div>
              <label
                htmlFor="new-request-clientEmail"
                className="mb-2 block text-sm font-medium text-ink-secondary"
              >
                Email <span className="text-ink-muted">(optional)</span>
              </label>
              <input
                id="new-request-clientEmail"
                name="clientEmail"
                type="email"
                autoComplete="email"
                defaultValue={was("clientEmail")}
                placeholder="client@example.com"
                className={fieldClass()}
              />
            </div>
          </>
        ) : null}

        <div className="md:col-span-2">
          <p className="text-sm font-medium text-ink-secondary">Where the work is</p>
          <p className="mt-1 text-xs text-ink-muted">
            Skip it if they didn&rsquo;t say — you&rsquo;ll need it before anyone can be sent
            there.
          </p>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="new-request-addressLine1"
            className="mb-2 block text-sm font-medium text-ink-secondary"
          >
            Address
          </label>
          <input
            id="new-request-addressLine1"
            name="addressLine1"
            type="text"
            autoComplete="address-line1"
            defaultValue={was("addressLine1")}
            placeholder="145 Maple Street"
            className={fieldClass()}
          />
        </div>

        <div>
          <label htmlFor="new-request-city" className="mb-2 block text-sm font-medium text-ink-secondary">
            City
          </label>
          <input
            id="new-request-city"
            name="city"
            type="text"
            autoComplete="address-level2"
            defaultValue={was("city")}
            placeholder="Brampton"
            className={fieldClass()}
          />
        </div>

        <div>
          <label
            htmlFor="new-request-province"
            className="mb-2 block text-sm font-medium text-ink-secondary"
          >
            Province
          </label>
          <input
            id="new-request-province"
            name="province"
            type="text"
            autoComplete="address-level1"
            defaultValue={was("province")}
            placeholder="ON"
            className={fieldClass()}
          />
        </div>

        <div>
          <label
            htmlFor="new-request-postalCode"
            className="mb-2 block text-sm font-medium text-ink-secondary"
          >
            Postal code
          </label>
          <input
            id="new-request-postalCode"
            name="postalCode"
            type="text"
            autoComplete="postal-code"
            defaultValue={was("postalCode")}
            placeholder="L6X 0A1"
            className={fieldClass()}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <SubmitButton
          pendingText="Saving…"
          className="rounded-md bg-action px-6 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active disabled:opacity-60"
        >
          Save request
        </SubmitButton>
        <p className="text-sm text-ink-muted">
          You can turn it into a job in one click when they say yes.
        </p>
      </div>
    </form>
  );
}
