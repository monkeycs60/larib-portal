-- CreateEnum
CREATE TYPE "AuthorType" AS ENUM ('OUR_TEAM', 'EXTERNAL');

-- AlterTable
ALTER TABLE "Author" ADD COLUMN     "emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "type" "AuthorType" NOT NULL DEFAULT 'OUR_TEAM';

-- CreateTable
CREATE TABLE "AuthorCentre" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorCentre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorAffiliation" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "raw" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "AuthorAffiliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthorCentre_centreId_idx" ON "AuthorCentre"("centreId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorCentre_authorId_centreId_key" ON "AuthorCentre"("authorId", "centreId");

-- CreateIndex
CREATE INDEX "AuthorAffiliation_authorId_idx" ON "AuthorAffiliation"("authorId");

-- AddForeignKey
ALTER TABLE "AuthorCentre" ADD CONSTRAINT "AuthorCentre_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorCentre" ADD CONSTRAINT "AuthorCentre_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorAffiliation" ADD CONSTRAINT "AuthorAffiliation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill emails[] from legacy single email
UPDATE "Author" SET "emails" = ARRAY["email"] WHERE "email" IS NOT NULL AND "email" <> '';

-- Backfill AuthorCentre from the denormalized primary centreId
INSERT INTO "AuthorCentre" ("id", "authorId", "centreId", "isPrimary", "order", "createdAt")
SELECT gen_random_uuid()::text, "id", "centreId", true, 0, now()
FROM "Author"
WHERE "centreId" IS NOT NULL;
