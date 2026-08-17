import type { JobGap } from "@/lib/job-validation";

/**
 * What this job is still missing, on the job.
 *
 * The counterweight to Phase 2's front door. Once a job can be created from a
 * name alone, the form has stopped being the place that asks for an address, an
 * email, a price — so the record has to be, or those things quietly never get
 * added. Jobber solves the same problem by refusing to save the job at all
 * ("Property is required"); we deliberately don't, which is exactly why this
 * panel has to exist.
 *
 * Three rules it follows:
 *
 * **It appears only when there is something to say.** A permanent panel reading
 * "nothing missing" is furniture, and furniture is what a contractor learns to
 * stop seeing. When the job is complete this renders nothing.
 *
 * **It is a list, not an alarm.** Amber is the system's one warm note and means
 * *attention* — but an unnamed address on a two-minute-old job is not something
 * gone wrong, it is work not done yet. So this reads in ordinary ink on the
 * ordinary panel, and saves amber for when something actually needs looking at.
 *
 * **Each line says what it costs.** "An address" alone is a nag. "An address —
 * nobody can be sent to this job" is a reason, and a reason is what makes
 * someone go and find one.
 */
export function JobGapsPanel({ gaps }: { gaps: JobGap[] }) {
  if (gaps.length === 0) return null;

  return (
    <section
      aria-labelledby="job-gaps-heading"
      className="rounded-lg border border-hairline bg-ground/50 p-5"
    >
      <h3 id="job-gaps-heading" className="text-sm font-semibold text-ink-primary">
        Still to add
      </h3>
      <p className="mt-1 text-xs text-ink-muted">
        None of this stops you saving the job. It&rsquo;s what the job can&rsquo;t do yet.
      </p>

      <ul className="mt-4 space-y-3">
        {gaps.map((gap) => (
          <li key={gap.id}>
            <p className="text-sm font-medium text-ink-secondary">{gap.need}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{gap.because}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
