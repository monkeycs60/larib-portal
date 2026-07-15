-- CreateEnum
CREATE TYPE "AuthorListRequestStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "contributorsNote" TEXT;

-- CreateTable
CREATE TABLE "AuthorListRequest" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "note" TEXT,
    "status" "AuthorListRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "AuthorListRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthorListRequest_articleId_status_idx" ON "AuthorListRequest"("articleId", "status");

-- AddForeignKey
ALTER TABLE "AuthorListRequest" ADD CONSTRAINT "AuthorListRequest_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorListRequest" ADD CONSTRAINT "AuthorListRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorListRequest" ADD CONSTRAINT "AuthorListRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
