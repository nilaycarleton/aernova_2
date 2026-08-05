"use client";

import { useActionState } from "react";
import {
  createPublicRequestAction,
  type PublicRequestState,
} from "@/app/(public)/request/[companySlug]/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

const FIELD =
  "mt-2 w-full rounded-xl border border-paper-rule-strong bg-paper-document px-3 py-2.5 text-sm text-paper-ink outline-none transition placeholder:text-paper-ink-faint focus:border-signal-blue";

function fieldClass(error?: string) {
  return error ? `${FIELD} border-danger focus:border-danger` : FIELD;
}

/**
 * Item 45's form, as the person asking for work fills it in.
 *
 * Fewer fields than the office's own `NewRequestForm` on purpose: no client
 * picker (this person has never seen the company's client list and never
 * should — that's a different kind of leak than a wrong guess), no lead
 * source (they don't know or care what that means; the form itself is the
 * source), no backdating a request that's happening right now.
 */
export function RequestForm({ companySlug }: { companySlug: string }) {
  const [state, formAction] = useActionState<PublicRequestState, FormData>(
    createPublicRequestAction,
    {}
  );

  if (state.success) {
    return (
      <div className="mt-8 rounded-2xl border border-paper-rule bg-paper-inset p-6">
        <p className="font-semibold text-paper-ink">Thanks — that&rsquo;s sent.</p>
        <p className="mt-2 text-sm leading-6 text-paper-ink-muted">
          They&rsquo;ll be in touch. No account, no password — this page is all you needed.
        </p>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};
  const was = (key: string) => state.values?.[key] ?? "";

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {state.formError ? (
        <p role="alert" className="text-sm text-danger-fg">
          {state.formError}
        </p>
      ) : null}

      <input type="hidden" name="companySlug" value={companySlug} />

      {/* Honeypot. Clipped to nothing and out of the tab order for everyone
          — sighted or on a screen reader — a real person never reaches it,
          so anything filled in here came from a script filling every input
          it found. `h-px w-px overflow-hidden` rather than pushing it
          off-screen: a huge negative offset can widen the page's own
          scrollable area if an ancestor isn't positioned. */}
      <div className="absolute h-px w-px overflow-hidden whitespace-nowrap" aria-hidden="true">
        <label htmlFor="request-website">Your website</label>
        <input
          id="request-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="request-name" className="block text-sm font-medium text-paper-ink-strong">
          Your name
        </label>
        <input
          id="request-name"
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={was("name")}
          placeholder="Dave Chen"
          className={fieldClass(errors.name)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "request-name-error" : undefined}
        />
        {errors.name ? (
          <p id="request-name-error" className="mt-1.5 text-xs text-danger-fg">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="request-title" className="block text-sm font-medium text-paper-ink-strong">
          What do you need?
        </label>
        <input
          id="request-title"
          name="title"
          type="text"
          defaultValue={was("title")}
          placeholder="Leak over the kitchen after the storm"
          className={fieldClass(errors.title)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? "request-title-error" : undefined}
        />
        {errors.title ? (
          <p id="request-title-error" className="mt-1.5 text-xs text-danger-fg">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="request-description"
          className="block text-sm font-medium text-paper-ink-strong"
        >
          Anything else <span className="text-paper-ink-faint">(optional)</span>
        </label>
        <textarea
          id="request-description"
          name="description"
          rows={3}
          defaultValue={was("description")}
          placeholder="Two-storey, happened after last week's storm…"
          className={fieldClass()}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="request-phone" className="block text-sm font-medium text-paper-ink-strong">
            Phone
          </label>
          <input
            id="request-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={was("phone")}
            placeholder="555-123-4567"
            className={fieldClass()}
          />
        </div>
        <div>
          <label htmlFor="request-email" className="block text-sm font-medium text-paper-ink-strong">
            Email
          </label>
          <input
            id="request-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={was("email")}
            placeholder="dave@example.com"
            className={fieldClass(errors.email)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "request-email-error" : undefined}
          />
        </div>
      </div>
      {errors.email ? <p className="text-xs text-danger-fg">{errors.email}</p> : null}
      <p className="text-xs text-paper-ink-faint">Leave a phone number or an email — either works.</p>

      <div>
        <p className="text-sm font-medium text-paper-ink-strong">
          Where <span className="text-paper-ink-faint">(optional)</span>
        </p>
        <input
          name="addressLine1"
          type="text"
          autoComplete="address-line1"
          defaultValue={was("addressLine1")}
          placeholder="145 Maple Street"
          className={fieldClass()}
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            name="city"
            type="text"
            autoComplete="address-level2"
            defaultValue={was("city")}
            placeholder="Brampton"
            className={`${fieldClass()} mt-0`}
          />
          <input
            name="province"
            type="text"
            autoComplete="address-level1"
            defaultValue={was("province")}
            placeholder="ON"
            className={`${fieldClass()} mt-0`}
          />
          <input
            name="postalCode"
            type="text"
            autoComplete="postal-code"
            defaultValue={was("postalCode")}
            placeholder="L6X 0A1"
            className={`${fieldClass()} mt-0`}
          />
        </div>
      </div>

      <SubmitButton
        pendingText="Sending…"
        className="w-full rounded-xl bg-paper-ink px-4 py-3 text-sm font-semibold text-paper-document transition hover:bg-paper-ink-strong disabled:opacity-60 sm:w-auto"
      >
        Send it
      </SubmitButton>
    </form>
  );
}
