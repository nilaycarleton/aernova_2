import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser, INVITE_COOKIE } from "@/lib/auth";
import { isWellFormedShareToken } from "@/lib/share-token";

/**
 * Joining your boss's team.
 *
 * Public, because the person opening it does not have an account yet — that is
 * the entire point. The token in the URL is the credential, the same shape a
 * homeowner's quote link uses.
 *
 * The order here is the whole trick. The invite is parked in a cookie *before*
 * the sign-up round trip, so that whatever Clerk redirects to afterwards, the
 * user never reaches `requireCompanyContext()` without a pending invite in
 * hand — which is what stops them being handed a shiny empty company of their
 * own. See the note at the trapdoor in `lib/auth.ts`.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isWellFormedShareToken(token)) return <Dead reason="notFound" />;

  const invite = await prisma.companyInvite.findFirst({
    where: { token },
    include: { company: { select: { name: true } } },
  });

  if (!invite || invite.revokedAt) return <Dead reason="notFound" />;
  if (invite.acceptedAt) return <Dead reason="used" company={invite.company.name} />;
  if (invite.expiresAt < new Date()) return <Dead reason="expired" company={invite.company.name} />;

  // Parked first, read later. Written even for a signed-in user, because the
  // membership write below can still fail and land them back here.
  (await cookies()).set(INVITE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
    path: "/",
  });

  const { userId } = await auth();

  if (!userId) {
    return (
      <Shell
        title={`Join ${invite.company.name}`}
        body="Make yourself an account and you'll land straight in your boss's team. It takes a minute."
      >
        <SignUpButton mode="modal" forceRedirectUrl={`/join/${token}`}>
          <button
            type="button"
            className="rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            Create my account
          </button>
        </SignUpButton>
        <p className="mt-4 text-xs text-ink-muted">
          This link was meant for one person and stops working once it&rsquo;s used.
        </p>
      </Shell>
    );
  }

  const user = await getCurrentDbUser();
  if (!user) return <Dead reason="notFound" />;

  // Already on this team — the second tap of a double-tapped link, or a link
  // re-opened out of curiosity. Not an error, and not a second membership.
  const existing = await prisma.companyMembership.findFirst({
    where: { companyId: invite.companyId, userId: user.id },
  });
  if (existing) {
    (await cookies()).delete(INVITE_COOKIE);
    redirect("/today");
  }

  /**
   * Claim the invite *first*, and conditionally.
   *
   * The `acceptedAt` check further up is a courtesy that renders a kind
   * message; it is not the guard. Two taps arriving together would both pass
   * it, and "single use" would quietly mean "as many as you can double-click".
   * The `updateMany` below only matches an invite that is still unspent, so the
   * database decides the winner and the loser gets the same message as anyone
   * else arriving late.
   *
   * Both writes in one transaction, because a membership without a spent invite
   * is a link that works twice, and a spent invite without a membership locks
   * somebody out of the team they were just invited to.
   */
  const joined = await prisma.$transaction(async (tx) => {
    const claimed = await tx.companyInvite.updateMany({
      where: { id: invite.id, acceptedAt: null, revokedAt: null },
      data: { acceptedAt: new Date(), acceptedByUserId: user.id },
    });
    if (claimed.count === 0) return false;

    await tx.companyMembership.create({
      data: { companyId: invite.companyId, userId: user.id, role: invite.role },
    });
    return true;
  });

  if (!joined) return <Dead reason="used" company={invite.company.name} />;

  (await cookies()).delete(INVITE_COOKIE);
  redirect("/today");
}

function Shell({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ground px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-hairline bg-surface-raised p-8">
        <h1 className="text-2xl font-semibold text-ink-primary">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-secondary">{body}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

/** Every dead end says the same amount: enough to act on, nothing to probe. */
function Dead({ reason, company }: { reason: "notFound" | "used" | "expired"; company?: string }) {
  const who = company ?? "your boss";
  if (reason === "used") {
    return (
      <Shell
        title="This link has been used"
        body={`Someone has already joined with it. If that wasn't you, ask ${who} for a new one.`}
      />
    );
  }
  if (reason === "expired") {
    return (
      <Shell
        title="This link has expired"
        body={`Invites last a week. Ask ${who} to send you a fresh one — it takes them a second.`}
      />
    );
  }
  return (
    <Shell
      title="This link doesn't work"
      body="It may have been cancelled, or copied across wrong. Ask whoever sent it for another."
    />
  );
}
