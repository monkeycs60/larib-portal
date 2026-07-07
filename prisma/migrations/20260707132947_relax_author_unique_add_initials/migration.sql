-- DropIndex
DROP INDEX "Author_firstName_lastName_key";

-- AlterTable
ALTER TABLE "Author" ADD COLUMN     "initials" TEXT;
