"use client";

import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";

/**
 * A few Astryx primitives at default settings, themed through
 * lib/astryx/theme.ts. What to look for: no drop shadow anywhere (including
 * on the dialog — DESIGN.md's no-shadow doctrine), the ink-primary/ground
 * inversion on the primary button (not cyan), the system sans stack, and
 * correct colors in both light and dark via the dashboard's ThemeToggle.
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
          subtitle="This surface should have no drop shadow."
          onOpenChange={setIsDialogOpen}
        />
        <div className="p-4 text-sm text-ink-secondary">
          If this panel is floating with a visible shadow, the shadow-token override in
          lib/astryx/theme.ts isn&apos;t reaching this component.
        </div>
      </Dialog>
    </div>
  );
}
