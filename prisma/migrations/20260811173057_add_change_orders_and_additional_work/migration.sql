-- CreateEnum
CREATE TYPE "ChangeOrderStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "AddOnReviewOverrideReason" AS ENUM ('HOMEOWNER_CONTACT_MISSING', 'VERBAL_APPROVAL', 'OWNER_OVERRIDE');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "billableAddOnThresholdCents" INTEGER;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "homeownerReviewConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "overriddenAt" TIMESTAMP(3),
ADD COLUMN     "overriddenByUserId" TEXT,
ADD COLUMN     "overrideNote" TEXT,
ADD COLUMN     "overrideReason" "AddOnReviewOverrideReason",
ADD COLUMN     "requiresHomeownerReview" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ChangeOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ChangeOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "shareToken" TEXT,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedByName" TEXT,
    "approvedIp" TEXT,
    "declinedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeOrderLineItem" (
    "id" TEXT NOT NULL,
    "changeOrderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'each',
    "unitCostCents" INTEGER,
    "unitPriceCents" INTEGER NOT NULL DEFAULT 0,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChangeOrderLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChangeOrder_shareToken_key" ON "ChangeOrder"("shareToken");

-- CreateIndex
CREATE INDEX "ChangeOrder_jobId_status_idx" ON "ChangeOrder"("jobId", "status");

-- CreateIndex
CREATE INDEX "ChangeOrder_quoteId_status_idx" ON "ChangeOrder"("quoteId", "status");

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderLineItem" ADD CONSTRAINT "ChangeOrderLineItem_changeOrderId_fkey" FOREIGN KEY ("changeOrderId") REFERENCES "ChangeOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
