"use server";

import { redirect } from "next/navigation";
import { CaptureSource, JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { jobDisplayName, validateNewJob } from "@/lib/job-validation";
import { clientDisplayName, splitTypedName } from "@/lib/client-name";
import { createClient, fillClientContactGaps, resolveProperty } from "@/lib/client-resolve";
import { withJobNumber } from "@/lib/job-number";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Validation failures are returned, not thrown. A thrown error unmounts the
 * form via the error boundary and takes everything the user typed with it —
 * see https://nextjs.org/docs/app/getting-started/error-handling ("model
 * expected errors as return values"). Only genuine invariants throw here.
 *
 * `values` is echoed back for the same reason: a form that forgets what someone
 * typed in order to report a problem has not saved them any work.
 */
export type NewJobState = {
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export type NewJobInput = {
  companyId: string;
  createdById: string;
  name: string;
  clientId: string;
  clientName: string;
  clientIsBusiness: boolean;
  clientEmail: string;
  clientPhone: string;
  leadSource: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
  captureSource: CaptureSource;
};

/**
 * The actual creation, pulled out of the form action so `/jobs/capture`
 * (item 49) can create a job the same way `/jobs/new` does — resolve or
 * create the client, resolve the property, assign a job number — without a
 * second copy of that logic. `createJobAction` below is now a thin wrapper:
 * validate the form, call this, redirect. Any caller that needs to do more
 * before redirecting (item 49 also drafts a quote) calls this directly and
 * owns its own redirect.
 */
export async function createJobRecord(input: NewJobInput) {
  const nameParts = splitTypedName(input.clientName, input.clientIsBusiness);
  let resolvedClientId: string;

  if (input.clientId) {
    const chosen = await prisma.client.findFirst({
      where: { id: input.clientId, companyId: input.companyId },
      select: { id: true },
    });
    if (!chosen) throw new Error("Client not found");
    resolvedClientId = chosen.id;
    await fillClientContactGaps(resolvedClientId, {
      email: input.clientEmail,
      phone: input.clientPhone,
    });
  } else {
    resolvedClientId = await createClient({
      companyId: input.companyId,
      ...nameParts,
      email: input.clientEmail,
      phone: input.clientPhone,
      leadSource: input.leadSource,
    });
  }

  const propertyId = await resolveProperty(input.companyId, resolvedClientId, {
    addressLine1: input.addressLine1,
    city: input.city,
    province: input.province,
    postalCode: input.postalCode,
  });

  const client = await prisma.client.findUniqueOrThrow({
    where: { id: resolvedClientId },
    select: { displayName: true, email: true, phone: true },
  });

  return withJobNumber(input.companyId, (jobNumber) =>
    prisma.job.create({
      data: {
        companyId: input.companyId,
        createdById: input.createdById,
        clientId: resolvedClientId,
        propertyId,
        jobNumber,
        // Named from the client when nobody typed a title. Resolved at write
        // time rather than at read time so the name is stable: renaming the
        // client later must not silently rename every job they ever had.
        name: jobDisplayName(input.name, client.displayName, jobNumber),
        status: JobStatus.LEAD,
        captureSource: input.captureSource,
        notes: input.notes || null,
        // Deprecated columns, still dual-written for one release so a rollback
        // reads a complete job. Read off the client rather than the form now:
        // picking an existing client means the form carries no name at all.
        clientName: client.displayName || clientDisplayName(nameParts),
        clientEmail: client.email,
        clientPhone: client.phone,
        addressLine1: input.addressLine1,
        city: input.city,
        province: input.province,
        postalCode: input.postalCode || null,
        country: "Canada",
      },
    })
  );
}

export async function createJobAction(
  _prevState: NewJobState,
  formData: FormData
): Promise<NewJobState> {
  const { company, user } = await requireCapability("editJob");

  const name = getString(formData, "name");
  // Written by the client picker, and carrying its *decision*: an id when an
  // existing client was chosen, a name when the answer was "someone new". Never
  // both, and a half-typed name reaches neither.
  const clientId = getString(formData, "clientId");
  const clientName = getString(formData, "clientName");
  const clientIsBusiness = getString(formData, "clientIsBusiness") === "true";
  const clientEmail = getString(formData, "clientEmail");
  const clientPhone = getString(formData, "clientPhone");
  const leadSource = getString(formData, "leadSource");
  const addressLine1 = getString(formData, "addressLine1");
  const city = getString(formData, "city");
  const province = getString(formData, "province");
  const postalCode = getString(formData, "postalCode");
  const notes = getString(formData, "notes");
  const captureSourceRaw = getString(formData, "captureSource");

  const values = {
    name,
    clientName,
    clientEmail,
    clientPhone,
    leadSource,
    addressLine1,
    city,
    province,
    postalCode,
    notes,
    captureSource: captureSourceRaw,
  };

  const fieldErrors = validateNewJob({ name, clientId, clientName });
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  const allowedSources = new Set(["DRONE", "MANUAL", "AI_CAPTURE"]);
  const captureSource = allowedSources.has(captureSourceRaw)
    ? (captureSourceRaw as CaptureSource)
    : CaptureSource.MANUAL;

  const job = await createJobRecord({
    companyId: company.id,
    createdById: user.id,
    name,
    clientId,
    clientName,
    clientIsBusiness,
    clientEmail,
    clientPhone,
    leadSource,
    addressLine1,
    city,
    province,
    postalCode,
    notes,
    captureSource,
  });

  redirect(`/jobs/${job.id}`);
}
