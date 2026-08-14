import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { formatAddress } from "@/lib/client-matching";
import { CLIENT_STATUS_META, clientStatusTone } from "@/lib/client-status";
import { statusLabel as jobStatusLabel, statusTone as jobStatusTone } from "@/lib/job-status";
import { shareUrl as buildShareUrl } from "@/lib/share-token";
import { ClientHubSharePanel } from "@/components/dashboard/client-hub-share-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Status } from "@/components/ui/status";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * A client's own page — new with item 44, and small on purpose.
 *
 * Everything a contractor needs about one client already lives somewhere:
 * jobs on `/jobs`, quotes on `/quotes`, the client's own fields on `/clients`.
 * What had nowhere to live was the one thing item 44 needed a home for — the
 * Client Hub link — so this page is that home plus just enough context
 * (who they are, which jobs) to make the link make sense, not a second
 * client editor.
 */
export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { company } = await requirePageCapability("viewAllJobs");

  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId: company.id },
    include: {
      properties: { orderBy: { createdAt: "asc" } },
      jobs: {
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, status: true, updatedAt: true },
      },
    },
  });
  if (!client) notFound();

  const host = (await headers()).get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  // Purely presentational — the existing text already shows this contact
  // info verbatim; wrapping it in tel:/mailto: adds no new data source and
  // is safe on every device (Step 27).
  const contactLinks = [
    client.phone ? { href: `tel:${client.phone}`, label: client.phone } : null,
    client.email ? { href: `mailto:${client.email}`, label: client.email } : null,
  ].filter((link): link is { href: string; label: string } => link !== null);

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Client"
        title={client.displayName}
        status={<Status tone={clientStatusTone(client.status)} label={CLIENT_STATUS_META[client.status].label} />}
        description={contactLinks.length === 0 ? "No contact info on file" : undefined}
      />
      {contactLinks.length > 0 ? (
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-secondary">
          {contactLinks.map((link, index) => (
            <span key={link.href}>
              {index > 0 ? <span className="mr-3 text-ink-muted">·</span> : null}
              <a
                href={link.href}
                className="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
              >
                {link.label}
              </a>
            </span>
          ))}
        </p>
      ) : null}

      <ClientHubSharePanel
        clientId={client.id}
        shareUrl={client.shareToken ? buildShareUrl("hub", client.shareToken, origin) : null}
      />

      <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <h3 className="text-lg font-semibold text-ink-primary">Properties</h3>
        {client.properties.length === 0 ? (
          <EmptyState kind="first-use" title="No property on file yet." compact />
        ) : (
          <ul className="mt-3 space-y-2">
            {client.properties.map((property) => (
              <li key={property.id} className="text-sm text-ink-secondary">
                {property.label ? `${property.label} — ` : ""}
                {formatAddress(property) || "No address yet"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <h3 className="text-lg font-semibold text-ink-primary">Jobs</h3>
        {client.jobs.length === 0 ? (
          <EmptyState kind="first-use" title="No jobs yet." compact />
        ) : (
          <ul className="mt-3 divide-y divide-hairline">
            {client.jobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-3 py-3">
                <Link
                  href={`/jobs/${job.id}`}
                  className="font-medium text-ink-primary underline underline-offset-4 transition hover:text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                >
                  {job.name}
                </Link>
                <Status tone={jobStatusTone(job.status)} label={jobStatusLabel(job.status)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
