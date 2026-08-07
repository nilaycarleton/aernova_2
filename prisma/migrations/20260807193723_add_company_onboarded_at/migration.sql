-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- Every company that already exists has already been using the app under
-- whatever trade/province it started with — none of them should be sent to
-- the new /onboarding redirect retroactively. Only a company created after
-- this migration (via prisma.company.create, which never sets this column)
-- starts genuinely null.
UPDATE "Company" SET "onboardedAt" = "createdAt" WHERE "onboardedAt" IS NULL;
