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

const toNullable = (value?: string | null): string | null => {
  if (typeof value !== 'string') return null
  return value.trim().length > 0 ? value : null
}

export async function saveAttempt(input: SaveAttemptInput): Promise<string> {
  // Reuse the latest draft (unvalidated) attempt for this user/case, or create one if missing.
  const existingDraft = await prisma.caseAttempt.findFirst({
    where: { userId: input.userId, caseId: input.caseId, validatedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  if (existingDraft) {
    const updated = await prisma.caseAttempt.update({
      where: { id: existingDraft.id },
      data: {
        lvef: toNullable(input.lvef ?? null),
        kinetic: toNullable(input.kinetic ?? null),
        lge: toNullable(input.lge ?? null),
        finalDx: toNullable(input.finalDx ?? null),
        report: toNullable(input.report ?? null),
      },
      select: { id: true },
    })
    return updated.id
  }
  const created = await prisma.caseAttempt.create({
    data: {
      id: crypto.randomUUID(),
      userId: input.userId,
      caseId: input.caseId,
      lvef: toNullable(input.lvef ?? null),
      kinetic: toNullable(input.kinetic ?? null),
      lge: toNullable(input.lge ?? null),
      finalDx: toNullable(input.finalDx ?? null),
      report: toNullable(input.report ?? null),
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

export type UserCaseState = {
  settings: {
    tags: string[]
    personalDifficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null
    comments: string | null
  } | null
  lastAttempt: {
    id: string
    lvef: string | null
    kinetic: string | null
    lge: string | null
    finalDx: string | null
    report: string | null
    validatedAt: Date | null
  } | null
}

export async function getUserCaseState(params: { userId: string; caseId: string }): Promise<UserCaseState> {
  const [settings, lastAttempt] = await Promise.all([
    prisma.userCaseSettings.findUnique({
      where: { userId_caseId: { userId: params.userId, caseId: params.caseId } },
      select: { tags: true, personalDifficulty: true, comments: true },
    }),
    prisma.caseAttempt.findFirst({
      where: { userId: params.userId, caseId: params.caseId },
      orderBy: [{ validatedAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, lvef: true, kinetic: true, lge: true, finalDx: true, report: true, validatedAt: true },
    }),
  ])

  return {
    settings: settings ? {
      tags: settings.tags,
      personalDifficulty: settings.personalDifficulty,
      comments: settings.comments,
    } : null,
    lastAttempt: lastAttempt ? {
      id: lastAttempt.id,
      lvef: lastAttempt.lvef,
      kinetic: lastAttempt.kinetic,
      lge: lastAttempt.lge,
      finalDx: lastAttempt.finalDx,
      report: lastAttempt.report,
      validatedAt: lastAttempt.validatedAt,
    } : null,
  }
}

export type CaseAttemptSummary = {
  id: string
  createdAt: Date
  validatedAt: Date | null
  lvef: string | null
  kinetic: string | null
  lge: string | null
  finalDx: string | null
  report: string | null
}

export async function listUserCaseAttempts(params: { userId: string; caseId: string }): Promise<CaseAttemptSummary[]> {
  return prisma.caseAttempt.findMany({
    where: { userId: params.userId, caseId: params.caseId },
    orderBy: [{ validatedAt: 'desc' }, { createdAt: 'desc' }],
    select: { id: true, createdAt: true, validatedAt: true, lvef: true, kinetic: true, lge: true, finalDx: true, report: true },
  })
}
