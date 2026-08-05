"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createLeadClientAction, type NewClientState } from "@/app/(dashboard)/clients/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

/**
 * One button, reachable from anywhere — PLAN-CRM.md item 10.
 *
 * All five nouns, now that Phase 5 has given Invoice an address. The entry was
 * held back rather than pointed at a route that didn't exist — the dead-link
 * problem `app-sidebar.tsx` already tore out eight of — and this is it landing
 * as that comment promised.
 *
 * Four of the five are links to where creation already lives — `/jobs/new`,
 * `/requests/new`, `/jobs` (quotes are written on a job, never on their own)
 * and `/quotes?status=APPROVED` (an invoice is raised from an approved quote,
 * never typed from scratch) — rather than second, thinner versions of forms
 * that already exist. Client is the odd one out: nothing before this button
 * could make one without a job attached, so it gets the one real form here, a
 * native `<dialog>` matching `QuoteStartDialog`'s idiom.
 */
const FIELD =
  "w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue";

export function QuickCreateMenu() {
  const [open, setOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="quick-create-list"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-primary text-lg font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        >
          <span aria-hidden>+</span>
          <span className="sr-only">Create new…</span>
        </button>

        {/* A plain list of links and one button, not `role="menu"` — that ARIA
            role promises arrow-key navigation between items, which this
            doesn't implement, and a role nobody backs with behaviour is worse
            than no role: it tells a screen reader user to expect something
            that then doesn't work. Tab order alone is honest here. */}
        {open ? (
          <div
            id="quick-create-list"
            className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-hairline bg-surface-sidebar py-1.5 shadow-lg"
          >
            <MenuLink href="/jobs/new" onNavigate={() => setOpen(false)}>
              New job
            </MenuLink>
            <MenuLink href="/requests/new" onNavigate={() => setOpen(false)}>
              New request
            </MenuLink>
            <MenuLink href="/jobs" onNavigate={() => setOpen(false)}>
              New quote
            </MenuLink>
            <MenuLink href="/quotes?status=APPROVED" onNavigate={() => setOpen(false)}>
              New invoice
            </MenuLink>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setClientDialogOpen(true);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-ink-secondary transition hover:bg-surface-lifted hover:text-ink-primary"
            >
              New client
            </button>
          </div>
        ) : null}
      </div>

      {clientDialogOpen ? (
        <NewClientDialog onClose={() => setClientDialogOpen(false)} />
      ) : null}
    </>
  );
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block px-3 py-2 text-sm text-ink-secondary transition hover:bg-surface-lifted hover:text-ink-primary"
    >
      {children}
    </Link>
  );
}

function NewClientDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState<NewClientState, FormData>(createLeadClientAction, {});
  const [isBusiness, setIsBusiness] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <dialog
      ref={ref}
      className="w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-hairline bg-surface-sidebar p-0 text-ink-primary backdrop:bg-ground/70 backdrop:backdrop-blur-sm"
    >
      <form action={formAction} className="p-6">
        <h2 className="text-lg font-semibold text-ink-primary">New client</h2>
        <p className="mt-1 text-sm text-ink-muted">
          A name is enough — everything else can wait until there&rsquo;s a job.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="quick-client-name" className="mb-1.5 block text-xs font-medium text-ink-secondary">
              Name
            </label>
            <input
              id="quick-client-name"
              name="name"
              type="text"
              autoFocus
              required
              placeholder={isBusiness ? "Northgate Strata" : "Dave Chen"}
              className={FIELD}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              name="isBusiness"
              value="true"
              checked={isBusiness}
              onChange={(event) => setIsBusiness(event.target.checked)}
              className="rounded border-hairline"
            />
            This is a business
          </label>

          <div>
            <label htmlFor="quick-client-source" className="mb-1.5 block text-xs font-medium text-ink-secondary">
              How did they find you? (optional)
            </label>
            <input
              id="quick-client-source"
              name="leadSource"
              type="text"
              placeholder="Referral, hockey rink board, Google…"
              className={FIELD}
            />
          </div>
        </div>

        {state.error ? <p className="mt-3 text-sm text-danger-fg">{state.error}</p> : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="rounded-xl px-4 py-2.5 text-sm text-ink-muted underline underline-offset-2"
          >
            Cancel
          </button>
          <SubmitButton
            pendingText="Creating…"
            className="rounded-xl bg-ink-primary px-5 py-2.5 text-sm font-semibold text-ground transition hover:bg-ink-secondary disabled:opacity-60"
          >
            Create client
          </SubmitButton>
        </div>
      </form>
    </dialog>
  );
}
