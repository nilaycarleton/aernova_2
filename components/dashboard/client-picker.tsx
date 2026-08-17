"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { searchClientsAction } from "@/app/(dashboard)/jobs/new/client-search";
import { looksLikeBusiness } from "@/lib/client-name";
import type { ClientSuggestion } from "@/lib/client-resolve";

/**
 * One field that finds a client or makes one.
 *
 * This replaces five boxes — first name, last name, business name, email,
 * phone — with a single line you type a name into. Two things had to be true
 * for that to work, and they are the reason this component is as long as it is:
 *
 * **Creating from a name alone has to be a real option, not a fallback.** The
 * last row of the list is always "Create «what you typed»". A $450 flashing
 * repair described over the phone is exactly the job whose customer is not in
 * the system yet, and pushing that person into a full New Client form is what
 * `PLAN-CRM.md` calls required-to-exist — the thing this phase removes.
 *
 * **The duplicate question moves here, from after the fact to during.** Phase 1
 * asked it on submit, once the record was already being written; a match now
 * appears while you type, carrying the two facts that settle it — how much work
 * they have and where. Which is why nothing is preselected when there is more
 * than one match: one match is a suggestion, two identical names is a question,
 * and a question answers itself only by being looked at.
 */

export type ClientSelection =
  | { kind: "existing"; client: ClientSuggestion }
  | { kind: "new"; name: string; isBusiness: boolean };

type Props = {
  /** Server-echoed value, so a validation error never costs what was typed. */
  initialQuery?: string;
  error?: string;
  onSelectionChange: (selection: ClientSelection | null) => void;
};

/** The trailing "Add «name»" row. Negative so it never collides with a result. */
const CREATE_INDEX = -2;
/**
 * Nothing highlighted, and the only state in which Enter does nothing at all.
 * Reached exactly when the search comes back with more than one client of the
 * same name — the case this component exists for. Two identical rows is a
 * question, and a question that answers itself on a keypress was never asked.
 */
const NONE = -1;
/** Below this, a search would return most of the client list. */
const MIN_QUERY = 2;

/** "5 minutes ago", "yesterday" — enough to recognise something you made. */
function whenAdded(value: Date | string): string {
  const then = new Date(value).getTime();
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(value).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

/**
 * What tells this client apart from the identically-named one under it.
 *
 * Never empty, for the reason Phase 1 found the hard way: a row reading only
 * "Dave Chen" is not a question, it is an obstacle. A client with no jobs is an
 * ordinary state — a lead added ahead of the work, or one whose jobs were
 * deleted — so it says so and offers the one fact it has, when it turned up.
 */
export function clientDetailLine(client: ClientSuggestion): string {
  const facts: string[] = [];
  facts.push(
    client.jobCount === 0
      ? "No jobs yet"
      : client.jobCount === 1
        ? "1 job"
        : `${client.jobCount} jobs`
  );
  if (client.latestAddress) facts.push(client.latestAddress);
  if (client.email) facts.push(client.email);
  else if (client.phone) facts.push(client.phone);
  facts.push(`added ${whenAdded(client.createdAt)}`);
  return facts.join(" · ");
}

export function ClientPicker({ initialQuery = "", error, onSelectionChange }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ClientSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState<number>(CREATE_INDEX);
  const [selection, setSelection] = useState<ClientSelection | null>(null);

  const trimmed = query.trim();
  // Derived rather than stored, so backspacing below the threshold empties the
  // list without a setState in the effect that filled it.
  const visible = trimmed.length < MIN_QUERY ? [] : results;

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Responses can land out of order; only the newest query's may be shown.
  const latestQuery = useRef(query);

  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) =>
    index === CREATE_INDEX ? `${baseId}-create` : `${baseId}-option-${index}`;

  const canCreate = trimmed.length > 0;

  const select = useCallback(
    (next: ClientSelection) => {
      setSelection(next);
      onSelectionChange(next);
      setOpen(false);
      setResults([]);
    },
    [onSelectionChange]
  );

  const clearSelection = useCallback(() => {
    setSelection(null);
    onSelectionChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    // Focus returns to where the work continues, not to the top of the form.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [onSelectionChange]);

  // Debounced search. 180ms is under the ~200ms that reads as "instant" while
  // still collapsing a burst of keystrokes into one round trip.
  //
  // Every setState below sits inside the timer or the promise, never in the
  // effect body: a synchronous setState here would cascade a second render on
  // every keystroke, which the React compiler's lint rule refuses for good
  // reason. Clearing on a too-short query is handled by deriving `visible`
  // instead of storing it.
  useEffect(() => {
    if (selection) return;
    const trimmed = query.trim();
    latestQuery.current = query;
    if (trimmed.length < MIN_QUERY) return;

    const timer = setTimeout(() => {
      setSearching(true);
      searchClientsAction(trimmed)
        .then((found) => {
          if (latestQuery.current !== query) return;
          setResults(found);
          // One match is a suggestion, so it is highlighted and enter takes it.
          // Two of the same name is the question — nothing is highlighted, and
          // enter cannot answer it by accident.
          setActive(found.length === 1 ? 0 : found.length === 0 ? CREATE_INDEX : NONE);
        })
        .catch(() => {
          // A failed lookup must never block creation: the create row still
          // works, so the worst case is a duplicate client rather than a job
          // that could not be written down.
          if (latestQuery.current === query) setResults([]);
        })
        .finally(() => {
          if (latestQuery.current === query) setSearching(false);
        });
    }, 180);

    return () => clearTimeout(timer);
  }, [query, selection]);

  // Keep the highlighted row in view when arrowing past the visible edge.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`#${CSS.escape(optionId(active))}`)
      ?.scrollIntoView({ block: "nearest" });
    // optionId is stable for a given baseId; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open, visible.length]);

  const orderedIndices = [...visible.map((_, index) => index), ...(canCreate ? [CREATE_INDEX] : [])];

  function move(delta: number) {
    if (orderedIndices.length === 0) return;
    setOpen(true);
    const current = orderedIndices.indexOf(active);
    const next = current === -1 ? (delta > 0 ? 0 : orderedIndices.length - 1) : current + delta;
    const wrapped = (next + orderedIndices.length) % orderedIndices.length;
    setActive(orderedIndices[wrapped]);
  }

  function commitActive() {
    if (active === CREATE_INDEX) {
      if (!canCreate) return;
      select({ kind: "new", name: trimmed, isBusiness: looksLikeBusiness(query) });
      return;
    }
    const client = visible[active];
    if (client) select({ kind: "existing", client });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Enter":
        // While the list is open, enter belongs to the list. It takes the
        // highlighted row, and when nothing is highlighted — the two-Dave-Chens
        // case — it does nothing at all rather than submitting a form whose
        // central question is still open.
        if (!open) break;
        event.preventDefault();
        if (orderedIndices.includes(active)) commitActive();
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        break;
      default:
        break;
    }
  }

  if (selection) {
    return (
      <SelectedClient
        selection={selection}
        onChangeClient={clearSelection}
        onBusinessToggle={(isBusiness) => {
          if (selection.kind !== "new") return;
          select({ ...selection, isBusiness });
        }}
      />
    );
  }

  const describedBy = [error ? `${baseId}-error` : null, `${baseId}-hint`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative">
      <label htmlFor={`${baseId}-input`} className="mb-2 block text-sm font-medium text-ink-secondary">
        Who it&rsquo;s for
      </label>

      <input
        ref={inputRef}
        id={`${baseId}-input`}
        // Not `name`: the value the server reads is the hidden field written by
        // the parent form, which carries the *decision* rather than the keystrokes.
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && orderedIndices.includes(active) ? optionId(active) : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        value={query}
        placeholder="Start typing a name or business…"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(CREATE_INDEX);
        }}
        onFocus={() => setOpen(true)}
        // A tick, so a click on an option lands before the list closes.
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className={`w-full rounded-lg border bg-ground/50 px-4 py-3 text-ink-primary outline-none transition placeholder:text-ink-muted ${
          error ? "border-danger focus:border-danger" : "border-hairline focus:border-signal-blue"
        }`}
      />

      <p id={`${baseId}-hint`} className="mt-2 text-xs text-ink-muted">
        A name is enough. If they&rsquo;re not in your list yet, press enter to add them.
      </p>

      {error ? (
        <p id={`${baseId}-error`} className="mt-2 text-xs text-danger-fg">
          {error}
        </p>
      ) : null}

      {/* Screen readers get the result count the sighted eye gets from the list. */}
      <p aria-live="polite" className="sr-only">
        {open && !searching
          ? visible.length === 0
            ? "No matching clients. Press enter to add a new one."
            : `${visible.length} matching ${visible.length === 1 ? "client" : "clients"}.`
          : ""}
      </p>

      {open && (visible.length > 0 || canCreate) ? (
        // Opaque on purpose. `surface-raised` is a 7% film in dark mode — right
        // for a panel sitting on the page, wrong for anything floating over it,
        // because the form fields underneath read straight through. And no
        // shadow: this system is flat by doctrine and layers by tone
        // (DESIGN.md), so a floating layer gets its own opaque neutral instead.
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-hairline bg-surface-sidebar">
          {visible.length > 1 ? (
            // Outside the listbox, not a presentational row inside it: a
            // listbox's children have to be options, and a screen reader
            // reading this sentence as one is worse than not hearing it.
            <p className="border-b border-hairline px-4 py-2.5 text-xs text-ink-secondary">
              More than one client goes by this name. Pick the right one, or add someone new.
            </p>
          ) : null}

          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Matching clients"
            className="max-h-80 overflow-y-auto p-1"
          >
          {visible.map((client, index) => (
            <li
              key={client.id}
              id={optionId(index)}
              role="option"
              aria-selected={active === index}
              onMouseDown={(event) => {
                // Before blur, so the click is not cancelled by the list closing.
                event.preventDefault();
                select({ kind: "existing", client });
              }}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer rounded-lg px-3 py-2.5 ${
                active === index ? "bg-surface-lifted" : ""
              }`}
            >
              <span className="block font-medium text-ink-primary">{client.displayName}</span>
              <span className="block text-sm text-ink-muted">{clientDetailLine(client)}</span>
            </li>
          ))}

          {canCreate ? (
            <li
              id={optionId(CREATE_INDEX)}
              role="option"
              aria-selected={active === CREATE_INDEX}
              onMouseDown={(event) => {
                event.preventDefault();
                select({ kind: "new", name: trimmed, isBusiness: looksLikeBusiness(query) });
              }}
              onMouseEnter={() => setActive(CREATE_INDEX)}
              className={`cursor-pointer rounded-lg px-3 py-2.5 ${
                active === CREATE_INDEX ? "bg-surface-lifted" : ""
              } ${visible.length > 0 ? "mt-1 border-t border-hairline pt-3" : ""}`}
            >
              <span className="block font-medium text-ink-primary">
                Add &ldquo;{trimmed}&rdquo;
              </span>
              <span className="block text-sm text-ink-muted">
                {visible.length > 0
                  ? "Someone new who happens to share the name"
                  : "New client — you can fill in the rest later"}
              </span>
            </li>
          ) : null}
          </ul>

          {/* Said out loud, not just to screen readers. A lookup that takes a
              moment on a job-site connection has to look like it is taking a
              moment — "a user should always know what is happening now"
              (PRODUCT.md). It sits under the rows so nothing moves when the
              results land. */}
          {searching ? (
            <p className="border-t border-hairline px-4 py-2.5 text-xs text-ink-muted">
              Checking your clients…
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The answer, once given. Shown instead of the box rather than beside it: the
 * question is settled, and a field still offering to be typed into suggests it
 * isn't. "Change" puts the box back with the cursor in it.
 */
function SelectedClient({
  selection,
  onChangeClient,
  onBusinessToggle,
}: {
  selection: ClientSelection;
  onChangeClient: () => void;
  onBusinessToggle: (isBusiness: boolean) => void;
}) {
  const toggleId = useId();
  const isNew = selection.kind === "new";
  const name = isNew ? selection.name : selection.client.displayName;

  return (
    <div>
      <p className="mb-2 block text-sm font-medium text-ink-secondary">Who it&rsquo;s for</p>

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-hairline bg-surface-lifted px-4 py-3">
        <div className="min-w-0">
          <p className="font-medium text-ink-primary">{name}</p>
          <p className="text-sm text-ink-muted">
            {isNew ? "New client — added when you save this job" : clientDetailLine(selection.client)}
          </p>
        </div>

        <button
          type="button"
          onClick={onChangeClient}
          className="shrink-0 rounded-lg border border-hairline bg-surface-raised px-3 py-1.5 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        >
          Change
        </button>
      </div>

      {isNew ? (
        // The one thing a single typed name genuinely cannot tell us. Preset
        // from the name's own words ("Ltd", "Property Management"), visible
        // either way, and one click to correct — a guess someone can see and
        // change, rather than one they find out about later on a quote.
        <div className="mt-3 flex items-center gap-2">
          <input
            id={toggleId}
            type="checkbox"
            checked={selection.isBusiness}
            onChange={(event) => onBusinessToggle(event.target.checked)}
            className="h-4 w-4 accent-signal-blue"
          />
          <label htmlFor={toggleId} className="text-sm text-ink-secondary">
            This is a business, not a person
          </label>
        </div>
      ) : null}
    </div>
  );
}
