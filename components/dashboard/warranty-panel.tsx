"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createWarrantyFromTemplateAction,
  duplicateWarrantyTemplateAction,
  reviewWarrantyAction,
  saveWarrantyDraftAction,
  sendWarrantyAction,
  updateWarrantyTemplateAction,
  type CreateWarrantyState,
  type ReviewWarrantyState,
  type SaveWarrantyDraftState,
  type SendWarrantyState,
  type UpdateWarrantyTemplateState,
} from "@/app/(dashboard)/jobs/[jobId]/warranty-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { Status } from "@/components/ui/status";
import { longDate } from "@/lib/long-date";
import { WARRANTY_STATUS_META, warrantyTermLabel } from "@/lib/warranty";

export type WarrantyTemplateRow = {
  id: string;
  name: string;
  variant: string | null;
  termMonths: number;
  coverageNotes: string | null;
  exclusions: string | null;
  /** True for a company's own (possibly duplicated) template — the only ones ever editable. */
  isCompanyOwned: boolean;
};

export type WarrantyRow = {
  id: string;
  status: "DRAFT" | "REVIEWED" | "SENT" | "VIEWED" | "CONFIRMED";
  termMonths: number;
  startsAt: string; // yyyy-mm-dd, for the date input
  coverageNotes: string | null;
  exclusions: string | null;
  companyInfoSnapshot: string;
  customerInfoSnapshot: string;
  propertyAddressSnapshot: string;
  version: number;
  shareUrl: string | null;
  sentAtLabel: string | null;
  reviewedAtLabel: string | null;
  reviewedByName: string | null;
  confirmedAtLabel: string | null;
  signerName: string | null;
};

const FIELD =
  "w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue";

const SECONDARY =
  "rounded-xl border border-hairline bg-surface-raised px-4 py-2.5 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument";

const PRIMARY =
  "rounded-xl bg-action px-5 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60";

/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §14.4/§20/§25 Phase 10 — office-facing
 * only. Never rendered on `/today`, and every write path behind it is
 * gated on `editJob` server-side (see `warranty-actions.ts`) — `editable`
 * here only controls what this component *shows*, never what it lets
 * through, matching `QualityCheckPanel`/`PreConstructionChecklistPanel`'s
 * own read-only-for-everyone-else convention.
 */
export function WarrantyPanel({
  jobId,
  warranty,
  builtInTemplates,
  companyTemplates,
  editable,
}: {
  jobId: string;
  warranty: WarrantyRow | null;
  builtInTemplates: WarrantyTemplateRow[];
  companyTemplates: WarrantyTemplateRow[];
  editable: boolean;
}) {
  if (!warranty && !editable) return null;

  return (
    <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink-primary">Warranty</h3>
        {warranty ? (
          <Status
            variant="solid"
            tone={WARRANTY_STATUS_META[warranty.status].tone}
            label={WARRANTY_STATUS_META[warranty.status].label}
          />
        ) : null}
      </div>

      {!warranty ? (
        editable ? (
          <TemplatePicker
            jobId={jobId}
            builtInTemplates={builtInTemplates}
            companyTemplates={companyTemplates}
          />
        ) : null
      ) : warranty.status === "CONFIRMED" ? (
        <ConfirmedSummary warranty={warranty} />
      ) : (
        <DraftEditor jobId={jobId} warranty={warranty} editable={editable} />
      )}
    </section>
  );
}

function ConfirmedSummary({ warranty }: { warranty: WarrantyRow }) {
  return (
    <div className="mt-4 space-y-4">
      <p className="rounded-xl bg-confirm/10 px-4 py-3 text-sm text-confirm-fg">
        Confirmed{warranty.signerName ? ` by ${warranty.signerName}` : ""}
        {warranty.confirmedAtLabel ? ` on ${warranty.confirmedAtLabel}` : ""}.
      </p>
      <div className="space-y-2 text-sm text-ink-secondary">
        <p>
          <span className="font-medium text-ink-primary">Term:</span>{" "}
          {warrantyTermLabel(warranty.termMonths)}, starting {longDate(warranty.startsAt)}
        </p>
        {warranty.coverageNotes ? (
          <p className="whitespace-pre-line">{warranty.coverageNotes}</p>
        ) : null}
      </div>
      {warranty.shareUrl ? (
        <Link href={warranty.shareUrl} target="_blank" className={SECONDARY}>
          Open the warranty
        </Link>
      ) : null}
      <p className="text-xs text-ink-muted">
        This warranty has been confirmed by the homeowner and can&rsquo;t be edited. Aernova doesn&rsquo;t
        yet support creating a corrected version in this release — if something needs to change,
        contact support.
      </p>
    </div>
  );
}

function DraftEditor({
  jobId,
  warranty,
  editable,
}: {
  jobId: string;
  warranty: WarrantyRow;
  editable: boolean;
}) {
  const [saveState, saveAction] = useActionState<SaveWarrantyDraftState, FormData>(
    saveWarrantyDraftAction,
    {}
  );
  const [reviewState, reviewAction] = useActionState<ReviewWarrantyState, FormData>(
    reviewWarrantyAction,
    {}
  );
  const [sendState, sendAction] = useActionState<SendWarrantyState, FormData>(sendWarrantyAction, {});

  if (!editable) {
    return (
      <div className="mt-4 space-y-2 text-sm text-ink-secondary">
        <p>
          <span className="font-medium text-ink-primary">Term:</span>{" "}
          {warrantyTermLabel(warranty.termMonths)}, starting {longDate(warranty.startsAt)}
        </p>
        {warranty.sentAtLabel ? <p>Sent {warranty.sentAtLabel}.</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-5">
      <form action={saveAction} className="space-y-3 border-b border-hairline pb-5">
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="warrantyId" value={warranty.id} />

        <div className="flex flex-wrap gap-3">
          <div className="w-32">
            <label htmlFor={`term-${warranty.id}`} className="mb-1.5 block text-xs font-medium text-ink-secondary">
              Term (months)
            </label>
            <input
              id={`term-${warranty.id}`}
              name="termMonths"
              type="number"
              min={1}
              defaultValue={warranty.termMonths}
              className={`${FIELD} tabular-nums`}
            />
          </div>
          <div className="w-40">
            <label htmlFor={`starts-${warranty.id}`} className="mb-1.5 block text-xs font-medium text-ink-secondary">
              Start date
            </label>
            <input
              id={`starts-${warranty.id}`}
              name="startsAt"
              type="date"
              defaultValue={warranty.startsAt}
              className={FIELD}
            />
          </div>
        </div>

        <div>
          <label htmlFor={`coverage-${warranty.id}`} className="mb-1.5 block text-xs font-medium text-ink-secondary">
            What&rsquo;s covered
          </label>
          <textarea
            id={`coverage-${warranty.id}`}
            name="coverageNotes"
            rows={4}
            defaultValue={warranty.coverageNotes ?? ""}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor={`exclusions-${warranty.id}`} className="mb-1.5 block text-xs font-medium text-ink-secondary">
            What&rsquo;s not covered
          </label>
          <textarea
            id={`exclusions-${warranty.id}`}
            name="exclusions"
            rows={4}
            defaultValue={warranty.exclusions ?? ""}
            className={FIELD}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor={`company-info-${warranty.id}`} className="mb-1.5 block text-xs font-medium text-ink-secondary">
              Company information
            </label>
            <textarea
              id={`company-info-${warranty.id}`}
              name="companyInfoSnapshot"
              rows={3}
              defaultValue={warranty.companyInfoSnapshot}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor={`customer-info-${warranty.id}`} className="mb-1.5 block text-xs font-medium text-ink-secondary">
              Customer information
            </label>
            <textarea
              id={`customer-info-${warranty.id}`}
              name="customerInfoSnapshot"
              rows={3}
              defaultValue={warranty.customerInfoSnapshot}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor={`property-${warranty.id}`} className="mb-1.5 block text-xs font-medium text-ink-secondary">
              Property address
            </label>
            <textarea
              id={`property-${warranty.id}`}
              name="propertyAddressSnapshot"
              rows={3}
              defaultValue={warranty.propertyAddressSnapshot}
              className={FIELD}
            />
          </div>
        </div>

        {saveState.error ? <p className="text-sm text-danger-fg">{saveState.error}</p> : null}

        <SubmitButton pendingText="Saving…" className={SECONDARY}>
          {saveState.savedAt ? "Saved" : "Save draft"}
        </SubmitButton>
        {warranty.status !== "DRAFT" ? (
          <p className="text-xs text-ink-muted">
            Saving a change here moves this back to draft — the review below was of the old wording.
          </p>
        ) : null}
      </form>

      <div className="flex flex-wrap items-center gap-3">
        {warranty.status === "DRAFT" ? (
          <form action={reviewAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="warrantyId" value={warranty.id} />
            <SubmitButton pendingText="Saving…" className={PRIMARY}>
              Mark reviewed
            </SubmitButton>
          </form>
        ) : null}

        {warranty.status === "REVIEWED" ? (
          <form action={sendAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="warrantyId" value={warranty.id} />
            <SubmitButton pendingText="Sending…" className={PRIMARY}>
              Send warranty
            </SubmitButton>
          </form>
        ) : null}

        {warranty.reviewedAtLabel ? (
          <p className="text-xs text-ink-muted">
            Reviewed {warranty.reviewedAtLabel}
            {warranty.reviewedByName ? ` by ${warranty.reviewedByName}` : ""}.
          </p>
        ) : null}
      </div>

      {reviewState.error ? <p className="text-sm text-danger-fg">{reviewState.error}</p> : null}
      {sendState.error ? <p className="text-sm text-danger-fg">{sendState.error}</p> : null}

      {(warranty.status === "SENT" || warranty.status === "VIEWED") && warranty.shareUrl ? (
        <div className="rounded-xl bg-ground/40 px-4 py-3 text-sm">
          <p className="text-ink-secondary">
            {warranty.sentAtLabel ? `Sent ${warranty.sentAtLabel}.` : "Sent."}{" "}
            {warranty.status === "VIEWED" ? "They've opened it." : "They haven't opened it yet."}
          </p>
          <Link
            href={warranty.shareUrl}
            target="_blank"
            className="mt-2 inline-flex text-sm font-medium text-ink-primary underline underline-offset-4 hover:text-ink-secondary"
          >
            Open the warranty
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function TemplatePicker({
  jobId,
  builtInTemplates,
  companyTemplates,
}: {
  jobId: string;
  builtInTemplates: WarrantyTemplateRow[];
  companyTemplates: WarrantyTemplateRow[];
}) {
  const [createState, createAction] = useActionState<CreateWarrantyState, FormData>(
    createWarrantyFromTemplateAction,
    {}
  );

  return (
    <div className="mt-4 space-y-5">
      <p className="text-sm text-ink-muted">
        Pick a starting point. You&rsquo;ll review and edit it before it goes out.
      </p>

      {companyTemplates.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Your templates</p>
          <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
            {companyTemplates.map((template) => (
              <TemplateRow key={template.id} jobId={jobId} template={template} createAction={createAction} />
            ))}
          </ul>
        </div>
      ) : null}

      {builtInTemplates.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Starters</p>
          <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
            {builtInTemplates.map((template) => (
              <TemplateRow key={template.id} jobId={jobId} template={template} createAction={createAction} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">No built-in templates for your trade yet.</p>
      )}

      {createState.error ? <p className="text-sm text-danger-fg">{createState.error}</p> : null}
    </div>
  );
}

function TemplateRow({
  jobId,
  template,
  createAction,
}: {
  jobId: string;
  template: WarrantyTemplateRow;
  createAction: (formData: FormData) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction] = useActionState<UpdateWarrantyTemplateState, FormData>(
    updateWarrantyTemplateAction,
    {}
  );

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-primary">{template.name}</p>
          <p className="text-xs text-ink-muted">{warrantyTermLabel(template.termMonths)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <form action={createAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="templateId" value={template.id} />
            <SubmitButton pendingText="Creating…" className={SECONDARY}>
              Use this
            </SubmitButton>
          </form>
          {template.isCompanyOwned ? (
            <button type="button" onClick={() => setEditing((v) => !v)} className={SECONDARY}>
              {editing ? "Close" : "Edit"}
            </button>
          ) : (
            <form action={duplicateWarrantyTemplateAction}>
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="templateId" value={template.id} />
              <SubmitButton pendingText="Copying…" className={SECONDARY}>
                Duplicate & customize
              </SubmitButton>
            </form>
          )}
        </div>
      </div>

      {editing && template.isCompanyOwned ? (
        <form action={updateAction} className="mt-3 space-y-2 rounded-xl border border-hairline p-3">
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="templateId" value={template.id} />
          <div className="flex flex-wrap gap-3">
            <input name="name" type="text" defaultValue={template.name} className={`${FIELD} flex-1`} />
            <input
              name="termMonths"
              type="number"
              min={1}
              defaultValue={template.termMonths}
              className={`${FIELD} w-28 tabular-nums`}
            />
          </div>
          <textarea
            name="coverageNotes"
            rows={3}
            placeholder="What's covered"
            defaultValue={template.coverageNotes ?? ""}
            className={FIELD}
          />
          <textarea
            name="exclusions"
            rows={3}
            placeholder="What's not covered"
            defaultValue={template.exclusions ?? ""}
            className={FIELD}
          />
          {updateState.error ? <p className="text-sm text-danger-fg">{updateState.error}</p> : null}
          <SubmitButton pendingText="Saving…" className={SECONDARY}>
            {updateState.savedAt ? "Saved" : "Save template"}
          </SubmitButton>
        </form>
      ) : null}
    </li>
  );
}
