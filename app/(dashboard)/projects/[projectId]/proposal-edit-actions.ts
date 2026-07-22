"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/auth";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/** Returns [value, error]. A bad number is reported, never thrown — see below. */
function readOptionalNumber(formData: FormData, key: string): [number | null, string | undefined] {
  const raw = getString(formData, key);
  if (!raw) return [null, undefined];
  const value = Number(raw);
  if (Number.isNaN(value)) return [null, "Enter a number, or leave this blank."];
  return [value, undefined];
}

/**
 * Validation is returned, not thrown. Throwing unmounts the form via the error
 * boundary and loses the whole proposal draft — see Next's error-handling guide
 * ("model expected errors as return values"). Only the projectId invariant, a
 * tampered/impossible state rather than user error, still throws.
 */
export type ProposalDraftState = { fieldErrors?: Record<string, string> };

export async function saveProposalDraftAction(
  _prevState: ProposalDraftState,
  formData: FormData
): Promise<ProposalDraftState> {
  const projectId = getString(formData, "projectId");
  const proposalId = getString(formData, "proposalId");
  const title = getString(formData, "title");
  const scope = getString(formData, "scope");
  const notes = getString(formData, "notes");
  const customLineItems = getString(formData, "customLineItems");
  const [optionalMarkup, markupError] = readOptionalNumber(formData, "optionalMarkup");
  const [totalAmount, totalError] = readOptionalNumber(formData, "totalAmount");
  const acceptedByName = getString(formData, "acceptedByName");
  const acceptedDate = getString(formData, "acceptedDate");

  if (!projectId) throw new Error("Missing projectId");

  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = "Give the proposal a title before saving.";
  if (totalError) fieldErrors.totalAmount = totalError;
  if (markupError) fieldErrors.optionalMarkup = markupError;
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  await requireProjectAccess(projectId);

  const scopeOfWork = JSON.stringify({
    version: new Date().toISOString(),
    plainTextScope: scope,
    notes,
    customLineItems: customLineItems
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    optionalMarkup,
    acceptance: acceptedByName || acceptedDate ? { name: acceptedByName, date: acceptedDate } : null,
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
  return {};
}
