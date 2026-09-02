/**
 * Finding the client and property a new job belongs to, and asking when it is
 * genuinely ambiguous.
 *
 * The rule: **a possible duplicate client is a question, never a decision.**
 * Silently attaching a job to an existing "Dave Chen" is right most of the time
 * and quietly wrong the rest, and quietly wrong means one customer's work
 * showing up in another customer's history. So a match is returned to the
 * caller, which shows it and lets a person answer.
 *
 * Phase 2 moved *when* that question gets asked. It used to fire on submit,
 * after the form had already been filled in; `searchClients` now feeds a
 * typeahead that asks while the name is still being typed, so the answer costs
 * a glance rather than a round trip. The server no longer second-guesses it:
 * choosing "Add «Dave Chen»" next to two existing Dave Chens is an explicit
 * answer, and re-asking would be overruling the person who gave it.
 *
 * A matching *property* is not ambiguous in the same way and is reused without
 * asking: the same client at the same address is the same building, and there
 * is no version of that where a person's answer would differ.
 */
import { ClientStatus, type JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isWonJobStatus } from "@/lib/client-lifecycle";
import {
  clientKey,
  clientMatchKeys,
  propertyKey,
  type AddressParts,
} from "@/lib/client-matching";
import { clientDisplayName, type ClientNameParts } from "@/lib/client-name";

/**
 * An existing client that might be the same person as the one being typed.
 *
 * Everything past the name is here to make the question *answerable*. A row
 * that says only "Dave Chen" asks someone to choose between two identical
 * things, which is not a question — it is an obstacle. So each match carries
 * what distinguishes it: how much work it has, where, and when it was added.
 */
export type ClientMatch = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  jobCount: number;
  latestAddress: string | null;
  /**
   * A client with no jobs is a real and common state — a lead added ahead of
   * any work, or one whose jobs have since been deleted. It still has to be
   * offered, and it still has to explain itself, which is what this is for.
   */
  createdAt: Date;
};

/**
 * The most recent property on a client, as the job form needs it: enough to
 * fill the address boxes in without anyone typing an address they have typed
 * before. `null` when the client has no address yet, which is ordinary.
 */
export type DefaultProperty = AddressParts & { id: string };

/** A client offered by the typeahead, with what it takes to auto-fill from it. */
export type ClientSuggestion = ClientMatch & {
  defaultProperty: DefaultProperty | null;
};

const CANDIDATE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  companyName: true,
  displayName: true,
  email: true,
  phone: true,
  createdAt: true,
  _count: { select: { jobs: true } },
  properties: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      id: true,
      addressLine1: true,
      city: true,
      province: true,
      postalCode: true,
    },
  },
} as const;

type Candidate = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  _count: { jobs: number };
  properties: {
    id: string;
    addressLine1: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
  }[];
};

/**
 * Every non-archived client in the company. Both matching and search run in
 * memory over this: the keys are normalized in a way Postgres cannot index, and
 * a company's client list is small enough that the scan is cheaper than the
 * machinery to avoid it. Revisit if a company ever passes ~10k clients.
 */
function loadCandidates(companyId: string) {
  return prisma.client.findMany({
    where: { companyId, status: { not: ClientStatus.ARCHIVED } },
    select: CANDIDATE_SELECT,
    orderBy: { createdAt: "asc" },
  }) as Promise<Candidate[]>;
}

function toSuggestion(candidate: Candidate): ClientSuggestion {
  const property = candidate.properties[0] ?? null;
  return {
    id: candidate.id,
    displayName: candidate.displayName,
    email: candidate.email,
    phone: candidate.phone,
    createdAt: candidate.createdAt,
    jobCount: candidate._count.jobs,
    latestAddress:
      [property?.addressLine1, property?.city].filter(Boolean).join(", ") || null,
    defaultProperty: property,
  };
}

/**
 * Most work first. The customer with fifteen jobs is the one being asked about,
 * so the answer is usually the top row; ties fall back to oldest-first so the
 * order is stable between keystrokes rather than shuffling under the cursor.
 */
function byRelevance(a: ClientSuggestion, b: ClientSuggestion) {
  return b.jobCount - a.jobCount || a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Clients matching what has been typed so far, for the job form's typeahead.
 *
 * This replaced an exact-key `findMatchingClients` that ran on submit. The
 * matching is looser on purpose — it runs on a partial name, and "dav" has to
 * find Dave Chen three letters in — and the looseness is affordable precisely
 * because a person is reading the results. Email and phone are searched too: a
 * roofer with two Dave Chens often knows the phone number rather than which one
 * had the garage.
 */
export async function searchClients(
  companyId: string,
  query: string,
  limit = 6
): Promise<ClientSuggestion[]> {
  const needle = clientKey(query);
  if (!needle) return [];
  // Digits only, so "(555) 123-4567" finds a client stored as "555-123-4567".
  const digits = query.replace(/\D/g, "");

  const candidates = await loadCandidates(companyId);
  return candidates
    .filter((candidate) => {
      if (clientMatchKeys(candidate).some((key) => key.includes(needle))) return true;
      if (clientKey(candidate.displayName).includes(needle)) return true;
      if (candidate.email && candidate.email.toLowerCase().includes(query.trim().toLowerCase()))
        return true;
      if (digits.length >= 3 && candidate.phone?.replace(/\D/g, "").includes(digits)) return true;
      return false;
    })
    .map(toSuggestion)
    .sort(byRelevance)
    .slice(0, limit);
}

export type CreateClientInput = ClientNameParts & {
  companyId: string;
  email?: string | null;
  phone?: string | null;
  leadSource?: string | null;
};

export async function createClient(input: CreateClientInput): Promise<string> {
  const created = await prisma.client.create({
    data: {
      companyId: input.companyId,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      companyName: input.companyName?.trim() || null,
      displayName: clientDisplayName(input),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      leadSource: input.leadSource?.trim() || null,
      status: ClientStatus.LEAD,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Fill in contact details an existing client is missing, from what was just
 * typed. Never overwrites: a blank field on this job must not erase a phone
 * number captured on the last one.
 */
export async function fillClientContactGaps(
  clientId: string,
  input: { email?: string | null; phone?: string | null }
): Promise<void> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { email: true, phone: true },
  });
  if (!client) return;

  const data: { email?: string; phone?: string } = {};
  if (!client.email && input.email?.trim()) data.email = input.email.trim();
  if (!client.phone && input.phone?.trim()) data.phone = input.phone.trim();
  if (Object.keys(data).length > 0) {
    await prisma.client.update({ where: { id: clientId }, data });
  }
}

/**
 * The property for this client at this address, creating it if it is new.
 * Returns null when there is no address yet, which is a legal state — a repair
 * booked over the phone gets an address when someone asks for one.
 */
export async function resolveProperty(
  companyId: string,
  clientId: string,
  address: AddressParts | undefined
): Promise<string | null> {
  const addressKey = address ? propertyKey(address) : "";
  if (!addressKey) return null;

  const properties = await prisma.property.findMany({
    where: { clientId },
    select: { id: true, addressLine1: true, city: true, province: true, postalCode: true },
    orderBy: { createdAt: "asc" },
  });

  const existing = properties.find((property) => propertyKey(property) === addressKey);
  if (existing) {
    // The postal code is left out of the match key precisely so it can be
    // filled in later, when someone finally types it.
    if (!existing.postalCode && address?.postalCode?.trim()) {
      await prisma.property.update({
        where: { id: existing.id },
        data: { postalCode: address.postalCode.trim() },
      });
    }
    return existing.id;
  }

  const created = await prisma.property.create({
    data: {
      companyId,
      clientId,
      addressLine1: address?.addressLine1?.trim() || null,
      city: address?.city?.trim() || null,
      province: address?.province?.trim() || null,
      postalCode: address?.postalCode?.trim() || null,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Apply the lead → client rule after a job's status changes (see
 * lib/client-lifecycle.ts for why SCHEDULED is the line). A no-op in every
 * case but the first win, so it is safe to call on every transition.
 */
export async function syncClientStatusForJob(
  jobId: string,
  jobStatus: JobStatus
): Promise<void> {
  if (!isWonJobStatus(jobStatus)) return;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { clientId: true },
  });
  if (!job?.clientId) return;

  // The status sits in the WHERE, not just the SET, so a client who converted
  // two years ago keeps their original `convertedAt` when their second job is
  // booked. The date they became a customer happened once.
  await prisma.client.updateMany({
    where: { id: job.clientId, status: ClientStatus.LEAD },
    data: { status: ClientStatus.ACTIVE, convertedAt: new Date() },
  });
}
