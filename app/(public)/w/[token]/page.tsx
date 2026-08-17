import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isWellFormedShareToken } from "@/lib/share-token";
import { markWarrantyViewed } from "@/app/(public)/w/[token]/actions";
import { DocumentBrand } from "@/components/public/document-brand";
import { DocumentSurface, DocumentHeader, DocumentMeta, DocumentFooter } from "@/components/ui/document";
import { WarrantyAcknowledgement } from "@/components/public/warranty-acknowledgement";
import { longDate } from "@/lib/long-date";
import { warrantyTermLabel } from "@/lib/warranty";

// The group layout says "Your quote", which is the wrong tab title for a warranty.
export const metadata: Metadata = {
  title: "Your warranty",
  description: "A workmanship warranty from your contractor",
  robots: { index: false, follow: false },
};

/**
 * The warranty, as the homeowner receives it.
 *
 * Same `paper-*` document doctrine as `/q/[token]`, `/i/[token]`, and
 * `/co/[token]` — printed, forwarded, kept. Deliberately view-only: no
 * approve/reject/request-changes door anywhere on this page, because a
 * warranty isn't negotiated (§14.4/§20). The one action is
 * `WarrantyAcknowledgement`, below.
 */
export default async function PublicWarrantyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isWellFormedShareToken(token)) notFound();

  const warranty = await prisma.warranty.findFirst({
    where: { shareToken: token },
    include: { company: true },
  });
  if (!warranty) notFound();

  await markWarrantyViewed(token);

  const confirmed = warranty.status === "CONFIRMED";

  return (
    <div className="min-h-screen bg-paper px-4 py-8 text-paper-ink-body sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <DocumentSurface>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <DocumentBrand name={warranty.company.name} logoUrl={warranty.company.logoUrl} />
              {warranty.company.phone ? (
                <p className="mt-0.5 text-sm text-paper-ink-muted">{warranty.company.phone}</p>
              ) : null}
            </div>
            {confirmed ? (
              <span className="shrink-0 rounded-full bg-confirm/15 px-3 py-1 text-xs font-medium text-confirm-fg">
                Confirmed received
              </span>
            ) : null}
          </header>

          <div className="mt-8">
            <DocumentHeader
              eyebrow="Warranty"
              title={`${warrantyTermLabel(warranty.termMonths)} workmanship warranty`}
            />
          </div>
          <p className="mt-1 text-sm text-paper-ink-muted">
            Starts {longDate(warranty.startsAt)}
          </p>

          {warranty.coverageNotes ? (
            <section className="mt-8">
              <h2 className="text-sm font-semibold text-paper-ink">What&rsquo;s covered</h2>
              <p className="mt-2 max-w-prose whitespace-pre-line text-sm leading-6 text-paper-ink-body">
                {warranty.coverageNotes}
              </p>
            </section>
          ) : null}

          {warranty.exclusions ? (
            <section className="mt-6">
              <h2 className="text-sm font-semibold text-paper-ink">What&rsquo;s not covered</h2>
              <p className="mt-2 max-w-prose whitespace-pre-line text-sm leading-6 text-paper-ink-body">
                {warranty.exclusions}
              </p>
            </section>
          ) : null}

          <section className="mt-8 border-t border-paper-rule pt-6">
            <DocumentMeta
              items={[
                { label: "From", value: <span className="whitespace-pre-line">{warranty.companyInfoSnapshot}</span> },
                { label: "For", value: <span className="whitespace-pre-line">{warranty.customerInfoSnapshot}</span> },
                { label: "Property", value: <span className="whitespace-pre-line">{warranty.propertyAddressSnapshot}</span> },
              ]}
            />
          </section>

          <WarrantyAcknowledgement token={token} confirmed={confirmed} signerName={warranty.signerName} />

          {/* Subtle by design (§20) — the homeowner is confirming a specific
              version, so knowing which one is theirs to see, quietly, never
              competing with the coverage terms for attention. */}
          <DocumentFooter>
            Warranty version {warranty.version}
            {confirmed && warranty.confirmedAt ? ` · Confirmed ${longDate(warranty.confirmedAt)}` : ""}
          </DocumentFooter>
        </DocumentSurface>
      </div>
    </div>
  );
}
