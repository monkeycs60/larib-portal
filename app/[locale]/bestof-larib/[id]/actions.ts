"use server"

import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { authenticatedAction } from '@/actions/safe-action'
import { saveAttempt, validateAttempt, upsertUserSettings } from '@/lib/services/bestof-larib-attempts'
import { htmlToPlainText } from '@/lib/html'
import { caseDetailTag, userCasesTag } from '@/lib/services/bestof-larib'

const ReportSchemaStrict = z.string().refine((value) => htmlToPlainText(value).length >= 10, { message: 'REPORT_TOO_SHORT' })

const SaveAttemptSchema = z.object({
  caseId: z.string().min(1),
  lvef: z.string().optional(),
  kinetic: z.string().optional(),
  lgePresent: z.boolean().optional(),
  lgeDetails: z.string().optional(),
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
      lgePresent: parsedInput.lgePresent,
      lgeDetails: parsedInput.lgeDetails,
      finalDx: parsedInput.finalDx,
      report: parsedInput.report,
    })
    revalidateTag(userCasesTag(ctx.userId))
    revalidateTag(caseDetailTag(parsedInput.caseId))
    return { attemptId }
  })

const ValidateAttemptSchema = z.object({ attemptId: z.string().min(1) })
export const validateAttemptAction = authenticatedAction
  .inputSchema(ValidateAttemptSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await validateAttempt({ userId: ctx.userId, attemptId: parsedInput.attemptId })
    if (result.caseId) {
      revalidateTag(userCasesTag(ctx.userId))
      revalidateTag(caseDetailTag(result.caseId))
    }
    return result
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
    revalidateTag(userCasesTag(ctx.userId))
    revalidateTag(caseDetailTag(parsedInput.caseId))
    return settings
  })

const SaveAllSchema = z.object({
  caseId: z.string().min(1),
  tags: z.array(z.string()).max(50),
  personalDifficulty: z.enum(['BEGINNER','INTERMEDIATE','ADVANCED']).nullable(),
  comments: z.string().nullable(),
  analysis: z.object({ lvef: z.string().optional(), kinetic: z.string().optional(), lgePresent: z.boolean().optional(), lgeDetails: z.string().optional(), finalDx: z.string().optional() }),
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
      lgePresent: parsedInput.analysis.lgePresent,
      lgeDetails: parsedInput.analysis.lgeDetails,
      finalDx: parsedInput.analysis.finalDx,
      report: parsedInput.report,
    })
    revalidateTag(userCasesTag(ctx.userId))
    revalidateTag(caseDetailTag(parsedInput.caseId))
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
      lgePresent: parsedInput.analysis.lgePresent,
      lgeDetails: parsedInput.analysis.lgeDetails,
      finalDx: parsedInput.analysis.finalDx,
      report: parsedInput.report,
    })
    const result = await validateAttempt({ userId: ctx.userId, attemptId })
    revalidateTag(userCasesTag(ctx.userId))
    revalidateTag(caseDetailTag(parsedInput.caseId))
    return { attemptId, ok: result.ok }
  })
