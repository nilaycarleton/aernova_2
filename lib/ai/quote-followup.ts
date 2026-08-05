/**
 * Item 50: draft a follow-up message for a quote that's gone quiet.
 *
 * The output is one short paragraph, not a structured object, so there is no
 * hallucination-guard shape worth splitting into a pure file the way
 * `capture-response.ts` and `scope-draft-response.ts` are — the only thing
 * done with the text is trimming it, and the contractor reads every word
 * before it goes anywhere.
 *
 * This never touches the cron. `app/api/cron/quote-reminders/route.ts` keeps
 * `followUpIntro()`'s fixed line — confirmed with the user rather than
 * guessed: an AI-drafted message is reviewed by a person before a homeowner
 * ever sees it, which an unattended cron can't do.
 */
import { prisma } from "@/lib/prisma";
import { getAnthropic, isAiConfigured, AI_MODELS } from "./client.ts";
import { buildRoofContext } from "./roof-context.ts";

const FOLLOWUP_SYSTEM = `You are Aernova's follow-up assistant. A contractor sent a homeowner a quote and hasn't heard back. Draft one short, warm nudge — a few sentences, not a sales pitch.

Ground it in the PROJECT DATA provided. Never invent urgency, never invent a discount or a deadline that doesn't exist, never guess why they haven't responded. It's fine to briefly reference what the quote was for.

Respond with the message itself — plain text, no subject line, no greeting like "Hi [Name]" (the email template already adds that), no signature, no markdown, no quotes around it. Just the paragraph.`;

export async function draftFollowUpMessage(input: {
  jobId: string;
  quoteId: string;
  daysSinceSent: number;
}): Promise<string> {
  if (!isAiConfigured()) throw new Error("AI is not configured.");

  const [roofContext, quote] = await Promise.all([
    buildRoofContext(input.jobId),
    prisma.quote.findUnique({
      where: { id: input.quoteId },
      select: { title: true, totalAmountCents: true },
    }),
  ]);

  const response = await getAnthropic().messages.create({
    model: AI_MODELS.chat,
    max_tokens: 256,
    thinking: { type: "disabled" },
    system: FOLLOWUP_SYSTEM,
    messages: [
      {
        role: "user",
        content: `PROJECT DATA:\n${roofContext}\n\n---\nThis quote${quote ? ` ("${quote.title}")` : ""} was sent ${input.daysSinceSent} day${input.daysSinceSent === 1 ? "" : "s"} ago and hasn't been answered.`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("The assistant didn't return any text.");

  const message = block.text.trim();
  if (!message) throw new Error("The assistant didn't draft anything.");
  return message;
}
