/**
 * Item 49: a photo in, a drafted job out.
 *
 * Runs before a job exists — there is no `buildRoofContext()` to reuse — so
 * the only context this gives the model is the company's own `Service`
 * catalog, built with the same doctrine `roof-context.ts` documents for its
 * own snapshot: sorted, deterministic, nothing volatile.
 *
 * The deterministic response-parsing lives in `capture-response.ts` instead
 * of here, so it can be tested without `@prisma/client` or a network call —
 * this file is the one that actually talks to Prisma and Gemini.
 */
import { prisma } from "@/lib/prisma";
import { getGemini, isAiConfigured, AI_MODELS } from "./client.ts";
import {
  catalogContext,
  parseCaptureResponse,
  type CaptureDraft,
  type ServiceForCapture,
} from "./capture-response.ts";

export type { CaptureDraft, ServiceForCapture } from "./capture-response.ts";

export async function serviceCatalogForCapture(companyId: string): Promise<ServiceForCapture[]> {
  return prisma.service.findMany({
    where: { companyId, isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, name: true, unit: true, unitPriceCents: true },
  });
}

const CAPTURE_SYSTEM = `You are Aernova's job-capture assistant. A contractor just took a photo on site of something that needs work and wants a job drafted from it, before they've typed anything.

Look at the photo and the company's price list below, then respond with a short, honest read: what the photo shows, a plain-language job name a roofer would actually use, and — only if one of the company's own catalog items is a real match — which one and why it fits.

Never invent a price that isn't in the catalog. If nothing matches, say so rather than guessing a service.

Respond with **only** a JSON object matching exactly this shape, no prose before or after it, no markdown fences:
{"jobName": string, "description": string, "serviceId": string or null, "suggestedPriceCents": number or null}

"description" is one or two sentences, in the words a roofer would use on the phone — never invent measurements or damage you can't actually see in the photo. "serviceId" is one of the bracketed ids from the price list, or null if nothing genuinely matches. "suggestedPriceCents" is that service's own price from the list — never a number you made up.`;

/**
 * Throws on anything unexpected (no key configured, a malformed response) —
 * callers are expected to catch and show a plain "couldn't draft this" rather
 * than surface a stack trace, same as every other AI call in this app.
 */
export async function draftJobFromPhoto(input: {
  companyId: string;
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}): Promise<CaptureDraft> {
  if (!isAiConfigured()) throw new Error("AI is not configured.");

  const services = await serviceCatalogForCapture(input.companyId);

  const response = await getGemini().models.generateContent({
    model: AI_MODELS.chat,
    config: {
      systemInstruction: CAPTURE_SYSTEM,
      maxOutputTokens: 512,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
    },
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: input.imageBase64, mimeType: input.mediaType } },
          { text: `PRICE LIST:\n${catalogContext(services)}` },
        ],
      },
    ],
  });

  const text = response.text;
  if (!text) throw new Error("The assistant didn't return any text.");

  return parseCaptureResponse(text, services);
}
