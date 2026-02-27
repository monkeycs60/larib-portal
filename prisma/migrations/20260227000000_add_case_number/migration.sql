-- AlterTable
ALTER TABLE "ClinicalCase" ADD COLUMN     "caseNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalCase_caseNumber_key" ON "ClinicalCase"("caseNumber");
