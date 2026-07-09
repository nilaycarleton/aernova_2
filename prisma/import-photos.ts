/**
 * Import a folder of drone photos into a new project so the full 3D pipeline can
 * be run end-to-end without clicking through the upload UI.
 *
 * Run (Node loads .env and strips TS types):
 *   node --env-file=.env --experimental-strip-types prisma/import-photos.ts [photoDir]
 * or:
 *   npm run import:photos -- "/path/to/photos"
 *
 * The project is attached to OWNER_EMAIL's company (default admin@aernova.ca) so
 * it shows up for the signed-in user; if that user/company doesn't exist yet it
 * provisions a fallback workspace. Each photo is stored via the same storage
 * driver and metadata extractor the upload action uses.
 *
 * If NODEODM is configured and the worker is online, processing is auto-kicked
 * after import (same submit path as the UI). Set IMPORT_ONLY=1 to skip that and
 * just stage the photos.
 */

import { readFileSync, readdirSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { storage } from "../lib/storage.ts";
import { parseDroneImageMetadata } from "../lib/drone-metadata.ts";
import { buildCaptureQualityProfile } from "../lib/photogrammetry-pipeline.ts";
import { isNodeOdmConfigured, getNodeOdmWorkerHealth } from "../lib/nodeodm-client.ts";
import { queueNodeOdmReconstruction } from "../lib/reconstruction.ts";

const prisma = new PrismaClient();

const PHOTO_DIR =
  process.argv[2] || process.env.PHOTO_DIR || "/Users/nilay/Downloads/36 wetherby";
const OWNER_EMAIL = process.env.OWNER_EMAIL || "admin@aernova.ca";
const PROJECT_NAME = process.env.PROJECT_NAME || path.basename(PHOTO_DIR);

async function resolveCompany() {
  const user = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
    include: { memberships: { include: { company: true }, orderBy: { createdAt: "asc" } } },
  });
  if (user && user.memberships[0]) {
    return { user, company: user.memberships[0].company };
  }

  // Fallback: provision a workspace so the script still runs before first sign-in.
  const provisioned = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: { clerkUserId: `import_${randomUUID()}`, email: OWNER_EMAIL, firstName: "Import", lastName: "User" },
  });
  const company = await prisma.company.create({
    data: {
      name: "Imported Workspace",
      slug: `imported-${randomUUID().slice(0, 8)}`,
      memberships: { create: { userId: provisioned.id, role: "OWNER" } },
    },
  });
  return { user: provisioned, company };
}

async function main() {
  const files = readdirSync(PHOTO_DIR)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort();
  if (files.length === 0) throw new Error(`No JPG files found in ${PHOTO_DIR}`);

  const { user, company } = await resolveCompany();

  const project = await prisma.project.create({
    data: {
      companyId: company.id,
      createdById: user.id,
      name: PROJECT_NAME,
      clientName: PROJECT_NAME,
      status: "INSPECTION",
      captureSource: "DRONE",
      addressLine1: PROJECT_NAME,
      city: "Toronto",
      province: "ON",
      notes: `Imported ${files.length} drone photos via import-photos script.`,
    },
  });

  const batchId = randomUUID();
  const created: { type: string; status: string; altitudeFt: number | null; captureDate: Date | null; metadataJson: Record<string, unknown> }[] = [];

  for (const [index, name] of files.entries()) {
    const bytes = readFileSync(path.join(PHOTO_DIR, name));
    const storedName = `${randomUUID()}${path.extname(name).toLowerCase() || ".jpg"}`;
    const { url } = await storage.put(`imagery/${project.id}/${storedName}`, bytes, "image/jpeg");
    const meta = parseDroneImageMetadata(bytes, name);

    const metadataJson = {
      source: "DRONE",
      uploadedVia: "import-photos-script",
      batchId,
      batchIndex: index + 1,
      fileSizeBytes: bytes.byteLength,
      originalName: name,
      latitude: meta.latitude ?? undefined,
      longitude: meta.longitude ?? undefined,
      gps: meta.latitude != null && meta.longitude != null ? true : undefined,
      exifAltitudeFt: meta.altitudeFt ?? undefined,
      exifCaptureDate: meta.captureDate?.toISOString() ?? undefined,
    };

    await prisma.projectImagery.create({
      data: {
        projectId: project.id,
        type: "DRONE",
        status: "UPLOADED",
        url,
        fileName: name,
        contentType: "image/jpeg",
        captureDate: meta.captureDate,
        altitudeFt: meta.altitudeFt,
        metadataJson,
      },
    });
    created.push({ type: "DRONE", status: "UPLOADED", altitudeFt: meta.altitudeFt, captureDate: meta.captureDate, metadataJson });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qa = buildCaptureQualityProfile(created as any);
  const geotagged = created.filter((r) => r.metadataJson.gps).length;

  console.log(`\n✅ Imported ${files.length} photos`);
  console.log(`   Company:  ${company.name} (${company.id})`);
  console.log(`   Project:  ${project.name} → /projects/${project.id}`);
  console.log(`   Geotags:  ${geotagged}/${files.length}`);
  console.log(`   Capture QA: score ${qa.score} — ${qa.label}`);

  // Hands-off step 3: auto-submit to NodeODM when a worker is reachable.
  if (process.env.IMPORT_ONLY === "1") {
    console.log(`\nIMPORT_ONLY set — skipping processing. Open the project and Queue 3D Processing when ready.`);
    return;
  }
  if (!isNodeOdmConfigured()) {
    console.log(`\nNODEODM_URL not configured — photos staged only. Start a worker (npm run nodeodm start), set NODEODM_URL, then re-run or Queue 3D Processing in the UI.`);
    return;
  }
  const health = await getNodeOdmWorkerHealth();
  if (!health.online) {
    console.log(`\nNodeODM at ${health.baseUrl} is not reachable (${health.errorMessage ?? "offline"}). Photos staged; start the worker and Queue 3D Processing.`);
    return;
  }

  try {
    const { taskUuid } = await queueNodeOdmReconstruction(project.id, project.name, "standard");
    console.log(`\n🚀 Submitted to NodeODM — task ${taskUuid}`);
    console.log(`   Watch progress: open /projects/${project.id} (auto-polls), or POST /api/projects/${project.id}/processing/sync`);
  } catch (error) {
    console.log(`\n⚠️  Import succeeded but processing submit failed: ${error instanceof Error ? error.message : error}`);
    console.log(`   Fix the issue and Queue 3D Processing from the UI.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
