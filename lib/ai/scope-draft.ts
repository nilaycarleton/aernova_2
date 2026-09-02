/**
 * Item 50: draft the quote's opening from the roof context this job already
 * has, grounded in this *company's own* past accepted quotes rather than
 * generic web knowledge of what a roofing quote sounds like.
 */
import { prisma } from "@/lib/prisma";
import { getGemini, isAiConfigured, AI_MODELS } from "./client.ts";
import { buildRoofContext } from "./roof-context.ts";
import { parseScopeDraft, type ScopeDraft } from "./scope-draft-response.ts";

export type { ScopeDraft } from "./scope-draft-response.ts";

/**
 * Up to three of the company's own approved quotes with a written opening —
 * sorted and capped the same deterministic way `roof-context.ts` documents
 * for its own snapshot. For tone and structure only; the system prompt is
 * explicit that these are not to be copied.
 */
async function pastAcceptedQuotesContext(companyId: string, excludeQuoteId: string): Promise<string> {
  const quotes = await prisma.quote.findMany({
    where: {
      companyId,
      status: "APPROVED",
      id: { not: excludeQuoteId },
      introBody: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { title: true, introTitle: true, introBody: true },
  });
  if (!quotes.length) return "(No past accepted quotes with an opening written yet.)";
  return quotes
    .map((q, i) => `${i + 1}. "${q.title}"${q.introTitle ? ` — ${q.introTitle}` : ""}\n${q.introBody}`)
    .join("\n\n");
}

const SCOPE_SYSTEM = `You are Aernova's quote-writing assistant. Draft the opening of a roofing quote — the part a homeowner reads before the price — from the job's own measurements and this company's own past accepted quotes.

Ground every claim in the PROJECT DATA provided. Never invent a measurement, a pitch, or damage that isn't in the data. If the data is thin, write a short, honest opening rather than padding it with generic claims.

Match the voice of the PAST ACCEPTED QUOTES if any are given — that's this company's own style, not a generic template — but never copy their sentences; this is a different job.

Respond with **only** a JSON object matching exactly this shape, no prose before or after it, no markdown fences:
{"introTitle": string, "introBody": string}

"introTitle" is short — a few words, like "Thanks for having us out." "introBody" is two to four sentences: what was found and what's being proposed, in the words a roofer would actually say to a homeowner.`;

export async function draftScopeOfWork(input: {
  jobId: string;
  quoteId: string;
  companyId: string;
}): Promise<ScopeDraft> {
  if (!isAiConfigured()) throw new Error("AI is not configured.");

  const [roofContext, pastQuotes] = await Promise.all([
    buildRoofContext(input.jobId),
    pastAcceptedQuotesContext(input.companyId, input.quoteId),
  ]);

  const response = await getGemini().models.generateContent({
    model: AI_MODELS.chat,
    config: {
      systemInstruction: SCOPE_SYSTEM,
      maxOutputTokens: 512,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `PROJECT DATA:\n${roofContext}\n\n---\nPAST ACCEPTED QUOTES FROM THIS COMPANY (tone and style only — do not copy):\n${pastQuotes}`,
          },
        ],
      },
    ],
  });

  const text = response.text;
  if (!text) throw new Error("The assistant didn't return any text.");

  return parseScopeDraft(text);
}
