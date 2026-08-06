"use server";

import { rm } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { ActivityKind, JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { storageDriverName } from "@/lib/storage";
import { ALL_STATUSES } from "@/lib/job-status";
import { syncClientStatusForJob } from "@/lib/client-resolve";
import { recordActivity } from "@/lib/activity";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { jobClient, jobIdentityInclude } from "@/lib/job-identity";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function updateJobStatusAction(jobId: string, status: JobStatus) {
  if (!jobId) throw new Error("Missing jobId");
  if (!ALL_STATUSES.includes(status)) throw new Error("Invalid job status");

  // Was a hand-rolled company check, which scoped the tenant but not the role:
  // any member — including a viewer, whose whole job is to change nothing —
  // could move any job in the company. `requireJobAccess` does both.
  await requireJobAccess(jobId, "editJob");

  await prisma.job.update({ where: { id: jobId }, data: { status } });

  // Winning the work is what turns a lead into a client — see
  // lib/client-lifecycle.ts. Nothing else in the product moves Client.status,
  // so without this the word "lead" would never mean anything.
  await syncClientStatusForJob(jobId, status);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/dashboard");
  revalidatePath("/clients");
}

export type RequestReviewState = { error?: string; requestedAt?: number };

/**
 * Item 48. Records that a review was asked for, and — when there's a client
 * email and Resend is configured — actually sends it. `channel` reuses
 * `ActivityMeta`'s existing "link" | "email" vocabulary from a quote's own
 * send record, since this is the same fact: a link went out one of two ways.
 *
 * No token is minted. `Company.reviewUrl` is a static, company-wide address —
 * Google's or Facebook's own review page — not a per-homeowner document, so
 * there's nothing here for `lib/share-token.ts` to protect.
 *
 * Every failure path here returns rather than throws — same reasoning as
 * `sendQuoteEmailAction`: a real Resend failure (rate limit, invalid domain,
 * transient network error) is reachable in production, and a contractor
 * mid-request should see the reason inline, not the whole job page replaced
 * by the error boundary.
 */
export async function requestReviewAction(
  _prevState: RequestReviewState,
  formData: FormData
): Promise<RequestReviewState> {
  const jobId = getString(formData, "jobId");
  const channel = getString(formData, "channel") === "email" ? "email" : "link";
  if (!jobId) throw new Error("Missing jobId");

  const { companyId, userId } = await requireJobAccess(jobId, "editJob");

  const [company, job] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true, reviewUrl: true } }),
    prisma.job.findFirst({ where: { id: jobId, companyId }, include: jobIdentityInclude }),
  ]);
  if (!company?.reviewUrl) return { error: "Add a review link in Settings first." };
  if (!job) return { error: "Job not found." };

  if (channel === "email") {
    const client = jobClient(job);
    if (!client.email) return { error: "This client has no email on file." };
    if (!isEmailConfigured()) return { error: "Email isn't set up in this environment." };
    try {
      await sendEmail({
        to: client.email,
        subject: `How did we do, ${client.name}?`,
        html: `<p>Hi ${client.name},</p><p>Thanks for choosing ${company.name}. If you have a minute, a review helps other homeowners find us.</p><p><a href="${company.reviewUrl}">Leave a review</a></p>`,
        text: `Hi ${client.name},\n\nThanks for choosing ${company.name}. If you have a minute, a review helps other homeowners find us.\n\n${company.reviewUrl}`,
      });
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Couldn't send the email." };
    }
  }

  await prisma.job.update({ where: { id: jobId }, data: { reviewRequestedAt: new Date() } });
  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.REVIEW_REQUESTED,
    actorUserId: userId,
    meta: { channel },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { requestedAt: Date.now() };
}

export async function deleteJobAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "").trim();
  if (!jobId) throw new Error("Missing jobId");

  // Deleting a job cascades through its imagery, measurements, photos and
  // quotes. Before this, every role in the company could do it — the guard
  // checked the tenant and stopped there.
  await requireJobAccess(jobId, "deleteJob");

  // All job children (imagery, measurements, jobs, quotes, …) cascade on
  // delete via the schema's onDelete: Cascade relations.
  await prisma.job.delete({ where: { id: jobId } });

  // Best-effort local file cleanup. With the S3 driver, orphaned objects are
  // left to bucket lifecycle rules rather than deleted here.
  if (storageDriverName() === "local") {
    const uploads = path.join(process.cwd(), "public", "uploads");
    await Promise.all(
      ["imagery", "processing", "photos"].map((prefix) =>
        rm(path.join(uploads, prefix, jobId), { recursive: true, force: true }).catch(() => undefined)
      )
    );
  }

  revalidatePath("/dashboard");
}
