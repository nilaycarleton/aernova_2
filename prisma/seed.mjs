import {
  CaptureSource,
  CompanyRole,
  IssueSeverity,
  MeasurementType,
  MeasurementUnit,
  PrismaClient,
  ProjectStatus,
  ProposalStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@aernova.com" },
    update: {},
    create: {
      clerkUserId: "demo_clerk_user_id",
      email: "demo@aernova.com",
      firstName: "Demo",
      lastName: "User",
    },
  });

  const company = await prisma.company.upsert({
    where: { slug: "aernova-demo" },
    update: {},
    create: {
      name: "Aernova Demo Roofing",
      slug: "aernova-demo",
    },
  });

  await prisma.companyMembership.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      userId: user.id,
      role: CompanyRole.OWNER,
    },
  });

  const existingProject = await prisma.project.findFirst({
    where: {
      companyId: company.id,
      name: "Maple Street Roof Replacement",
    },
  });

  if (existingProject) {
    const existingPhoto = await prisma.photoAsset.findFirst({
      where: {
        projectId: existingProject.id,
        url: "/inspection-placeholder.svg",
      },
    });

    if (!existingPhoto) {
      await prisma.photoAsset.create({
        data: {
          projectId: existingProject.id,
          url: "/inspection-placeholder.svg",
          fileName: "rear-slope-inspection.svg",
          contentType: "image/svg+xml",
          locationTag: "Rear slope near ridge",
          caption: "Wind damage visible along the upper rear slope with annotated shingles and flashing area.",
          annotationsJson: [
            {
              id: "demo-circle",
              tool: "circle",
              x: 70,
              y: 52,
              r: 8,
              label: "Flashing wear",
            },
            {
              id: "demo-arrow",
              tool: "arrow",
              x1: 62,
              y1: 38,
              x2: 68,
              y2: 48,
              label: "Check seal",
            },
          ],
        },
      });
    }

    const existingImagery = await prisma.projectImagery.findFirst({
      where: {
        projectId: existingProject.id,
        url: "/inspection-placeholder.svg",
      },
    });

    if (!existingImagery) {
      await prisma.projectImagery.create({
        data: {
          projectId: existingProject.id,
          type: "ORTHOMOSAIC",
          status: "NEEDS_REVIEW",
          url: "/inspection-placeholder.svg",
          fileName: "demo-orthomosaic.svg",
          contentType: "image/svg+xml",
          altitudeFt: 165,
          notes: "Demo orthomosaic/model preview for Phase 6 workflow.",
          metadataJson: {
            capture: "demo",
            source: "drone",
          },
          extractedJson: {
            generatedAt: new Date().toISOString(),
            confidence: 82,
            planes: [
              { label: "AI Plane A", pitchRatio: "8/12", areaSqft: 1260, edgeFt: 142 },
              { label: "AI Plane B", pitchRatio: "8/12", areaSqft: 1185, edgeFt: 136 },
              { label: "Garage plane", pitchRatio: "6/12", areaSqft: 465, edgeFt: 78 },
            ],
            edges: [
              { type: "ridge", lengthFt: 64 },
              { type: "valley", lengthFt: 28 },
              { type: "eave", lengthFt: 114 },
            ],
            reviewNote: "AI extraction is a planning draft. Confirm roof planes and edges before final estimate.",
          },
        },
      });
    }

    const existingComparison = await prisma.roofComparison.findFirst({
      where: {
        projectId: existingProject.id,
        title: "Demo before/after comparison",
      },
    });

    if (!existingComparison) {
      await prisma.roofComparison.create({
        data: {
          projectId: existingProject.id,
          title: "Demo before/after comparison",
          beforeUrl: "/inspection-placeholder.svg",
          afterUrl: "/inspection-placeholder.svg",
          summary: "Demo comparison sheet for pre-job and post-job roof documentation.",
          differencesJson: [
            "Pre-job roof condition documented",
            "Post-job comparison image ready for client review",
            "Use in completion package or claim support",
          ],
        },
      });
    }

    console.log("Seeded project already exists:", existingProject.name);
    return;
  }

  const project = await prisma.project.create({
    data: {
      companyId: company.id,
      createdById: user.id,
      name: "Maple Street Roof Replacement",
      clientName: "North Peak Roofing",
      clientEmail: "client@example.com",
      clientPhone: "555-123-4567",
      status: ProjectStatus.READY_FOR_QUOTE,
      captureSource: CaptureSource.DRONE,
      addressLine1: "145 Maple Street",
      city: "Brampton",
      province: "ON",
      postalCode: "L6X 0A1",
      notes: "Drone capture complete. Waiting on final proposal send.",
      sections: {
        create: [
          {
            label: "Main house - front plane",
            planeIndex: 1,
            pitchRatio: "8/12",
            pitchDegrees: 33.69,
            projectedAreaSqft: 1200,
            surfaceAreaSqft: 1420,
            ridgeLengthFt: 22,
            eaveLengthFt: 36,
            rakeLengthFt: 18,
          },
          {
            label: "Main house - rear plane",
            planeIndex: 2,
            pitchRatio: "8/12",
            pitchDegrees: 33.69,
            projectedAreaSqft: 1180,
            surfaceAreaSqft: 1398,
            ridgeLengthFt: 22,
            eaveLengthFt: 36,
            rakeLengthFt: 18,
          },
          {
            label: "Detached garage",
            planeIndex: 3,
            pitchRatio: "6/12",
            pitchDegrees: 26.57,
            projectedAreaSqft: 420,
            surfaceAreaSqft: 470,
            ridgeLengthFt: 20,
            eaveLengthFt: 42,
            rakeLengthFt: 16,
          },
        ],
      },
      measurements: {
        create: [
          {
            type: MeasurementType.AREA,
            label: "Total roof area",
            unit: MeasurementUnit.SQFT,
            value: 3240,
            displayValue: "3,240 sq ft",
            source: CaptureSource.DRONE,
            confidence: 92,
            sortOrder: 1,
          },
          {
            type: MeasurementType.RIDGE,
            label: "Total ridge length",
            unit: MeasurementUnit.FT,
            value: 64,
            displayValue: "64 ft",
            source: CaptureSource.DRONE,
            confidence: 90,
            sortOrder: 2,
          },
          {
            type: MeasurementType.PITCH,
            label: "Average roof pitch",
            unit: MeasurementUnit.RATIO,
            value: 8,
            displayValue: "8/12",
            source: CaptureSource.DRONE,
            confidence: 88,
            sortOrder: 3,
          },
          {
            type: MeasurementType.WASTE_FACTOR,
            label: "Recommended waste factor",
            unit: MeasurementUnit.PERCENT,
            value: 12,
            displayValue: "12%",
            source: CaptureSource.MANUAL,
            confidence: 85,
            sortOrder: 4,
          },
          {
            type: MeasurementType.VALLEY,
            label: "Total valley length",
            unit: MeasurementUnit.FT,
            value: 28,
            displayValue: "28 ft",
            source: CaptureSource.DRONE,
            confidence: 87,
            sortOrder: 5,
          },
          {
            type: MeasurementType.HIP,
            label: "Total hip length",
            unit: MeasurementUnit.FT,
            value: 34,
            displayValue: "34 ft",
            source: CaptureSource.DRONE,
            confidence: 89,
            sortOrder: 6,
          },
          {
            type: MeasurementType.EAVE,
            label: "Total eave length",
            unit: MeasurementUnit.FT,
            value: 114,
            displayValue: "114 ft",
            source: CaptureSource.DRONE,
            confidence: 91,
            sortOrder: 7,
          },
          {
            type: MeasurementType.RAKE,
            label: "Total rake length",
            unit: MeasurementUnit.FT,
            value: 52,
            displayValue: "52 ft",
            source: CaptureSource.DRONE,
            confidence: 88,
            sortOrder: 8,
          },
          {
            type: MeasurementType.FACET_COUNT,
            label: "Roof facet count",
            unit: MeasurementUnit.COUNT,
            value: 7,
            displayValue: "7 facets",
            source: CaptureSource.DRONE,
            confidence: 86,
            sortOrder: 9,
          },
        ],
      },
      issues: {
        create: [
          {
            title: "Missing shingles",
            description: "Recommended action: replace wind-damaged shingles and verify underlayment.\nPhoto tag/location: Rear slope near ridge\nCaption: Wind damage visible along the upper rear slope.",
            severity: IssueSeverity.HIGH,
            locationLabel: "Rear slope near ridge",
          },
          {
            title: "Flashing damage",
            description: "Recommended action: replace pipe boot flashing during roof replacement.\nPhoto tag/location: South vent stack\nCaption: Seal appears near end of service life.",
            severity: IssueSeverity.MEDIUM,
            locationLabel: "South vent stack",
          },
        ],
      },
      photos: {
        create: [
          {
            url: "/inspection-placeholder.svg",
            fileName: "rear-slope-inspection.svg",
            contentType: "image/svg+xml",
            locationTag: "Rear slope near ridge",
            caption: "Wind damage visible along the upper rear slope with annotated shingles and flashing area.",
            annotationsJson: [
              {
                id: "demo-circle",
                tool: "circle",
                x: 70,
                y: 52,
                r: 8,
                label: "Flashing wear",
              },
              {
                id: "demo-arrow",
                tool: "arrow",
                x1: 62,
                y1: 38,
                x2: 68,
                y2: 48,
                label: "Check seal",
              },
            ],
          },
        ],
      },
      proposals: {
        create: [
          {
            title: "Full replacement proposal",
            status: ProposalStatus.DRAFT,
            totalAmount: 8950,
            scopeOfWork: JSON.stringify({
              plainTextScope:
                "Remove old shingles, replace damaged underlayment areas, install new architectural shingles, replace flashing, install ridge cap, and complete site cleanup.",
              notes: "Measurements and final quantities should be field verified before ordering.",
              customLineItems: ["Replace pipe boot flashing", "Add detached garage as separate structure"],
              optionalMarkup: 12,
              sections: [
                {
                  title: "Scope of Work",
                  body: "Remove old shingles, replace damaged underlayment areas, install new architectural shingles, replace flashing, install ridge cap, and complete site cleanup.",
                },
                {
                  title: "Notes",
                  body: "Measurements and final quantities should be field verified before ordering.",
                },
              ],
            }),
          },
        ],
      },
    },
  });

  console.log("Seeded project:", project.name);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
