import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ChangeOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { shareUrl as buildShareUrl } from "@/lib/share-token";
import { ChangeOrderEditor } from "@/components/dashboard/change-order-editor";
import { ChangeOrderSharePanel } from "@/components/dashboard/change-order-share-panel";
import { PageHeader } from "@/components/ui/page-header";

/**
 * A change order's own page — same reasoning `QuoteBuilderPage` gives for a
 * quote: this is a document with rows and a decision, and belongs on its
 * own page rather than folded into a card.
 */
export default async function ChangeOrderPage({
  params,
}: {
  params: Promise<{ jobId: string; changeOrderId: string }>;
}) {
  const { jobId, changeOrderId } = await params;
  const { companyId } = await requireJobAccess(jobId, "editQuote");

  const changeOrder = await prisma.changeOrder.findFirst({
    where: { id: changeOrderId, jobId, companyId },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      quote: { select: { id: true, title: true, quoteNumber: true, totalAmountCents: true } },
    },
  });
  if (!changeOrder) notFound();

  // The origin comes off the request rather than an env var so the link a
  // contractor copies always points at the host they're actually using —
  // preview deploy, custom domain, or localhost — same reasoning
  // `QuoteBuilderPage` gives for its own share link.
  const host = (await headers()).get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const shareUrl = changeOrder.shareToken ? buildShareUrl("changeOrder", changeOrder.shareToken, origin) : null;

  const editable = changeOrder.status !== ChangeOrderStatus.APPROVED;
  const dateLabel = (value: Date | null) =>
    value ? value.toLocaleDateString("en-CA", { dateStyle: "medium" }) : null;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow={`Change order · amends Quote #${changeOrder.quote.quoteNumber ?? changeOrder.quote.id.slice(0, 6)}`}
        title={changeOrder.title}
        description={
          ChangeOrderStatus.DRAFT === changeOrder.status
            ? "Draft — not sent yet"
            : changeOrder.status === ChangeOrderStatus.SENT
              ? "Sent — waiting on an answer"
              : changeOrder.status === ChangeOrderStatus.APPROVED
                ? `Approved${dateLabel(changeOrder.approvedAt) ? ` ${dateLabel(changeOrder.approvedAt)}` : ""}`
                : "Declined"
        }
      />

      <ChangeOrderEditor
        jobId={jobId}
        changeOrderId={changeOrderId}
        editable={editable}
        initialTitle={changeOrder.title}
        initialDescription={changeOrder.description ?? ""}
        initialLines={changeOrder.lineItems.map((line) => ({
          id: line.id,
          name: line.name,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitCostCents: line.unitCostCents,
          unitPriceCents: line.unitPriceCents,
        }))}
      />

      <ChangeOrderSharePanel
        jobId={jobId}
        changeOrderId={changeOrderId}
        shareUrl={shareUrl}
        status={changeOrder.status}
        sentAt={dateLabel(changeOrder.sentAt)}
        viewedAt={dateLabel(changeOrder.viewedAt)}
      />
    </div>
  );
}
