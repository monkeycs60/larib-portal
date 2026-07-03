-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminApplications" "Application"[] DEFAULT ARRAY[]::"Application"[];
