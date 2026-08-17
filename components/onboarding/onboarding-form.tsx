"use client";

import { useState } from "react";
import type { Trade } from "@prisma/client";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { completeOnboardingAction } from "@/app/onboarding/actions";

const selectClass =
  "w-full rounded-lg border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument";

export type OnboardingTemplateCard = {
  id: string;
  trade: Trade;
  name: string;
  /** Plain-language summary of what this template hides, e.g. "Hides: Processing". Null if nothing's hidden. */
  hidesSummary: string | null;
  /** Plain-language summary of what this template renames, e.g. "Ready for quote → Ready to price". Null if nothing's renamed. */
  renamesSummary: string | null;
};

/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §14.6/§15/§16/§25 Phase 11 — the second
 * onboarding step, added to what was previously a one-shot trade+province
 * form. Both steps live in one `<form>` so the whole thing submits once,
 * at the end — step 1's inputs stay mounted (just visually hidden) while
 * step 2 is showing, so their values are still part of the same submit.
 *
 * Cards, not a table; no drag-and-drop; no custom-stage authoring — a
 * company picks a starting point here and can still rename/hide stages
 * later from Settings → Workflow (`app/(dashboard)/settings/workflow`).
 */
export function OnboardingForm({
  tradeOptions,
  provinceOptions,
  templates,
}: {
  tradeOptions: { value: Trade; label: string }[];
  provinceOptions: { value: string; label: string }[];
  templates: OnboardingTemplateCard[];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [trade, setTrade] = useState<Trade | "">("");
  const [province, setProvince] = useState("");
  const [templateId, setTemplateId] = useState("");

  const tradeTemplates = templates.filter((t) => t.trade === trade);

  const continueToStep2 = () => {
    if (!trade || !province) return;
    // Default to the trade's own template — the common case is confirming
    // it, not hunting for it, since v1 ships exactly one per trade.
    setTemplateId((current) => current || tradeTemplates[0]?.id || "");
    setStep(2);
  };

  return (
    <form action={completeOnboardingAction} className="mt-6">
      {/* Focused Entry mode's one required affordance for a multi-step flow
          (Premium UI Redesign Phase 6 §51) — this was a silent two-step form
          before, with no indication a second screen was coming. */}
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-ink-muted" aria-live="polite">
        Step {step} of 2
      </p>

      <div className={step === 1 ? "space-y-5" : "hidden"}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-secondary">
            What&apos;s your trade?
          </span>
          <select
            name="trade"
            required
            value={trade}
            onChange={(e) => {
              setTrade(e.target.value as Trade);
              setTemplateId("");
            }}
            className={selectClass}
          >
            <option value="" disabled>
              Choose one
            </option>
            {tradeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-secondary">
            What province do you work in?
          </span>
          <select
            name="province"
            required
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className={selectClass}
          >
            <option value="" disabled>
              Choose one
            </option>
            {provinceOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={continueToStep2}
          disabled={!trade || !province}
          className="w-full rounded-md bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-50"
        >
          Continue
        </button>
      </div>

      {step === 2 ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-ink-secondary">What&apos;s your workflow?</p>
            <p className="mt-1 text-xs text-ink-muted">
              You can rename or hide stages any time later, in Settings.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="sr-only">Workflow template</legend>
            {tradeTemplates.map((t) => (
              <label
                key={t.id}
                className={`block cursor-pointer rounded-lg border p-4 transition ${
                  templateId === t.id
                    ? "border-signal-blue/40 bg-signal-blue/10"
                    : "border-hairline hover:bg-surface-lifted"
                }`}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="workflowTemplateId"
                    value={t.id}
                    checked={templateId === t.id}
                    onChange={() => setTemplateId(t.id)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink-primary">{t.name}</span>
                    {t.hidesSummary ? (
                      <span className="mt-1 block text-xs text-ink-muted">{t.hidesSummary}</span>
                    ) : null}
                    {t.renamesSummary ? (
                      <span className="mt-1 block text-xs text-ink-muted">{t.renamesSummary}</span>
                    ) : null}
                  </span>
                </span>
              </label>
            ))}

            <label
              className={`block cursor-pointer rounded-lg border p-4 transition ${
                templateId === ""
                  ? "border-signal-blue/40 bg-signal-blue/10"
                  : "border-hairline hover:bg-surface-lifted"
              }`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="workflowTemplateId"
                  value=""
                  checked={templateId === ""}
                  onChange={() => setTemplateId("")}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-primary">Start with the default</span>
                  <span className="mt-1 block text-xs text-ink-muted">
                    Every stage shown, nothing renamed. Change it later if you want.
                  </span>
                </span>
              </span>
            </label>
          </fieldset>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-hairline px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted"
            >
              Back
            </button>
            <SubmitButton
              pendingText="Setting up…"
              className="flex-1 rounded-md bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
            >
              Finish setup
            </SubmitButton>
          </div>
        </div>
      ) : null}
    </form>
  );
}
