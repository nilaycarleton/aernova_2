"use server";

import { revalidatePath } from "next/cache";
import { IssueSeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const allowedSeverities = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createRoofIssueAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const title = getString(formData, "title");
  const severityRaw = getString(formData, "severity");
  const locationLabel = getString(formData, "locationLabel");
  const recommendedAction = getString(formData, "recommendedAction");
  const photoTag = getString(formData, "photoTag");
  const caption = getString(formData, "caption");
  const urgency = getString(formData, "urgency");

  if (!projectId) throw new Error("Missing projectId");
  if (!title) throw new Error("Issue title is required");
  if (!allowedSeverities.has(severityRaw)) throw new Error("Invalid severity");

  const details = [
    recommendedAction ? `Recommended action: ${recommendedAction}` : null,
    photoTag ? `Photo tag/location: ${photoTag}` : null,
    caption ? `Caption: ${caption}` : null,
    urgency ? `Urgency: ${urgency}` : null,
  ].filter(Boolean);

  await prisma.roofIssue.create({
    data: {
      projectId,
      title,
      severity: severityRaw as IssueSeverity,
      locationLabel: locationLabel || null,
      description: details.join("\n") || null,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/report`);
}
