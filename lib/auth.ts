import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CompanyModule,
  CompanyRole,
  Trade,
  type Company,
  type CompanyMembership,
  type User,
} from "@prisma/client";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { provisionCompanyCatalog } from "@/lib/company-setup";
import { assertCan, can, jobScopeForRole, type Capability } from "@/lib/permissions";

/** Where a pending invite is parked across the sign-up round trip. */
export const INVITE_COOKIE = "aernova_invite";

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

  /**
   * The trapdoor, closed.
   *
   * Below this line a signed-in user with no membership gets a brand new
   * company with themselves as OWNER — which is right for a contractor signing
   * up, and catastrophic for a crew member who tapped their boss's invite and
   * then landed anywhere other than `/join`. They would end up the owner of an
   * empty company, wondering where the work went, while the invite sat unused.
   *
   * So a pending invite always wins over provisioning. The cookie is set by
   * `/join/[token]` before the sign-up round trip and is belt-and-braces: the
   * redirect back from Clerk normally lands on `/join` anyway, and this catches
   * every path where it doesn't.
   */
  const pendingInvite = (await cookies()).get(INVITE_COOKIE)?.value;
  if (pendingInvite) redirect(`/join/${pendingInvite}`);

  // First sign-in: create a workspace for this contractor.
  const baseName = companyNameFor(user);
  const company = await prisma.company.create({
    data: {
      name: baseName,
      slug: await uniqueCompanySlug(baseName),
      // Roofing is the trade being sold to, so it is the assumption that costs
      // the fewest people a wrong first screen. Onboarding asks properly, and
      // changing it re-provisions nothing — the catalog is theirs by then.
      trade: Trade.ROOFING,
      modules: [CompanyModule.ROOFING, CompanyModule.AERIAL_MEASUREMENT],
      memberships: {
        create: { userId: user.id, role: CompanyRole.OWNER },
      },
    },
    include: { memberships: true },
  });
  const membership = company.memberships[0];

  // A price list and a tax rate, so the first quote is not preceded by an
  // afternoon of data entry. Best-effort: a workspace that exists without its
  // catalog is recoverable (`npm run db:seed-catalog`); a sign-in that fails
  // because a default price could not be written is not.
  try {
    await provisionCompanyCatalog(company.id, { trade: company.trade, province: null });
  } catch (error) {
    console.error("Could not provision the starting catalog for", company.id, error);
  }

  return { user, company, membership, role: membership.role };
}

/**
 * Guard for job mutations: confirm the job belongs to the signed-in user's
 * company, that this *role* may reach it at all, and — when asked — that the
 * role may do the specific thing being attempted.
 *
 * This is the chokepoint. The knowledge graph puts it at 60 edges, more than
 * any other function in the codebase, which is the good news: a role that must
 * not reach a job is stopped in one place rather than in sixty. It is also why
 * the scoping below is a query and not a filter applied afterwards — a job a
 * crew member may not see must never be *loaded*, let alone rendered.
 *
 * Throws on every miss, and always with the same words. "Job not found" and
 * "you may not edit this job" are different sentences to a user and the same
 * sentence to somebody enumerating ids.
 */
export async function requireJobAccess(jobId: string, capability?: Capability) {
  if (!jobId) throw new Error("Missing jobId");
  const { company, user, role } = await requireCompanyContext();

  if (capability) assertCan(role, capability);

  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      companyId: company.id,
      // Crew reach only the jobs they have been put on the roof for. For every
      // other role this adds nothing — see `jobScopeForRole`.
      ...jobScopeForRole(role, user.id),
    },
    select: { id: true },
  });
  if (!job) throw new Error("Job not found");

  return { companyId: company.id, userId: user.id, role };
}

/**
 * The same guard for an action: throws, and the error boundary catches it.
 */
export async function requireCapability(capability: Capability) {
  const context = await requireCompanyContext();
  assertCan(context.role, capability);
  return context;
}

/**
 * The guard for a *page*: send them somewhere they belong instead of throwing.
 *
 * A crew member who taps a stale link or types `/quotes` out of curiosity has
 * done nothing wrong, and an error screen would tell them they have. They get
 * their own day instead — which is both kinder and quieter, since a redirect
 * leaks less about what exists than an error page does.
 */
export async function requirePageCapability(capability: Capability, to = "/today") {
  const context = await requireCompanyContext();
  if (!can(context.role, capability)) redirect(to);
  return context;
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
