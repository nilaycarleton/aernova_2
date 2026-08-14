import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatAddress } from "@/lib/client-matching";
import { clientTiles } from "@/lib/client-insights";
import { ClientsBrowser } from "@/components/dashboard/clients-browser";
import { PageHeader } from "@/components/ui/page-header";

/**
 * The second of the five nouns to get its own address.
 *
 * Everything here already existed in the database and nowhere on screen: a
 * client's standing, how they found you, their tags, the work you have done
 * for them. The split created these records; this is the page that admits they
 * exist.
 *
 * Deliberately not here yet: a "New client" button. A client is created inline
 * from the job form today (Phase 2 item 11), and a second creation path that
 * makes a client with no job attached is a Phase 3 decision, not a button to
 * add because the page looks bare without one.
 */
export default async function ClientsPage() {
  const { company, role } = await requirePageCapability("viewAllJobs");

  const clients = await prisma.client.findMany({
    where: { companyId: company.id },
    include: {
      properties: {
        take: 1,
        orderBy: { createdAt: "asc" },
      },
      jobs: {
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      _count: { select: { jobs: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const tiles = clientTiles(
    clients.map((c) => ({ createdAt: c.createdAt, convertedAt: c.convertedAt }))
  );

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Clients"
        description={
          clients.length > 0 ? "Everyone you have worked for, and everyone who has asked." : undefined
        }
      />

      <ClientsBrowser
        tiles={tiles}
        canDelete={can(role, "deleteClient")}
        clients={clients.map((client) => ({
          id: client.id,
          displayName: client.displayName,
          address: client.properties[0] ? formatAddress(client.properties[0]) : null,
          status: client.status,
          tags: client.tags,
          leadSource: client.leadSource,
          jobCount: client._count.jobs,
          // "Last activity" is the last time anything about this client moved.
          // Their own record covers a phone number being fixed; their newest
          // job covers the work. Whichever is later is the honest answer.
          lastActivityAt:
            client.jobs[0] && client.jobs[0].updatedAt > client.updatedAt
              ? client.jobs[0].updatedAt
              : client.updatedAt,
        }))}
      />
    </div>
  );
}
