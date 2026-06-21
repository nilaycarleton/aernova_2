import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { ImageryType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const imageryTypes = new Set(["DRONE", "ORTHOMOSAIC", "MODEL", "BEFORE", "AFTER"]);
const maxImagesPerUpload = 80;

function uploadDir(projectId: string) {
  return path.join(process.cwd(), "public", "uploads", "imagery", projectId);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const formData = await request.formData();
  const files = [...formData.getAll("images"), formData.get("image")].filter(
    (file): file is File => file instanceof File && file.size > 0
  );
  const typeRaw = String(formData.get("type") ?? "DRONE");
  const notes = String(formData.get("notes") ?? "").trim();
  const altitudeRaw = String(formData.get("altitudeFt") ?? "").trim();
  const captureDateRaw = String(formData.get("captureDate") ?? "").trim();
  const captureTimeRaw = String(formData.get("captureTime") ?? "").trim();
  const altitudeFt = altitudeRaw ? Number(altitudeRaw) : null;
  const captureDate =
    captureDateRaw && captureTimeRaw
      ? new Date(`${captureDateRaw}T${captureTimeRaw}`)
      : captureDateRaw
        ? new Date(`${captureDateRaw}T12:00`)
        : null;

  if (!projectId) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }

  if (!imageryTypes.has(typeRaw)) {
    return NextResponse.json({ error: "Invalid imagery type" }, { status: 400 });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "Choose one or more images to upload" }, { status: 400 });
  }

  if (files.length > maxImagesPerUpload) {
    return NextResponse.json({ error: `Upload up to ${maxImagesPerUpload} images at a time` }, { status: 400 });
  }

  if (files.some((file) => !file.type.startsWith("image/"))) {
    return NextResponse.json({ error: "Only image uploads are supported" }, { status: 400 });
  }

  if (altitudeRaw && Number.isNaN(altitudeFt)) {
    return NextResponse.json({ error: "Altitude must be a number" }, { status: 400 });
  }

  if (captureDateRaw && Number.isNaN(captureDate?.getTime())) {
    return NextResponse.json({ error: "Capture date is invalid" }, { status: 400 });
  }

  if (captureTimeRaw && !/^\d{2}:\d{2}$/.test(captureTimeRaw)) {
    return NextResponse.json({ error: "Capture time is invalid" }, { status: 400 });
  }

  const dir = uploadDir(projectId);
  await mkdir(dir, { recursive: true });
  const batchId = randomUUID();
  const createInputs: Prisma.ProjectImageryCreateManyInput[] = [];

  for (const [index, file] of files.entries()) {
    const extension = path.extname(file.name).toLowerCase() || ".jpg";
    const storedName = `${randomUUID()}${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, storedName), bytes);

    createInputs.push({
      projectId,
      type: typeRaw as ImageryType,
      status: "UPLOADED",
      url: `/uploads/imagery/${projectId}/${storedName}`,
      fileName: file.name,
      contentType: file.type,
      captureDate,
      altitudeFt,
      notes: notes || null,
      metadataJson: {
        source: typeRaw,
        uploadedVia: "phase-six-api",
        batchId,
        batchIndex: index + 1,
        fileSizeBytes: file.size,
        originalName: file.name,
        captureDate: captureDateRaw || null,
        captureTime: captureTimeRaw || null,
        photogrammetryRole: typeRaw === "DRONE" ? "source-capture" : "reference",
      },
    });
  }

  await prisma.projectImagery.createMany({ data: createInputs });

  return NextResponse.json({
    ok: true,
    uploaded: files.length,
    batchId,
  });
}
