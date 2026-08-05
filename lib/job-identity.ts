/**
 * Who a job is for and where it is, read from the relations when they are
 * loaded and from the job's own deprecated columns when they are not.
 *
 * The split gave the customer to `Client` and the address to `Property`, but
 * `Job` still carries a denormalized copy of both for one release. Rather
 * than teach a dozen screens that rule, they ask here. When the deprecated
 * columns are dropped, the fallback branches in this file are the only thing to
 * delete — that is the whole reason it exists.
 */
import type { AddressParts } from "@/lib/client-matching";

export type JobParties = {
  name: string;
  email: string | null;
  phone: string | null;
};

/** Shape of a job row, with the relations optionally included. */
export type JobLike = {
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  client?: { displayName: string; email: string | null; phone: string | null } | null;
  property?: AddressParts | null;
};

/** The `include` that makes the relation branch here take effect. */
export const jobIdentityInclude = {
  client: {
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      companyName: true,
      email: true,
      phone: true,
      status: true,
    },
  },
  property: {
    select: {
      id: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      province: true,
      postalCode: true,
      latitude: true,
      longitude: true,
    },
  },
} as const;

export function jobClient(job: JobLike): JobParties {
  if (job.client) {
    return { name: job.client.displayName, email: job.client.email, phone: job.client.phone };
  }
  return {
    name: job.clientName ?? "",
    email: job.clientEmail ?? null,
    phone: job.clientPhone ?? null,
  };
}

export function jobAddress(job: JobLike): AddressParts {
  if (job.property) return job.property;
  return {
    addressLine1: job.addressLine1,
    city: job.city,
    province: job.province,
    postalCode: job.postalCode,
  };
}

/** A person's name, or their email when they haven't given one. */
export function personName(user: { firstName: string | null; lastName: string | null; email: string }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}
