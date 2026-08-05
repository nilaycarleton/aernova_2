import { QuickJobSheet } from "@/components/dashboard/quick-job-sheet";

/**
 * The form for a phone held in one hand.
 *
 * Narrow rather than responsive-wide: this page is the same on a desktop as it
 * is on a phone, because the thing that makes it fast is that it asks for three
 * things, and a wider screen is not a reason to ask for more.
 */
export default function QuickJobPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-primary">Quick job</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Who it&rsquo;s for, what the work is, what you told them it costs. Everything else can
          wait until you&rsquo;re back in the truck.
        </p>
      </div>

      <QuickJobSheet />
    </div>
  );
}
