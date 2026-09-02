import { NextRequest, NextResponse } from "next/server";
import { getGemini, isAiConfigured, AI_MODELS } from "@/lib/ai/client";
import { buildRoofContext, ROOF_ASSISTANT_SYSTEM } from "@/lib/ai/roof-context";
import { checkAiRateLimit, recordAiUsage } from "@/lib/ai/rate-limit";
import { requireJobAccess } from "@/lib/auth";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

const MAX_HISTORY = 20; // cost guard — cap conversation length per request
const MAX_MESSAGE_CHARS = 4000;

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

  // Scope to the caller's company — the old /ai route skipped this.
  let userId: string;
  try {
    ({ userId } = await requireJobAccess(jobId, "editJob"));
  } catch {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Each call spends real money, so cap before doing any work.
  const limit = await checkAiRateLimit({ jobId, userId });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: limit.message },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = (await req.json().catch(() => null)) as { messages?: unknown } | null;
  const raw = Array.isArray(body?.messages) ? body!.messages : null;
  if (!raw) return NextResponse.json({ error: "messages[] is required" }, { status: 400 });

  const messages: ChatMessage[] = (raw as unknown[])
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
        typeof (m as ChatMessage).content === "string"
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "The last message must be from the user" }, { status: 400 });
  }

  const context = await buildRoofContext(jobId);

  // Count it once the request is valid and about to hit the API. Recorded before
  // streaming because the spend is committed the moment the call is made — a
  // client disconnecting mid-stream doesn't refund it.
  await recordAiUsage({ jobId, userId, kind: "chat" });

  const stream = await getGemini().models.generateContentStream({
    model: AI_MODELS.chat,
    config: {
      // Instructions + roof context are identical for every question in a
      // job. (Gemini context caching isn't wired up here — the roof-context
      // snapshot for a typical job is well under the token minimum caching
      // requires, so it wouldn't help most jobs; this is a cost-optimization
      // gap versus the old Anthropic prompt-cache prefix, not a functional
      // one — every question still gets the full, correct context.)
      systemInstruction: `${ROOF_ASSISTANT_SYSTEM}\n\n---\nPROJECT DATA:\n${context}`,
      maxOutputTokens: 2048,
      // Snappy, low-cost conversational Q&A over data we already provide.
      thinkingConfig: { thinkingBudget: 0 },
    },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
        }
      } catch (err) {
        console.error("[chat] stream error", err);
        controller.enqueue(encoder.encode("\n\n[The assistant hit an error. Please try again.]"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
