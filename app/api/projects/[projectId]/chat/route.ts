import { NextRequest, NextResponse } from "next/server";
import { getAnthropic, isAiConfigured, AI_MODELS } from "@/lib/ai/client";
import { buildRoofContext, ROOF_ASSISTANT_SYSTEM } from "@/lib/ai/roof-context";
import { requireProjectAccess } from "@/lib/auth";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

const MAX_HISTORY = 20; // cost guard — cap conversation length per request
const MAX_MESSAGE_CHARS = 4000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured. Set ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  // Scope to the caller's company — the old /ai route skipped this.
  try {
    await requireProjectAccess(projectId);
  } catch {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
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

  const context = await buildRoofContext(projectId);

  const stream = getAnthropic().messages.stream({
    model: AI_MODELS.chat,
    max_tokens: 2048,
    // Snappy, low-cost conversational Q&A over data we already provide.
    thinking: { type: "disabled" },
    system: [
      {
        type: "text",
        // Instructions + roof context are identical for every question in a
        // project — cache the whole prefix so follow-ups read it at ~0.1x cost.
        text: `${ROOF_ASSISTANT_SYSTEM}\n\n---\nPROJECT DATA:\n${context}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
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
