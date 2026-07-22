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
  pitchBreakdown: Array<{
    pitch: string;
    area: number;
    percent: number;
  }>;
  wasteRecommendation: {
    measuredSquares: number;
    suggestedSquares: number;
    recommendedWaste: number;
    measuredWaste: number | null;
    complexity: string;
    complexityScore: number;
    laborMultiplier: number;
    areaSource: string;
    totalAreaSqft: number;
    totalLineLengthFt: number;
    valleyHipFt: number;
    reasons: string[];
  };
  issues: Array<{
    id: string;
    title: string;
    description: string | null;
    severity: string;
    locationLabel: string | null;
  }>;
  photos: Array<{
    id: string;
    url: string;
    fileName: string | null;
    locationTag: string | null;
    caption: string | null;
    roofIssueId: string | null;
    annotationsJson: unknown;
  }>;
  imagery: Array<{
    id: string;
    type: string;
    status: string;
    url: string;
    fileName: string | null;
    altitudeFt: number | null;
    notes: string | null;
    extractedJson: unknown;
  }>;
  comparisons: Array<{
    id: string;
    beforeUrl: string | null;
    afterUrl: string | null;
    title: string;
    summary: string | null;
    differencesJson: unknown;
  }>;
  reportSections: Array<{
    title: string;
    body: string;
  }>;
  lineItems: Array<{ description: string; quantity: number; unit: string; unitCost: number; amount: number }>;
  totals: {
    subtotal: number;
    markupPercent: number;
    markupAmount: number;
    taxPercent: number;
    taxAmount: number;
    total: number;
  } | null;
};

function money(value: number | null) {
  if (value === null || value === undefined) return "—";
  return `$${value.toLocaleString()}`;
}

function parseAnnotations(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
}

function parseTextList(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export function PrintReport({ report }: { report: ReportVm }) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 bg-paper-document p-8 text-paper-ink shadow print:max-w-none print:space-y-6 print:p-0 print:shadow-none">
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

      <div className="print-hide flex items-center justify-between rounded-2xl border border-paper-rule bg-paper-document p-6">
        <h1 className="text-lg font-semibold text-paper-ink">
          Printable Report Preview
        </h1>
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Print / Save as PDF
        </button>
      </div>

      <section className="rounded-3xl border border-paper-rule p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-paper-ink-faint">
              Aernova
            </div>
            <h1 className="mt-3 text-4xl font-semibold text-paper-ink">
              {report.cover.title}
            </h1>
            <p className="mt-2 text-lg text-paper-ink-muted">
              {report.cover.subtitle}
            </p>
          </div>

          <div className="rounded-2xl border border-paper-rule bg-paper-inset p-5 text-sm">
            <div><span className="font-semibold">Project:</span> {report.cover.projectName}</div>
            <div className="mt-2"><span className="font-semibold">Client:</span> {report.cover.clientName}</div>
            <div className="mt-2"><span className="font-semibold">Address:</span> {report.cover.address}</div>
            <div className="mt-2"><span className="font-semibold">Capture Source:</span> {report.cover.captureSource}</div>
            <div className="mt-2"><span className="font-semibold">Status:</span> {report.cover.status.replaceAll("_", " ")}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-paper-rule p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-paper-ink-faint">Total Roof Area</div>
          <div className="mt-2 text-2xl font-semibold">{report.measurementsSummary.totalAreaDisplay}</div>
        </div>
        <div className="rounded-2xl border border-paper-rule p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-paper-ink-faint">Predominant Pitch</div>
          <div className="mt-2 text-2xl font-semibold">{report.measurementsSummary.predominantPitch}</div>
        </div>
        <div className="rounded-2xl border border-paper-rule p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-paper-ink-faint">Ridges + Hips</div>
          <div className="mt-2 text-2xl font-semibold">{report.measurementsSummary.ridgesHipsFt.toLocaleString()} ft</div>
        </div>
        <div className="rounded-2xl border border-paper-rule p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-paper-ink-faint">Suggested Waste</div>
          <div className="mt-2 text-2xl font-semibold">{report.measurementsSummary.wasteDisplay}</div>
        </div>
      </section>

      <section className="rounded-3xl border border-paper-rule p-6">
        <h2 className="text-2xl font-semibold">Measurement Summary</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl bg-paper-inset p-4">Valleys: {report.measurementsSummary.valleysFt.toLocaleString()} ft</div>
          <div className="rounded-2xl bg-paper-inset p-4">Rakes: {report.measurementsSummary.rakesFt.toLocaleString()} ft</div>
          <div className="rounded-2xl bg-paper-inset p-4">Eaves / Starter: {report.measurementsSummary.eavesFt.toLocaleString()} ft</div>
          <div className="rounded-2xl bg-paper-inset p-4">Drip Edge: {report.measurementsSummary.dripEdgeFt.toLocaleString()} ft</div>
          <div className="rounded-2xl bg-paper-inset p-4">Roof faces: {report.measurementsSummary.totalFacets ?? "—"}</div>
          <div className="rounded-2xl bg-paper-inset p-4">Report type: Roof measurement summary</div>
        </div>
      </section>

      <section className="rounded-3xl border border-paper-rule p-6">
        <h2 className="text-2xl font-semibold">Areas by Pitch & Waste Guidance</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-paper-inset p-4">
            <div className="text-sm font-semibold text-paper-ink-body">Pitch breakdown</div>
            <div className="mt-3 space-y-2">
              {report.pitchBreakdown.length === 0 ? (
                <p className="text-sm text-paper-ink-muted">No pitch-grouped facet data available.</p>
              ) : (
                report.pitchBreakdown.map((row) => (
                  <div key={row.pitch} className="flex items-center justify-between gap-4 text-sm">
                    <span>{row.pitch}</span>
                    <span>{row.area.toLocaleString()} sq ft · {row.percent}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-paper-inset p-4">
            <div className="text-sm font-semibold text-paper-ink-body">Waste recommendation</div>
            <p className="mt-3 text-sm leading-6 text-paper-ink-body">
              Complexity: {report.wasteRecommendation.complexity}. Measured squares:{" "}
              {report.wasteRecommendation.measuredSquares.toFixed(2)}. Suggested squares:{" "}
              {report.wasteRecommendation.suggestedSquares.toFixed(2)}. Recommended waste:{" "}
              {report.wasteRecommendation.recommendedWaste}% based on{" "}
              {report.wasteRecommendation.reasons.join(", ")}. Score:{" "}
              {report.wasteRecommendation.complexityScore}/100. Labor factor:{" "}
              {report.wasteRecommendation.laborMultiplier.toFixed(2)}x. Area source:{" "}
              {report.wasteRecommendation.areaSource}.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-paper-rule p-6">
        <h2 className="text-2xl font-semibold">Pricing & Material Summary</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl bg-paper-inset p-4">Estimated Total: {money(report.pricingSummary.totalAmount)}</div>
          <div className="rounded-2xl bg-paper-inset p-4">Material Cost: {money(report.pricingSummary.materialCost)}</div>
          <div className="rounded-2xl bg-paper-inset p-4">Labor Cost: {money(report.pricingSummary.laborCost)}</div>
          <div className="rounded-2xl bg-paper-inset p-4">Accessory Cost: {money(report.pricingSummary.accessoryCost)}</div>
          <div className="rounded-2xl bg-paper-inset p-4">Disposal Cost: {money(report.pricingSummary.disposalCost)}</div>
          <div className="rounded-2xl bg-paper-inset p-4">
            Suggested Squares: {typeof report.pricingSummary.suggestedSquares === "number"
              ? report.pricingSummary.suggestedSquares.toLocaleString(undefined, { maximumFractionDigits: 1 })
              : "—"}
            <br />
            Estimated Bundles: {report.pricingSummary.shingleBundles ?? "—"}
          </div>
        </div>

        {report.lineItems.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Itemized estimate</h3>
            <table className="mt-3 min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-paper-rule text-left text-paper-ink-faint">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Unit price</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {report.lineItems.map((li, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-3 py-2">{li.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{li.quantity.toLocaleString()} {li.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums">${li.unitCost.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">${li.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.totals && (
              <div className="mt-3 ml-auto w-full max-w-xs space-y-1 text-sm tabular-nums">
                <div className="flex justify-between text-paper-ink-muted"><span>Subtotal</span><span>${report.totals.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-paper-ink-muted"><span>Overhead &amp; profit ({report.totals.markupPercent}%)</span><span>${report.totals.markupAmount.toLocaleString()}</span></div>
                <div className="flex justify-between text-paper-ink-muted"><span>Tax ({report.totals.taxPercent}%)</span><span>${report.totals.taxAmount.toLocaleString()}</span></div>
                <div className="flex justify-between border-t border-slate-300 pt-1.5 text-base font-bold"><span>Total</span><span>${report.totals.total.toLocaleString()}</span></div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-paper-rule p-6">
        <h2 className="text-2xl font-semibold">Roof Sections</h2>
        {report.sections.length === 0 ? (
          <p className="mt-4 text-paper-ink-muted">No roof section data available.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-paper-rule text-left text-paper-ink-faint">
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

      <section className="space-y-4 rounded-3xl border border-paper-rule p-6">
        <h2 className="text-2xl font-semibold">Summary</h2>
        {report.reportSections.map((section) => (
          <div key={section.title} className="rounded-2xl bg-paper-inset p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-paper-ink-muted">
              {section.title}
            </h3>
            <p className="mt-3 leading-7 text-paper-ink-body">{section.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-paper-rule p-6">
        <h2 className="text-2xl font-semibold">Inspection Issues</h2>
        {report.issues.length === 0 ? (
          <p className="mt-4 text-paper-ink-muted">No inspection issues recorded.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {report.issues.map((issue) => (
              <div key={issue.id} className="rounded-2xl bg-paper-inset p-4">
                <div className="font-semibold">{issue.title}</div>
                <div className="mt-1 text-sm text-paper-ink-muted">
                  Severity: {issue.severity}
                  {issue.locationLabel ? ` · Location: ${issue.locationLabel}` : ""}
                </div>
                {issue.description ? (
                  <p className="mt-2 text-sm leading-6 text-paper-ink-body">{issue.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-paper-rule p-6">
        <h2 className="text-2xl font-semibold">Photo Evidence</h2>
        {report.photos.length === 0 ? (
          <p className="mt-4 text-paper-ink-muted">No photo evidence uploaded.</p>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {report.photos.map((photo) => {
              const annotations = parseAnnotations(photo.annotationsJson);
              return (
                <div key={photo.id} className="break-inside-avoid rounded-2xl border border-paper-rule p-4">
                  <div className="relative overflow-hidden rounded-xl border border-paper-rule bg-paper">
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.locationTag || photo.fileName || "Roof inspection photo"}
                      className="block aspect-video w-full object-cover"
                    />
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {annotations.map((annotation) => {
                        const id = String(annotation.id ?? Math.random());
                        const tool = String(annotation.tool ?? "");
                        const label = String(annotation.label ?? "");

                        if (tool === "circle") {
                          const x = Number(annotation.x ?? 0);
                          const y = Number(annotation.y ?? 0);
                          const r = Number(annotation.r ?? 7);
                          return (
                            <g key={id}>
                              <circle cx={x} cy={y} r={r} fill="rgba(249,115,22,0.18)" stroke="#EA580C" strokeWidth="0.8" />
                              <text x={x + r + 1} y={y} fill="#9A3412" fontSize="3" dominantBaseline="middle">
                                {label}
                              </text>
                            </g>
                          );
                        }

                        if (tool === "arrow") {
                          return (
                            <g key={id}>
                              <line
                                x1={Number(annotation.x1 ?? 0)}
                                y1={Number(annotation.y1 ?? 0)}
                                x2={Number(annotation.x2 ?? 0)}
                                y2={Number(annotation.y2 ?? 0)}
                                stroke="#B45309"
                                strokeWidth="0.9"
                              />
                              <text x={Number(annotation.x1 ?? 0)} y={Number(annotation.y1 ?? 0) - 2} fill="#92400E" fontSize="3">
                                {label}
                              </text>
                            </g>
                          );
                        }

                        if (tool === "label") {
                          const x = Number(annotation.x ?? 0);
                          const y = Number(annotation.y ?? 0);
                          return (
                            <g key={id}>
                              <rect x={x} y={y - 4} width={Math.max(label.length * 1.9, 12)} height="6" rx="1.5" fill="rgba(15,23,42,0.86)" />
                              <text x={x + 1.5} y={y} fill="#BFDBFE" fontSize="3.1" dominantBaseline="middle">
                                {label}
                              </text>
                            </g>
                          );
                        }

                        return null;
                      })}
                    </svg>
                  </div>
                  <div className="mt-3 text-sm text-paper-ink-body">
                    <div className="font-semibold text-paper-ink">
                      {photo.locationTag ?? photo.fileName ?? "Inspection photo"}
                    </div>
                    {photo.caption ? <p className="mt-1 leading-6">{photo.caption}</p> : null}
                    <p className="mt-2 text-paper-ink-faint">
                      {annotations.length} annotation{annotations.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-paper-rule p-6">
        <h2 className="text-2xl font-semibold">Drone scan</h2>
        <div className="mt-5 rounded-2xl bg-paper-inset p-4">
          <div className="text-sm font-semibold text-paper-ink-body">Photos &amp; 3D model</div>
          {report.imagery.length === 0 ? (
            <p className="mt-3 text-sm text-paper-ink-muted">No drone imagery uploaded.</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm text-paper-ink-body">
              {report.imagery.slice(0, 4).map((item) => (
                <div key={item.id} className="flex gap-3 border-b border-paper-rule pb-3 last:border-0 last:pb-0">
                  <img
                    src={item.url}
                    alt={item.fileName ?? "Drone photo of the roof"}
                    className="h-16 w-20 rounded-lg object-cover"
                  />
                  <div>
                    <div className="font-semibold text-paper-ink">{item.fileName ?? item.type}</div>
                    <div>{item.type} · {item.status.replaceAll("_", " ")} · {item.altitudeFt ? `${item.altitudeFt} ft` : "No altitude"}</div>
                    {item.notes ? <div className="mt-1 text-paper-ink-muted">{item.notes}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-paper-rule p-6">
        <h2 className="text-2xl font-semibold">Before / After Comparisons</h2>
        {report.comparisons.length === 0 ? (
          <p className="mt-4 text-paper-ink-muted">No comparison sheets created.</p>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {report.comparisons.map((comparison) => (
              <div key={comparison.id} className="break-inside-avoid rounded-2xl border border-paper-rule p-4">
                <h3 className="font-semibold text-paper-ink">{comparison.title}</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-[0.16em] text-paper-ink-faint">Before</div>
                    <div className="aspect-video overflow-hidden rounded-xl bg-paper">
                      {comparison.beforeUrl ? <img src={comparison.beforeUrl} alt={`Before: ${comparison.title}`} className="h-full w-full object-cover" /> : null}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-[0.16em] text-paper-ink-faint">After</div>
                    <div className="aspect-video overflow-hidden rounded-xl bg-paper">
                      {comparison.afterUrl ? <img src={comparison.afterUrl} alt={`After: ${comparison.title}`} className="h-full w-full object-cover" /> : null}
                    </div>
                  </div>
                </div>
                {comparison.summary ? <p className="mt-3 text-sm leading-6 text-paper-ink-body">{comparison.summary}</p> : null}
                <ul className="mt-3 space-y-1 text-sm text-paper-ink-muted">
                  {parseTextList(comparison.differencesJson).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-paper-rule p-6 text-sm text-paper-ink-muted">
        <h2 className="text-lg font-semibold text-paper-ink">Notes & Disclaimer</h2>
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
