"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@astryxdesign/core/Button";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Dialog } from "@astryxdesign/core/Dialog";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { List } from "@astryxdesign/core/List";
import { LayoutContent } from "@astryxdesign/core/Layout";

import { Status } from "@/components/ui/status";
import { NumericReadout } from "@/components/ui/numeric-readout";
import { PageHeader } from "@/components/ui/page-header";
import { ActionToolbar } from "@/components/ui/action-toolbar";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { DataRow } from "@/components/ui/data-row";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRow, SkeletonReadout, SkeletonList } from "@/components/ui/skeleton";
import { SplitInspector } from "@/components/ui/split-inspector";
import {
  DocumentSurface,
  DocumentHeader,
  DocumentSection,
  DocumentMeta,
  DocumentRule,
  DocumentTotalRow,
  DocumentFooter,
} from "@/components/ui/document";
import { CounterTextArea } from "@/components/ui/form-field";
import { formatMoney } from "@/lib/money";
import {
  FIXTURE_JOB,
  FIXTURE_JOB_LONG,
  FIXTURE_JOB_MISSING,
  FIXTURE_JOB_ROWS,
  FIXTURE_REQUEST,
  FIXTURE_QUOTE,
  FIXTURE_INVOICE,
  FIXTURE_INVOICE_BALANCE,
  FIXTURE_MEASUREMENT,
  FIXTURE_WARRANTY,
} from "@/lib/design-system-fixtures";

/** Local lab chrome only — matches the sibling token preview's own `Section`, not exported, not a Phase 3 primitive itself. */
function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 border-t border-hairline pt-6">
      <h2 className="text-sm font-semibold text-ink-primary">{title}</h2>
      {description ? (
        <div className="mt-1 max-w-[70ch] text-sm text-ink-secondary">{description}</div>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** A reviewer re-checking one primitive mid-build shouldn't have to scroll-search 13 sections for it (Impeccable critique finding). */
const SECTIONS = [
  { id: "astryx-audit", label: "Astryx audit" },
  { id: "status", label: "Status" },
  { id: "numeric-readout", label: "NumericReadout" },
  { id: "page-header", label: "PageHeader" },
  { id: "action-toolbar", label: "ActionToolbar" },
  { id: "filter-toolbar", label: "FilterToolbar" },
  { id: "data-row", label: "DataRow" },
  { id: "empty-state", label: "EmptyState" },
  { id: "skeleton", label: "Skeleton" },
  { id: "split-inspector", label: "SplitInspector" },
  { id: "document", label: "Document" },
  { id: "form-pattern", label: "Form pattern" },
  { id: "overlay", label: "Overlay" },
  { id: "verification-log", label: "Verification log" },
];

function JumpNav() {
  return (
    <nav aria-label="Jump to primitive" className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
      {SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="text-ink-secondary underline-offset-2 hover:text-ink-primary hover:underline"
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}

function Variant({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      {children}
    </div>
  );
}

export function PrimitivesClient() {
  return (
    <div className="space-y-10">
      <JumpNav />
      <AstryxDecisionMatrix />
      <StatusDemo />
      <NumericReadoutDemo />
      <PageHeaderDemo />
      <ActionToolbarDemo />
      <FilterToolbarDemo />
      <DataRowDemo />
      <EmptyStateDemo />
      <SkeletonDemo />
      <SplitInspectorDemo />
      <DocumentDemo />
      <FormFieldDemo />
      <OverlayDemo />
      <ResponsiveNotes />
    </div>
  );
}

function AstryxDecisionMatrix() {
  const rows: { primitive: string; decision: string; note: string }[] = [
    { primitive: "Status", decision: "A/B — StatusDot + Badge directly", note: "Tone→variant map is the only Aernova code (lib/status-tone.ts)." },
    { primitive: "NumericReadout", decision: "D — bespoke", note: "No Astryx equivalent for a labeled tabular-nums readout; presentation-only, no math." },
    { primitive: "PageHeader", decision: "D — bespoke", note: "No Astryx page-identity primitive; distinct from Phase 2 TopNav's route identity." },
    { primitive: "ActionToolbar", decision: "B — Toolbar composition", note: "Names the end-content slot by primary/secondary role." },
    { primitive: "FilterToolbar", decision: "D — bespoke container", note: "Query state stays page-owned; this is layout only." },
    { primitive: "DataRow", decision: "A — Item directly", note: "Item already solves interactiveRef / href / onClick semantics." },
    { primitive: "EmptyState", decision: "A — EmptyState directly", note: "The one Astryx component with no client directive; kind→copy defaults only." },
    { primitive: "Skeleton", decision: "A — Skeleton directly", note: "Row/Readout/List are compositions of it, not replacements." },
    { primitive: "SplitInspector", decision: "B — Layout/LayoutPanel + Dialog", note: "Breakpoint doctrine + responsive swap is the bespoke part." },
    { primitive: "Document primitives", decision: "D — bespoke (paper tokens)", note: "No Astryx paper/print surface; DocumentBrand/QuoteTotals reused as-is, not replaced." },
    { primitive: "Form pattern", decision: "A — TextInput/TextArea/Selector/etc. directly", note: "CounterTextArea only adds the min/max status message." },
    { primitive: "Overlay pattern", decision: "A — Dialog/AlertDialog/DropdownMenu directly", note: "No new wrapper; doctrine documented below." },
  ];

  return (
    <Section
      id="astryx-audit"
      title="Astryx capability audit — reuse decisions"
      description="Per-primitive record required by the acceptance criteria (&quot;no custom primitive duplicates an Astryx primitive without a recorded reason&quot;). Full audit detail in docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_PHASE_3_IMPLEMENTATION.md."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-ink-muted">
              <th className="pb-2 pr-4 font-medium">Primitive</th>
              <th className="pb-2 pr-4 font-medium">Decision</th>
              <th className="pb-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map((row) => (
              <tr key={row.primitive}>
                <td className="py-2 pr-4 font-medium text-ink-primary">{row.primitive}</td>
                <td className="py-2 pr-4 text-ink-secondary">{row.decision}</td>
                <td className="max-w-[36ch] py-2 text-ink-muted">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function StatusDemo() {
  return (
    <Section
      id="status"
      title="Status"
      description="The severity-dot pattern (Phase 0 decision record) plus a solid-badge variant for table cells. Color is never the only signal — text is always present."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Variant label="Dot — all tones">
          <div className="flex flex-wrap gap-4">
            <Status tone="neutral" label="Draft" />
            <Status tone="info" label="Awaiting homeowner review" />
            <Status tone="success" label="Paid" />
            <Status tone="caution" label="Changes requested" />
            <Status tone="danger" label="Overdue" />
          </div>
        </Variant>
        <Variant label="Dot — pulsing (live state)">
          <Status tone="info" label="Processing" pulsing />
        </Variant>
        <Variant label="Solid badge — all tones">
          <div className="flex flex-wrap gap-2">
            <Status tone="neutral" label="Archived" variant="solid" />
            <Status tone="info" label="Contacted / Qualified" variant="solid" />
            <Status tone="success" label="Completed" variant="solid" />
            <Status tone="caution" label="Pending" variant="solid" />
            <Status tone="danger" label="Overdue" variant="solid" />
          </div>
        </Variant>
        <Variant label="Long label">
          <Status tone="info" label="Awaiting homeowner review before scheduling" />
        </Variant>
      </div>
    </Section>
  );
}

function NumericReadoutDemo() {
  return (
    <Section
      id="numeric-readout"
      title="NumericReadout"
      description="Tabular-nums, caller-formatted. Cyan is reserved for tone=&quot;measurement&quot; only — never money or counts (The Readout Rule). Roof area and Pitch appear together here only to catalog the option itself — DESIGN.md's &quot;one cyan figure per surface&quot; rule still applies to any single real screen."
    >
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <NumericReadout label="Balance due" value={formatMoney(FIXTURE_INVOICE_BALANCE.amountCents)} tone="default" />
        <NumericReadout label="Roof area" value={FIXTURE_MEASUREMENT.area} tone="measurement" />
        <NumericReadout label="Progress" value={FIXTURE_JOB.progress} unit="%" />
        <NumericReadout label="Active jobs" value={37} />
        <NumericReadout label="Overdue invoices" value={3} detail="Since Aug 2" />
        <NumericReadout label="Pitch" value={FIXTURE_MEASUREMENT.pitch} tone="measurement" />
        <NumericReadout label="Unavailable" value={null} />
        <NumericReadout label="Zero balance" value={formatMoney(0)} />
        <NumericReadout label="Adjustment" value="−$1,250.00" />
        <NumericReadout label="Large contract" value={formatMoney(999999_99)} />
        <NumericReadout label="Visits" value="3 of 5" size="sm" />
        <NumericReadout label="Win rate" value="100%" size="lg" />
      </div>
    </Section>
  );
}

function PageHeaderDemo() {
  return (
    <Section
      id="page-header"
      title="PageHeader"
      description="Page-level identity inside route content — distinct from Phase 2's TopNav (&quot;where am I&quot;). Four representative configurations."
    >
      <div className="space-y-8">
        <div className="rounded-md border border-dashed border-hairline p-4">
          <PageHeader title="Dashboard" />
        </div>
        <div className="rounded-md border border-dashed border-hairline p-4">
          <PageHeader
            title="Jobs"
            description="37 active jobs"
            primaryAction={<Button label="New job" variant="primary" size="sm" />}
          />
        </div>
        <div className="rounded-md border border-dashed border-hairline p-4">
          <PageHeader
            eyebrow={FIXTURE_JOB_LONG.jobNumber}
            title={FIXTURE_JOB_LONG.title}
            status={<Status tone="info" label={FIXTURE_JOB_LONG.status} />}
            secondaryActions={<Button label="Edit" variant="secondary" size="sm" />}
            primaryAction={<Button label="Mark complete" variant="primary" size="sm" />}
          />
        </div>
        <div className="rounded-md border border-dashed border-hairline p-4">
          <PageHeader title="Workflow" description="Choose the stages your team uses." />
        </div>
      </div>
    </Section>
  );
}

function ActionToolbarDemo() {
  return (
    <Section id="action-toolbar" title="ActionToolbar" description="At most one dominant action; secondary/More menu carries the rest.">
      <div className="space-y-4">
        <ActionToolbar
          label="Job actions"
          secondary={
            <DropdownMenu
              button={{ label: "More", variant: "ghost", size: "sm" }}
              items={[
                { label: "Duplicate", onClick: () => {} },
                { label: "Archive", onClick: () => {} },
                { type: "divider" },
                { label: "Delete", onClick: () => {}, isDisabled: true },
              ]}
            />
          }
          primary={<Button label="Mark complete" variant="primary" size="sm" />}
        />
        <ActionToolbar label="Saving" primary={<Button label="Saving…" variant="primary" size="sm" isLoading />} />
        <ActionToolbar label="Locked" primary={<Button label="Send" variant="primary" size="sm" isDisabled />} />
      </div>
    </Section>
  );
}

function FilterToolbarDemo() {
  const [search, setSearch] = useState("");
  return (
    <Section id="filter-toolbar" title="FilterToolbar" description="Layout only — query state stays page-owned.">
      <FilterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search jobs"
        filters={
          <>
            <Button label="Status: Active" variant="secondary" size="sm" />
            <Button label="Trade: Roofing" variant="secondary" size="sm" />
          </>
        }
        resultCount={`${FIXTURE_JOB_ROWS.length} jobs`}
        onClear={search ? () => setSearch("") : undefined}
        actions={<Button label="New job" variant="primary" size="sm" />}
      />
    </Section>
  );
}

function DataRowDemo() {
  return (
    <Section
      id="data-row"
      title="DataRow"
      description="Wraps Astryx Item — short, long, and missing-metadata job rows, a request row, and an invoice row with a trailing Status. Missing metadata always gets an explicit placeholder (&quot;No address on file&quot;), never a silently-dropped line — see the doc comment on DataRow's meta prop."
    >
      <List hasDividers>
        <DataRow
          leading={<Status tone="info" label={FIXTURE_JOB.status} />}
          primary={FIXTURE_JOB.title}
          meta={`${FIXTURE_JOB.jobNumber} · ${FIXTURE_JOB.address}`}
          trailing={formatMoney(FIXTURE_JOB.balanceDueCents)}
          href="#"
        />
        <DataRow
          leading={<Status tone="caution" label={FIXTURE_JOB_LONG.status} />}
          primary={FIXTURE_JOB_LONG.title}
          meta={`${FIXTURE_JOB_LONG.jobNumber} · ${FIXTURE_JOB_LONG.address}`}
          trailing="No balance due"
          href="#"
        />
        <DataRow
          leading={<Status tone="neutral" label={FIXTURE_JOB_MISSING.status} />}
          primary={FIXTURE_JOB_MISSING.title}
          meta={FIXTURE_JOB_MISSING.address ?? "No address on file"}
          href="#"
        />
        <DataRow
          leading={<Status tone="info" label="Awaiting homeowner review before scheduling" />}
          primary="Long status in the leading slot"
          meta="Stress case: a long Status label next to an icon-sized slot"
          href="#"
        />
        <DataRow
          primary={FIXTURE_REQUEST.name}
          meta={FIXTURE_REQUEST.detail}
          trailing={<Status tone="info" label={FIXTURE_REQUEST.status} variant="solid" />}
          href="#"
        />
        <DataRow
          primary={FIXTURE_INVOICE.number}
          meta={formatMoney(FIXTURE_INVOICE.amountCents)}
          trailing={<Status tone="danger" label={FIXTURE_INVOICE.status} variant="solid" />}
          selected
          href="#"
        />
        <DataRow
          primary={FIXTURE_QUOTE.number}
          meta={formatMoney(FIXTURE_QUOTE.amountCents)}
          trailing={<Status tone="caution" label={FIXTURE_QUOTE.status} variant="solid" />}
          disabled
        />
      </List>
    </Section>
  );
}

function EmptyStateDemo() {
  return (
    <Section id="empty-state" title="EmptyState" description="Astryx EmptyState directly. Four kinds; action only when one is actually available.">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-md border border-hairline p-4">
          <EmptyState kind="first-use" title="No jobs yet" description="Create your first job to get started." action={<Button label="New job" variant="primary" size="sm" />} compact />
        </div>
        <div className="rounded-md border border-hairline p-4">
          <EmptyState kind="filtered" title="No jobs match these filters" compact />
        </div>
        <div className="rounded-md border border-hairline p-4">
          <EmptyState kind="clear" compact />
        </div>
        <div className="rounded-md border border-hairline p-4">
          <EmptyState kind="error" action={<Button label="Try again" variant="secondary" size="sm" />} compact />
        </div>
      </div>
      <div className="mt-6 rounded-md border border-hairline p-4">
        <Variant label="Non-compact (full list panel, not a constrained space)">
          <EmptyState
            kind="first-use"
            title="No jobs yet"
            description="Create your first job to get started."
            action={<Button label="New job" variant="primary" size="sm" />}
          />
        </Variant>
      </div>
    </Section>
  );
}

function SkeletonDemo() {
  return (
    <Section id="skeleton" title="Skeleton" description="Astryx Skeleton, composed into the shapes Aernova actually needs.">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Variant label="Row"><SkeletonRow /></Variant>
        <Variant label="Readout"><SkeletonReadout /></Variant>
        <Variant label="List (3 rows)"><SkeletonList rows={3} /></Variant>
      </div>
    </Section>
  );
}

/** Same tone-per-status convention DataRowDemo uses — kept local since this is fixture-mapping for the lab, not a domain STATUS_META table. */
function jobStatusTone(status: string): "neutral" | "info" | "caution" {
  if (status === "Lead") return "neutral";
  if (status === "In progress") return "caution";
  return "info";
}

function SplitInspectorDemo() {
  const [selected, setSelected] = useState<typeof FIXTURE_JOB_ROWS[number] | null>(null);

  return (
    <Section
      id="split-inspector"
      title="SplitInspector"
      description="Resize the window to see the swap: >=1280px is a true two-pane split (Astryx Layout `end` slot); below that the inspector opens as a bottom-anchored Astryx Dialog sheet. Select a row to open it."
    >
      <div className="rounded-md border border-hairline" style={{ minHeight: 320 }}>
        <SplitInspector
          isInspectorOpen={selected !== null}
          onInspectorOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          inspectorTitle={selected?.title ?? "Inspector"}
          main={
            <List hasDividers>
              {FIXTURE_JOB_ROWS.map((job) => (
                <DataRow
                  key={job.jobNumber}
                  primary={job.title}
                  meta={`${job.jobNumber} · ${job.address ?? "No address on file"}`}
                  trailing={<Status tone={jobStatusTone(job.status)} label={job.status} />}
                  onClick={() => setSelected(job)}
                  selected={selected?.jobNumber === job.jobNumber}
                />
              ))}
            </List>
          }
          inspector={
            selected ? (
              <div className="space-y-4 p-4">
                <NumericReadout label="Progress" value={selected.progress} unit="%" />
                <NumericReadout label="Balance due" value={selected.balanceDueCents === null ? null : formatMoney(selected.balanceDueCents)} />
                <p className="text-sm text-ink-secondary">{selected.address ?? "No address on file"}</p>
              </div>
            ) : null
          }
        />
      </div>
    </Section>
  );
}

function DocumentDemo() {
  return (
    <Section
      id="document"
      title="Document primitives"
      description="Print-safe paper surface, not wired into the actual public routes yet (Phase 6). DocumentBrand/QuoteTotals are reused as-is elsewhere; these fill the gaps the duplication audit found (heading, section, rule, totals row on the invoice page). headingLevel={2} here only — the real public routes render DocumentHeader as the page's sole h1; this lab already has one from the page shell, so it steps down a level rather than competing with it."
    >
      <DocumentSurface>
        <DocumentHeader eyebrow="Quote #482" title="Dunmore Property Group — Unit 4B" headingLevel={2} />
        <DocumentMeta
          items={[
            { label: "Prepared for", value: "Dunmore Property Group" },
            { label: "Address", value: "88 Merivale Road Extension, Nepean, ON" },
            { label: "Date", value: "August 12, 2026" },
          ]}
        />
        <DocumentSection title="Scope of work">
          <p className="text-sm" style={{ color: "var(--color-paper-ink-body)" }}>
            Full tear-off and standing-seam metal roof replacement, including flashing and
            ventilation upgrades.
          </p>
        </DocumentSection>
        <DocumentRule />
        <DocumentSection title="Totals">
          <div className="max-w-xs space-y-2">
            <DocumentTotalRow label="Subtotal" value={formatMoney(1600000)} />
            <DocumentTotalRow label="Discount" value={`−${formatMoney(50000)}`} />
          </div>
          <div className="mt-3 max-w-xs">
            <DocumentRule strong />
            <div className="pt-3">
              <DocumentTotalRow label="Total" value={formatMoney(1550000)} emphasis />
            </div>
          </div>
        </DocumentSection>
        <DocumentFooter>Warranty term {FIXTURE_WARRANTY.termMonths} months. Generated by Aernova.</DocumentFooter>
      </DocumentSurface>
    </Section>
  );
}

function FormFieldDemo() {
  const [note, setNote] = useState("Homeowner unreachable after");
  const [shortNote, setShortNote] = useState("Called twice");
  const [longNote, setLongNote] = useState(
    "Homeowner unreachable after three attempts across two weeks; neighbor confirmed the property is currently vacant pending sale, so proceeding without a verbal approval since there is no one to reach for one and the inspection window closes Friday.",
  );

  return (
    <Section
      id="form-pattern"
      title="Form pattern — Astryx TextInput/TextArea directly"
      description="CounterTextArea is the only addition: a min/max character-counter status message, matching the doctrine already proven by lib/invoice/addon-override.ts's OWNER_OVERRIDE note field. All three counter states shown, since this behavior is the entire reason the component exists over a plain TextArea."
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Variant label="In range (success)">
          <CounterTextArea label="Reason for override" min={20} max={500} value={note} onChange={setNote} rows={3} />
        </Variant>
        <Variant label="Under minimum (counts up)">
          <CounterTextArea label="Reason for override" min={20} max={500} value={shortNote} onChange={setShortNote} rows={3} />
        </Variant>
        <Variant label="Over maximum (error)">
          <CounterTextArea label="Reason for override" min={20} max={240} value={longNote} onChange={setLongNote} rows={3} />
        </Variant>
      </div>
    </Section>
  );
}

function OverlayDemo() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <Section
      id="overlay"
      title="Overlay doctrine"
      description={
        <>
          Astryx Dialog/AlertDialog/DropdownMenu/Popover directly — no new wrapper. Dialog for
          general content (form, info), AlertDialog specifically for destructive confirmations
          (replaces a hand-typed <code>window.confirm</code>, of which the duplication audit
          found 10 instances alongside the 4 that already use{" "}
          <code>components/dashboard/confirm-submit.tsx</code>). ConfirmSubmit stays exactly as
          it is — it exists for server-action forms with no client-side state to hang an
          AlertDialog off; AlertDialog is for client-side flows that already have one.
        </>
      }
    >
      <div className="flex flex-wrap gap-3">
        <Button label="Open Dialog" variant="secondary" size="sm" onClick={() => setDialogOpen(true)} />
        <Button label="Delete job (AlertDialog)" variant="destructive" size="sm" onClick={() => setAlertOpen(true)} />
      </div>

      <Dialog isOpen={dialogOpen} onOpenChange={setDialogOpen} purpose="info" width={420}>
        <DialogHeader title="Job details" onOpenChange={setDialogOpen} />
        <LayoutContent>
          <p className="text-sm text-ink-secondary">
            Ordinary content dialog — Escape and backdrop click both close it (purpose=&quot;info&quot;).
          </p>
        </LayoutContent>
      </Dialog>

      <AlertDialog
        isOpen={alertOpen}
        onOpenChange={setAlertOpen}
        title="Delete this job?"
        description="This action cannot be undone."
        actionLabel="Delete"
        onAction={() => setAlertOpen(false)}
      />
    </Section>
  );
}

function ResponsiveNotes() {
  return (
    <Section
      id="verification-log"
      title="Responsive / theme / a11y verification log"
      description="Live-checked at 390 / 768 / 1024 / 1440 / 1728, dark and light, keyboard-only, and browser 200% zoom. Full results in docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_PHASE_3_IMPLEMENTATION.md — this page is what was checked, not a substitute for checking it."
    >
      <ul className="list-inside list-disc space-y-1 text-sm text-ink-secondary">
        <li>PageHeader/ActionToolbar actions wrap and reorder below 640px without clipping.</li>
        <li>FilterToolbar keeps search full-width and primary on phone; filters wrap onto their own row.</li>
        <li>SplitInspector: sheet below 1280px, true split at/above it — see the demo above.</li>
        <li>DataRow selected/disabled states hold at 200% zoom; no control disappears.</li>
        <li>Dialog/AlertDialog: focus trap, Escape, and focus return all verified via keyboard only.</li>
      </ul>
    </Section>
  );
}
