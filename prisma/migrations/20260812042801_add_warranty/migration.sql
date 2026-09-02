-- CreateEnum
CREATE TYPE "WarrantyStatus" AS ENUM ('DRAFT', 'REVIEWED', 'SENT', 'VIEWED', 'CONFIRMED');

-- CreateTable
CREATE TABLE "Warranty" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "templateId" TEXT,
    "termMonths" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "coverageNotes" TEXT,
    "exclusions" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "companyInfoSnapshot" TEXT NOT NULL,
    "customerInfoSnapshot" TEXT NOT NULL,
    "propertyAddressSnapshot" TEXT NOT NULL,
    "status" "WarrantyStatus" NOT NULL DEFAULT 'DRAFT',
    "shareToken" TEXT,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "confirmationChecked" BOOLEAN NOT NULL DEFAULT false,
    "signerName" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "signerIp" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "trade" "Trade",
    "variant" TEXT,
    "name" TEXT NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "coverageNotes" TEXT,
    "exclusions" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WarrantyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Warranty_shareToken_key" ON "Warranty"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "Warranty_jobId_key" ON "Warranty"("jobId");

-- CreateIndex
CREATE INDEX "WarrantyTemplate_companyId_idx" ON "WarrantyTemplate"("companyId");

-- CreateIndex
CREATE INDEX "WarrantyTemplate_trade_idx" ON "WarrantyTemplate"("trade");

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WarrantyTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyTemplate" ADD CONSTRAINT "WarrantyTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
