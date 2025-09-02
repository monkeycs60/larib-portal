-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'FR');

-- CreateEnum
CREATE TYPE "Application" AS ENUM ('BESTOF_LARIB', 'CONGES', 'CARDIOLARIB');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "applications" "Application"[],
ADD COLUMN     "arrivalDate" TIMESTAMP(3),
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "country" TEXT,
ADD COLUMN     "departureDate" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "language" "Language" NOT NULL DEFAULT 'EN',
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "profilePhoto" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';
