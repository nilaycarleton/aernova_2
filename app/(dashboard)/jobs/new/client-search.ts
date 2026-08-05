"use server";

import { requireCapability } from "@/lib/auth";
import { searchClients, type ClientSuggestion } from "@/lib/client-resolve";

/**
 * Clients matching what has been typed into the job form's client box.
 *
 * A Server Function rather than a route handler: there is no second caller, and
 * the Next docs are explicit that auth is verified *inside* every action rather
 * than relying on the page that rendered it. `requireCapability("viewAllJobs")`
 * is what keeps one company's client list out of another's typeahead — and out
 * of the hands of a crew member, for whom the client list is not a tool but a
 * copy of the business.
 */
export async function searchClientsAction(query: string): Promise<ClientSuggestion[]> {
  const { company } = await requireCapability("viewAllJobs");
  if (query.trim().length < 2) return [];
  return searchClients(company.id, query);
}
