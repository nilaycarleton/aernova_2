"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { generateShareToken } from "@/lib/share-token";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Mint the Client Hub link — item 44. Same shape as `shareQuoteAction`: the
 * token is minted once and kept, so re-opening this panel never invalidates
 * a link already sitting in a homeowner's inbox.
 *
 * Gated on `editJob`, the same capability that already lets a role manage a
 * client and its jobs — there is no narrower "can expose a client's whole
 * history" capability, and inventing one for a single action would be a
 * permission tier nobody else in the product has.
 */
export async function createClientHubLinkAction(formData: FormData) {
  const clientId = getString(formData, "clientId");
  if (!clientId) throw new Error("Missing clientId");

  const { company } = await requireCapability("editJob");

  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId: company.id },
    select: { id: true, shareToken: true },
  });
  if (!client) throw new Error("Client not found");

  if (!client.shareToken) {
    await prisma.client.update({
      where: { id: client.id },
      data: { shareToken: generateShareToken() },
    });
  }

  revalidatePath(`/clients/${clientId}`);
}

/** Close the door again. The token is cleared, so the old link stops working. */
export async function unshareClientHubLinkAction(formData: FormData) {
  const clientId = getString(formData, "clientId");
  if (!clientId) throw new Error("Missing clientId");

  const { company } = await requireCapability("editJob");

  await prisma.client.updateMany({
    where: { id: clientId, companyId: company.id },
    data: { shareToken: null },
  });

  revalidatePath(`/clients/${clientId}`);
}
