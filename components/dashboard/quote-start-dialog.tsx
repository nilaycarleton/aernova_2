"use client";

import { useState } from "react";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { LayoutContent } from "@astryxdesign/core/Layout";
import {
  createQuoteFromTemplateAction,
  deleteQuoteTemplateAction,
} from "@/app/(dashboard)/jobs/[jobId]/template-actions";
import { createBlankQuoteAction } from "@/app/(dashboard)/jobs/[jobId]/quote-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { formatMoney } from "@/lib/money";

/**
 * The first decision of a quote, when there is one to make.
 *
 * A contractor with saved templates almost never wants a blank document — they
 * want the re-roof they have sent forty times. So the templates come first and
 * the blank one sits underneath, which is the order Jobber landed on too.
 *
 * With no templates saved this component never renders: the job page keeps the
 * plain "Create quote" button, one click to a blank draft. A chooser with one
 * option is a step, not a choice.
 *
 * Astryx `Dialog`, matching the pattern established for the other three native
 * `<dialog>` implementations Phase 3's migration map named (`quick-create-menu.tsx`,
 * `pipeline-board.tsx`'s `MoveDialog`, `visit-drag.tsx`'s `MoveDialog`) — this was
 * the one member of that list still a hand-managed `showModal()`/`close()` native
 * dialog. The three server actions below are unchanged; only the dialog chrome
 * moved.
 */
export type StartTemplate = {
  id: string;
  name: string;
  lineCount: number;
  /** What the same rows came to last time, at today's prices. */
  totalCents: number;
};

const PRIMARY =
  "shrink-0 rounded-md bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument";

export function QuoteStartDialog({
  jobId,
  templates,
}: {
  jobId: string;
  templates: StartTemplate[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [managing, setManaging] = useState(false);

  // Closing puts the list back the way it was found. Nobody expects "manage"
  // to still be on the next time they open this.
  function handleOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen);
    if (!nextOpen) setManaging(false);
  }

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={PRIMARY}>
        Create quote
      </button>

      <Dialog
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        purpose="info"
        width={512}
      >
        <DialogHeader
          title="Start this quote"
          subtitle={
            managing
              ? "Removing a template leaves every quote you made from it alone."
              : "Pick one you've saved, or start from nothing."
          }
          onOpenChange={handleOpenChange}
          endContent={
            <button
              type="button"
              onClick={() => setManaging((current) => !current)}
              className="shrink-0 rounded-lg px-2 py-1 text-xs text-ink-muted underline underline-offset-2 transition hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              {managing ? "Done" : "Manage"}
            </button>
          }
        />

        <LayoutContent>
          <ul className="max-h-80 overflow-y-auto p-2">
            {templates.map((template) => (
              <li key={template.id} className="flex items-center gap-2">
                {/* Two sibling forms rather than one nested in the other, which
                  HTML does not allow — and which is why deleting lives behind
                  the Manage toggle instead of beside every row all the time. */}
                <form
                  action={createQuoteFromTemplateAction}
                  className="min-w-0 flex-1"
                >
                  <input type="hidden" name="jobId" value={jobId} />
                  <input type="hidden" name="templateId" value={template.id} />
                  <button
                    type="submit"
                    disabled={managing}
                    className="w-full rounded-lg px-3 py-3 text-left transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <span className="block truncate text-sm font-medium text-ink-primary">
                      {template.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {template.lineCount}{" "}
                      {template.lineCount === 1 ? "line" : "lines"} ·{" "}
                      {formatMoney(template.totalCents)} at today&rsquo;s prices
                    </span>
                  </button>
                </form>

                {managing ? (
                  <form
                    action={deleteQuoteTemplateAction}
                    className="shrink-0 pr-1"
                  >
                    <input type="hidden" name="jobId" value={jobId} />
                    <input
                      type="hidden"
                      name="templateId"
                      value={template.id}
                    />
                    <SubmitButton
                      pendingText="Removing…"
                      className="rounded-lg border border-danger/25 px-2.5 py-1.5 text-xs text-danger-fg transition hover:bg-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                    >
                      Remove
                    </SubmitButton>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline p-5">
            <form action={createBlankQuoteAction}>
              <input type="hidden" name="jobId" value={jobId} />
              <SubmitButton
                pendingText="Opening…"
                className="rounded-lg border border-hairline bg-surface-raised px-4 py-2.5 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
              >
                Start from scratch
              </SubmitButton>
            </form>

            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="rounded-lg px-3 py-2.5 text-sm text-ink-secondary transition hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              Never mind
            </button>
          </div>
        </LayoutContent>
      </Dialog>
    </>
  );
}
