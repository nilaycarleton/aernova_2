import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { ImageryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { requireJobAccess } from "@/lib/auth";

// A route handler (not a Server Action) so the before/after photos aren't capped
// by the 1 MB Server Action body limit — the request body streams straight in.
export const runtime = "nodejs";

/** Store one before/after photo and record it as BEFORE/AFTER job imagery
 *  (so it also lands in the photo library). Returns the URL, or null if absent. */
async function uploadComparisonPhoto(
  jobId: string,
  file: FormDataEntryValue | null,
  type: "BEFORE" | "AFTER"
): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) throw new Error("Before/after photos must be images");

  const extension = path.extname(file.name).toLowerCase() || ".jpg";
  const storedName = `${randomUUID()}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { url } = await storage.put(`imagery/${jobId}/${storedName}`, bytes, file.type);

  await prisma.projectImagery.create({
    data: {
      jobId,
      type: type as ImageryType,
      status: "READY",
      url,
      fileName: file.name,
      contentType: file.type,
      metadataJson: { source: type, uploadedVia: "comparison" },
    },
  });

  return url;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    await requireJobAccess(jobId, "editJob");
  } catch {
    return NextResponse.json({ error: "Not authorized for this job" }, { status: 403 });
  }

  const formData = await req.formData();
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Give the comparison a title." }, { status: 400 });
  }

  let beforeUrl: string | null;
  let afterUrl: string | null;
  try {
    beforeUrl = await uploadComparisonPhoto(jobId, formData.get("beforeImage"), "BEFORE");
    afterUrl = await uploadComparisonPhoto(jobId, formData.get("afterImage"), "AFTER");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }

  await prisma.roofComparison.create({
    data: {
      jobId,
      title,
      beforeUrl,
      afterUrl,
      summary: summary || null,
      differencesJson: [
        "Pre-job photo evidence captured",
        "Post-job comparison pending or ready for client sheet",
        "Use this sheet for inspection comparison and completion documentation",
      ],
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/report`);
  return NextResponse.json({ ok: true });
}
