"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RequestStatus } from "@prisma/client";
import {
  REQUEST_FILTERS,
  REQUEST_STATUS_META,
  RequestFilter,
  isOverdue,
  matchesRequestFilter,
  requestStatusTone,
} from "@/lib/request-status";
import { sinceLabel } from "@/lib/relative-time";
import {
  convertRequestToJobAction,
  deleteRequestAction,
  updateRequestStatusAction,
} from "@/app/(dashboard)/requests/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { ConfirmSubmit } from "@/components/dashboard/confirm-submit";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { Status } from "@/components/ui/status";

export type BrowserRequest = {
  id: string;
  title: string;
  description: string | null;
  clientName: string;
  address: string | null;
  status: RequestStatus;
  source: string | null;
  requestedAt: string | Date;
  /** Set once this became work. */
  jobId: string | null;
};

export function RequestsBrowser({
  requests,
  canDelete,
}: {
  requests: BrowserRequest[];
  canDelete: boolean;
}) {
  const [filter, setFilter] = useState<RequestFilter>("OPEN");

  const filtered = useMemo(
    () =>
      requests
        .filter((r) => matchesRequestFilter(r.status, filter))
        // Longest wait first. This list is a queue of people owed an answer,
        // and the person who has waited longest is the one to call.
        .sort(
          (a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()
        ),
    [requests, filter]
  );

  if (requests.length === 0) {
    return (
      <EmptyState
        kind="first-use"
        title="Nobody's waiting on you"
        description="When someone calls or emails asking for work, write it down here. It keeps the ask out of your job list until you know it's real — and turns into a job in one click when it is."
        action={
          <Link
            href="/requests/new"
            className="inline-flex rounded-md bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            Write down a request
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <FilterToolbar
        resultCount={`${filtered.length} of ${requests.length} request${requests.length === 1 ? "" : "s"}`}
        filters={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as RequestFilter)}
            aria-label="Filter requests"
            className="rounded-md border border-hairline bg-ground/60 px-3 py-2 text-sm text-ink-strong"
          >
            {REQUEST_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState kind="filtered" title="Nothing here right now." />
      ) : (
        <ul className="grid gap-4">
          {filtered.map((request) => {
            const meta = REQUEST_STATUS_META[request.status];
            const late = isOverdue(request.status, request.requestedAt);

            return (
              <li
                key={request.id}
                className="min-w-0 rounded-lg border border-hairline bg-surface-raised p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-ink-primary">{request.title}</p>
                    <p className="mt-1 text-sm text-ink-secondary">
                      {request.clientName}
                      {request.address ? ` · ${request.address}` : ""}
                      {request.source ? ` · came in by ${request.source}` : ""}
                    </p>
                    {request.description ? (
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                        {request.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Status variant="solid" tone={requestStatusTone(request.status)} label={meta.label} />
                    {/* Amber only when it is genuinely late. An hour-old
                        request is not a warning, it is Tuesday. */}
                    <span
                      className={`text-xs ${late ? "font-medium text-caution-fg" : "text-ink-muted"}`}
                      title={new Date(request.requestedAt).toLocaleString()}
                    >
                      {late ? "Waiting since " : "Asked "}
                      {sinceLabel(request.requestedAt).toLowerCase()}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
                  {request.jobId ? (
                    <Link
                      href={`/jobs/${request.jobId}`}
                      className="rounded-lg border border-hairline bg-surface-raised px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                    >
                      Open the job
                    </Link>
                  ) : (
                    <>
                      <form action={convertRequestToJobAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <SubmitButton
                          pendingText="Creating…"
                          className="rounded-md bg-action px-4 py-2 text-sm font-semibold text-on-action transition hover:bg-action-active disabled:opacity-60"
                        >
                          Turn into a job
                        </SubmitButton>
                      </form>

                      {/* §4/§25 Phase 6. A brand new request's first, most
                          obvious next step — separate from "I'm looking at
                          it" below, which is starting the assessment itself
                          and stays available on both NEW and CONTACTED, the
                          same direct shortcut this button has always offered
                          from a fresh request. */}
                      {request.status === RequestStatus.NEW ? (
                        <StatusButton
                          requestId={request.id}
                          status={RequestStatus.CONTACTED}
                          label="Mark Contacted"
                        />
                      ) : null}

                      {request.status === RequestStatus.NEW ||
                      request.status === RequestStatus.CONTACTED ? (
                        <StatusButton
                          requestId={request.id}
                          status={RequestStatus.ASSESSING}
                          label="I'm looking at it"
                        />
                      ) : null}

                      <StatusButton
                        requestId={request.id}
                        status={RequestStatus.CLOSED}
                        label="Not going ahead"
                      />
                    </>
                  )}

                  {canDelete ? (
                    <form action={deleteRequestAction} className="ml-auto">
                      <input type="hidden" name="requestId" value={request.id} />
                      <ConfirmSubmit
                        pendingText="Deleting…"
                        question={`Delete this request from ${request.clientName}? This cannot be undone.${
                          request.jobId ? " The job it became stays exactly as it is." : ""
                        }`}
                        className="flex min-h-11 items-center text-sm text-ink-muted underline underline-offset-2 transition hover:text-danger-fg disabled:opacity-60"
                      >
                        Delete
                      </ConfirmSubmit>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusButton({
  requestId,
  status,
  label,
}: {
  requestId: string;
  status: RequestStatus;
  label: string;
}) {
  return (
    <form action={updateRequestStatusAction}>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton
        pendingText="Saving…"
        className="rounded-lg border border-hairline bg-surface-raised px-4 py-2 text-sm font-medium text-ink-secondary transition hover:bg-surface-lifted hover:text-ink-primary disabled:opacity-60"
      >
        {label}
      </SubmitButton>
    </form>
  );
}
