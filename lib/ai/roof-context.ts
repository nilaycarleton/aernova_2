import { prisma } from "@/lib/prisma";
import type { LineItem, CostTotals } from "@/lib/report-generator";
import { formatMoney } from "@/lib/money";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, jobIdentityInclude } from "@/lib/job-identity";

type ParsedScope = {
  summary?: Record<string, unknown>;
  lineItems?: LineItem[];
  totals?: CostTotals;
};

/**
 * Build a deterministic, plain-text snapshot of one job's roof: sections
 * (facets), roofing quantities, inspection issues, and the latest estimate.
 *
 * This string is used as the prompt-cached prefix for every AI feature on the
 * job (chat, quote explanation, scope writer, …). Determinism is load-
 * bearing: prompt caching is a byte-exact prefix match, so any nondeterministic
 * ordering (unsorted rows, timestamps) would silently miss the cache and pay
 * full input price on every call. All queries below sort explicitly and nothing
 * volatile (createdAt, ids) is emitted.
 */
export async function buildRoofContext(jobId: string): Promise<string> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      sections: { orderBy: { label: "asc" } },
      measurements: { orderBy: [{ type: "asc" }, { label: "asc" }] },
      issues: { orderBy: [{ severity: "asc" }, { title: "asc" }] },
      quotes: { orderBy: { createdAt: "desc" }, take: 1 },
      ...jobIdentityInclude,
    },
  });
  if (!job) throw new Error("Job not found");

  const out: string[] = [];
  out.push(`# Job: ${job.name}`);
  out.push(`Client: ${jobClient(job).name}`);
  const address = formatAddress(jobAddress(job));
  if (address) out.push(`Address: ${address}`);
  out.push(`Status: ${job.status}`);

  if (job.sections.length) {
    out.push("", "## Roof sections (facets)");
    for (const s of job.sections) {
      const parts = [
        s.pitchRatio ? `pitch ${s.pitchRatio}` : null,
        s.surfaceAreaSqft != null ? `surface ${s.surfaceAreaSqft} ft²` : null,
        s.projectedAreaSqft != null ? `footprint ${s.projectedAreaSqft} ft²` : null,
        s.ridgeLengthFt ? `ridge ${s.ridgeLengthFt} ft` : null,
        s.hipLengthFt ? `hip ${s.hipLengthFt} ft` : null,
        s.valleyLengthFt ? `valley ${s.valleyLengthFt} ft` : null,
        s.eaveLengthFt ? `eave ${s.eaveLengthFt} ft` : null,
        s.rakeLengthFt ? `rake ${s.rakeLengthFt} ft` : null,
      ]
        .filter(Boolean)
        .join(", ");
      out.push(`- ${s.label}: ${parts || "no geometry recorded"}`);
    }
  }

  if (job.measurements.length) {
    out.push("", "## Roofing quantities");
    for (const m of job.measurements) {
      out.push(`- ${m.type}: ${m.displayValue || `${m.value} ${m.unit}`}`);
    }
  }

  if (job.issues.length) {
    out.push("", "## Inspection issues");
    for (const i of job.issues) {
      out.push(`- [${i.severity}] ${i.title}${i.description ? ` — ${i.description}` : ""}`);
    }
  }

  const quote = job.quotes[0];
  if (quote) {
    out.push("", `## Latest estimate: "${quote.title}" (${quote.status})`);
    if (quote.totalAmountCents != null) out.push(`Total: ${formatMoney(quote.totalAmountCents)}`);

    let scope: ParsedScope | null = null;
    try {
      scope = quote.scopeOfWork ? (JSON.parse(quote.scopeOfWork) as ParsedScope) : null;
    } catch {
      scope = null;
    }

    if (scope?.summary) {
      const s = scope.summary;
      const keys = [
        "roofSquares",
        "wasteFactorPercent",
        "suggestedSquares",
        "shingleBundles",
        "predominantPitch",
        "complexity",
        "ridgeOrHipFt",
        "valleyFt",
        "rakeFt",
        "starterEaveFt",
        "dripEdgeFt",
      ];
      const parts = keys.filter((k) => s[k] != null).map((k) => `${k}=${s[k]}`);
      if (parts.length) out.push(`Summary: ${parts.join(", ")}`);
    }

    if (scope?.lineItems?.length) {
      out.push("Line items:");
      for (const li of scope.lineItems) {
        out.push(
          `- ${li.description}: ${li.quantity} ${li.unit} @ $${li.unitCost} = $${li.amount.toLocaleString()}`
        );
      }
    }

    if (scope?.totals) {
      const t = scope.totals;
      out.push(
        `Totals: materials $${t.materials}, labor $${t.labor}, accessories $${t.accessories}, ` +
          `disposal $${t.disposal}, subtotal $${t.subtotal}, markup ${t.markupPercent}% ($${t.markupAmount}), ` +
          `tax ${t.taxPercent}% ($${t.taxAmount}), total $${t.total}`
      );
    }
  }

  return out.join("\n");
}

// System instructions for the job assistant. Stable across every question
// in a job, so it sits with the roof context inside the cached prefix.
export const ROOF_ASSISTANT_SYSTEM = `You are Aernova's roofing assistant, helping a professional roofer understand and explain a specific roof job.

Ground every answer in the PROJECT DATA provided — cite the actual numbers (areas, pitches, lengths, quantities, line-item costs). When explaining a quote, put it in plain language: how roof area and pitch drive the material squares, why a waste factor is added, and why ridge / hip / valley / eave and accessory quantities matter to the price. If the data doesn't contain something the roofer asks about, say so plainly instead of inventing numbers. Default to a concise, practical tone for a roofer; when asked to write for a homeowner or an insurer, adopt that voice.`;
