"use server";

import { rm } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { storageDriverName } from "@/lib/storage";
import { ALL_STATUSES } from "@/lib/job-status";
import { syncClientStatusForJob } from "@/lib/client-resolve";

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
