import { PrototypeClient } from "./prototype-client";

/**
 * Phase 0 interactive prototype (Step 10). Server shell only — gating already
 * happens in app/(prototype)/phase-0/layout.tsx (OWNER-only, matching the
 * existing astryx-preview convention). All interaction lives in the client
 * component; this file exists so the route boundary stays a Server Component,
 * consistent with the redesign plan's own "keep client boundaries narrow"
 * principle (docs/AERNOVA_DESIGN_REFERENCE.md §11.2) even inside a throwaway
 * prototype.
 */
export default function PrototypePage() {
  return <PrototypeClient />;
}
