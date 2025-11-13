-- DropForeignKey
ALTER TABLE "ClinicalCase" DROP CONSTRAINT "ClinicalCase_createdById_fkey";

-- AddForeignKey
ALTER TABLE "ClinicalCase" ADD CONSTRAINT "ClinicalCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
