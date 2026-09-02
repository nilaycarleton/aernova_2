"use server";

import { revalidatePath } from "next/cache";
import { ActivityKind, JobExpenseCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { parseMoneyToCents } from "@/lib/money";
import { labourAmountCents } from "@/lib/job-costing";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const CATEGORIES = Object.values(JobExpenseCategory);

/** useActionState wrapper — validation and save failures come back as state, same recovery contract as `createMeasurementWithState`. */
export type JobExpenseFormState = { fieldErrors?: Record<string, string>; formError?: string };

export async function addJobExpenseWithState(
  _prevState: JobExpenseFormState,
  formData: FormData
): Promise<JobExpenseFormState> {
  const categoryRaw = getString(formData, "category");
  const fieldErrors: Record<string, string> = {};

  if (!CATEGORIES.includes(categoryRaw as JobExpenseCategory)) {
    fieldErrors.category = "Choose a category.";
  } else if (categoryRaw === JobExpenseCategory.LABOUR) {
    const hours = Number(getString(formData, "hours"));
    if (!Number.isFinite(hours) || hours <= 0) {
      fieldErrors.hours = "Enter how many hours were worked.";
    }
    const { cents: rateCents } = parseMoneyToCents(getString(formData, "hourlyRate"));
    if (rateCents == null || rateCents <= 0) {
      fieldErrors.hourlyRate = "Enter an hourly rate.";
    }
  } else {
    const { cents } = parseMoneyToCents(getString(formData, "amount"));
    if (cents == null || cents <= 0) {
      fieldErrors.amount = "Enter an amount.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    await addJobExpenseAction(formData);
    return {};
  } catch (error) {
    return {
      formError: error instanceof Error ? error.message : "Couldn't log that. Please try again.",
    };
  }
}

/**
 * Log what a job actually cost. Item 46 — the counterpart to the quote's own
 * `unitCostCents`, which is frozen at approval and never learns what actually
 * happened on site.
 *
 * LABOUR is the one category with its own shape: hours × an hourly rate,
 * computed once here rather than trusting a typed amount, so the entry can
 * always be read back as "6 hours at $45" and not just a bare number nobody
 * remembers the arithmetic behind. Every other category is a plain amount —
 * a materials run or an equipment rental doesn't decompose the same way, and
 * forcing one shape on both would mean fabricating hours for a bag of nails.
 */
export async function addJobExpenseAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const categoryRaw = getString(formData, "category");
  if (!jobId) throw new Error("Missing jobId");
  if (!CATEGORIES.includes(categoryRaw as JobExpenseCategory)) {
    throw new Error("Choose a category.");
  }
  const category = categoryRaw as JobExpenseCategory;

  const { companyId, userId } = await requireJobAccess(jobId, "manageJobCosts");

  const description = getString(formData, "description") || null;
  const incurredAtRaw = getString(formData, "incurredAt");
  const incurredAt = incurredAtRaw ? new Date(incurredAtRaw) : new Date();
  if (Number.isNaN(incurredAt.getTime())) throw new Error("That date isn't valid.");

  let amountCents: number;
  let hours: number | null = null;
  let hourlyRateCents: number | null = null;

  if (category === JobExpenseCategory.LABOUR) {
    hours = Number(getString(formData, "hours"));
    const { cents: rateCents } = parseMoneyToCents(getString(formData, "hourlyRate"));
    if (!Number.isFinite(hours) || hours <= 0) {
      throw new Error("Enter how many hours were worked.");
    }
    if (rateCents == null || rateCents <= 0) {
      throw new Error("Enter an hourly rate.");
    }
    hourlyRateCents = rateCents;
    amountCents = labourAmountCents(hours, rateCents);
  } else {
    const { cents } = parseMoneyToCents(getString(formData, "amount"));
    if (cents == null || cents <= 0) {
      throw new Error("Enter an amount.");
    }
    amountCents = cents;
  }

  await prisma.jobExpense.create({
    data: {
      companyId,
      jobId,
      category,
      description,
      amountCents,
      hours,
      hourlyRateCents,
      incurredAt,
      createdByUserId: userId,
    },
  });

  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.JOB_EXPENSE_LOGGED,
    actorUserId: userId,
    meta: { category, amountCents },
  });

  revalidatePath(`/jobs/${jobId}`);
}

export async function deleteJobExpenseAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const expenseId = getString(formData, "expenseId");
  if (!jobId || !expenseId) throw new Error("Missing jobId or expenseId");

  const { companyId } = await requireJobAccess(jobId, "manageJobCosts");

  // Scoped on both ids so a valid expense id from a *different* job in the
  // same company can't be deleted by guessing at the form fields.
  await prisma.jobExpense.deleteMany({
    where: { id: expenseId, jobId, companyId },
  });

  revalidatePath(`/jobs/${jobId}`);
}
