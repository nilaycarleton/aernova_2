import { NextRequest, NextResponse } from "next/server";
import { getAnthropic, isAiConfigured, AI_MODELS } from "@/lib/ai/client";
import { buildRoofContext, ROOF_ASSISTANT_SYSTEM } from "@/lib/ai/roof-context";
import { requireProjectAccess } from "@/lib/auth";

export const runtime = "nodejs";

const SUMMARY_PROMPT = `Write a short, professional summary of this roof project for the roofer — 3-5 sentences. Cover the roof type/size, location, the key measurements, any major issues, and the estimate/proposal status. Use the numbers from the project data; don't invent anything not present.`;

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

  // Scope to the caller's company — this route previously trusted the
  // client-supplied projectId with no access check (cross-tenant leak).
  try {
    await requireProjectAccess(projectId);
  } catch {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  if (body?.action !== "summarize_project") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const context = await buildRoofContext(projectId);

  const message = await getAnthropic().messages.create({
    model: AI_MODELS.chat,
    max_tokens: 400,
    thinking: { type: "disabled" },
    system: [
      {
        type: "text",
        // Byte-identical to the chat route's system prefix, so the roof context
        // caches once and both features read it at ~0.1x cost.
        text: `${ROOF_ASSISTANT_SYSTEM}\n\n---\nPROJECT DATA:\n${context}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: SUMMARY_PROMPT }],
  });

  const summary = message.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  return NextResponse.json({ summary });
}
