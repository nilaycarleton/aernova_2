/**
 * The deterministic half of item 49's capture flow, split out of
 * `capture.ts` so it can be tested without `@prisma/client` or a network
 * call in the loop — same reason `lib/quote/totals.ts` stays free of
 * `prisma` while the actions that call it don't.
 */
import { formatMoney, type Cents } from "../money.ts";
import { parseJsonObject } from "./json-response.ts";

export type ServiceForCapture = {
  id: string;
  name: string;
  unit: string;
  unitPriceCents: Cents;
};

export type CaptureDraft = {
  jobName: string;
  description: string;
  serviceId: string | null;
  suggestedPriceCents: Cents | null;
};

/**
 * Given whatever text the model returned, decide what to trust. The
 * hallucination guard is the whole point: a model can echo back a
 * `serviceId` that doesn't exist in this company's catalog, or a price that
 * isn't the catalog's own, and this is the one place that catches it before
 * either reaches a draft job.
 */
export function parseCaptureResponse(rawText: string, services: ServiceForCapture[]): CaptureDraft {
  const raw = parseJsonObject(rawText);
  if (!raw) throw new Error("Couldn't read the assistant's response.");

  const matched =
    typeof raw.serviceId === "string" ? services.find((s) => s.id === raw.serviceId) : undefined;

  return {
    jobName: typeof raw.jobName === "string" && raw.jobName.trim() ? raw.jobName.trim() : "New job",
    description: typeof raw.description === "string" ? raw.description.trim() : "",
    serviceId: matched?.id ?? null,
    // The service's own price, never whatever number the model echoed back.
    suggestedPriceCents: matched?.unitPriceCents ?? null,
  };
}

export function catalogContext(services: ServiceForCapture[]): string {
  if (!services.length) return "(This company has no catalog items yet.)";
  return services
    .map((s) => `- [${s.id}] ${s.name}: ${formatMoney(s.unitPriceCents)} per ${s.unit}`)
    .join("\n");
}
