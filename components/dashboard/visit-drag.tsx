"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { moveVisitAction } from "@/app/(dashboard)/schedule/actions";

/**
 * Rain, a late delivery, a client who isn't in — moving a day is routine, and
 * `moveVisitAction` has existed since the calendar did with nothing calling
 * it. These two components are the UI it was waiting on: drag a card off
 * `DraggableVisit`, drop it on a `DropDay`.
 *
 * Native HTML5 drag-and-drop, not a library — this is a mouse/trackpad
 * gesture on the office calendar (`/schedule`), never something a crew member
 * on a phone needs, so there's no touch story to build and no new dependency
 * to carry for one gesture.
 *
 * **Drag is never the only way in.** Native HTML5 DnD has no keyboard story
 * of its own — nothing makes a `draggable` element operable by Tab and Enter
 * — and nothing else in this app lets you move a visit to a different day.
 * Shipping drag alone would mean a keyboard-only user simply cannot reschedule
 * a visit, a WCAG 2.1.1 failure and not a nitpick. So `DraggableVisit` always
 * renders a small, focusable "Move" button beside the card — a native
 * `<dialog>` with a date input is the keyboard/touch/screen-reader path,
 * dragging is the pointer shortcut on top of it, and both end up calling the
 * same `moveVisitAction`.
 */
export function DraggableVisit({
  jobId,
  visitId,
  visitLabel,
  children,
}: {
  jobId: string;
  visitId: string;
  /** For the dialog's heading and the button's accessible name. */
  visitLabel: string;
  children: React.ReactNode;
}) {
  const [moving, setMoving] = useState(false);

  function onDragStart(event: React.DragEvent) {
    event.dataTransfer.setData("application/json", JSON.stringify({ jobId, visitId }));
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="group relative">
      <div draggable onDragStart={onDragStart} className="cursor-grab active:cursor-grabbing">
        {children}
      </div>
      <button
        type="button"
        onClick={() => setMoving(true)}
        aria-label={`Move ${visitLabel} to a different day`}
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-surface-sidebar/90 text-xs text-ink-muted opacity-40 transition hover:opacity-100 hover:text-ink-primary focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-instrument"
      >
        <span aria-hidden>⠿</span>
      </button>
      {moving ? (
        <MoveDialog
          jobId={jobId}
          visitId={visitId}
          visitLabel={visitLabel}
          onClose={() => setMoving(false)}
        />
      ) : null}
    </div>
  );
}

function MoveDialog({
  jobId,
  visitId,
  visitLabel,
  onClose,
}: {
  jobId: string;
  visitId: string;
  visitLabel: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const day = new FormData(event.currentTarget).get("day");
    if (!day) return;

    setPending(true);
    const formData = new FormData();
    formData.set("jobId", jobId);
    formData.set("visitId", visitId);
    formData.set("day", String(day));
    await moveVisitAction(formData);
    router.refresh();
    ref.current?.close();
  }

  return (
    <dialog
      ref={ref}
      className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-hairline bg-surface-sidebar p-0 text-ink-primary backdrop:bg-ground/70 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={onSubmit} className="p-5">
        <h2 className="text-base font-semibold text-ink-primary">Move {visitLabel}</h2>
        <label htmlFor="move-visit-day" className="mb-1.5 mt-4 block text-xs font-medium text-ink-secondary">
          New day
        </label>
        <input
          id="move-visit-day"
          name="day"
          type="date"
          required
          autoFocus
          className="w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue"
        />
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="rounded-xl px-4 py-2.5 text-sm text-ink-muted underline underline-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-ink-primary px-5 py-2.5 text-sm font-semibold text-ground transition hover:bg-ink-secondary disabled:opacity-60"
          >
            {pending ? "Moving…" : "Move it"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function DropDay({
  day,
  className,
  children,
}: {
  /** YYYY-MM-DD, what `moveVisitAction` reads back with `parseDayInput`. */
  day: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [over, setOver] = useState(false);

  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
    setOver(true);
  }

  async function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setOver(false);
    const raw = event.dataTransfer.getData("application/json");
    if (!raw) return;

    let payload: { jobId?: string; visitId?: string };
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    if (!payload.jobId || !payload.visitId) return;

    const formData = new FormData();
    formData.set("jobId", payload.jobId);
    formData.set("visitId", payload.visitId);
    formData.set("day", day);
    await moveVisitAction(formData);
    router.refresh();
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`${className ?? ""} ${over ? "outline outline-2 outline-offset-2 outline-instrument" : ""}`}
    >
      {children}
    </div>
  );
}
