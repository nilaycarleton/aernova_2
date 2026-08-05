"use server";

import { redirect } from "next/navigation";
import { ActivityKind, CaptureSource, JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { splitTypedName } from "@/lib/client-name";
import { createClient, fillClientContactGaps } from "@/lib/client-resolve";
import { withJobNumber } from "@/lib/job-number";
import { withQuoteNumber } from "@/lib/quote/numbering";
import { jobDisplayName } from "@/lib/job-validation";
import { parseMoneyToCents } from "@/lib/money";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export type QuickJobState = {
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

/**
 * Who · what · price, standing in somebody's driveway.
 *
 * The same three things a contractor writes on the back of a business card,
 * and nothing else — no address, no capture source, no notes. Those are all
 * things you fill in sitting down, and this form exists for the two minutes
 * when you are not.
 *
 * The price is optional and, when given, becomes a draft quote rather than a
 * field on the job. A number agreed at the door is a quote — it is the thing
 * you will send, argue about and eventually invoice — and putting it anywhere
 * else would mean moving it later.
 */
export async function createQuickJobAction(
  _prevState: QuickJobState,
  formData: FormData
): Promise<QuickJobState> {
  const { company, user } = await requireCapability("editJob");

  const clientId = getString(formData, "clientId");
  const clientName = getString(formData, "clientName");
  const clientIsBusiness = getString(formData, "clientIsBusiness") === "true";
  const clientPhone = getString(formData, "clientPhone");
  const name = getString(formData, "name");
  const priceRaw = getString(formData, "price");

  const values = { clientName, clientPhone, name, price: priceRaw };

  const fieldErrors: Record<string, string> = {};
  if (!clientId && !clientName) fieldErrors.client = "Who's it for?";

  // Tolerant on purpose: "$4,200" typed on a phone is not a mistake.
  const { cents: priceCents, error: priceError } = parseMoneyToCents(priceRaw);
  if (priceError) fieldErrors.price = priceError;

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  let resolvedClientId: string;
  if (clientId) {
    const chosen = await prisma.client.findFirst({
      where: { id: clientId, companyId: company.id },
      select: { id: true },
    });
    if (!chosen) throw new Error("Client not found");
    resolvedClientId = chosen.id;
    await fillClientContactGaps(resolvedClientId, { phone: clientPhone });
  } else {
    resolvedClientId = await createClient({
      companyId: company.id,
      ...splitTypedName(clientName, clientIsBusiness),
      phone: clientPhone,
    });
  }

  const client = await prisma.client.findUniqueOrThrow({
    where: { id: resolvedClientId },
    select: { displayName: true, email: true, phone: true },
  });

  const job = await withJobNumber(company.id, (jobNumber) =>
    prisma.job.create({
      data: {
        companyId: company.id,
        createdById: user.id,
        clientId: resolvedClientId,
        jobNumber,
        name: jobDisplayName(name, client.displayName, jobNumber),
        status: JobStatus.LEAD,
        captureSource: CaptureSource.MANUAL,
        // Deprecated columns, still dual-written for one release. The address
        // is genuinely unknown here rather than skipped — the missing-info rail
        // on the job says so, which is exactly what it is for.
        clientName: client.displayName,
        clientEmail: client.email,
        clientPhone: client.phone,
        addressLine1: "",
        city: "",
        province: "",
        country: "Canada",
      },
    })
  );

  if (priceCents !== null && priceCents > 0) {
    const quote = await withQuoteNumber(company.id, (quoteNumber) =>
      prisma.quote.create({
      data: {
        companyId: company.id,
        jobId: job.id,
        quoteNumber,
        title: `${job.name} – Quote`,
        status: "DRAFT",
        totalAmountCents: priceCents,
        totalAmount: priceCents / 100,
        scopeOfWork: JSON.stringify({ plainTextScope: "" }),
      },
    }));

    await recordActivity({
      companyId: company.id,
      jobId: job.id,
      kind: ActivityKind.QUOTE_CREATED,
      actorUserId: user.id,
      meta: { quoteId: quote.id, amountCents: priceCents },
    });
  }

  redirect(`/jobs/${job.id}`);
}
