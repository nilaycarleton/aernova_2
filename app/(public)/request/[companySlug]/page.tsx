import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RequestForm } from "@/components/public/request-form";

// The group layout says "Your quote" — the wrong tab title for the door in.
export const metadata: Metadata = {
  title: "Request a quote",
  description: "Tell your contractor what you need",
  robots: { index: false, follow: false },
};

/**
 * Item 45: the public door onto item 44's `Request`. `Company.slug` is the
 * credential — permanent and already minted at signup for every company,
 * unlike a `Quote`/`Invoice`/`Client` share token, so there is no "create
 * the link" step for this one. It was written and never read anywhere until
 * now.
 *
 * Nothing here is gated by module or trade: any company that exists can
 * take an ask through this door, roofer or not.
 */
export default async function PublicRequestPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  const company = await prisma.company.findUnique({
    where: { slug: companySlug },
    select: { name: true, phone: true },
  });
  if (!company) notFound();

  return (
    <div className="min-h-screen bg-paper px-4 py-8 text-paper-ink-body sm:px-6 sm:py-12">
      <div className="mx-auto max-w-xl">
        <article className="rounded-2xl border border-paper-rule bg-paper-document p-6 sm:p-10">
          <p className="text-lg font-semibold text-paper-ink">{company.name}</p>
          {company.phone ? (
            <p className="mt-0.5 text-sm text-paper-ink-muted">{company.phone}</p>
          ) : null}

          <h1 className="mt-6 text-2xl font-semibold text-paper-ink">
            Tell us what you need
          </h1>
          <p className="mt-2 text-sm leading-6 text-paper-ink-muted">
            A few lines is enough — we&rsquo;ll be in touch to sort out the rest.
          </p>

          <RequestForm companySlug={companySlug} />
        </article>
      </div>
    </div>
  );
}
