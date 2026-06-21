import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncNodeOdmModelJob } from "@/lib/processing-jobs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const jobs = await prisma.processingJob.findMany({
    where: {
      projectId,
      provider: "nodeodm",
      status: { in: ["QUEUED", "PROCESSING"] },
      modelImageryId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  const results = [];

  for (const job of jobs) {
    if (!job.modelImageryId) continue;
    try {
      results.push(await syncNodeOdmModelJob(projectId, job.modelImageryId));
    } catch (error) {
      results.push({
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unable to sync job",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    synced: results.length,
    results,
  });
}
