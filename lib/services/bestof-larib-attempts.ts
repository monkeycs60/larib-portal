import { prisma } from '@/lib/prisma'

export type SaveAttemptInput = {
  userId: string
  caseId: string
  lvef?: string
  kinetic?: string
  lge?: string
  finalDx?: string
  report?: string
}

export async function saveAttempt(input: SaveAttemptInput): Promise<string> {
  const created = await prisma.caseAttempt.create({
    data: {
      id: crypto.randomUUID(),
      userId: input.userId,
      caseId: input.caseId,
      lvef: input.lvef ?? null,
      kinetic: input.kinetic ?? null,
      lge: input.lge ?? null,
      finalDx: input.finalDx ?? null,
      report: input.report ?? null,
    },
    select: { id: true },
  })
  return created.id
}

export async function validateAttempt({ userId, attemptId }: { userId: string; attemptId: string }): Promise<boolean> {
  const attempt = await prisma.caseAttempt.findUnique({ where: { id: attemptId }, select: { id: true, userId: true } })
  if (!attempt || attempt.userId !== userId) return false
  await prisma.caseAttempt.update({ where: { id: attemptId }, data: { validatedAt: new Date() } })
  return true
}

export async function upsertUserSettings(input: { userId: string; caseId: string; tags: string[]; personalDifficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'; comments?: string | null }) {
  const settings = await prisma.userCaseSettings.upsert({
    where: { userId_caseId: { userId: input.userId, caseId: input.caseId } },
    update: {
      tags: input.tags,
      personalDifficulty: input.personalDifficulty ?? null,
      comments: input.comments ?? null,
    },
    create: {
      id: crypto.randomUUID(),
      userId: input.userId,
      caseId: input.caseId,
      tags: input.tags,
      personalDifficulty: input.personalDifficulty ?? null,
      comments: input.comments ?? null,
    },
    select: { id: true },
  })
  return settings
}
