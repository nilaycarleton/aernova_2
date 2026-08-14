"use client";

import Link from "next/link";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";

/**
 * Plain, pre-formatted view model — see quotes-table.tsx for why formatting
 * happens server-side and why the status pill isn't Astryx Badge.
 */
export interface InvoiceRow extends Record<string, unknown> {
  id: string;
  jobId: string;
  clientName: string;
  title: string;
  invoiceLabel: string;
  address: string;
  dueLabel: string;
  statusLabel: string;
  statusHint: string;
  statusBadgeClass: string;
  owedLabel: string;
  isOwed: boolean;
}

export function InvoicesTable({ rows }: { rows: InvoiceRow[] }) {
  const columns: TableColumn<InvoiceRow>[] = [
    {
      key: "client",
      header: "Client",
      width: proportional(2),
      renderCell: (row) => (
        <div>
          {/* The whole row is about this invoice, so the link is on the thing
              you'd point at: whose roof it is. */}
          <Link
            href={`/jobs/${row.jobId}/invoices/${row.id}`}
            className="font-medium text-ink-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            {row.clientName}
          </Link>
          <span className="mt-0.5 block text-xs text-ink-muted">{row.title}</span>
        </div>
      ),
    },
    { key: "invoiceLabel", header: "Invoice", width: pixel(110) },
    { key: "address", header: "Where", width: proportional(2) },
    { key: "dueLabel", header: "Due", width: pixel(120) },
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
      key: "owed",
      header: "Owing",
      align: "end",
      width: pixel(120),
      renderCell: (row) => (
        // What is left, not what was billed. The billed figure is on the
        // invoice; the one worth scanning a column of is what's still owed.
        <span
          className={row.isOwed ? "font-semibold tabular-nums text-ink-primary" : "tabular-nums text-ink-muted"}
        >
          {row.owedLabel}
        </span>
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
