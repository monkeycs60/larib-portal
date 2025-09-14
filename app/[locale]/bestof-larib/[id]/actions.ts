"use server"

import { z } from 'zod'
import { authenticatedAction } from '@/actions/safe-action'
import { saveAttempt, validateAttempt, upsertUserSettings } from '@/lib/services/bestof-larib-attempts'

const SaveAttemptSchema = z.object({
  caseId: z.string().min(1),
  lvef: z.string().min(1).optional(),
  kinetic: z.string().min(1).optional(),
  lge: z.string().min(1).optional(),
  finalDx: z.string().min(1).optional(),
  report: z.string().min(1).optional(),
})

export const saveAttemptAction = authenticatedAction
  .inputSchema(SaveAttemptSchema)
  .action(async ({ parsedInput, ctx }) => {
    const attemptId = await saveAttempt({
      userId: ctx.userId,
      caseId: parsedInput.caseId,
      lvef: parsedInput.lvef,
      kinetic: parsedInput.kinetic,
      lge: parsedInput.lge,
      finalDx: parsedInput.finalDx,
      report: parsedInput.report,
    })
    return { attemptId }
  })

const ValidateAttemptSchema = z.object({ attemptId: z.string().min(1) })
export const validateAttemptAction = authenticatedAction
  .inputSchema(ValidateAttemptSchema)
  .action(async ({ parsedInput, ctx }) => {
    const ok = await validateAttempt({ userId: ctx.userId, attemptId: parsedInput.attemptId })
    return { ok }
  })

const UpsertSettingsSchema = z.object({
  caseId: z.string().min(1),
  tags: z.array(z.string()).max(50).optional(),
  personalDifficulty: z.enum(['BEGINNER','INTERMEDIATE','ADVANCED']).optional(),
  comments: z.string().optional(),
})

export const upsertSettingsAction = authenticatedAction
  .inputSchema(UpsertSettingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const settings = await upsertUserSettings({
      userId: ctx.userId,
      caseId: parsedInput.caseId,
      tags: parsedInput.tags ?? [],
      personalDifficulty: parsedInput.personalDifficulty,
      comments: parsedInput.comments ?? null,
    })
    return settings
  })
