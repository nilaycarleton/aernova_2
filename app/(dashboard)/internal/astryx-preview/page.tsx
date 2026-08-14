import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth";
import { AstryxPreviewClient } from "./astryx-preview-client";

/**
 * Scaffolding for the Astryx integration (see the plan in the astryx-
 * integration branch), not a product surface — sanity-checks that the
 * defineTheme mapping in lib/astryx/theme.ts actually renders Precision
 * Workshop tokens (right shadow-or-none, right radius, right colors) in both
 * themes before any real component gets swizzled in. Unlinked from
 * AppSidebar; gated to OWNER because it isn't a capability in
 * lib/permissions.ts's matrix — it's not a business action, so it doesn't
 * belong in that matrix at all.
 */
export default async function AstryxPreviewPage() {
  const { role } = await requireCompanyContext();
  if (role !== "OWNER") {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink-primary">Astryx preview</h1>
        <p className="text-sm text-ink-muted">
          Internal only. Verifies the Precision Workshop theme mapping renders correctly — not a
          product surface.
        </p>
      </div>
      <AstryxPreviewClient />
    </div>
  );
}
