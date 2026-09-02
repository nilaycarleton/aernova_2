import { NextRequest, NextResponse } from "next/server";
import { getGemini, isAiConfigured, AI_MODELS } from "@/lib/ai/client";
import { buildRoofContext, ROOF_ASSISTANT_SYSTEM } from "@/lib/ai/roof-context";
import { checkAiRateLimit, recordAiUsage } from "@/lib/ai/rate-limit";
import { requireJobAccess } from "@/lib/auth";

export const runtime = "nodejs";

const SUMMARY_PROMPT = `Write a short, professional summary of this roof job for the roofer — 3-5 sentences. Cover the roof type/size, location, the key measurements, any major issues, and the estimate/quote status. Use the numbers from the job data; don't invent anything not present.`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured. Set GEMINI_API_KEY." },
      { status: 503 }
    );
  }

  // Scope to the caller's company — this route previously trusted the
  // client-supplied jobId with no access check (cross-tenant leak).
  let userId: string;
  try {
    ({ userId } = await requireJobAccess(jobId, "editJob"));
  } catch {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  if (body?.action !== "summarize_project") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Summaries share the job's AI budget — they cost the same as a chat turn.
  const limit = await checkAiRateLimit({ jobId, userId });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: limit.message },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const context = await buildRoofContext(jobId);
  await recordAiUsage({ jobId, userId, kind: "summary" });

  const response = await getGemini().models.generateContent({
    model: AI_MODELS.chat,
    config: {
      // Byte-identical to the chat route's system prefix, so if Gemini
      // context caching is ever wired up for this pair, they'd share it.
      systemInstruction: `${ROOF_ASSISTANT_SYSTEM}\n\n---\nPROJECT DATA:\n${context}`,
      maxOutputTokens: 400,
      thinkingConfig: { thinkingBudget: 0 },
    },
    contents: [{ role: "user", parts: [{ text: SUMMARY_PROMPT }] }],
  });

  const summary = (response.text ?? "").trim();

  return NextResponse.json({ summary });
}
