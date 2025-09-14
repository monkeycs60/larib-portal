-- CreateTable
CREATE TABLE "AdminTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminTagOnCase" (
    "caseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminTagOnCase_pkey" PRIMARY KEY ("caseId","tagId")
);

-- CreateTable
CREATE TABLE "UserTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTagOnCase" (
    "caseId" TEXT NOT NULL,
    "userTagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTagOnCase_pkey" PRIMARY KEY ("caseId","userTagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminTag_name_key" ON "AdminTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserTag_userId_name_key" ON "UserTag"("userId", "name");

-- AddForeignKey
ALTER TABLE "AdminTagOnCase" ADD CONSTRAINT "AdminTagOnCase_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ClinicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminTagOnCase" ADD CONSTRAINT "AdminTagOnCase_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "AdminTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTag" ADD CONSTRAINT "UserTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTagOnCase" ADD CONSTRAINT "UserTagOnCase_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ClinicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTagOnCase" ADD CONSTRAINT "UserTagOnCase_userTagId_fkey" FOREIGN KEY ("userTagId") REFERENCES "UserTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
