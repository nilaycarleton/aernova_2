-- CreateEnum
CREATE TYPE "JobProgressState" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'MOSTLY_COMPLETE', 'READY_FOR_QUALITY_CHECK', 'COMPLETED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "progressPercent" INTEGER,
ADD COLUMN     "progressState" "JobProgressState";
