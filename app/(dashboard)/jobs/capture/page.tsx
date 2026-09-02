import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { isAiConfigured } from "@/lib/ai/client";
import { CaptureSheet } from "@/components/dashboard/capture-sheet";

/**
 * Item 49. Same narrow, phone-sized shell as `/jobs/quick` — this is the
 * other door onto a fast job, a photo instead of three typed fields.
 *
 * Absent rather than broken without a key: same "no button for a capability
 * that doesn't exist yet" rule the calendar feed and quote-email panels
 * follow, just at the page level since there's nothing partial to offer.
 */
export default async function CapturePage() {
  await requireCapability("editJob");

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-primary">Draft from a photo</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Take a photo of what needs work. We draft a job name, a short description, and a
          price from your own catalog — you pick who it&rsquo;s for and review the rest before
          anything saves.
        </p>
      </div>

      {isAiConfigured() ? (
        <CaptureSheet />
      ) : (
        <p className="rounded-lg border border-hairline bg-surface-raised p-6 text-sm text-ink-muted">
          AI capture isn&rsquo;t set up in this environment yet.{" "}
          <Link href="/jobs/new" className="underline underline-offset-4 hover:text-ink-primary">
            Use the full form instead
          </Link>
          .
        </p>
      )}
    </div>
  );
}
