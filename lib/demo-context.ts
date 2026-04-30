import { prisma } from "@/lib/prisma";

export async function getDemoContext() {
  const company = await prisma.company.findUnique({
    where: { slug: "aernova-demo" },
  });

  if (!company) {
    throw new Error(
      'Demo company not found. Run "npx tsx prisma/seed.ts" first.'
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: "demo@aernova.com" },
  });

  if (!user) {
    throw new Error(
      'Demo user not found. Run "npx tsx prisma/seed.ts" first.'
    );
  }

  return { company, user };
}