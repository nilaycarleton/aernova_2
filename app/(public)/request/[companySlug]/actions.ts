"use server";

import { revalidatePath } from "next/cache";
import { ActivityKind, RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { splitTypedName, validateClientName } from "@/lib/client-name";
import { createClient, fillClientContactGaps, resolveProperty } from "@/lib/client-resolve";
import { isResubmit, normalizedRequestEmail } from "@/lib/public-request";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export type PublicRequestState = {
  /** Set only for something not tied to one field — a bad or dead link. */
  formError?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  success?: boolean;
};

/**
 * Item 45: a homeowner asking for work, with nobody from the company in the
 * room. Same two fields `createRequestAction` requires (a name, what they
 * want) plus the honeypot and the email-match this door needs that the
 * office form doesn't — see `lib/public-request.ts` for why email is the one
 * signal trusted to merge automatically here.
 *
 * Every failure path returns rather than throws, same reasoning as
 * `NewRequestState`/`NewJobState`: a homeowner mid-submit should see a plain
 * sentence, not an error boundary.
 */
export async function createPublicRequestAction(
  _prevState: PublicRequestState,
  formData: FormData
): Promise<PublicRequestState> {
  const companySlug = getString(formData, "companySlug");
  const company = await prisma.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) {
    return { formError: "This link isn't working right now — try contacting them directly." };
  }

  // Honeypot: a field no sighted or assistive-tech user can reach (see the
  // form component), so anything in it came from a script filling every
  // input it found. Answered with the same success a real submission gets —
  // telling a bot which field gave it away only makes the next one smarter.
  if (getString(formData, "website")) {
    return { success: true };
  }

  const name = getString(formData, "name");
  const email = getString(formData, "email");
  const phone = getString(formData, "phone");
  const title = getString(formData, "title");
  const description = getString(formData, "description");
  const addressLine1 = getString(formData, "addressLine1");
  const city = getString(formData, "city");
  const province = getString(formData, "province");
  const postalCode = getString(formData, "postalCode");

  const values = {
    name,
    email,
    phone,
    title,
    description,
    addressLine1,
    city,
    province,
    postalCode,
  };

  const fieldErrors: Record<string, string> = {};
  const nameParts = splitTypedName(name, false);
  const nameError = validateClientName(nameParts);
  if (nameError) fieldErrors.name = nameError;
  if (!title) fieldErrors.title = "Let us know what you need — a few words is enough.";
  if (!email && !phone) {
    fieldErrors.email = "Leave a phone number or an email so they can reach you.";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  const normalizedEmail = email ? normalizedRequestEmail(email) : "";
  const existing = normalizedEmail
    ? await prisma.client.findFirst({
        where: { companyId: company.id, email: { equals: normalizedEmail, mode: "insensitive" } },
        select: { id: true },
      })
    : null;

  let clientId: string;
  if (existing) {
    clientId = existing.id;
    await fillClientContactGaps(clientId, { email, phone });

    // Soft resubmit guard — see lib/public-request.ts. Only reachable once a
    // client is already matched, since there is nothing to compare a
    // brand-new lead's timing against.
    const recent = await prisma.request.findFirst({
      where: { companyId: company.id, clientId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (recent && isResubmit(recent.createdAt)) {
      return { success: true };
    }
  } else {
    clientId = await createClient({
      companyId: company.id,
      ...nameParts,
      email: email || null,
      phone: phone || null,
      leadSource: "Website",
    });
  }

  const propertyId = await resolveProperty(company.id, clientId, {
    addressLine1,
    city,
    province,
    postalCode,
  });

  await prisma.request.create({
    data: {
      companyId: company.id,
      clientId,
      propertyId,
      title,
      description: description || null,
      source: "Website",
      requestedAt: new Date(),
      status: RequestStatus.NEW,
    },
  });

  await recordActivity({
    companyId: company.id,
    kind: ActivityKind.REQUEST_CREATED,
  });

  revalidatePath("/requests");
  revalidatePath("/pipeline");
  return { success: true };
}
