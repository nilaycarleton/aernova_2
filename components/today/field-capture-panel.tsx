"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { completeVisitAction } from "@/app/(dashboard)/schedule/actions";
import { saveVisitNoteAction, uploadVisitPhotoAction } from "@/app/(dashboard)/today/field-actions";
import { enqueue, flushQueue } from "@/lib/offline/field-queue";

/**
 * What a crew member does after arriving: leave a note, take a photo, mark it
 * done. The one screen in the app built for a bad signal — see PLAN-CRM.md
 * item 32 — so every one of those three tries the network first and falls
 * back to a local queue rather than failing outright. "Retries when the
 * signal comes back," decided with the user over the alternative of a full
 * offline-first sync engine: a couple of days of work instead of a different
 * product.
 *
 * Deliberately not a service worker. Nothing in this app has ever registered
 * one, and background sync needs a registration lifecycle this page doesn't
 * have reason to grow yet — an `online` listener plus a while-the-tab-is-open
 * poll covers the actual failure mode, a dropped bar or two on a roof, not a
 * phone put in a drawer for a week.
 */
export function FieldCapturePanel({
  jobId,
  visitId,
  initialDone,
}: {
  jobId: string;
  visitId: string;
  initialDone: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initialDone);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshPendingCount = useCallback(async () => {
    // IndexedDB is browser-only; this component only ever runs client-side,
    // but the count is read lazily rather than in render to keep the first
    // paint synchronous.
    const { listPending } = await import("@/lib/offline/field-queue");
    setPending((await listPending()).length);
  }, []);

  const flush = useCallback(async () => {
    const flushedCount = await flushQueue({
      uploadPhoto: async (item) => {
        const formData = new FormData();
        formData.set("jobId", item.jobId);
        formData.set("visitId", item.visitId);
        formData.set("caption", item.caption);
        formData.set("photo", new File([item.blob], item.fileName, { type: item.contentType }));
        await uploadVisitPhotoAction(formData);
      },
      saveNote: async (item) => {
        const formData = new FormData();
        formData.set("jobId", item.jobId);
        formData.set("visitId", item.visitId);
        formData.set("note", item.note);
        await saveVisitNoteAction(formData);
      },
      complete: async (item) => {
        const formData = new FormData();
        formData.set("jobId", item.jobId);
        formData.set("visitId", item.visitId);
        await completeVisitAction(formData);
      },
    });
    await refreshPendingCount();
    if (flushedCount > 0) router.refresh();
  }, [refreshPendingCount, router]);

  useEffect(() => {
    // Both are async and set state only after their own await, never
    // synchronously within this effect body — the lint rule can't see past
    // the function boundary to tell the difference.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshPendingCount();
    if (navigator.onLine) flush();
    window.addEventListener("online", flush);
    // A belt-and-braces poll: `online` fires on a real disconnect/reconnect,
    // but a flaky site can sit at "connected, nothing gets through" for a
    // while without ever firing it.
    const interval = window.setInterval(() => {
      if (navigator.onLine) flush();
    }, 20_000);
    return () => {
      window.removeEventListener("online", flush);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.set("jobId", jobId);
    formData.set("visitId", visitId);
    formData.set("caption", "");
    formData.set("photo", file);

    try {
      await uploadVisitPhotoAction(formData);
      setMessage("Photo saved.");
      router.refresh();
    } catch {
      await enqueue({
        type: "photo",
        jobId,
        visitId,
        blob: file,
        fileName: file.name,
        contentType: file.type,
        caption: "",
      });
      await refreshPendingCount();
      setMessage("No signal — photo will send when you're back online.");
    }
  }

  async function handleSaveNote() {
    const note = noteDraft.trim();
    if (!note) return;

    const formData = new FormData();
    formData.set("jobId", jobId);
    formData.set("visitId", visitId);
    formData.set("note", note);

    try {
      await saveVisitNoteAction(formData);
      setNoteDraft("");
      setNoteOpen(false);
      setMessage("Note saved.");
      router.refresh();
    } catch {
      await enqueue({ type: "note", jobId, visitId, note });
      await refreshPendingCount();
      setNoteDraft("");
      setNoteOpen(false);
      setMessage("No signal — note will send when you're back online.");
    }
  }

  async function handleComplete() {
    const formData = new FormData();
    formData.set("jobId", jobId);
    formData.set("visitId", visitId);

    // Optimistic: a crew member who just finished a roof in bad signal needs
    // the button to say "done" now, not "still trying."
    setDone(true);
    try {
      await completeVisitAction(formData);
      router.refresh();
    } catch {
      await enqueue({ type: "complete", jobId, visitId });
      await refreshPendingCount();
      setMessage("No signal — marked done here, will sync when you're back online.");
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {!done ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleComplete}
            className="flex-1 rounded-md bg-action px-5 py-4 text-base font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            Mark this done
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-hairline px-5 py-4 text-base font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            Add a photo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-lg border border-hairline px-5 py-4 text-base font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        >
          Add a photo
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhoto}
        className="sr-only"
        aria-label="Add a photo for this visit"
      />

      {noteOpen ? (
        <div className="space-y-2">
          <label htmlFor={`note-${visitId}`} className="sr-only">
            Add a note
          </label>
          <textarea
            id={`note-${visitId}`}
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            rows={3}
            placeholder="What should the office know?"
            className="w-full rounded-md border border-hairline bg-ground/50 px-4 py-3 text-sm text-ink-primary outline-none transition focus:border-signal-blue"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveNote}
              className="rounded-md bg-action px-4 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              Save note
            </button>
            <button
              type="button"
              onClick={() => setNoteOpen(false)}
              className="rounded-lg px-4 py-2.5 text-sm text-ink-muted underline underline-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="text-sm text-ink-secondary underline underline-offset-2 transition hover:text-ink-primary"
        >
          Add a note
        </button>
      )}

      <p aria-live="polite" className="min-h-5 text-xs text-ink-muted">
        {pending > 0
          ? `${pending} waiting for a signal…`
          : message}
      </p>
    </div>
  );
}
