-- AlterTable
ALTER TABLE "Study" ADD COLUMN "enrollment" INTEGER;
ALTER TABLE "Study" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StudyInvestigator" ADD COLUMN "centreId" TEXT;

-- AddForeignKey
ALTER TABLE "StudyInvestigator" ADD CONSTRAINT "StudyInvestigator_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
