import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth";

/**
 * Phase 0 concept/prototype surface for the Premium UI Redesign
 * (docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_REDESIGN_PLAN.md). Not a product surface.
 *
 * Isolation, matching the existing app/(dashboard)/internal/astryx-preview
 * convention (same OWNER-only gate) but in a *new top-level route group*,
 * sibling to (dashboard)/(public)/(report), rather than nested inside
 * (dashboard) — this tree exists to demonstrate a different shell, which it
 * cannot do while inheriting app/(dashboard)/layout.tsx's AppSidebar/header.
 * It still inherits the root app/layout.tsx (ClerkProvider, AstryxThemeProvider,
 * skip link, globals.css tokens), so dark/light and the semantic color tokens
 * behave exactly like the real app.
 *
 * Unlinked from AppSidebar. Gated to OWNER because, like astryx-preview, this
 * isn't a business action — it doesn't belong in lib/permissions.ts's
 * capability matrix at all.
 */
export default async function Phase0Layout({ children }: { children: React.ReactNode }) {
  const { role } = await requireCompanyContext();
  if (role !== "OWNER") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-ground">
      <div
        role="note"
        className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-hairline bg-surface-sidebar px-4 py-1.5 text-center text-xs text-ink-muted"
      >
        <span aria-hidden="true">&#9679;</span>
        Phase 0 — internal concept/prototype exploration. Not a product surface. Nothing here is wired to real data or business actions.
      </div>
      {children}
    </div>
  );
}
