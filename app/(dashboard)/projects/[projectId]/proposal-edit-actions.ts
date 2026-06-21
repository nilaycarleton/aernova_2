"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalNumber(formData: FormData, key: string) {
  const raw = getString(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  if (Number.isNaN(value)) throw new Error(`Invalid number for ${key}`);
  return value;
}

export async function saveProposalDraftAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const proposalId = getString(formData, "proposalId");
  const title = getString(formData, "title");
  const scope = getString(formData, "scope");
  const notes = getString(formData, "notes");
  const customLineItems = getString(formData, "customLineItems");
  const optionalMarkup = getOptionalNumber(formData, "optionalMarkup");
  const totalAmount = getOptionalNumber(formData, "totalAmount");

  if (!projectId) throw new Error("Missing projectId");
  if (!title) throw new Error("Proposal title is required");

  const scopeOfWork = JSON.stringify({
    version: new Date().toISOString(),
    plainTextScope: scope,
    notes,
    customLineItems: customLineItems
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    optionalMarkup,
    sections: [
      {
        title: "Scope of Work",
        body: scope || "Scope to be confirmed.",
      },
      {
        title: "Notes",
        body: notes || "No additional notes.",
      },
    ],
  });

  if (proposalId) {
    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        title,
        totalAmount,
        scopeOfWork,
      },
    });
  } else {
    await prisma.proposal.create({
      data: {
        projectId,
        title,
        totalAmount,
        status: "DRAFT",
        scopeOfWork,
      },
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/report`);
}
