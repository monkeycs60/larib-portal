-- AlterTable
ALTER TABLE "Study" ADD COLUMN "nctId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Study_nctId_key" ON "Study"("nctId");
