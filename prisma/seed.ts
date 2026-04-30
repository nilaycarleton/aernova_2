import {
  CaptureSource,
  CompanyRole,
  MeasurementType,
  MeasurementUnit,
  ProjectStatus,
  ProposalStatus,
  IssueSeverity,
  PrismaClient,
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
            label: "Front Main Plane",
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
            label: "Rear Main Plane",
            planeIndex: 2,
            pitchRatio: "8/12",
            pitchDegrees: 33.69,
            projectedAreaSqft: 1180,
            surfaceAreaSqft: 1398,
            ridgeLengthFt: 22,
            eaveLengthFt: 36,
            rakeLengthFt: 18,
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
        ],
      },
      issues: {
        create: [
          {
            title: "Missing shingles near ridge",
            description: "Likely wind damage on rear slope.",
            severity: IssueSeverity.HIGH,
            locationLabel: "Rear slope near ridge",
          },
          {
            title: "Pipe flashing wear",
            description: "Seal appears near end of service life.",
            severity: IssueSeverity.MEDIUM,
            locationLabel: "South vent stack",
          },
        ],
      },
      proposals: {
        create: [
          {
            title: "Full replacement proposal",
            status: ProposalStatus.DRAFT,
            totalAmount: 8950,
            scopeOfWork:
              "Remove old shingles, replace damaged underlayment areas, install new architectural shingles, replace flashing, install ridge cap, cleanup site.",
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