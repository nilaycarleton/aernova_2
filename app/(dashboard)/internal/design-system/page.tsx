import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth";
import { DesignSystemClient } from "./design-system-client";

/**
 * Premium UI Redesign Phase 1's token preview — every semantic state the
 * new Precision Workshop foundation defines, in both themes, demonstrated
 * through Tailwind utilities, Astryx primitives, and Motion side by side so
 * a reviewer can confirm they're the same tokens, not three parallel
 * systems. Not a product surface; not a Phase 3 component library.
 *
 * Same isolation convention as the sibling `/internal/astryx-preview`:
 * unlinked from AppSidebar, gated to OWNER because this isn't a business
 * action and doesn't belong in lib/permissions.ts's capability matrix.
 */
export default async function DesignSystemPage() {
  const { role } = await requireCompanyContext();
  if (role !== "OWNER") {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ink-primary">Design system — Precision Workshop</h1>
        <p className="mt-2 max-w-[70ch] text-sm text-ink-secondary">
          Internal only. The Premium UI Redesign Phase 1 token preview — see{" "}
          <code>docs/DESIGN.md</code> for the written reference this page demonstrates.
        </p>
        <p className="mt-2 text-sm text-ink-secondary">
          Looking for the shared component library instead? See the Phase 3{" "}
          <Link href="/internal/design-system/primitives" className="text-instrument-fg underline underline-offset-2">
            operational primitives lab
          </Link>
          .
        </p>
      </div>
      <DesignSystemClient />
    </div>
  );
}
