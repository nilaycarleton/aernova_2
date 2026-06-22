import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CompanyRole, type Company, type CompanyMembership, type User } from "@prisma/client";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Ensure a Prisma User row exists for the signed-in Clerk user, keeping the
 * cached profile fields in sync. Returns null when no one is signed in.
 */
export async function getCurrentDbUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const profile = {
    email,
    firstName: clerkUser.firstName ?? undefined,
    lastName: clerkUser.lastName ?? undefined,
    imageUrl: clerkUser.imageUrl ?? undefined,
  };

  // Already linked to this Clerk id → just refresh the cached profile.
  const byClerkId = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (byClerkId) {
    return prisma.user.update({ where: { id: byClerkId.id }, data: profile });
  }

  // A row with this email already exists (e.g. a prior sign-in or a different
  // Clerk instance). Re-link it to the current Clerk id instead of creating a
  // duplicate, which would violate the unique email constraint.
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      return prisma.user.update({
        where: { id: byEmail.id },
        data: { ...profile, clerkUserId: userId },
      });
    }
  }

  return prisma.user.create({ data: { clerkUserId: userId, ...profile } });
}

export type CompanyContext = {
  user: User;
  company: Company;
  membership: CompanyMembership;
  role: CompanyRole;
};

/**
 * Resolve the signed-in user's active company, auto-provisioning one (with the
 * user as OWNER) the first time they sign in. Every dashboard page and server
 * action should call this so all data is scoped to the caller's company.
 *
 * Redirects to /sign-in if there is no session (the proxy normally prevents
 * this, but calling it here keeps server actions safe too).
 */
export async function requireCompanyContext(): Promise<CompanyContext> {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const existing = await prisma.companyMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { company: true },
  });

  if (existing) {
    return { user, company: existing.company, membership: existing, role: existing.role };
  }

  // First sign-in: create a workspace for this contractor.
  const baseName = companyNameFor(user);
  const company = await prisma.company.create({
    data: {
      name: baseName,
      slug: await uniqueCompanySlug(baseName),
      memberships: {
        create: { userId: user.id, role: CompanyRole.OWNER },
      },
    },
    include: { memberships: true },
  });
  const membership = company.memberships[0];

  return { user, company, membership, role: membership.role };
}

function companyNameFor(user: User) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (name) return `${name}'s Company`;
  const local = user.email.split("@")[0];
  return local ? `${local}'s Company` : "My Company";
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "company"
  );
}

async function uniqueCompanySlug(name: string) {
  const base = slugify(name);
  // Slugs are unique; retry with a short random suffix on the rare collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomBytes(3).toString("hex")}`;
    const taken = await prisma.company.findUnique({ where: { slug } });
    if (!taken) return slug;
  }
  return `${base}-${randomBytes(5).toString("hex")}`;
}
