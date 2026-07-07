-- DropIndex
DROP INDEX "Affiliation_name_key";

-- AlterTable
ALTER TABLE "Affiliation" ADD COLUMN     "centreId" TEXT,
ADD COLUMN     "raw" TEXT;

-- CreateTable
CREATE TABLE "Centre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "isOwn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Centre_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Centre_name_key" ON "Centre"("name");

-- CreateIndex
CREATE INDEX "Affiliation_name_idx" ON "Affiliation"("name");

-- AddForeignKey
ALTER TABLE "Affiliation" ADD CONSTRAINT "Affiliation_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
