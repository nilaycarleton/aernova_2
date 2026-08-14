"use client";

import Link from "next/link";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";

/**
 * Plain, pre-formatted view model — the server page does every lookup
 * (client name, address, status label) and money/date formatting before this
 * crosses the server/client boundary, since renderCell closures can't be
 * passed as props from a Server Component. The status pill keeps the
 * existing `QUOTE_STATUS_META` classes as-is: DESIGN.md's Chips spec (10%
 * tint + `-fg` text, read-only carriers) doesn't match Astryx Badge's
 * semantic variants, which `lib/astryx/theme.ts` wires as the *solid-fill*
 * role instead — see that file's `--color-success/error/warning` comment.
 */
export interface QuoteRow extends Record<string, unknown> {
  id: string;
  jobId: string;
  clientName: string;
  title: string;
  quoteLabel: string;
  address: string;
  createdLabel: string;
  statusLabel: string;
  statusHint: string;
  statusBadgeClass: string;
  totalLabel: string;
}

export function QuotesTable({ rows }: { rows: QuoteRow[] }) {
  const columns: TableColumn<QuoteRow>[] = [
    {
      key: "client",
      header: "Client",
      width: proportional(2),
      renderCell: (row) => (
        <div>
          {/* The whole row is about this quote, so the link is on the thing
              you'd point at: whose roof it is. */}
          <Link
            href={`/jobs/${row.jobId}/quotes/${row.id}`}
            className="font-medium text-ink-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            {row.clientName}
          </Link>
          <span className="mt-0.5 block text-xs text-ink-muted">{row.title}</span>
        </div>
      ),
    },
    { key: "quoteLabel", header: "Quote", width: pixel(110) },
    { key: "address", header: "Where", width: proportional(2) },
    { key: "createdLabel", header: "Created", width: pixel(120) },
    {
      key: "status",
      header: "Standing",
      width: pixel(170),
      renderCell: (row) => (
        <span
          title={row.statusHint}
          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${row.statusBadgeClass}`}
        >
          {row.statusLabel}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      align: "end",
      width: pixel(120),
      renderCell: (row) => (
        <span className="font-semibold tabular-nums text-ink-primary">{row.totalLabel}</span>
      ),
    },
  ];

  return (
    <Table
      data={rows}
      columns={columns}
      idKey="id"
      density="balanced"
      dividers="rows"
      hasHover
    />
  );
}
