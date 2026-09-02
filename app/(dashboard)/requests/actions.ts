"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ActivityKind,
  CaptureSource,
  JobStatus,
  RequestStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { splitTypedName } from "@/lib/client-name";
import { createClient, fillClientContactGaps, resolveProperty } from "@/lib/client-resolve";
import { withJobNumber } from "@/lib/job-number";
import { jobDisplayName } from "@/lib/job-validation";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Same contract as the job form: expected problems come back as values so the
 * error boundary never unmounts the form and takes what someone typed with it.
 */
export type NewRequestState = {
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

/**
 * Write down an ask.
 *
 * Two required fields — who, and what they want — and the second one is
 * required where the job form's name is not, because "Job for Dave Chen" is a
 * usable job name and "Dave Chen wants something" is not a usable request. The
 * whole value of this record is knowing what was asked for without phoning
 * back to find out.
 */
export async function createRequestAction(
  _prevState: NewRequestState,
  formData: FormData
): Promise<NewRequestState> {
  const { company } = await requireCapability("editJob");

  const clientId = getString(formData, "clientId");
  const clientName = getString(formData, "clientName");
  const clientIsBusiness = getString(formData, "clientIsBusiness") === "true";
  const clientEmail = getString(formData, "clientEmail");
  const clientPhone = getString(formData, "clientPhone");
  const title = getString(formData, "title");
  const description = getString(formData, "description");
  const source = getString(formData, "source");
  const requestedAtRaw = getString(formData, "requestedAt");
  const addressLine1 = getString(formData, "addressLine1");
  const city = getString(formData, "city");
  const province = getString(formData, "province");
  const postalCode = getString(formData, "postalCode");

  const values = {
    clientName,
    clientEmail,
    clientPhone,
    title,
    description,
    source,
    requestedAt: requestedAtRaw,
    addressLine1,
    city,
    province,
    postalCode,
  };

  const fieldErrors: Record<string, string> = {};
  if (!clientId && !clientName) fieldErrors.client = "Who asked? Pick a client or add a new one.";
  if (!title) fieldErrors.title = "What do they want? A few words is enough.";

  // A request dated in the future is a typo, not a booking — Phase 4's calendar
  // is where a future date means something.
  const requestedAt = requestedAtRaw ? new Date(requestedAtRaw) : new Date();
  if (requestedAtRaw && Number.isNaN(requestedAt.getTime())) {
    fieldErrors.requestedAt = "That date didn't make sense. Leave it blank for today.";
  } else if (requestedAt.getTime() > Date.now() + 60 * 1000) {
    fieldErrors.requestedAt = "This is when they asked, so it can't be in the future.";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  let resolvedClientId: string;
  if (clientId) {
    const chosen = await prisma.client.findFirst({
      where: { id: clientId, companyId: company.id },
      select: { id: true },
    });
    if (!chosen) throw new Error("Client not found");
    resolvedClientId = chosen.id;
    await fillClientContactGaps(resolvedClientId, { email: clientEmail, phone: clientPhone });
  } else {
    resolvedClientId = await createClient({
      companyId: company.id,
      ...splitTypedName(clientName, clientIsBusiness),
      email: clientEmail,
      phone: clientPhone,
      // How the request arrived *is* how they found you, so it lands on the
      // client too rather than being asked for twice.
      leadSource: source,
    });
  }

  const propertyId = await resolveProperty(company.id, resolvedClientId, {
    addressLine1,
    city,
    province,
    postalCode,
  });

  await prisma.request.create({
    data: {
      companyId: company.id,
      clientId: resolvedClientId,
      propertyId,
      title,
      description: description || null,
      source: source || null,
      requestedAt,
      status: RequestStatus.NEW,
    },
  });

  await recordActivity({
    companyId: company.id,
    kind: ActivityKind.REQUEST_CREATED,
  });

  revalidatePath("/requests");
  redirect("/requests");
}

export async function updateRequestStatusAction(formData: FormData) {
  const requestId = getString(formData, "requestId");
  const status = getString(formData, "status") as RequestStatus;
  if (!requestId) throw new Error("Missing requestId");
  if (!Object.values(RequestStatus).includes(status)) throw new Error("Invalid request status");

  const { company } = await requireCapability("editJob");
  // CONVERTED is not a status anyone types — it is what converting *did*, and
  // setting it by hand would leave a request claiming to be a job that isn't.
  if (status === RequestStatus.CONVERTED) {
    throw new Error("Convert a request by creating its job, not by setting its status");
  }

  await prisma.request.updateMany({
    where: { id: requestId, companyId: company.id },
    data: { status },
  });

  revalidatePath("/requests");
}

/**
 * Erase a request. Nothing else in the schema points *at* a `Request` — not
 * a job, not a quote — so unlike the other three deletes this one has no
 * downstream to reason about: converting one already copied everything worth
 * keeping onto its own `Job`, which survives untouched either way.
 */
export async function deleteRequestAction(formData: FormData) {
  const requestId = getString(formData, "requestId");
  if (!requestId) throw new Error("Missing requestId");

  const { company } = await requireCapability("deleteRequest");

  await prisma.request.deleteMany({ where: { id: requestId, companyId: company.id } });

  revalidatePath("/requests");
}

/**
 * Turn an ask into work.
 *
 * Everything the request already knows comes across — the client, the address,
 * what they asked for — so the answer to "yes, let's do it" is one button and
 * no retyping. That carry-over is the entire reason a request is a record
 * rather than a note in someone's phone.
 */
export async function convertRequestToJobAction(formData: FormData) {
  const requestId = getString(formData, "requestId");
  if (!requestId) throw new Error("Missing requestId");

  const { company, user } = await requireCapability("editJob");

  const request = await prisma.request.findFirst({
    where: { id: requestId, companyId: company.id },
    include: {
      client: { select: { id: true, displayName: true, email: true, phone: true } },
      property: true,
    },
  });
  if (!request) throw new Error("Request not found");

  // Already converted: send them to the job rather than making a second one.
  if (request.jobId) redirect(`/jobs/${request.jobId}`);

  const job = await withJobNumber(company.id, (jobNumber) =>
    prisma.job.create({
      data: {
        companyId: company.id,
        createdById: user.id,
        clientId: request.clientId,
        propertyId: request.propertyId,
        jobNumber,
        // What they asked for becomes the job's name. It is the one job name in
        // the product that nobody had to invent — it is the customer's own
        // words, which is the best name a job can have.
        name: jobDisplayName(request.title, request.client.displayName, jobNumber),
        status: JobStatus.LEAD,
        captureSource: CaptureSource.MANUAL,
        notes: request.description,
        // Item 41: whoever was working the lead keeps working the job —
        // converting must not reset the ownership question to unassigned.
        assignedToId: request.assignedToId,
        // Deprecated columns, still dual-written for one release.
        clientName: request.client.displayName,
        clientEmail: request.client.email,
        clientPhone: request.client.phone,
        addressLine1: request.property?.addressLine1 ?? "",
        city: request.property?.city ?? "",
        province: request.property?.province ?? "",
        postalCode: request.property?.postalCode ?? null,
        country: request.property?.country ?? "Canada",
      },
    })
  );

  await prisma.request.update({
    where: { id: request.id },
    data: { status: RequestStatus.CONVERTED, jobId: job.id },
  });

  await recordActivity({
    companyId: company.id,
    jobId: job.id,
    kind: ActivityKind.REQUEST_CONVERTED,
    actorUserId: user.id,
  });

  revalidatePath("/requests");
  redirect(`/jobs/${job.id}`);
}
