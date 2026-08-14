"use client";

import { useState } from "react";
import { ADD_ON_REVIEW_OVERRIDE_REASON_OPTIONS } from "@/lib/format";
import { OVERRIDE_NOTE_MAX, overrideNoteCounterText } from "@/lib/invoice/addon-override";

/**
 * §19.2's override picklist plus its conditional note — shared by the
 * direct-invoice creation form (choosing to skip review up front) and the
 * standalone override form on an already-created review-pending invoice
 * (`AddonOverrideForm`). Fields only, no `<form>`/submit of its own, so each
 * caller can wrap it in whatever action it needs.
 *
 * Only `OWNER_OVERRIDE` gets the strict 20-500 character note, the exact
 * validation copy, and the two-state counter (decisions 22/27/32/37) — the
 * other two reasons are self-explanatory, so their note stays optional and
 * unconstrained.
 */
export function AddOnOverrideFields({
  idPrefix = "override",
  reasonRequired = true,
}: {
  idPrefix?: string;
  /**
   * False in the direct-invoice creation panel: leaving the reason blank
   * there is a real, valid choice — "use the default homeowner-review
   * path" — not a validation error. True in the standalone override form
   * on an already-created invoice, where picking a reason is the entire
   * point of that form.
   */
  reasonRequired?: boolean;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const isOwnerOverride = reason === "OWNER_OVERRIDE";
  const length = note.trim().length;

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-reason`} className="mb-1.5 block text-xs font-medium text-ink-secondary">
          Why skip homeowner review?
        </label>
        <select
          id={`${idPrefix}-reason`}
          name="overrideReason"
          required={reasonRequired}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue"
        >
          <option value="" disabled={reasonRequired}>
            {reasonRequired ? "Pick a reason" : "No override — send for homeowner review"}
          </option>
          {ADD_ON_REVIEW_OVERRIDE_REASON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {reason ? (
        <div>
          <label htmlFor={`${idPrefix}-note`} className="mb-1.5 block text-xs font-medium text-ink-secondary">
            {isOwnerOverride ? "Explain why" : "Anything worth remembering (optional)"}
          </label>
          <textarea
            id={`${idPrefix}-note`}
            name="overrideNote"
            rows={isOwnerOverride ? 4 : 2}
            required={isOwnerOverride}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={isOwnerOverride ? OVERRIDE_NOTE_MAX : undefined}
            className="w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue"
          />
          {isOwnerOverride ? (
            <p className="mt-1.5 text-xs text-ink-muted">{overrideNoteCounterText(length)}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
