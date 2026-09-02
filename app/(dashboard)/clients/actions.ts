"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { splitTypedName, validateClientName } from "@/lib/client-name";
import { createClient } from "@/lib/client-resolve";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export type NewClientState = { error?: string };

/**
 * A client with no job attached yet — the second creation path `/clients`
 * itself said wasn't a button to add "because the page looks bare without
 * one." The global quick-create menu is that path, now that there's
 * somewhere other than the job form to ask for it. Same rule as the job
 * form's inline creation: a name is enough, everything else is optional.
 */
export async function createLeadClientAction(
  _prevState: NewClientState,
  formData: FormData
): Promise<NewClientState> {
  const { company } = await requireCapability("editJob");

  const isBusiness = getString(formData, "isBusiness") === "true";
  const nameParts = splitTypedName(getString(formData, "name"), isBusiness);
  const error = validateClientName(nameParts);
  if (error) return { error };

  await createClient({
    companyId: company.id,
    ...nameParts,
    leadSource: getString(formData, "leadSource") || null,
  });

  redirect("/clients");
}

/**
 * Erase a client — no status restriction, same as `deleteJobAction`'s own
 * precedent: a permanent action gated by a capability and a confirmation in
 * the UI, not by the record's own state.
 *
 * Cascades their properties and requests (`onDelete: Cascade` in the schema)
 * — real loss, that's the lead history and the buildings gone. What survives
 * on purpose: any job they had. `Job.clientId` is `SetNull`, and every job
 * still carries its own denormalized `clientName`/address columns from
 * before the Client/Property split, so a deleted client's old jobs keep
 * showing a name and address rather than going blank — and every quote,
 * invoice and payment on those jobs is untouched, because none of them
 * reference `Client` at all.
 */
export async function deleteClientAction(formData: FormData) {
  const clientId = getString(formData, "clientId");
  if (!clientId) throw new Error("Missing clientId");

  const { company } = await requireCapability("deleteClient");

  await prisma.client.deleteMany({ where: { id: clientId, companyId: company.id } });

  revalidatePath("/clients");
}
