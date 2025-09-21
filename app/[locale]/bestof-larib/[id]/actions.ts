"use server"

import { z } from 'zod'
import { authenticatedAction } from '@/actions/safe-action'
import { saveAttempt, validateAttempt, upsertUserSettings } from '@/lib/services/bestof-larib-attempts'
import { htmlToPlainText } from '@/lib/html'

const ReportSchemaStrict = z.string().refine((value) => htmlToPlainText(value).length >= 10, { message: 'REPORT_TOO_SHORT' })

const SaveAttemptSchema = z.object({
  caseId: z.string().min(1),
  lvef: z.string().optional(),
  kinetic: z.string().optional(),
  lge: z.string().optional(),
  finalDx: z.string().optional(),
  report: z.string().optional(),
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

const SaveAllSchema = z.object({
  caseId: z.string().min(1),
  tags: z.array(z.string()).max(50),
  personalDifficulty: z.enum(['BEGINNER','INTERMEDIATE','ADVANCED']).nullable(),
  comments: z.string().nullable(),
  analysis: z.object({ lvef: z.string().optional(), kinetic: z.string().optional(), lge: z.string().optional(), finalDx: z.string().optional() }),
  report: z.string().optional(),
})

const SaveAllAndValidateSchema = SaveAllSchema.extend({
  report: ReportSchemaStrict,
})

export const saveAllAction = authenticatedAction
  .inputSchema(SaveAllSchema)
  .action(async ({ parsedInput, ctx }) => {
    await upsertUserSettings({
      userId: ctx.userId,
      caseId: parsedInput.caseId,
      tags: parsedInput.tags,
      personalDifficulty: parsedInput.personalDifficulty ?? undefined,
      comments: parsedInput.comments,
    })
    const attemptId = await saveAttempt({
      userId: ctx.userId,
      caseId: parsedInput.caseId,
      lvef: parsedInput.analysis.lvef,
      kinetic: parsedInput.analysis.kinetic,
      lge: parsedInput.analysis.lge,
      finalDx: parsedInput.analysis.finalDx,
      report: parsedInput.report,
    })
    return { attemptId }
  })

export const saveAllAndValidateAction = authenticatedAction
  .inputSchema(SaveAllAndValidateSchema)
  .action(async ({ parsedInput, ctx }) => {
    await upsertUserSettings({
      userId: ctx.userId,
      caseId: parsedInput.caseId,
      tags: parsedInput.tags,
      personalDifficulty: parsedInput.personalDifficulty ?? undefined,
      comments: parsedInput.comments,
    })
    const attemptId = await saveAttempt({
      userId: ctx.userId,
      caseId: parsedInput.caseId,
      lvef: parsedInput.analysis.lvef,
      kinetic: parsedInput.analysis.kinetic,
      lge: parsedInput.analysis.lge,
      finalDx: parsedInput.analysis.finalDx,
      report: parsedInput.report,
    })
    const ok = await validateAttempt({ userId: ctx.userId, attemptId })
    return { attemptId, ok }
  })
