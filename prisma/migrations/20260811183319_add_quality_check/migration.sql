-- CreateTable
CREATE TABLE "QualityCheck" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "siteCleaned" BOOLEAN NOT NULL DEFAULT false,
    "photosUploaded" BOOLEAN NOT NULL DEFAULT false,
    "fieldEvidenceNotes" TEXT,
    "fieldEvidenceSubmittedAt" TIMESTAMP(3),
    "fieldEvidenceSubmittedByUserId" TEXT,
    "scopeCompleted" BOOLEAN NOT NULL DEFAULT false,
    "deficienciesResolved" BOOLEAN NOT NULL DEFAULT false,
    "walkthroughCompleted" BOOLEAN NOT NULL DEFAULT false,
    "walkthroughNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QualityCheck_jobId_key" ON "QualityCheck"("jobId");

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
