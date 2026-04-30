"use client";

type ReportVm = {
  cover: {
    title: string;
    subtitle: string;
    projectName: string;
    clientName: string;
    address: string;
    captureSource: string;
    status: string;
  };
  measurementsSummary: {
    totalAreaDisplay: string;
    predominantPitch: string;
    totalFacets: number | null;
    ridgesHipsFt: number;
    valleysFt: number;
    rakesFt: number;
    eavesFt: number;
    dripEdgeFt: number;
    wasteDisplay: string;
  };
  pricingSummary: {
    totalAmount: number | null;
    materialCost: number | null;
    laborCost: number | null;
    accessoryCost: number | null;
    disposalCost: number | null;
    suggestedSquares: number | null;
    shingleBundles: number | null;
  };
  sections: Array<{
    id: string;
    label: string;
    pitchRatio: string | null;
    surfaceAreaSqft: number | null;
    ridgeLengthFt: number | null;
    hipLengthFt: number | null;
    valleyLengthFt: number | null;
    eaveLengthFt: number | null;
    rakeLengthFt: number | null;
  }>;
  issues: Array<{
    id: string;
    title: string;
    description: string | null;
    severity: string;
    locationLabel: string | null;
  }>;
  reportSections: Array<{
    title: string;
    body: string;
  }>;
};

function money(value: number | null) {
  if (value === null || value === undefined) return "—";
  return `$${value.toLocaleString()}`;
}

export function PrintReport({ report }: { report: ReportVm }) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 bg-white p-8 text-slate-900 shadow print:max-w-none print:space-y-6 print:p-0 print:shadow-none">
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 12mm;
          }

          html, body {
            background: white !important;
          }

          .print-hide {
            display: none !important;
          }
        }
      `}</style>

      <div className="print-hide flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-slate-900">
          Printable Report Preview
        </h1>
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Print / Save as PDF
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              Aernova
            </div>
            <h1 className="mt-3 text-4xl font-semibold text-slate-900">
              {report.cover.title}
            </h1>
            <p className="mt-2 text-lg text-slate-600">
              {report.cover.subtitle}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm">
            <div><span className="font-semibold">Project:</span> {report.cover.projectName}</div>
            <div className="mt-2"><span className="font-semibold">Client:</span> {report.cover.clientName}</div>
            <div className="mt-2"><span className="font-semibold">Address:</span> {report.cover.address}</div>
            <div className="mt-2"><span className="font-semibold">Capture Source:</span> {report.cover.captureSource}</div>
            <div className="mt-2"><span className="font-semibold">Status:</span> {report.cover.status.replaceAll("_", " ")}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Total Roof Area</div>
          <div className="mt-2 text-2xl font-semibold">{report.measurementsSummary.totalAreaDisplay}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Predominant Pitch</div>
          <div className="mt-2 text-2xl font-semibold">{report.measurementsSummary.predominantPitch}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Ridges + Hips</div>
          <div className="mt-2 text-2xl font-semibold">{report.measurementsSummary.ridgesHipsFt.toLocaleString()} ft</div>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Suggested Waste</div>
          <div className="mt-2 text-2xl font-semibold">{report.measurementsSummary.wasteDisplay}</div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 p-6">
        <h2 className="text-2xl font-semibold">Measurement Summary</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">Valleys: {report.measurementsSummary.valleysFt.toLocaleString()} ft</div>
          <div className="rounded-2xl bg-slate-50 p-4">Rakes: {report.measurementsSummary.rakesFt.toLocaleString()} ft</div>
          <div className="rounded-2xl bg-slate-50 p-4">Eaves / Starter: {report.measurementsSummary.eavesFt.toLocaleString()} ft</div>
          <div className="rounded-2xl bg-slate-50 p-4">Drip Edge: {report.measurementsSummary.dripEdgeFt.toLocaleString()} ft</div>
          <div className="rounded-2xl bg-slate-50 p-4">Total Facets: {report.measurementsSummary.totalFacets ?? "—"}</div>
          <div className="rounded-2xl bg-slate-50 p-4">Report Type: Roofing Measurement Summary</div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 p-6">
        <h2 className="text-2xl font-semibold">Pricing & Material Summary</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">Estimated Total: {money(report.pricingSummary.totalAmount)}</div>
          <div className="rounded-2xl bg-slate-50 p-4">Material Cost: {money(report.pricingSummary.materialCost)}</div>
          <div className="rounded-2xl bg-slate-50 p-4">Labor Cost: {money(report.pricingSummary.laborCost)}</div>
          <div className="rounded-2xl bg-slate-50 p-4">Accessory Cost: {money(report.pricingSummary.accessoryCost)}</div>
          <div className="rounded-2xl bg-slate-50 p-4">Disposal Cost: {money(report.pricingSummary.disposalCost)}</div>
          <div className="rounded-2xl bg-slate-50 p-4">
            Suggested Squares: {report.pricingSummary.suggestedSquares ?? "—"}
            <br />
            Estimated Bundles: {report.pricingSummary.shingleBundles ?? "—"}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 p-6">
        <h2 className="text-2xl font-semibold">Roof Sections</h2>
        {report.sections.length === 0 ? (
          <p className="mt-4 text-slate-600">No roof section data available.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-3 py-3">Section</th>
                  <th className="px-3 py-3">Pitch</th>
                  <th className="px-3 py-3">Area</th>
                  <th className="px-3 py-3">Ridge</th>
                  <th className="px-3 py-3">Hip</th>
                  <th className="px-3 py-3">Valley</th>
                  <th className="px-3 py-3">Eave</th>
                  <th className="px-3 py-3">Rake</th>
                </tr>
              </thead>
              <tbody>
                {report.sections.map((section) => (
                  <tr key={section.id} className="border-b border-slate-100">
                    <td className="px-3 py-3">{section.label}</td>
                    <td className="px-3 py-3">{section.pitchRatio ?? "—"}</td>
                    <td className="px-3 py-3">{section.surfaceAreaSqft ?? "—"}</td>
                    <td className="px-3 py-3">{section.ridgeLengthFt ?? "—"}</td>
                    <td className="px-3 py-3">{section.hipLengthFt ?? "—"}</td>
                    <td className="px-3 py-3">{section.valleyLengthFt ?? "—"}</td>
                    <td className="px-3 py-3">{section.eaveLengthFt ?? "—"}</td>
                    <td className="px-3 py-3">{section.rakeLengthFt ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 p-6">
        <h2 className="text-2xl font-semibold">Report Narrative</h2>
        {report.reportSections.map((section) => (
          <div key={section.title} className="rounded-2xl bg-slate-50 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
              {section.title}
            </h3>
            <p className="mt-3 leading-7 text-slate-700">{section.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 p-6">
        <h2 className="text-2xl font-semibold">Inspection Issues</h2>
        {report.issues.length === 0 ? (
          <p className="mt-4 text-slate-600">No inspection issues recorded.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {report.issues.map((issue) => (
              <div key={issue.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="font-semibold">{issue.title}</div>
                <div className="mt-1 text-sm text-slate-600">
                  Severity: {issue.severity}
                  {issue.locationLabel ? ` · Location: ${issue.locationLabel}` : ""}
                </div>
                {issue.description ? (
                  <p className="mt-2 text-sm leading-6 text-slate-700">{issue.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 p-6 text-sm text-slate-600">
        <h2 className="text-lg font-semibold text-slate-900">Notes & Disclaimer</h2>
        <p className="mt-3 leading-7">
          This report is intended to support roofing estimation, proposal drafting, and project planning.
          Measurements, waste recommendations, material quantities, and pricing should be field-verified before
          final ordering or installation. Site conditions, crew methods, decking condition, accessory selection,
          and local code requirements may change final scope and totals.
        </p>
      </section>
    </div>
  );
}