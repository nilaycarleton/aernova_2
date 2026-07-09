"use server";

import { rm } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCompanyContext } from "@/lib/auth";
import { storageDriverName } from "@/lib/storage";
import { ALL_STATUSES } from "@/lib/project-status";

export async function updateProjectStatusAction(projectId: string, status: ProjectStatus) {
  if (!projectId) throw new Error("Missing projectId");
  if (!ALL_STATUSES.includes(status)) throw new Error("Invalid project status");

  const { company } = await requireCompanyContext();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { companyId: true },
  });
  if (!project || project.companyId !== company.id) {
    throw new Error("Project not found");
  }

  await prisma.project.update({ where: { id: projectId }, data: { status } });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function deleteProjectAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) throw new Error("Missing projectId");

  const { company } = await requireCompanyContext();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { companyId: true },
  });
  if (!project || project.companyId !== company.id) {
    throw new Error("Project not found");
  }

  // All project children (imagery, measurements, jobs, proposals, …) cascade on
  // delete via the schema's onDelete: Cascade relations.
  await prisma.project.delete({ where: { id: projectId } });

  // Best-effort local file cleanup. With the S3 driver, orphaned objects are
  // left to bucket lifecycle rules rather than deleted here.
  if (storageDriverName() === "local") {
    const uploads = path.join(process.cwd(), "public", "uploads");
    await Promise.all(
      ["imagery", "processing", "photos"].map((prefix) =>
        rm(path.join(uploads, prefix, projectId), { recursive: true, force: true }).catch(() => undefined)
      )
    );
  }

  revalidatePath("/dashboard");
}
