/*
  Warnings:

  - You are about to drop the column `isClosed` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `leadUserId` on the `Study` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('PLANNED', 'ONGOING', 'COMPLETED', 'STOPPED');

-- CreateEnum
CREATE TYPE "StudyRole" AS ENUM ('PI', 'CO_INVESTIGATOR');

-- DropForeignKey
ALTER TABLE "Study" DROP CONSTRAINT "Study_leadUserId_fkey";

-- AlterTable
ALTER TABLE "Study" DROP COLUMN "isClosed",
DROP COLUMN "leadUserId",
ADD COLUMN     "acronym" TEXT,
ADD COLUMN     "domain" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "funding" TEXT,
ADD COLUMN     "status" "StudyStatus" NOT NULL DEFAULT 'PLANNED';

-- CreateTable
CREATE TABLE "StudyInvestigator" (
    "studyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "role" "StudyRole" NOT NULL DEFAULT 'CO_INVESTIGATOR',

    CONSTRAINT "StudyInvestigator_pkey" PRIMARY KEY ("studyId","authorId")
);

-- CreateTable
CREATE TABLE "_StudyCentres" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StudyCentres_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_StudyCentres_B_index" ON "_StudyCentres"("B");

-- AddForeignKey
ALTER TABLE "StudyInvestigator" ADD CONSTRAINT "StudyInvestigator_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyInvestigator" ADD CONSTRAINT "StudyInvestigator_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudyCentres" ADD CONSTRAINT "_StudyCentres_A_fkey" FOREIGN KEY ("A") REFERENCES "Centre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudyCentres" ADD CONSTRAINT "_StudyCentres_B_fkey" FOREIGN KEY ("B") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;
