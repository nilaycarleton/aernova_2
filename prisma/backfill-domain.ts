/**
 * Backfill the domain split: give every existing Job a Client and a
 * Property, and hand the roof data down to the Property that owns it.
 *
 *   npm run db:backfill-domain
 *
 * Idempotent in every step — it only fills nulls, never overwrites — so it is
 * safe to run repeatedly, and safe to run again after a deploy to catch rows
 * written by an older build.
 *
 * The interesting part is deduplication. Each Job carries its own typed
 * copy of the customer and the address, so three jobs for the same homeowner
 * are three different spellings of one person. They collapse onto one Client
 * and one Property using the keys in lib/client-matching.ts. This merge is the
 * whole point: without it the split produces a client list that is just the job
 * list wearing a different hat.
 *
 * Ordering matters. Jobs are processed oldest first so the client and
 * property that survive carry the earliest details, and so `jobNumber` runs in
 * the order the work actually happened.
 */
import { ClientStatus, PrismaClient, JobStatus } from "@prisma/client";
import { clientKey, propertyKey } from "../lib/client-matching.ts";
import { parseClientName } from "../lib/client-name.ts";

const prisma = new PrismaClient();

/** Statuses that mean this customer bought something, not just enquired. */
const WON_STATUSES = new Set<JobStatus>([
  JobStatus.QUOTED,
  JobStatus.SCHEDULED,
  JobStatus.IN_PROGRESS,
  JobStatus.COMPLETED,
]);

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  let clientsCreated = 0;
  let propertiesCreated = 0;
  let jobsLinked = 0;
  let jobsNumbered = 0;
  let roofRowsMoved = 0;

  for (const company of companies) {
    const jobs = await prisma.job.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        clientId: true,
        propertyId: true,
        jobNumber: true,
        status: true,
        clientName: true,
        clientEmail: true,
        clientPhone: true,
        addressLine1: true,
        city: true,
        province: true,
        postalCode: true,
        country: true,
        latitude: true,
        longitude: true,
      },
    });
    if (jobs.length === 0) continue;

    // Seed the caches from what is already in the database, so a second run
    // matches against real rows instead of creating a parallel set of them.
    // Keyed on the display name, which for a backfilled client is the exact
    // string the job carried — so a re-run matches what the last run wrote.
    const clientsByKey = new Map<string, string>();
    for (const client of await prisma.client.findMany({
      where: { companyId: company.id },
      select: { id: true, displayName: true },
    })) {
      const key = clientKey(client.displayName);
      if (key && !clientsByKey.has(key)) clientsByKey.set(key, client.id);
    }

    const propertiesByKey = new Map<string, string>();
    for (const property of await prisma.property.findMany({
      where: { companyId: company.id },
      select: { id: true, clientId: true, addressLine1: true, city: true, province: true },
    })) {
      const key = `${property.clientId}::${propertyKey(property)}`;
      if (!propertiesByKey.has(key)) propertiesByKey.set(key, property.id);
    }

    const highest = await prisma.job.aggregate({
      where: { companyId: company.id },
      _max: { jobNumber: true },
    });
    let nextJobNumber = (highest._max.jobNumber ?? 0) + 1;

    for (const job of jobs) {
      let clientId = job.clientId;
      let propertyId = job.propertyId;

      if (!clientId) {
        // A job with a blank client name is a real possibility in old data.
        // It gets its own client named after the job rather than merging with
        // every other nameless job, which would invent a customer.
        const name = job.clientName?.trim() || "Unnamed client";
        const key = clientKey(name);
        const existing = key ? clientsByKey.get(key) : undefined;

        if (existing) {
          clientId = existing;
          // Fill in contact details this client did not have yet. Never
          // overwrite: the earliest job won, and a later blank must not
          // erase it.
          await prisma.client.update({
            where: { id: existing },
            data: {
              email: job.clientEmail?.trim() || undefined,
              phone: job.clientPhone?.trim() || undefined,
            },
          });
        } else {
          const created = await prisma.client.create({
            data: {
              companyId: company.id,
              // The name is kept verbatim for display; the split into first /
              // last / business is a best-effort guess at a string that was
              // never structured. A wrong guess is invisible until someone
              // opens the record, and correct on screen either way.
              ...parseClientName(name),
              displayName: name,
              email: job.clientEmail?.trim() || null,
              phone: job.clientPhone?.trim() || null,
              status: WON_STATUSES.has(job.status)
                ? ClientStatus.ACTIVE
                : ClientStatus.LEAD,
            },
            select: { id: true },
          });
          clientId = created.id;
          clientsCreated += 1;
          if (key) clientsByKey.set(key, clientId);
        }
      }

      // A client who has since bought is promoted out of LEAD, but never
      // demoted — a later enquiry does not make an existing customer a lead.
      if (WON_STATUSES.has(job.status)) {
        await prisma.client.updateMany({
          where: { id: clientId, status: ClientStatus.LEAD },
          data: { status: ClientStatus.ACTIVE },
        });
      }

      if (!propertyId) {
        const addressKey = propertyKey(job);
        // No address at all means no building to speak of. The job keeps its
        // client and gets a property later, when someone types one.
        if (addressKey) {
          const cacheKey = `${clientId}::${addressKey}`;
          const existing = propertiesByKey.get(cacheKey);
          if (existing) {
            propertyId = existing;
          } else {
            const created = await prisma.property.create({
              data: {
                companyId: company.id,
                clientId: clientId!,
                addressLine1: job.addressLine1 || null,
                city: job.city || null,
                province: job.province || null,
                postalCode: job.postalCode,
                country: job.country,
                latitude: job.latitude,
                longitude: job.longitude,
              },
              select: { id: true },
            });
            propertyId = created.id;
            propertiesCreated += 1;
            propertiesByKey.set(cacheKey, propertyId);
          }
        }
      }

      const jobNumber = job.jobNumber ?? nextJobNumber++;
      if (job.jobNumber === null) jobsNumbered += 1;

      if (
        job.clientId !== clientId ||
        job.propertyId !== propertyId ||
        job.jobNumber !== jobNumber
      ) {
        await prisma.job.update({
          where: { id: job.id },
          data: { clientId, propertyId, jobNumber },
        });
        if (job.clientId !== clientId) jobsLinked += 1;
      }

      // Hand the roof data to the building. Scoped to rows that have no
      // property yet, so re-running never disturbs anything already placed —
      // including rows a human has since moved to a different property.
      if (propertyId) {
        const where = { jobId: job.id, propertyId: null };
        const data = { propertyId };
        const moved = await Promise.all([
          prisma.roofSection.updateMany({ where, data }),
          prisma.measurement.updateMany({ where, data }),
          prisma.modelMeasurement.updateMany({ where, data }),
          prisma.projectImagery.updateMany({ where, data }),
          prisma.roofIssue.updateMany({ where, data }),
        ]);
        roofRowsMoved += moved.reduce((sum, result) => sum + result.count, 0);
      }
    }
  }

  console.log(
    [
      `Clients created:      ${clientsCreated}`,
      `Properties created:   ${propertiesCreated}`,
      `Jobs linked:          ${jobsLinked}`,
      `Jobs numbered:        ${jobsNumbered}`,
      `Roof rows re-parented:${roofRowsMoved}`,
    ].join("\n")
  );

  // Report what is left rather than failing on it. A job with no client is a
  // bug; a job with no property may simply have no address yet, which is legal.
  const unlinked = await prisma.job.count({ where: { clientId: null } });
  if (unlinked > 0) console.log(`\n⚠️  ${unlinked} job(s) still have no client.`);

  const noProperty = await prisma.job.count({ where: { propertyId: null } });
  if (noProperty > 0) {
    console.log(`${noProperty} job(s) have no property — they have no address to make one from.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
