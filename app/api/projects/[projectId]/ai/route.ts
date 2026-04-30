import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await req.json();

  const { action } = body;

  if (action !== "summarize_project") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // 🔥 Load project data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      measurements: true,
      issues: true,
      proposals: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const latestProposal = project.proposals[0];

  // 🧠 Build structured context
  const context = {
    project: {
      name: project.name,
      clientName: project.clientName,
      address: `${project.addressLine1}, ${project.city}, ${project.province}`,
      status: project.status,
    },
    measurements: project.measurements.map((m) => ({
      type: m.type,
      value: m.value,
    })),
    issues: project.issues.map((i) => ({
      title: i.title,
      severity: i.severity,
    })),
    proposal: latestProposal
      ? {
          total: latestProposal.totalAmount,
        }
      : null,
  };

  // 🧠 Call OpenAI
  const response = await openai.responses.create({
    model: "gpt-5-mini",
    input: [
      {
        role: "system",
        content: `
You are a roofing project assistant.

Write a short, professional summary of the project.

Rules:
- Keep it 3–5 sentences
- Be clear and professional
- Mention:
  - project type
  - location
  - key measurements
  - major issues (if any)
  - proposal status
        `,
      },
      {
        role: "user",
        content: JSON.stringify(context),
      },
    ],
  });

  const summary = response.output_text;

  return NextResponse.json({ summary });
}