-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "reviewDelayDays" INTEGER;
