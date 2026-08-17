"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { LayoutContent } from "@astryxdesign/core/Layout";
import { updateRequestStatusAction } from "@/app/(dashboard)/requests/actions";
import {
  markQuoteApprovedAction,
  markQuoteDeclinedAction,
  shareQuoteAction,
} from "@/app/(dashboard)/jobs/[jobId]/quotes/[quoteId]/send-actions";
import {
  assignJobSalespersonAction,
  assignRequestSalespersonAction,
} from "@/app/(dashboard)/pipeline/actions";
import { formatMoney } from "@/lib/money";
import { QUOTE_DECLINE_REASON_META } from "@/lib/quote-status";
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_META,
  pipelineDropTargets,
  requestStatusForStage,
  type PipelineStage,
} from "@/lib/pipeline";
import { EmptyState } from "@/components/ui/empty-state";

export type PipelineCard = {
  kind: "request" | "job";
  /** requestId, or jobId. */
  id: string;
  /** Only set for a job card that has a quote. */
  quoteId?: string | null;
  stage: PipelineStage;
  title: string;
  clientName: string;
  address: string | null;
  amountCents: number | null;
  href: string | null;
  /** Item 41's salesperson assignment. Null means unowned. */
  assignedTo: { id: string; name: string } | null;
};

export type AssignableUser = { id: string; name: string };

async function assignCard(card: PipelineCard, userId: string) {
  const formData = new FormData();
  formData.set("userId", userId);
  if (card.kind === "request") {
    formData.set("requestId", card.id);
    await assignRequestSalespersonAction(formData);
  } else {
    formData.set("jobId", card.id);
    await assignJobSalespersonAction(formData);
  }
}

/**
 * The write path for every drop *and* every keyboard "Move" that needs no
 * further input — no action this board calls exists only for it. A request
 * swaps `LEAD`/`ASSESSING`/`LOST` through the same `updateRequestStatusAction`
 * its own list already uses, via `requestStatusForStage`; a job's quote
 * reaches `WON` through `markQuoteApprovedAction`, exactly the "they said yes
 * on the phone" action the quote page's own button calls.
 *
 * A job card dropped on `LOST` is deliberately **not** handled here —
 * `markQuoteDeclinedAction` requires a reason, and there is no reason to send
 * on a bare drop. `MoveDialog` below calls that action directly once one's
 * been picked.
 */
async function advanceCard(card: PipelineCard, target: PipelineStage) {
  const formData = new FormData();
  if (card.kind === "request") {
    const status = requestStatusForStage(target);
    if (!status) return;
    formData.set("requestId", card.id);
    formData.set("status", status);
    await updateRequestStatusAction(formData);
    return;
  }
  formData.set("jobId", card.id);
  formData.set("quoteId", card.quoteId ?? "");
  if (target === "AWAITING_RESPONSE") await shareQuoteAction(formData);
  else if (target === "WON") await markQuoteApprovedAction(formData);
}

export function PipelineBoard({
  columns,
  canMoveRequests,
  canMoveQuotes,
  canAssign,
  assignableUsers,
}: {
  columns: Map<PipelineStage, PipelineCard[]>;
  canMoveRequests: boolean;
  canMoveQuotes: boolean;
  /** Whether the signed-in role may reassign a card at all — independent of
   *  whether it may move one: assignment is gated on `editJob`, moving a
   *  job's quote is gated on `sendQuote`, and the two roles don't coincide. */
  canAssign: boolean;
  assignableUsers: AssignableUser[];
}) {
  const total = PIPELINE_STAGES.reduce((sum, stage) => sum + (columns.get(stage)?.length ?? 0), 0);

  if (total === 0) {
    return (
      <EmptyState
        kind="clear"
        title="Nothing in motion"
        description="A request that hasn't been answered, or a job with a quote out, shows up here."
      />
    );
  }

  return (
    <>
      {/* A Kanban board doesn't shrink — Phase 5 route guidance is explicit
          that mobile pipeline must be usable without relying solely on
          horizontal Kanban. Below `lg:`, a stage selector + vertical card
          list replaces the board entirely (same data, same Card component,
          same drop targets via each card's own "Move" button); the
          horizontal board takes over at `lg:` and up, where a mouse and
          screen width both make it the better tool. */}
      <div className="lg:hidden">
        <MobileStageList
          columns={columns}
          canMoveRequests={canMoveRequests}
          canMoveQuotes={canMoveQuotes}
          canAssign={canAssign}
          assignableUsers={assignableUsers}
        />
      </div>

      {/* Scrolls in its own box rather than pushing the page sideways. */}
      <div className="hidden overflow-x-auto pb-2 lg:block">
        <div className="flex min-w-max gap-4">
          {PIPELINE_STAGES.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              cards={columns.get(stage) ?? []}
              canMoveRequests={canMoveRequests}
              canMoveQuotes={canMoveQuotes}
              canAssign={canAssign}
              assignableUsers={assignableUsers}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function MobileStageList({
  columns,
  canMoveRequests,
  canMoveQuotes,
  canAssign,
  assignableUsers,
}: {
  columns: Map<PipelineStage, PipelineCard[]>;
  canMoveRequests: boolean;
  canMoveQuotes: boolean;
  canAssign: boolean;
  assignableUsers: AssignableUser[];
}) {
  const stagesWithCards = PIPELINE_STAGES.filter((stage) => (columns.get(stage)?.length ?? 0) > 0);
  const [stage, setStage] = useState<PipelineStage>(stagesWithCards[0] ?? PIPELINE_STAGES[0]);
  const cards = columns.get(stage) ?? [];
  const [moving, setMoving] = useState<PipelineCard | null>(null);

  return (
    <div className="space-y-3">
      <select
        value={stage}
        onChange={(event) => setStage(event.target.value as PipelineStage)}
        aria-label="Stage"
        className="w-full rounded-lg border border-hairline bg-ground/60 px-3 py-2.5 text-sm text-ink-strong"
      >
        {PIPELINE_STAGES.map((option) => (
          <option key={option} value={option}>
            {PIPELINE_STAGE_META[option].label} ({columns.get(option)?.length ?? 0})
          </option>
        ))}
      </select>

      {cards.length === 0 ? (
        <p className="rounded-lg border border-hairline bg-surface-raised px-4 py-6 text-center text-sm text-ink-muted">
          Nothing here.
        </p>
      ) : (
        <ul className="space-y-2">
          {cards.map((card) => (
            <Card
              key={`${card.kind}-${card.id}`}
              card={card}
              canMove={canMove(card, canMoveRequests, canMoveQuotes)}
              onRequestMove={() => setMoving(card)}
              canAssign={canAssign}
              assignableUsers={assignableUsers}
            />
          ))}
        </ul>
      )}

      {moving ? <MoveDialog card={moving} onClose={() => setMoving(null)} /> : null}
    </div>
  );
}

function canMove(card: PipelineCard, canMoveRequests: boolean, canMoveQuotes: boolean): boolean {
  return card.kind === "request" ? canMoveRequests : canMoveQuotes;
}

type MovingCard = { card: PipelineCard; presetTarget?: PipelineStage };

function Column({
  stage,
  cards,
  canMoveRequests,
  canMoveQuotes,
  canAssign,
  assignableUsers,
}: {
  stage: PipelineStage;
  cards: PipelineCard[];
  canMoveRequests: boolean;
  canMoveQuotes: boolean;
  canAssign: boolean;
  assignableUsers: AssignableUser[];
}) {
  const router = useRouter();
  const [over, setOver] = useState(false);
  const [moving, setMoving] = useState<MovingCard | null>(null);
  const meta = PIPELINE_STAGE_META[stage];

  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
    setOver(true);
  }

  async function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setOver(false);
    const raw = event.dataTransfer.getData("application/json");
    if (!raw) return;
    let card: PipelineCard;
    try {
      card = JSON.parse(raw);
    } catch {
      return;
    }
    if (!pipelineDropTargets(card).includes(stage)) return;
    if (!canMove(card, canMoveRequests, canMoveQuotes)) return;

    // A job dropped on Lost needs a reason first — same dialog the keyboard
    // "Move" button opens, just pre-targeted at Lost instead of defaulting
    // to the first option. A request needs no reason (`Request` has no field
    // for one) and writes straight through.
    if (stage === "LOST" && card.kind === "job") {
      setMoving({ card, presetTarget: "LOST" });
      return;
    }

    await advanceCard(card, stage);
    router.refresh();
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`w-72 shrink-0 rounded-lg border border-hairline bg-surface-raised p-3 transition ${
        over ? "outline outline-2 outline-offset-2 outline-instrument" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-2 px-1 pb-2">
        <h3 className="text-sm font-semibold text-ink-primary" title={meta.hint}>
          {meta.label}
        </h3>
        <span className="text-xs tabular-nums text-ink-muted">{cards.length}</span>
      </div>

      <ul className="space-y-2">
        {cards.map((card) => (
          <Card
            key={`${card.kind}-${card.id}`}
            card={card}
            canMove={canMove(card, canMoveRequests, canMoveQuotes)}
            onRequestMove={() => setMoving({ card })}
            canAssign={canAssign}
            assignableUsers={assignableUsers}
          />
        ))}
      </ul>

      {cards.length === 0 ? (
        <p className="px-1 py-3 text-xs text-ink-muted">Nothing here.</p>
      ) : null}

      {moving ? (
        <MoveDialog
          card={moving.card}
          presetTarget={moving.presetTarget}
          onClose={() => setMoving(null)}
        />
      ) : null}
    </div>
  );
}

function Card({
  card,
  canMove,
  onRequestMove,
  canAssign,
  assignableUsers,
}: {
  card: PipelineCard;
  canMove: boolean;
  onRequestMove: () => void;
  canAssign: boolean;
  assignableUsers: AssignableUser[];
}) {
  const targets = pipelineDropTargets(card);
  const draggable = canMove && targets.length > 0;

  function onDragStart(event: React.DragEvent) {
    event.dataTransfer.setData("application/json", JSON.stringify(card));
    event.dataTransfer.effectAllowed = "move";
  }

  const body = (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-ink-primary">{card.title}</p>
      <p className="mt-0.5 truncate text-xs text-ink-muted">
        {card.clientName}
        {card.address ? ` · ${card.address}` : ""}
      </p>
      {card.amountCents != null ? (
        <p className="mt-1 text-xs font-medium tabular-nums text-ink-secondary">
          {formatMoney(card.amountCents)}
        </p>
      ) : null}
    </div>
  );

  return (
    <li className="group relative">
      <div
        draggable={draggable}
        onDragStart={draggable ? onDragStart : undefined}
        className={`rounded-lg border border-hairline bg-ground/40 p-3 transition hover:bg-surface-lifted ${
          draggable ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        {card.href ? (
          <Link
            href={card.href}
            className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            {body}
          </Link>
        ) : (
          body
        )}
      </div>

      {/* A whole separate block below the draggable card, not inside it — a
          `<select>` nested inside a `draggable="true"` region fights the
          browser over whether a click opens the dropdown or starts a drag.
          The *control* is absent rather than disabled when this role can't
          assign (same reasoning `QuoteSharePanel` documents for its own
          buttons — a picker that can't work invites a click that goes
          nowhere), but the *fact* still reads either way: "Unassigned" is as
          much a status as a name is, and a read-only viewer shouldn't see a
          name appear only sometimes with no way to tell that apart from a
          permission gap. */}
      {canAssign ? (
        <AssigneeSelect card={card} assignableUsers={assignableUsers} />
      ) : (
        <p className="mt-1 truncate px-1 text-xs text-ink-muted">
          {card.assignedTo?.name ?? "Unassigned"}
        </p>
      )}

      {/* Drag is a pointer shortcut, never the only way in — same reasoning
          `DraggableVisit` documents. A focusable "Move" control beside every
          movable card is what makes advancing a deal possible by keyboard.
          Phase 5 live-review finding: opacity-0-until-hover has no touch
          equivalent — a touchscreen has no hover state, so the control was
          technically tappable but undiscoverable on mobile/tablet. Now
          always visible below `lg:` (where drag isn't offered anyway; see
          the board's own drag-is-desktop-only doctrine), hover/focus-reveal
          only at `lg:` and up. */}
      {draggable ? (
        <button
          type="button"
          onClick={onRequestMove}
          aria-label={`Move ${card.title} to a different stage`}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-surface-sidebar/90 text-xs text-ink-muted transition before:absolute before:-inset-2.5 before:content-[''] lg:before:content-none focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-instrument lg:opacity-0 lg:hover:opacity-100 lg:group-hover:opacity-100"
        >
          <span aria-hidden>⠿</span>
        </button>
      ) : null}
    </li>
  );
}

/**
 * The picker itself. Plain and neutral (`ink-muted`/hairline), never cyan —
 * a name is not a reading, and the Readout Rule reserves that colour for one.
 * Fires on change rather than needing a separate submit: nobody wants a
 * "Save" button for a one-field decision made from a card in a list.
 */
function AssigneeSelect({
  card,
  assignableUsers,
}: {
  card: PipelineCard;
  assignableUsers: AssignableUser[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setPending(true);
    await assignCard(card, event.target.value);
    router.refresh();
    setPending(false);
  }

  return (
    <select
      value={card.assignedTo?.id ?? ""}
      onChange={onChange}
      disabled={pending}
      aria-label={`Assign ${card.title} to someone`}
      className="mt-1 w-full truncate rounded-lg border border-hairline bg-transparent px-1.5 py-1 text-xs text-ink-muted outline-none transition hover:bg-surface-lifted focus:border-signal-blue disabled:opacity-60"
    >
      <option value="">Unassigned</option>
      {assignableUsers.map((user) => (
        <option key={user.id} value={user.id}>
          {user.name}
        </option>
      ))}
    </select>
  );
}

// Phase 3 migration map §60: one of the four native `<dialog>` implementations
// named for direct Astryx Dialog migration. `isOpen`/`onOpenChange` replace
// the old `ref.current?.close()`/`showModal()` pair; the submit contract
// itself (which action fires, what FormData it builds) is unchanged.
function MoveDialog({
  card,
  presetTarget,
  onClose,
}: {
  card: PipelineCard;
  presetTarget?: PipelineStage;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const targets = pipelineDropTargets(card);
  const [stage, setStage] = useState<PipelineStage>(presetTarget ?? targets[0]);
  // Only a job's quote needs a reason to land on Lost — a request has no
  // field to put one in, so `requestStatusForStage` writes CLOSED straight
  // through `advanceCard` below, same as any other request transition.
  const needsReason = card.kind === "job" && stage === "LOST";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitted = new FormData(event.currentTarget);
    const target = submitted.get("stage") as PipelineStage | null;
    if (!target) return;

    setPending(true);
    if (card.kind === "job" && target === "LOST") {
      const reason = submitted.get("reason");
      if (!reason) {
        setPending(false);
        return;
      }
      const formData = new FormData();
      formData.set("jobId", card.id);
      formData.set("quoteId", card.quoteId ?? "");
      formData.set("reason", String(reason));
      formData.set("note", String(submitted.get("note") ?? ""));
      await markQuoteDeclinedAction(formData);
    } else {
      await advanceCard(card, target);
    }
    router.refresh();
    onClose();
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      purpose="info"
      width={352}
    >
      <DialogHeader title={`Move ${card.title}`} onOpenChange={() => onClose()} />
      <LayoutContent>
        <form onSubmit={onSubmit}>
          <label htmlFor="move-card-stage" className="mb-1.5 block text-xs font-medium text-ink-secondary">
            New stage
          </label>
          <select
            id="move-card-stage"
            name="stage"
            autoFocus
            value={stage}
            onChange={(event) => setStage(event.target.value as PipelineStage)}
            className="w-full rounded-md border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue"
          >
            {targets.map((option) => (
              <option key={option} value={option}>
                {PIPELINE_STAGE_META[option].label}
              </option>
            ))}
          </select>

          {needsReason ? (
            <>
              <label htmlFor="move-card-reason" className="mb-1.5 mt-4 block text-xs font-medium text-ink-secondary">
                Why?
              </label>
              <select
                id="move-card-reason"
                name="reason"
                required
                className="w-full rounded-md border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue"
              >
                {Object.entries(QUOTE_DECLINE_REASON_META).map(([value, reasonMeta]) => (
                  <option key={value} value={value}>
                    {reasonMeta.label}
                  </option>
                ))}
              </select>
              <label htmlFor="move-card-note" className="mb-1.5 mt-4 block text-xs font-medium text-ink-secondary">
                Anything worth remembering (optional)
              </label>
              <textarea
                id="move-card-note"
                name="note"
                rows={2}
                className="w-full rounded-md border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue"
              />
            </>
          ) : null}

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm text-ink-muted underline underline-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-action px-5 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-active disabled:opacity-60"
            >
              {pending ? "Moving…" : needsReason ? "Mark it lost" : "Move it"}
            </button>
          </div>
        </form>
      </LayoutContent>
    </Dialog>
  );
}
