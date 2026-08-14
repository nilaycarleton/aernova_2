-- CreateTable
CREATE TABLE "PreConstructionChecklist" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "materialsConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "materialsNotes" TEXT,
    "permitsChecked" BOOLEAN NOT NULL DEFAULT false,
    "permitRequired" BOOLEAN,
    "permitNotes" TEXT,
    "crewReady" BOOLEAN NOT NULL DEFAULT false,
    "startDateConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "readinessNotes" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreConstructionChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreConstructionChecklist_jobId_key" ON "PreConstructionChecklist"("jobId");

-- AddForeignKey
ALTER TABLE "PreConstructionChecklist" ADD CONSTRAINT "PreConstructionChecklist_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
