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

  const allowedSources = new Set(["DRONE", "MANUAL"]);
  const captureSource = allowedSources.has(captureSourceRaw)
    ? (captureSourceRaw as CaptureSource)
    : CaptureSource.MANUAL;

  const nameParts = splitTypedName(clientName, clientIsBusiness);
  let resolvedClientId: string;

  if (clientId) {
    // An id that arrived in a form post proves nothing on its own. Confirm it
    // is this company's before a job is hung off it.
    const chosen = await prisma.client.findFirst({
      where: { id: clientId, companyId: company.id },
      select: { id: true },
    });
    if (!chosen) throw new Error("Client not found");
    resolvedClientId = chosen.id;
    await fillClientContactGaps(resolvedClientId, { email: clientEmail, phone: clientPhone });
  } else {
    // "Someone new" was chosen with any matching clients on screen, so this is
    // an answer rather than an oversight. Re-running the match here and asking
    // again would be overruling the person who just answered.
    resolvedClientId = await createClient({
      companyId: company.id,
      ...nameParts,
      email: clientEmail,
      phone: clientPhone,
      leadSource,
    });
  }

  const propertyId = await resolveProperty(company.id, resolvedClientId, {
    addressLine1,
    city,
    province,
    postalCode,
  });

  const client = await prisma.client.findUniqueOrThrow({
    where: { id: resolvedClientId },
    select: { displayName: true, email: true, phone: true },
  });

  const job = await withJobNumber(company.id, (jobNumber) =>
    prisma.job.create({
      data: {
        companyId: company.id,
        createdById: user.id,
        clientId: resolvedClientId,
        propertyId,
        jobNumber,
        // Named from the client when nobody typed a title. Resolved at write
        // time rather than at read time so the name is stable: renaming the
        // client later must not silently rename every job they ever had.
        name: jobDisplayName(name, client.displayName, jobNumber),
        status: JobStatus.LEAD,
        captureSource,
        notes: notes || null,
        // Deprecated columns, still dual-written for one release so a rollback
        // reads a complete job. Read off the client rather than the form now:
        // picking an existing client means the form carries no name at all.
        clientName: client.displayName || clientDisplayName(nameParts),
        clientEmail: client.email,
        clientPhone: client.phone,
        addressLine1,
        city,
        province,
        postalCode: postalCode || null,
        country: "Canada",
      },
    })
  );

  redirect(`/jobs/${job.id}`);
}
