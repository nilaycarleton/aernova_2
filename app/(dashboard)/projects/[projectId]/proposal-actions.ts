"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateRoofingReport } from "@/lib/report-generator";

export async function generateProposalAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();

  if (!projectId) {
    throw new Error("Missing projectId");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      measurements: true,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const report = generateRoofingReport(project, project.measurements);

  const proposal = await prisma.proposal.create({
    data: {
      projectId: project.id,
      title: report.title,
      status: "DRAFT",
      totalAmount: report.totalAmount,
      scopeOfWork: JSON.stringify({
        summary: report.summary,
        sections: report.sections,
        plainTextScope: report.scopeOfWork,
      }),
    },
  });

  redirect(`/projects/${project.id}?proposal=${proposal.id}`);
}