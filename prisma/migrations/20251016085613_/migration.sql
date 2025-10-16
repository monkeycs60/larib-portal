/*
  Warnings:

  - You are about to drop the column `lge` on the `CaseAttempt` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CaseAttempt" DROP COLUMN "lge",
ADD COLUMN     "lgeDetails" TEXT,
ADD COLUMN     "lgePresent" BOOLEAN;
