-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityKind" ADD VALUE 'CHANGE_ORDER_CREATED';
ALTER TYPE "ActivityKind" ADD VALUE 'CHANGE_ORDER_APPROVED';
ALTER TYPE "ActivityKind" ADD VALUE 'ADDITIONAL_WORK_INVOICED';
ALTER TYPE "ActivityKind" ADD VALUE 'ADDITIONAL_WORK_HOMEOWNER_REVIEW_SENT';
ALTER TYPE "ActivityKind" ADD VALUE 'ADDITIONAL_WORK_HOMEOWNER_CONFIRMED';
ALTER TYPE "ActivityKind" ADD VALUE 'ADDITIONAL_WORK_OFFICE_OVERRIDE';
ALTER TYPE "ActivityKind" ADD VALUE 'QUALITY_CHECK_EVIDENCE_SUBMITTED';
ALTER TYPE "ActivityKind" ADD VALUE 'QUALITY_CHECK_COMPLETED';
ALTER TYPE "ActivityKind" ADD VALUE 'WARRANTY_SENT';
ALTER TYPE "ActivityKind" ADD VALUE 'WARRANTY_CONFIRMED';
ALTER TYPE "ActivityKind" ADD VALUE 'PROGRESS_UPDATED';
