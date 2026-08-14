import { UndoToastProvider } from "@/components/dashboard/undo-toast";
import { ShellChrome } from "@/components/dashboard/shell/shell-chrome";
import { requireCompanyContext } from "@/lib/auth";

/**
 * Premium UI Redesign Phase 2 — the Precision Workshop application shell.
 * Stays a Server Component: company/role resolution happens here, once,
 * server-side, exactly as before (`requireCompanyContext()` is unchanged).
 * Only three serializable facts cross into the client boundary — `role`,
 * `company.name`, `displayName` — everything nav-shaped (which destinations,
 * grouping, active state) is recomputed client-side from that
 * server-verified `role` via the shared pure `lib/shell-nav.ts` module. See
 * `components/dashboard/shell/shell-chrome.tsx` for the rest.
 *
 * `AppSidebar` (the old shell) is retired by this file, not left running
 * alongside the new one — see docs/PREMIUM_UI_PHASE_2_IMPLEMENTATION.md for
 * what was removed and why nothing kept both in production at once.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { company, user, role } = await requireCompanyContext();
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <UndoToastProvider>
      <ShellChrome role={role} companyName={company.name} displayName={displayName}>
        {children}
      </ShellChrome>
    </UndoToastProvider>
  );
}
