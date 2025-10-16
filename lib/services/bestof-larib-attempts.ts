import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { caseDetailTag, userCasesTag } from './bestof-larib'
import { caseUserTagsTag } from './bestof-larib-tags'

export type SaveAttemptInput = {
  userId: string
  caseId: string
  lvef?: string
  kinetic?: string
  lgePresent?: boolean
  lgeDetails?: string
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
        lgePresent: input.lgePresent ?? null,
        lgeDetails: toNullable(input.lgeDetails ?? null),
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
      lgePresent: input.lgePresent ?? null,
      lgeDetails: toNullable(input.lgeDetails ?? null),
      finalDx: toNullable(input.finalDx ?? null),
      report: toNullable(input.report ?? null),
    },
    select: { id: true },
  })
  return created.id
}

export async function validateAttempt({ userId, attemptId }: { userId: string; attemptId: string }): Promise<{ ok: boolean; caseId: string | null }> {
  const attempt = await prisma.caseAttempt.findUnique({ where: { id: attemptId }, select: { id: true, userId: true, caseId: true } })
  if (!attempt || attempt.userId !== userId) return { ok: false, caseId: null }
  await prisma.caseAttempt.update({ where: { id: attemptId }, data: { validatedAt: new Date() } })
  return { ok: true, caseId: attempt.caseId }
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
    lgePresent: boolean | null
    lgeDetails: string | null
    finalDx: string | null
    report: string | null
    validatedAt: Date | null
  } | null
}

const fetchUserCaseState = async (userId: string, caseId: string): Promise<UserCaseState> => {
  const [settings, lastAttempt] = await Promise.all([
    prisma.userCaseSettings.findUnique({
      where: { userId_caseId: { userId, caseId } },
      select: { tags: true, personalDifficulty: true, comments: true },
    }),
    prisma.caseAttempt.findFirst({
      where: { userId, caseId },
      orderBy: [{ validatedAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, lvef: true, kinetic: true, lgePresent: true, lgeDetails: true, finalDx: true, report: true, validatedAt: true },
    }),
  ])

  return {
    settings: settings
      ? {
          tags: settings.tags,
          personalDifficulty: settings.personalDifficulty,
          comments: settings.comments,
        }
      : null,
    lastAttempt: lastAttempt
      ? {
          id: lastAttempt.id,
          lvef: lastAttempt.lvef,
          kinetic: lastAttempt.kinetic,
          lgePresent: lastAttempt.lgePresent,
          lgeDetails: lastAttempt.lgeDetails,
          finalDx: lastAttempt.finalDx,
          report: lastAttempt.report,
          validatedAt: lastAttempt.validatedAt,
        }
      : null,
  }
}

const cachedUserCaseState = cache(async (userId: string, caseId: string) =>
  unstable_cache(
    () => fetchUserCaseState(userId, caseId),
    ['bestof:user-case-state', userId, caseId],
    { tags: [userCasesTag(userId), caseDetailTag(caseId), caseUserTagsTag(userId, caseId)] },
  )(),
)

export async function getUserCaseState(params: { userId: string; caseId: string }): Promise<UserCaseState> {
  return cachedUserCaseState(params.userId, params.caseId)
}

export type CaseAttemptSummary = {
  id: string
  createdAt: Date
  validatedAt: Date | null
  lvef: string | null
  kinetic: string | null
  lgePresent: boolean | null
  lgeDetails: string | null
  finalDx: string | null
  report: string | null
}

const cachedUserCaseAttempts = cache(async (userId: string, caseId: string) =>
  unstable_cache(
    () =>
      prisma.caseAttempt.findMany({
        where: { userId, caseId },
        orderBy: [{ validatedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          createdAt: true,
          validatedAt: true,
          lvef: true,
          kinetic: true,
          lgePresent: true,
          lgeDetails: true,
          finalDx: true,
          report: true,
        },
      }),
    ['bestof:user-case-attempts', userId, caseId],
    { tags: [userCasesTag(userId), caseDetailTag(caseId)] },
  )(),
)

export async function listUserCaseAttempts(params: { userId: string; caseId: string }): Promise<CaseAttemptSummary[]> {
  return cachedUserCaseAttempts(params.userId, params.caseId)
}
