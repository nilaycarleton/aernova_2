"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClientStatus } from "@prisma/client";
import {
  CLIENT_FILTERS,
  CLIENT_STATUS_META,
  ClientFilter,
  matchesClientFilter,
} from "@/lib/client-status";
import type { Tile } from "@/lib/client-insights";
import { sinceLabel } from "@/lib/relative-time";
import { deleteClientAction } from "@/app/(dashboard)/clients/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

export type BrowserClient = {
  id: string;
  displayName: string;
  /** Their first property on one line, or null when nobody has an address yet. */
  address: string | null;
  status: ClientStatus;
  tags: string[];
  leadSource: string | null;
  jobCount: number;
  lastActivityAt: string | Date;
};

type Props = {
  tiles: Tile[];
  clients: BrowserClient[];
  canDelete: boolean;
};

function DeltaLabel({ tile }: { tile: Tile }) {
  // Nothing to compare against, so nothing is claimed. A "+0%" here would read
  // as "flat", which is not what "there was nothing before" means.
  if (tile.delta === null) {
    return <p className="mt-2 text-xs text-ink-muted">{tile.value > 0 ? "First in this period" : "—"}</p>;
  }

  const up = tile.delta > 0;
  return (
    <p className="mt-2 text-xs text-ink-muted">
      <span className="font-medium tabular-nums text-ink-secondary">
        {up ? "+" : ""}
        {tile.delta}%
      </span>{" "}
      {tile.comparison}
    </p>
  );
}

export function ClientsBrowser({ tiles, clients, canDelete }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("LEADS_AND_ACTIVE");
  const [tag, setTag] = useState<string>("");

  const allTags = useMemo(
    () => Array.from(new Set(clients.flatMap((c) => c.tags))).sort(),
    [clients]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (!matchesClientFilter(c.status, filter)) return false;
      if (tag && !c.tags.includes(tag)) return false;
      if (!q) return true;
      return (
        c.displayName.toLowerCase().includes(q) ||
        (c.address?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [clients, query, filter, tag]);

  if (clients.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-hairline p-10 text-center">
        <p className="text-lg font-medium text-ink-primary">No clients yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
          Clients arrive with the work. Start a job and type who it&apos;s for — they&apos;ll be
          here as a lead the moment you do.
        </p>
        <Link
          href="/jobs/new"
          className="mt-5 inline-flex rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        >
          New job
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="min-w-0 rounded-2xl border border-hairline bg-surface-raised p-5"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">{tile.label}</p>
            {/* The one cyan figure per tile — the Readout Rule: cyan marks the
                number, never the label and never the delta. */}
            <p className="mt-2 text-4xl font-semibold tabular-nums text-instrument-fg">
              {tile.value}
            </p>
            <DeltaLabel tile={tile} />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or address…"
          className="min-w-0 flex-1 rounded-xl border border-hairline bg-ground/60 px-4 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-signal-blue/50 focus:outline-none"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ClientFilter)}
          aria-label="Filter by status"
          className="rounded-xl border border-hairline bg-ground/60 px-3 py-2 text-sm text-ink-strong"
        >
          {CLIENT_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {/* Only offered once tags exist. An empty dropdown is a promise the
            data cannot keep. */}
        {allTags.length > 0 ? (
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            aria-label="Filter by tag"
            className="rounded-xl border border-hairline bg-ground/60 px-3 py-2 text-sm text-ink-strong"
          >
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <p className="text-xs text-ink-muted">
        {filtered.length} of {clients.length} client{clients.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline p-10 text-center text-ink-muted">
          No clients match your filters.
        </div>
      ) : (
        /* The table scrolls inside its own box rather than pushing the page
           sideways — a horizontal scrollbar on the whole app is a bug. */
        <div className="overflow-x-auto rounded-2xl border border-hairline">
          <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface-raised">
                <th scope="col" className="px-4 py-3 font-medium text-ink-secondary">Name</th>
                <th scope="col" className="px-4 py-3 font-medium text-ink-secondary">Address</th>
                <th scope="col" className="px-4 py-3 font-medium text-ink-secondary">Tags</th>
                <th scope="col" className="px-4 py-3 font-medium text-ink-secondary">Status</th>
                <th scope="col" className="px-4 py-3 font-medium text-ink-secondary">Last activity</th>
                {canDelete ? <th scope="col" className="px-4 py-3" /> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id} className="border-b border-hairline last:border-b-0">
                  <td className="px-4 py-3">
                    {/* Item 44 gave clients their own page — their name goes
                        there now, not to a job search standing in for one. */}
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-ink-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                    >
                      {client.displayName}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {client.jobCount === 0
                        ? "No jobs yet"
                        : `${client.jobCount} job${client.jobCount === 1 ? "" : "s"}`}
                      {client.leadSource ? ` · via ${client.leadSource}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">
                    {client.address ?? <span className="text-ink-muted">No address yet</span>}
                  </td>
                  <td className="px-4 py-3">
                    {client.tags.length === 0 ? (
                      <span className="text-ink-muted">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1.5">
                        {client.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-surface-lifted px-2.5 py-0.5 text-xs text-ink-secondary"
                          >
                            {t}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        CLIENT_STATUS_META[client.status].badge
                      }`}
                    >
                      {CLIENT_STATUS_META[client.status].label}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-ink-secondary"
                    title={new Date(client.lastActivityAt).toLocaleString()}
                  >
                    {sinceLabel(client.lastActivityAt)}
                  </td>
                  {canDelete ? (
                    <td className="px-4 py-3 text-right">
                      <form
                        action={deleteClientAction}
                        onSubmit={(event) => {
                          if (
                            !window.confirm(
                              `Delete ${client.displayName}? This also deletes their properties and any open requests. ${
                                client.jobCount > 0
                                  ? `Their ${client.jobCount} job${client.jobCount === 1 ? "" : "s"} will stay, keeping the name and address as they are today. `
                                  : ""
                              }This cannot be undone.`
                            )
                          ) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="clientId" value={client.id} />
                        <SubmitButton
                          pendingText="Deleting…"
                          className="text-xs text-ink-muted underline underline-offset-2 transition hover:text-danger-fg disabled:opacity-60"
                        >
                          Delete
                        </SubmitButton>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
