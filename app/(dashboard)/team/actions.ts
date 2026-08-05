"use server";

import { revalidatePath } from "next/cache";
import { CompanyRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { generateShareToken } from "@/lib/share-token";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/** A week. Long enough to get texted and acted on, short enough to go stale. */
const INVITE_DAYS = 7;

/**
 * Mint a link for one person.
 *
 * Single use and dated, because the failure mode of the alternative is not
 * theoretical: a link that never expires, forwarded once into a group chat, is
 * a permanent open door into a company's client list. One person, one link. If
 * you have hired three, make three.
 */
export async function createInviteAction(formData: FormData) {
  const { company, user } = await requireCapability("manageTeam");

  const label = getString(formData, "label") || null;
  const roleRaw = getString(formData, "role");
  // Only the roles a person is realistically hired into. OWNER is never
  // grantable by invite — a company gets exactly one, at signup.
  const role =
    roleRaw === "ADMIN" || roleRaw === "ESTIMATOR" || roleRaw === "SALES" || roleRaw === "VIEWER"
      ? (roleRaw as CompanyRole)
      : CompanyRole.CREW;

  await prisma.companyInvite.create({
    data: {
      companyId: company.id,
      token: generateShareToken(),
      role,
      label,
      createdById: user.id,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath("/team");
}

/** Kill a link that hasn't been used, or that went to the wrong number. */
export async function revokeInviteAction(formData: FormData) {
  const { company } = await requireCapability("manageTeam");
  const inviteId = getString(formData, "inviteId");
  if (!inviteId) return;

  await prisma.companyInvite.updateMany({
    where: { id: inviteId, companyId: company.id, acceptedAt: null },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/team");
}

/**
 * Take somebody off the team.
 *
 * Their user account survives — it is theirs, not the company's — and so does
 * everything they did. What ends is their access to this company's work. The
 * last owner cannot be removed, or a company becomes unadministrable by a
 * single misclick.
 */
export async function removeMemberAction(formData: FormData) {
  const { company, user } = await requireCapability("manageTeam");
  const membershipId = getString(formData, "membershipId");
  if (!membershipId) return;

  const membership = await prisma.companyMembership.findFirst({
    where: { id: membershipId, companyId: company.id },
    select: { id: true, role: true, userId: true },
  });
  if (!membership) return;

  if (membership.userId === user.id) {
    throw new Error("You can't remove yourself from your own company.");
  }

  if (membership.role === CompanyRole.OWNER) {
    const owners = await prisma.companyMembership.count({
      where: { companyId: company.id, role: CompanyRole.OWNER },
    });
    if (owners <= 1) throw new Error("A company needs an owner.");
  }

  await prisma.companyMembership.delete({ where: { id: membership.id } });
  revalidatePath("/team");
}
