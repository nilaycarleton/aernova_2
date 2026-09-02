import { NextResponse } from "next/server";
import { requireJobAccess } from "@/lib/auth";
import { uploadProjectImageryAction } from "@/app/(dashboard)/jobs/[jobId]/phase-six-actions";

export const runtime = "nodejs";

/**
 * `ImageryUploadForm` posts here with fetch (not a native form submit) so it
 * can show upload progress/errors inline instead of a full navigation. The
 * action itself does the validation/auth/storage/DB work — this route only
 * bridges the browser POST to it and shapes the JSON response the form
 * expects. `jobId` comes from the URL, not the form body, so it's injected
 * into the FormData before handing off.
 */
export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  try {
    await requireJobAccess(jobId, "editJob");
  } catch {
    return NextResponse.json({ error: "Not authorized for this job" }, { status: 403 });
  }

  const formData = await request.formData();
  formData.set("jobId", jobId);

  const uploaded = [...formData.getAll("images"), formData.get("image")].filter(
    (file): file is File => file instanceof File && file.size > 0
  ).length;

  try {
    await uploadProjectImageryAction(formData);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ uploaded });
}
