import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth";
import { PrimitivesClient } from "./primitives-client";

/**
 * Premium UI Redesign Phase 3's proof surface — every shared operational
 * primitive (components/ui/*), demonstrated through its full applicable
 * state matrix with realistic Aernova fixtures (lib/design-system-
 * fixtures.ts). This is the acceptance surface the plan calls for (Step 4:
 * "the internal lab is the primary proof surface for Phase 3; production
 * pages are not"), not a second token preview — see the sibling
 * `/internal/design-system` for that (Phase 1).
 *
 * Same isolation convention as its sibling: unlinked from navigation,
 * OWNER-gated because this isn't a business action and doesn't belong in
 * lib/permissions.ts's capability matrix.
 */
export default async function DesignSystemPrimitivesPage() {
  const { role } = await requireCompanyContext();
  if (role !== "OWNER") {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ink-primary">
          Design system — Operational primitives
        </h1>
        <p className="mt-2 max-w-[70ch] text-sm text-ink-secondary">
          Internal only. The Premium UI Redesign Phase 3 primitive lab — see{" "}
          <code>docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_PHASE_3_IMPLEMENTATION.md</code> for the written record this page
          demonstrates, and <code>components/ui/</code> for the primitives themselves. Not yet
          wired into any production route.
        </p>
      </div>
      <PrimitivesClient />
    </div>
  );
}
