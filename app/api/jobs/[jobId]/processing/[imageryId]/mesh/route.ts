import { NextResponse } from "next/server";
import { resolveModelMeshText } from "@/lib/roof-extraction-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Serve a model's extraction OBJ (the mesh the roof extractor runs on) so the
 * annotation viewer can render + raycast it in the extractor's metre frame.
 * Returned as text/plain for THREE's OBJLoader.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string; imageryId: string }> }
) {
  const { jobId, imageryId } = await params;
  try {
    const { text } = await resolveModelMeshText(jobId, imageryId);
    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load model mesh" },
      { status: 502 }
    );
  }
}
