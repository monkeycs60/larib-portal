-- AlterTable
ALTER TABLE "Author" ADD COLUMN     "centreId" TEXT;

-- AddForeignKey
ALTER TABLE "Author" ADD CONSTRAINT "Author_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
