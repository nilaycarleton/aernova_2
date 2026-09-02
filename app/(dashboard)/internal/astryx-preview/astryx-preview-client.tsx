"use client";

import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";

/**
 * A few Astryx primitives at default settings, themed through
 * lib/astryx/theme.ts. What to look for: the ink-primary/ground inversion on
 * the primary button (not cyan), IBM Plex Sans, correct colors in both light
 * and dark via the dashboard's ThemeToggle, and — since Phase 1 — a small,
 * restrained shadow on the dialog specifically (the one sanctioned floating-
 * element exception to the no-shadow-on-page-surfaces doctrine; see
 * docs/DESIGN.md's Elevation section). No shadow should appear on the card
 * above it, which sits in normal page flow.
 *
 * For the full Phase 1 token system (colors, typography, spacing, radius,
 * motion, states, document tokens) see /internal/design-system instead —
 * this page stays narrowly scoped to "does the Astryx mapping itself work."
 */
export function AstryxPreviewClient() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Button label="Primary" variant="primary" />
          <Button label="Secondary" variant="secondary" />
          <Button label="Ghost" variant="ghost" />
          <Button label="Destructive" variant="destructive" />
          <Button label="Open dialog" variant="secondary" onClick={() => setIsDialogOpen(true)} />
        </div>
      </Card>

      <Dialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} purpose="info">
        <DialogHeader
          title="Theme check"
          subtitle="This floating surface should have a small, restrained shadow."
          onOpenChange={setIsDialogOpen}
        />
        <div className="p-4 text-sm text-ink-secondary">
          If this panel has no shadow at all, the shadow-token override in lib/astryx/theme.ts
          isn&apos;t reaching this component. The Card above it, which sits in normal page flow,
          should have no shadow — see docs/DESIGN.md&apos;s Elevation section for why the rule
          differs for floating content.
        </div>
      </Dialog>
    </div>
  );
}
