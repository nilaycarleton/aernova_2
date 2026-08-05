"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ActivityKind, InvoiceStatus, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { generateShareToken, shareUrl } from "@/lib/share-token";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { formatMoney, parseMoneyToCents } from "@/lib/money";
import { isManualPaymentMethod, paymentMethodLabel } from "@/lib/invoice/payment-methods";
import { invoiceSendGaps } from "@/lib/invoice/gaps";
import { resyncInvoiceMoney } from "@/lib/invoice/resync";
import { firstSendIntro, invoiceEmailHtml, invoiceEmailText } from "@/lib/invoice/email-templates";
import type { Capability } from "@/lib/permissions";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/** Every action here needs the same three things. Fetched once, guarded once. */
async function loadInvoice(formData: FormData, capability: Capability) {
  const jobId = getString(formData, "jobId");
  const invoiceId = getString(formData, "invoiceId");
  if (!jobId || !invoiceId) throw new Error("Missing jobId or invoiceId");

  const { companyId, userId } = await requireJobAccess(jobId, capability);

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, jobId, companyId },
    select: {
      id: true,
      status: true,
      shareToken: true,
      invoiceNumber: true,
      totalAmountCents: true,
      taxCents: true,
      dueAt: true,
    },
  });
  if (!invoice) throw new Error("Invoice not found");

  return { jobId, invoiceId, companyId, userId, invoice };
}

function revalidateInvoice(jobId: string, invoiceId: string) {
  revalidatePath(`/jobs/${jobId}/invoices/${invoiceId}`);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/invoices");
}

/**
 * Open the invoice to the homeowner.
 *
 * Mints the share link, marks it SENT, and hands over a URL to paste into a text
 * message — the same two-doors-one-token shape `shareQuoteAction` established,
 * and for the same reason: a re-send must never invalidate the link already
 * sitting in somebody's inbox.
 */
export async function shareInvoiceAction(formData: FormData) {
  const { jobId, invoiceId, companyId, userId, invoice } = await loadInvoice(
    formData,
    "sendInvoice"
  );

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { businessNumber: true },
  });
  const lineCount = await prisma.invoiceLineItem.count({ where: { invoiceId } });

  const gaps = invoiceSendGaps({
    chargesTax: invoice.taxCents > 0,
    hasBusinessNumber: Boolean(company?.businessNumber?.trim()),
    hasLines: lineCount > 0,
  });
  if (gaps.length > 0) throw new Error(gaps[0].because);

  const shareToken = invoice.shareToken ?? generateShareToken();

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      shareToken,
      sentAt: new Date(),
      // An invoice that has been paid, part-paid or cancelled stays where it
      // is. Re-opening the link for a homeowner who already paid must not walk
      // the status back to "awaiting payment" and put it on the chase list.
      status: invoice.status === InvoiceStatus.DRAFT ? InvoiceStatus.SENT : invoice.status,
    },
  });

  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.INVOICE_SENT,
    actorUserId: userId,
    meta: {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber ?? undefined,
      amountCents: invoice.totalAmountCents,
      channel: "link",
    },
  });

  revalidateInvoice(jobId, invoiceId);
}

/** Close the door again. The old link stops working. */
export async function unshareInvoiceAction(formData: FormData) {
  const { jobId, invoiceId, companyId } = await loadInvoice(formData, "sendInvoice");

  await prisma.invoice.updateMany({
    where: { id: invoiceId, companyId },
    // Back to DRAFT only from SENT. Revoking the link on a part-paid invoice
    // must not erase the fact that money came in against it.
    data: { shareToken: null, status: InvoiceStatus.DRAFT },
  });

  revalidateInvoice(jobId, invoiceId);
}

export type SendInvoiceState = { error?: string; sentAt?: number };

/**
 * The other door onto the link `shareInvoiceAction` already minted. Never mints
 * one itself, so there is still exactly one place an invoice token is born.
 *
 * Returns rather than throws on every failure path — a contractor mid-send
 * should read "this client has no email on file", not hit an error boundary.
 */
export async function sendInvoiceEmailAction(
  _prevState: SendInvoiceState,
  formData: FormData
): Promise<SendInvoiceState> {
  const jobId = getString(formData, "jobId");
  const invoiceId = getString(formData, "invoiceId");
  if (!jobId || !invoiceId) throw new Error("Missing jobId or invoiceId");

  const { companyId, userId } = await requireJobAccess(jobId, "sendInvoice");

  if (!isEmailConfigured()) {
    return { error: "Email isn't set up for this company yet." };
  }

  const [invoice, job, company] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: invoiceId, jobId, companyId },
      select: {
        id: true,
        shareToken: true,
        invoiceNumber: true,
        totalAmountCents: true,
        amountPaidCents: true,
        dueAt: true,
      },
    }),
    prisma.job.findFirst({ where: { id: jobId, companyId }, include: jobIdentityInclude }),
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
  ]);
  if (!invoice || !job) throw new Error("Invoice not found");
  if (!invoice.shareToken) return { error: "Create the link first." };

  const client = jobClient(job);
  if (!client.email) {
    return { error: "This client has no email on file — add one, or send the link another way." };
  }

  const host = (await headers()).get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const url = shareUrl("invoice", invoice.shareToken, origin);
  const companyName = company?.name || "your contractor";
  const balance = formatMoney(invoice.totalAmountCents - invoice.amountPaidCents);
  const due = invoice.dueAt
    ? invoice.dueAt.toLocaleDateString("en-CA", { dateStyle: "long" })
    : null;

  const intro = firstSendIntro({ companyName, balance, due });

  try {
    await sendEmail({
      to: client.email,
      subject: `Invoice from ${companyName}`,
      html: invoiceEmailHtml({ clientName: client.name, url, intro }),
      text: invoiceEmailText({ clientName: client.name, url, intro }),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't send the email." };
  }

  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.INVOICE_SENT,
    actorUserId: userId,
    meta: {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber ?? undefined,
      amountCents: invoice.totalAmountCents,
      channel: "email",
    },
  });

  revalidateInvoice(jobId, invoiceId);
  return { sentAt: Date.now() };
}

export type RecordPaymentState = { error?: string; recordedAt?: number };

/**
 * Money arrived.
 *
 * The primary path in Canada, not a fallback — a cheque, an e-transfer, cash in
 * a driveway. Written as a row rather than a column bump so a deposit in March
 * and a balance in May stay two facts with two dates, and so Phase 5b's webhook
 * has somewhere to write with nothing to migrate.
 *
 * Overpayment is accepted rather than rejected. A homeowner who rounds
 * $1,847.30 up to $1,850 has paid $1,850, and a form that refused it would be
 * asking the contractor to record a number that did not clear their bank.
 */
export async function recordPaymentAction(
  _prevState: RecordPaymentState,
  formData: FormData
): Promise<RecordPaymentState> {
  const jobId = getString(formData, "jobId");
  const invoiceId = getString(formData, "invoiceId");
  if (!jobId || !invoiceId) throw new Error("Missing jobId or invoiceId");

  const { companyId, userId } = await requireJobAccess(jobId, "recordPayment");

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, jobId, companyId },
    select: { id: true, status: true, invoiceNumber: true },
  });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === InvoiceStatus.VOID) {
    return { error: "This invoice was cancelled. Raise a new one to bill for the work." };
  }

  const { cents, error } = parseMoneyToCents(getString(formData, "amount"));
  if (error) return { error };
  if (cents == null) return { error: "How much came in?" };
  if (cents === 0) return { error: "Enter an amount greater than zero." };

  const methodRaw = getString(formData, "method");
  if (!isManualPaymentMethod(methodRaw)) return { error: "Pick how it was paid." };
  const method = methodRaw as PaymentMethod;

  // Blank means today, which is the common case — most payments are written
  // down the same afternoon they land.
  const paidAtRaw = getString(formData, "paidAt");
  const paidAt = paidAtRaw ? new Date(`${paidAtRaw}T12:00:00`) : new Date();
  if (Number.isNaN(paidAt.getTime())) return { error: "That date didn't read as a date." };

  const result = await prisma.$transaction(async (tx) => {
    await tx.invoicePayment.create({
      data: {
        companyId,
        invoiceId,
        amountCents: cents,
        method,
        paidAt,
        reference: getString(formData, "reference") || null,
        notes: getString(formData, "notes") || null,
        recordedByUserId: userId,
      },
    });
    return resyncInvoiceMoney(tx, invoiceId);
  });

  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.PAYMENT_RECORDED,
    actorUserId: userId,
    meta: {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber ?? undefined,
      amountCents: cents,
      method: paymentMethodLabel(method),
      balanceCents: result.balanceCents,
    },
  });

  if (result.justPaid) {
    await recordActivity({
      companyId,
      jobId,
      kind: ActivityKind.INVOICE_PAID,
      actorUserId: userId,
      meta: {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber ?? undefined,
        amountCents: result.paidCents,
      },
    });
  }

  revalidateInvoice(jobId, invoiceId);
  return { recordedAt: Date.now() };
}

/**
 * Unwrite a payment.
 *
 * Deleted outright rather than reversed with a negative row. A payment recorded
 * by mistake — the wrong invoice, a typo, a cheque that bounced before it was
 * ever really money — is not a transaction that happened and was undone; it is
 * a line that should not have been typed. The job's history still carries the
 * PAYMENT_RECORDED event, so the correction is visible without the balance
 * carrying a phantom.
 */
export async function deletePaymentAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const invoiceId = getString(formData, "invoiceId");
  const paymentId = getString(formData, "paymentId");
  if (!jobId || !invoiceId || !paymentId) throw new Error("Missing ids");

  const { companyId } = await requireJobAccess(jobId, "recordPayment");

  await prisma.$transaction(async (tx) => {
    // Scoped by company *and* invoice, so a payment id from another company's
    // invoice cannot be deleted by guessing it.
    const { count } = await tx.invoicePayment.deleteMany({
      where: { id: paymentId, invoiceId, companyId },
    });
    if (count === 0) throw new Error("Payment not found");
    await resyncInvoiceMoney(tx, invoiceId);
  });

  revalidateInvoice(jobId, invoiceId);
}

/**
 * Cancel the invoice, keeping it on the record.
 *
 * VOID rather than a delete: an invoice that was sent to a homeowner is a thing
 * that happened, and a numbering sequence with a hole in it is a question an
 * accountant will eventually ask. Refused once money has come in — that is a
 * refund, which is a different act with different paperwork, and quietly
 * voiding an invoice with payments against it would strand them.
 */
export async function voidInvoiceAction(formData: FormData) {
  const { jobId, invoiceId, companyId, userId, invoice } = await loadInvoice(
    formData,
    "editInvoice"
  );

  const paid = await prisma.invoicePayment.count({ where: { invoiceId, companyId } });
  if (paid > 0) {
    throw new Error("Money has come in against this invoice. Remove the payments first.");
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: InvoiceStatus.VOID, shareToken: null },
  });

  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.INVOICE_VOIDED,
    actorUserId: userId,
    meta: {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber ?? undefined,
      amountCents: invoice.totalAmountCents,
    },
  });

  revalidateInvoice(jobId, invoiceId);
}

/**
 * Change when it's due.
 *
 * Its own action because the due date is the one thing on a sent invoice a
 * contractor routinely changes after the fact — "give them till the end of the
 * month" is a decision made on the phone, and it has to move the overdue list
 * with it. Clearing it is legitimate: an invoice with no due date is never
 * late, which is what "due on receipt, and I'm not chasing it" looks like.
 */
export async function updateInvoiceDueDateAction(formData: FormData) {
  const { jobId, invoiceId } = await loadInvoice(formData, "editInvoice");

  const raw = getString(formData, "dueAt");
  const dueAt = raw ? new Date(`${raw}T12:00:00`) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) throw new Error("That date didn't read as a date.");

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({ where: { id: invoiceId }, data: { dueAt } });
    // The due date is half of what OVERDUE means, so moving it has to settle
    // the status in the same breath — otherwise an invoice given another two
    // weeks stays flagged red until something else happens to it.
    await resyncInvoiceMoney(tx, invoiceId);
  });

  revalidateInvoice(jobId, invoiceId);
}

/**
 * Erase an invoice outright — not void it, gone, number and all.
 *
 * Restricted to `DRAFT` and `VOID`: an invoice nobody outside the company has
 * ever seen, or one already cancelled. Anything `SENT`, `PARTIALLY_PAID`,
 * `PAID` or `OVERDUE` stays void-only forever, because that is the whole
 * reason `voidInvoiceAction` exists rather than a delete button — see its own
 * comment. The payment count check is redundant with that status restriction
 * today (nothing lets a `VOID` invoice hold a payment, and nothing currently
 * stops a `DRAFT` one from acquiring one by mistake), which is exactly why
 * it's kept: belt and braces on the one guard that must never have an
 * exception.
 */
export async function deleteInvoiceAction(formData: FormData) {
  const { jobId, invoiceId, invoice } = await loadInvoice(formData, "deleteInvoice");

  if (invoice.status !== InvoiceStatus.DRAFT && invoice.status !== InvoiceStatus.VOID) {
    throw new Error("Only a draft or a cancelled invoice can be deleted — void this one first.");
  }

  const paid = await prisma.invoicePayment.count({ where: { invoiceId } });
  if (paid > 0) {
    throw new Error("Money has come in against this invoice. Remove the payments first.");
  }

  await prisma.invoice.delete({ where: { id: invoiceId } });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/invoices");
  redirect(`/jobs/${jobId}`);
}

/**
 * Where the bill goes.
 *
 * "Same as the property address" clears all six columns rather than copying
 * the property's address onto the invoice — null is what "no override" means
 * here (see `lib/invoice/billing-address.ts`), and copying it would turn every
 * ordinary invoice into a frozen snapshot that silently stops following the
 * property if someone fixes a typo in it later. An override is only ever
 * written when a contractor deliberately unchecked the box and typed
 * something different.
 */
export async function updateInvoiceBillingAddressAction(formData: FormData) {
  const { jobId, invoiceId } = await loadInvoice(formData, "editInvoice");

  const sameAsProperty = getString(formData, "sameAsProperty") !== "false";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: sameAsProperty
      ? {
          billingAddressLine1: null,
          billingAddressLine2: null,
          billingCity: null,
          billingProvince: null,
          billingPostalCode: null,
        }
      : {
          billingAddressLine1: getString(formData, "addressLine1") || null,
          billingAddressLine2: getString(formData, "addressLine2") || null,
          billingCity: getString(formData, "city") || null,
          billingProvince: getString(formData, "province") || null,
          billingPostalCode: getString(formData, "postalCode") || null,
        },
  });

  revalidateInvoice(jobId, invoiceId);
}

