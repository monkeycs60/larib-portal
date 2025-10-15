-- DropIndex
DROP INDEX "AdminTagOnCase_tagId_idx";

-- DropIndex
DROP INDEX "CaseAttempt_userId_caseId_validatedAt_createdAt_idx";

-- DropIndex
DROP INDEX "ClinicalCase_difficulty_idx";

-- DropIndex
DROP INDEX "ClinicalCase_diseaseTagId_idx";

-- DropIndex
DROP INDEX "ClinicalCase_examTypeId_idx";

-- DropIndex
DROP INDEX "ClinicalCase_status_createdAt_idx";

-- DropIndex
DROP INDEX "Session_userId_createdAt_idx";

-- DropIndex
DROP INDEX "UserTagOnCase_userTagId_idx";

-- CreateTable
CREATE TABLE "LeavePeriod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "allocatedDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeavePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeavePeriod_userId_startDate_idx" ON "LeavePeriod"("userId", "startDate");

-- CreateIndex
CREATE INDEX "LeavePeriod_userId_endDate_idx" ON "LeavePeriod"("userId", "endDate");

-- AddForeignKey
ALTER TABLE "LeavePeriod" ADD CONSTRAINT "LeavePeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
