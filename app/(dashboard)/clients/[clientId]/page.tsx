import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { formatAddress } from "@/lib/client-matching";
import { CLIENT_STATUS_META } from "@/lib/client-status";
import { shareUrl as buildShareUrl } from "@/lib/share-token";
import { ClientHubSharePanel } from "@/components/dashboard/client-hub-share-panel";

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
  const statusMeta = CLIENT_STATUS_META[client.status];

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-6">
      <header className="min-w-0">
        <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">Client</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-semibold text-ink-primary">{client.displayName}</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.badge}`}>
            {statusMeta.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-ink-secondary">
          {[client.email, client.phone].filter(Boolean).join(" · ") || "No contact info on file"}
        </p>
      </header>

      <ClientHubSharePanel
        clientId={client.id}
        shareUrl={client.shareToken ? buildShareUrl("hub", client.shareToken, origin) : null}
      />

      <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <h3 className="text-lg font-semibold text-ink-primary">Properties</h3>
        {client.properties.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No property on file yet.</p>
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
          <p className="mt-2 text-sm text-ink-muted">No jobs yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline">
            {client.jobs.map((job) => (
              <li key={job.id} className="py-3">
                <Link
                  href={`/jobs/${job.id}`}
                  className="font-medium text-ink-primary underline underline-offset-4 transition hover:text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                >
                  {job.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
