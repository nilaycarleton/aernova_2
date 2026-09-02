import { IBM_Plex_Sans, Source_Sans_3, Geist } from "next/font/google";
import { JOBS, money } from "../_fixtures";

/**
 * Typography comparison fixture (Phase 0, Step 8). Self-hosted via
 * next/font/google — no separate npm dependency, no runtime request, and
 * scoped to this route only via CSS variables applied to each column's own
 * wrapper, never globals.css. Only the winning candidate becomes a real
 * production font, during Phase 1's foundation work — see
 * docs/phase-0/02-typography-comparison.md for the recommendation.
 */
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex",
  display: "swap",
});

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-sans",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-geist",
  display: "swap",
});

const CANDIDATES = [
  {
    id: "system",
    name: "System UI stack (current)",
    className: "",
    style: undefined,
    note: "-apple-system, Segoe UI, Roboto, Helvetica, Arial — zero webfont, current production choice.",
  },
  {
    id: "plex",
    name: "IBM Plex Sans Variable",
    className: ibmPlexSans.variable,
    style: { fontFamily: "var(--font-ibm-plex)" },
    note: "Designed for UI; industrial/technical character. Leading hypothesis per the redesign plan — being validated here, not preselected.",
  },
  {
    id: "source",
    name: "Source Sans 3 Variable",
    className: sourceSans3.variable,
    style: { fontFamily: "var(--font-source-sans)" },
    note: "Purpose-built UI family, neutral tone, clear at small sizes.",
  },
  {
    id: "geist",
    name: "Geist Sans",
    className: geist.variable,
    style: { fontFamily: "var(--font-geist)" },
    note: "Contemporary geometry, variable delivery, first-class next/font path.",
  },
];

function Fixture() {
  const job = JOBS[0];
  const longAddress = "Dunmore Property Group — Unit 4B, 88 Merivale Road Extension, Nepean, ON K2H 9G3";
  return (
    <div className="space-y-5" style={{ fontVariantNumeric: "tabular-nums" }}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Dashboard action center
        </p>
        <p className="mt-1 text-sm font-semibold text-ink-primary">
          Quote hasn&rsquo;t been opened in 6 days
        </p>
        <p className="text-sm text-ink-secondary">Vellani Holdings &middot; {money(1284000)}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-hairline">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-ink-muted">
              <th className="px-3 py-2 font-medium">Client</th>
              <th className="px-3 py-2 font-medium">Address</th>
              <th className="px-3 py-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-hairline">
              <td className="px-3 py-2 text-ink-primary">{job.client}</td>
              <td className="max-w-[220px] truncate px-3 py-2 text-ink-secondary" title={longAddress}>
                {longAddress}
              </td>
              <td className="px-3 py-2 text-right text-ink-primary">{money(4650000)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-ink-primary">Fenwick &amp; Sons Hardware</td>
              <td className="px-3 py-2 text-ink-secondary">1200 Industrial Parkway, Ottawa, ON</td>
              <td className="px-3 py-2 text-right text-ink-primary">{money(218000)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-ink-muted">Roof area</p>
          <p className="font-medium text-ink-primary">28,406 sq&nbsp;ft</p>
        </div>
        <div>
          <p className="text-ink-muted">Pitch</p>
          <p className="font-medium text-ink-primary">6/12 (26.6&deg;)</p>
        </div>
        <div>
          <p className="text-ink-muted">Waste factor</p>
          <p className="font-medium text-ink-primary">12.5%</p>
        </div>
        <div>
          <p className="text-ink-muted">Scheduled</p>
          <p className="font-medium text-ink-primary">Thu, Aug 14 &middot; 8:00 AM</p>
        </div>
      </div>

      <form className="space-y-3 rounded-lg border border-hairline p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-primary" htmlFor={`note-${job.id}`}>
            Additional work note
          </label>
          <textarea
            id={`note-${job.id}`}
            className="w-full rounded-md border border-hairline bg-surface-raised px-3 py-2 text-sm text-ink-primary"
            rows={2}
            defaultValue="Homeowner requested an additional downspout on the north elevation."
          />
          <p className="mt-1 text-xs text-ink-muted">32 more characters required</p>
        </div>
        <button
          type="button"
          className="rounded-md bg-action px-3 py-1.5 text-sm font-medium text-on-action"
        >
          Send for review
        </button>
      </form>

      <div className="rounded-lg border border-hairline bg-surface-raised p-3 text-sm">
        <p className="text-ink-muted">Mobile crew task</p>
        <p className="mt-1 font-medium text-ink-primary">
          Quality walkthrough — 24 Sugarbush Way, Manotick, ON
        </p>
        <p className="text-ink-secondary">3:30 PM &middot; Not Started</p>
      </div>
    </div>
  );
}

export default function TypographyComparisonPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1400px] px-4 py-8 outline-none md:px-6">
      <header className="mb-8 max-w-[70ch]">
        <h1 className="text-xl font-semibold text-ink-primary">Typography comparison</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Same real Aernova-shaped content — long client/address strings, money, measurements, form
          copy with a validation hint, a mobile crew task — rendered in each candidate. Use your
          browser&rsquo;s zoom (200%) and the app theme toggle to check both themes; this page inherits
          the real token system from <code>app/globals.css</code>, only the font family changes per
          column.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-4">
        {CANDIDATES.map((candidate) => (
          <section
            key={candidate.id}
            className={`${candidate.className} rounded-lg border border-hairline p-4`}
            style={candidate.style}
          >
            <h2 className="text-sm font-semibold text-ink-primary">{candidate.name}</h2>
            <p className="mt-1 text-xs text-ink-muted">{candidate.note}</p>
            <div className="mt-4">
              <Fixture />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
