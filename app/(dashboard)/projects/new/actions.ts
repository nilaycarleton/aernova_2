"use server";

import { redirect } from "next/navigation";
import { CaptureSource, ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCompanyContext } from "@/lib/auth";
import { validateNewProject } from "@/lib/project-validation";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Validation failures are returned, not thrown. A thrown error unmounts the
 * form via the error boundary and takes everything the user typed with it —
 * see https://nextjs.org/docs/app/getting-started/error-handling ("model
 * expected errors as return values"). Only genuine invariants throw here.
 */
export type NewProjectState = {
  fieldErrors?: Record<string, string>;
};

export async function createProjectAction(
  _prevState: NewProjectState,
  formData: FormData
): Promise<NewProjectState> {
  const { company, user } = await requireCompanyContext();

  const name = getString(formData, "name");
  const clientName = getString(formData, "clientName");
  const clientEmail = getString(formData, "clientEmail");
  const clientPhone = getString(formData, "clientPhone");
  const addressLine1 = getString(formData, "addressLine1");
  const city = getString(formData, "city");
  const province = getString(formData, "province");
  const postalCode = getString(formData, "postalCode");
  const notes = getString(formData, "notes");
  const captureSourceRaw = getString(formData, "captureSource");

  const fieldErrors = validateNewProject({ name, clientName, addressLine1, city, province });
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const allowedSources = new Set(["DRONE", "MANUAL"]);
  const captureSource = allowedSources.has(captureSourceRaw)
    ? (captureSourceRaw as CaptureSource)
    : CaptureSource.MANUAL;

  const project = await prisma.project.create({
    data: {
      companyId: company.id,
      createdById: user.id,
      name,
      clientName,
      clientEmail: clientEmail || null,
      clientPhone: clientPhone || null,
      status: ProjectStatus.LEAD,
      captureSource,
      addressLine1,
      city,
      province,
      postalCode: postalCode || null,
      country: "Canada",
      notes: notes || null,
    },
  });

  redirect(`/projects/${project.id}`);
}
