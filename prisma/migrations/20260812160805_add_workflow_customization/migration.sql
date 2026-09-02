-- CreateTable
CREATE TABLE "CompanyWorkflowStage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobStatus" "ProjectStatus" NOT NULL,
    "label" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyWorkflowStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTemplate" (
    "id" TEXT NOT NULL,
    "trade" "Trade" NOT NULL,
    "name" TEXT NOT NULL,
    "stagesJson" JSONB NOT NULL,

    CONSTRAINT "WorkflowTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyWorkflowStage_companyId_jobStatus_key" ON "CompanyWorkflowStage"("companyId", "jobStatus");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTemplate_trade_name_key" ON "WorkflowTemplate"("trade", "name");

-- AddForeignKey
ALTER TABLE "CompanyWorkflowStage" ADD CONSTRAINT "CompanyWorkflowStage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
