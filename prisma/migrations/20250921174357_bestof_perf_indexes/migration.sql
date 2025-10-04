-- CreateIndex
CREATE INDEX "AdminTagOnCase_tagId_idx" ON "AdminTagOnCase"("tagId");

-- CreateIndex
CREATE INDEX "CaseAttempt_userId_caseId_validatedAt_createdAt_idx" ON "CaseAttempt"("userId", "caseId", "validatedAt", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicalCase_difficulty_idx" ON "ClinicalCase"("difficulty");

-- CreateIndex
CREATE INDEX "ClinicalCase_diseaseTagId_idx" ON "ClinicalCase"("diseaseTagId");

-- CreateIndex
CREATE INDEX "ClinicalCase_examTypeId_idx" ON "ClinicalCase"("examTypeId");

-- CreateIndex
CREATE INDEX "ClinicalCase_status_createdAt_idx" ON "ClinicalCase"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Session_userId_createdAt_idx" ON "Session"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserTagOnCase_userTagId_idx" ON "UserTagOnCase"("userTagId");
