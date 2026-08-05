import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobIdentityInclude } from "@/lib/job-identity";
import { formatMoney } from "@/lib/money";
import { isWellFormedShareToken } from "@/lib/share-token";
import { quoteStatusLabel } from "@/lib/quote-status";
import { invoiceStatusLabel } from "@/lib/invoice/status";
import { hubMeasurements, hubModelGlbUrl, shareableInvoices, shareableQuotes } from "@/lib/client-hub";
import { HubModelViewer } from "@/components/public/hub-model-viewer";

// The group layout says "Your quote" — the wrong tab title for a page that
// isn't any one document.
export const metadata: Metadata = {
  title: "Your roof",
  description: "Everything from your contractor, in one place",
  robots: { index: false, follow: false },
};

const VISIT_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  MISSED: "Missed",
  CANCELLED: "Cancelled",
};

/**
 * Item 44's Client Hub, as the homeowner receives it.
 *
 * One link, every job they have with this company — built from the `paper-*`
 * tokens like the quote and invoice pages, for the same reason: this is a
 * document, not a screen, and a repeat customer's whole history should read
 * that way too.
 *
 * `lib/client-hub.ts` owns what's safe to put here; this page only fetches
 * and lays it out. Nothing here re-implements the quote or invoice document
 * itself — a quote and an invoice already have their own public pages, and
 * this one links out to them rather than growing a second, thinner copy.
 * What has nowhere else to live is the roof report (measurements, photos,
 * the 3D model) and the visit history, so those render inline.
 */
export default async function ClientHubPage({
  params,
}: {
  params: Promise<{ clientToken: string }>;
}) {
  const { clientToken } = await params;
  if (!isWellFormedShareToken(clientToken)) notFound();

  const client = await prisma.client.findFirst({
    where: { shareToken: clientToken },
    include: {
      company: { select: { name: true, phone: true } },
      jobs: {
        orderBy: { createdAt: "desc" },
        include: {
          ...jobIdentityInclude,
          quotes: { orderBy: { createdAt: "desc" } },
          invoices: { orderBy: { createdAt: "desc" } },
          visits: { orderBy: { startAt: "desc" }, take: 20 },
          measurements: true,
          imagery: true,
          photos: { orderBy: { createdAt: "desc" }, take: 12 },
        },
      },
    },
  });
  if (!client) notFound();

  const now = new Date();

  const jobs = client.jobs
    .map((job) => {
      const quotes = shareableQuotes(job.quotes);
      const invoices = shareableInvoices(job.invoices);
      const measurements = hubMeasurements(job.measurements);
      const glbUrl = hubModelGlbUrl(job.imagery);
      const upcomingVisits = job.visits
        .filter((visit) => visit.startAt >= now)
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
      const pastVisits = job.visits
        .filter((visit) => visit.startAt < now)
        .sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
      return {
        job,
        address: formatAddress(jobAddress(job)),
        quotes,
        invoices,
        measurements,
        glbUrl,
        photos: job.photos,
        upcomingVisits,
        pastVisits,
        // Roofing vocabulary only earns its place when there's actually
        // roofing/aerial-measurement data behind it — a job's photos on their
        // own (a lawn-care before/after, a crew snapshot) are not "your roof".
        hasRoofReport: measurements.length > 0 || glbUrl !== null,
      };
    })
    // A job with nothing shareable yet — still a lead, nothing sent, no
    // visit booked — has no card. Absent, not a blank one.
    .filter(
      (j) =>
        j.quotes.length > 0 ||
        j.invoices.length > 0 ||
        j.upcomingVisits.length > 0 ||
        j.pastVisits.length > 0 ||
        j.hasRoofReport ||
        j.photos.length > 0
    );

  const hasAnything = jobs.length > 0;

  const longDate = (value: Date) => value.toLocaleDateString("en-CA", { dateStyle: "long" });
  const shortTime = (value: Date) =>
    value.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });

  return (
    <main className="min-h-screen bg-paper px-4 py-8 text-paper-ink-body sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-2xl border border-paper-rule bg-paper-document p-6 sm:p-10">
          <div className="min-w-0">
            {/* The contractor's name, never ours — same rule the quote and
                invoice pages follow. */}
            <p className="text-lg font-semibold text-paper-ink">{client.company.name}</p>
            {client.company.phone ? (
              <p className="mt-0.5 text-sm text-paper-ink-muted">{client.company.phone}</p>
            ) : null}
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-paper-ink">Hi {client.displayName}</h1>
          <p className="mt-2 text-sm leading-6 text-paper-ink-muted">
            Everything {client.company.name} has sent you — quotes, invoices, visits, and your
            roof — in one place.
          </p>
        </header>

        {!hasAnything ? (
          <div className="rounded-2xl border border-dashed border-paper-rule bg-paper-document p-10 text-center">
            <p className="text-paper-ink-body">Nothing to show yet.</p>
            <p className="mt-2 text-sm text-paper-ink-muted">
              Check back once {client.company.name} sends something your way.
            </p>
          </div>
        ) : (
          jobs.map(
            ({
              job,
              address,
              quotes,
              invoices,
              measurements,
              glbUrl,
              photos,
              upcomingVisits,
              pastVisits,
              hasRoofReport,
            }) => (
              <section
                key={job.id}
                className="rounded-2xl border border-paper-rule bg-paper-document p-6 sm:p-10"
              >
                <h2 className="text-xl font-semibold text-paper-ink">{job.name}</h2>
                {address ? <p className="mt-1 text-sm text-paper-ink-muted">{address}</p> : null}

                {hasRoofReport ? (
                  <section className="mt-8">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-paper-ink-faint">
                      Your roof
                    </h3>
                    {glbUrl ? (
                      <div className="mt-3">
                        <HubModelViewer glbUrl={glbUrl} />
                        <p className="mt-2 text-xs text-paper-ink-faint">
                          Drag to look around, scroll to zoom.
                        </p>
                      </div>
                    ) : null}
                    {measurements.length > 0 ? (
                      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {measurements.map((m) => (
                          <div key={m.type} className="rounded-xl bg-paper-inset p-3">
                            <dt className="text-xs text-paper-ink-faint">{m.label}</dt>
                            <dd className="mt-1 font-medium tabular-nums text-paper-ink-strong">
                              {m.displayValue}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </section>
                ) : null}

                {photos.length > 0 ? (
                  <section className="mt-8">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-paper-ink-faint">
                      Photos
                    </h3>
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {photos.map((photo) => (
                        <img
                          key={photo.id}
                          src={photo.url}
                          alt={photo.caption ?? "Job photo"}
                          loading="lazy"
                          decoding="async"
                          className="aspect-square w-full rounded-lg border border-paper-rule object-cover"
                        />
                      ))}
                    </div>
                  </section>
                ) : null}

                {quotes.length > 0 ? (
                  <section className="mt-8">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-paper-ink-faint">
                      Quotes
                    </h3>
                    <ul className="mt-3 divide-y divide-paper-rule">
                      {quotes.map((quote) => (
                        <li key={quote.id} className="flex items-center justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <Link
                              href={`/q/${quote.shareToken}`}
                              className="font-medium text-paper-ink underline underline-offset-4"
                            >
                              {quote.title}
                            </Link>
                            <p className="mt-0.5 text-xs text-paper-ink-faint">
                              {quoteStatusLabel(quote.status)}
                            </p>
                          </div>
                          <p className="shrink-0 font-medium tabular-nums text-paper-ink-strong">
                            {quote.totalAmountCents != null ? formatMoney(quote.totalAmountCents) : "—"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {invoices.length > 0 ? (
                  <section className="mt-8">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-paper-ink-faint">
                      Invoices
                    </h3>
                    <ul className="mt-3 divide-y divide-paper-rule">
                      {invoices.map((invoice) => (
                        <li
                          key={invoice.id}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/i/${invoice.shareToken}`}
                              className="font-medium text-paper-ink underline underline-offset-4"
                            >
                              {invoice.title}
                            </Link>
                            <p className="mt-0.5 text-xs text-paper-ink-faint">
                              {invoiceStatusLabel(invoice.status)}
                            </p>
                          </div>
                          <p className="shrink-0 font-medium tabular-nums text-paper-ink-strong">
                            {formatMoney(invoice.totalAmountCents)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {upcomingVisits.length > 0 || pastVisits.length > 0 ? (
                  <section className="mt-8">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-paper-ink-faint">
                      Visits
                    </h3>
                    <ul className="mt-3 divide-y divide-paper-rule">
                      {[...upcomingVisits, ...pastVisits].map((visit) => (
                        <li key={visit.id} className="flex items-center justify-between gap-3 py-3">
                          <p className="text-paper-ink-body">
                            {longDate(visit.startAt)}
                            {!visit.allDay ? ` · ${shortTime(visit.startAt)}` : ""}
                          </p>
                          <p className="shrink-0 text-sm text-paper-ink-faint">
                            {VISIT_STATUS_LABEL[visit.status] ?? visit.status}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </section>
            )
          )
        )}
      </div>
    </main>
  );
}
