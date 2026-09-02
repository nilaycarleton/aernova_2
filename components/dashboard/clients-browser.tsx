"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClientStatus } from "@prisma/client";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import {
  CLIENT_FILTERS,
  CLIENT_STATUS_META,
  ClientFilter,
  clientStatusTone,
  matchesClientFilter,
} from "@/lib/client-status";
import type { Tile } from "@/lib/client-insights";
import { sinceLabel } from "@/lib/relative-time";
import { deleteClientAction } from "@/app/(dashboard)/clients/actions";
import { ConfirmSubmit } from "@/components/dashboard/confirm-submit";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { Status } from "@/components/ui/status";
import { NumericReadout } from "@/components/ui/numeric-readout";

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
      <EmptyState
        kind="first-use"
        title="No clients yet"
        description="Clients arrive with the work. Start a job and type who it's for — they'll be here as a lead the moment you do."
        action={
          <Link
            href="/jobs/new"
            className="inline-flex rounded-md bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            New job
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="min-w-0 rounded-lg border border-hairline bg-surface-raised p-5"
          >
            {/* Was the one cyan figure per tile, with a doc comment claiming
                the Readout Rule for it — backwards, same bug Phase 4 found and
                fixed on the dashboard. A client count is a business count, not
                a measurement; NumericReadout's tone="default" is ordinary ink. */}
            <NumericReadout label={tile.label} value={tile.value} size="lg" />
            <DeltaLabel tile={tile} />
          </div>
        ))}
      </div>

      <FilterToolbar
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by name or address…"
        resultCount={`${filtered.length} of ${clients.length} client${clients.length === 1 ? "" : "s"}`}
        filters={
          <>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as ClientFilter)}
              aria-label="Filter by status"
              className="rounded-md border border-hairline bg-ground/60 px-3 py-2 text-sm text-ink-strong"
            >
              {CLIENT_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            {/* Only offered once tags exist. An empty dropdown is a promise
                the data cannot keep. */}
            {allTags.length > 0 ? (
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                aria-label="Filter by tag"
                className="rounded-md border border-hairline bg-ground/60 px-3 py-2 text-sm text-ink-strong"
              >
                <option value="">All tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            ) : null}
          </>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState kind="filtered" title="No clients match your filters." />
      ) : (
        <ClientsTable clients={filtered} canDelete={canDelete} />
      )}
    </div>
  );
}

function ClientsTable({ clients, canDelete }: { clients: BrowserClient[]; canDelete: boolean }) {
  const columns: TableColumn<BrowserClient & Record<string, unknown>>[] = [
    {
      key: "name",
      header: "Name",
      width: proportional(2),
      renderCell: (client) => (
        <div>
          {/* Item 44 gave clients their own page — their name goes there now,
              not to a job search standing in for one. */}
          <Link
            href={`/clients/${client.id}`}
            className="font-medium text-ink-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            {client.displayName}
          </Link>
          <p className="mt-0.5 text-xs text-ink-muted">
            {client.jobCount === 0 ? "No jobs yet" : `${client.jobCount} job${client.jobCount === 1 ? "" : "s"}`}
            {client.leadSource ? ` · via ${client.leadSource}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "address",
      header: "Address",
      width: proportional(2),
      renderCell: (client) => (
        <span className="text-ink-secondary">
          {client.address ?? <span className="text-ink-muted">No address yet</span>}
        </span>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      width: proportional(2),
      renderCell: (client) =>
        client.tags.length === 0 ? (
          <span className="text-ink-muted">—</span>
        ) : (
          <span className="flex flex-wrap gap-1.5">
            {client.tags.map((t) => (
              <span key={t} className="rounded-full bg-surface-lifted px-2.5 py-0.5 text-xs text-ink-secondary">
                {t}
              </span>
            ))}
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      width: pixel(140),
      renderCell: (client) => (
        <Status
          variant="solid"
          tone={clientStatusTone(client.status)}
          label={CLIENT_STATUS_META[client.status].label}
        />
      ),
    },
    {
      key: "lastActivity",
      header: "Last activity",
      width: pixel(140),
      renderCell: (client) => (
        <span className="text-ink-secondary" title={new Date(client.lastActivityAt).toLocaleString()}>
          {sinceLabel(client.lastActivityAt)}
        </span>
      ),
    },
    ...(canDelete
      ? [
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            width: pixel(90),
            align: "end" as const,
            renderCell: (client: BrowserClient) => (
              <form action={deleteClientAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <ConfirmSubmit
                  pendingText="Deleting…"
                  question={`Delete ${client.displayName}? This also deletes their properties and any open requests. ${
                    client.jobCount > 0
                      ? `Their ${client.jobCount} job${client.jobCount === 1 ? "" : "s"} will stay, keeping the name and address as they are today. `
                      : ""
                  }This cannot be undone.`}
                  // Impeccable audit finding (live at 420px): a Table cell's
                  // button inherits no minimum size from the row — same
                  // touch-target gap Phase 4 already found and fixed on the
                  // Jobs list's own Delete button.
                  className="inline-flex min-h-11 items-center text-xs text-ink-muted underline underline-offset-2 transition hover:text-danger-fg disabled:opacity-60"
                >
                  Delete
                </ConfirmSubmit>
              </form>
            ),
          },
        ]
      : []),
  ];

  return <Table data={clients} columns={columns} idKey="id" density="balanced" dividers="rows" hasHover />;
}
