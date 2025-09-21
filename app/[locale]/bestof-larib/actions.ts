"use server"
import { z } from 'zod'
import { adminOnlyAction, authenticatedAction } from '@/actions/safe-action'
import { createClinicalCase, ensureDiseaseTag, ensureExamType, updateClinicalCase, deleteClinicalCase } from '@/lib/services/bestof-larib'
import {
  ensureAdminTag,
  ensureUserTag,
  getCaseAdminTagIds,
  getCaseUserTagIds,
  listAdminTags,
  listCasesByAdminTag,
  listCasesByUserTag,
  listUserTags,
  setCaseAdminTags,
  setCaseUserTags,
  updateAdminTag,
  deleteAdminTag,
  updateUserTag,
  deleteUserTag,
} from '@/lib/services/bestof-larib-tags'

const CreateCaseSchema = z.object({
  name: z.string().min(1),
  examTypeName: z.string().trim().optional().nullable(),
  diseaseTagName: z.string().trim().optional().nullable(),
  difficulty: z.enum(['BEGINNER','INTERMEDIATE','ADVANCED']),
  tags: z.array(z.string().min(1)).max(10).optional(),
  pdfUrl: z.string().url().optional().nullable(),
  pdfKey: z.string().optional().nullable(),
  textContent: z.string().trim().optional().nullable(),
  status: z.enum(['DRAFT','PUBLISHED']),
})

export const createCaseAction = authenticatedAction
  .inputSchema(CreateCaseSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Validation: at least one content source for published, drafts can be empty
    if (parsedInput.status === 'PUBLISHED') {
      if (!parsedInput.pdfUrl && !parsedInput.textContent) {
        throw new Error('CONTENT_REQUIRED')
      }
      if (!parsedInput.examTypeName || !parsedInput.diseaseTagName) {
        throw new Error('FIELDS_REQUIRED')
      }
    }
    // Exclusivity always enforced
    if (parsedInput.pdfUrl && parsedInput.textContent) {
      throw new Error('CONTENT_EXCLUSIVE')
    }
    const created = await createClinicalCase({
      ...parsedInput,
      createdById: ctx.userId,
    })
    return created
  })

export const createExamTypeAction = adminOnlyAction
  .inputSchema(z.object({ name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const ex = await ensureExamType(parsedInput.name)
    return ex
  })

export const createDiseaseTagAction = adminOnlyAction
  .inputSchema(z.object({ name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const d = await ensureDiseaseTag(parsedInput.name)
    return d
  })

const UpdateCaseSchema = CreateCaseSchema.extend({ id: z.string().min(1) })

export const updateCaseAction = adminOnlyAction
  .inputSchema(UpdateCaseSchema)
  .action(async ({ parsedInput }) => {
    if (parsedInput.status === 'PUBLISHED') {
      if (!parsedInput.pdfUrl && !parsedInput.textContent) {
        throw new Error('CONTENT_REQUIRED')
      }
      if (!parsedInput.examTypeName || !parsedInput.diseaseTagName) {
        throw new Error('FIELDS_REQUIRED')
      }
    }
    if (parsedInput.pdfUrl && parsedInput.textContent) {
      throw new Error('CONTENT_EXCLUSIVE')
    }
    const updated = await updateClinicalCase(parsedInput)
    return updated
  })

export const deleteCaseAction = adminOnlyAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const deleted = await deleteClinicalCase(parsedInput.id)
    return deleted
  })

// --- Tagging actions ---

// Shared admin tags
export const listAdminTagsAction = adminOnlyAction
  .action(async () => {
    return await listAdminTags()
  })

export const getCaseAdminTagIdsAction = adminOnlyAction
  .inputSchema(z.object({ caseId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    return await getCaseAdminTagIds(parsedInput.caseId)
  })

export const ensureAdminTagAction = adminOnlyAction
  .inputSchema(z.object({ name: z.string().min(1), color: z.string().min(1), description: z.string().trim().optional().nullable() }))
  .action(async ({ parsedInput }) => {
    return await ensureAdminTag({ name: parsedInput.name, color: parsedInput.color, description: parsedInput.description })
  })

export const setCaseAdminTagsAction = adminOnlyAction
  .inputSchema(z.object({ caseId: z.string().min(1), tagIds: z.array(z.string().min(1)).default([]) }))
  .action(async ({ parsedInput }) => {
    return await setCaseAdminTags(parsedInput.caseId, parsedInput.tagIds)
  })

export const listCasesByAdminTagAction = adminOnlyAction
  .inputSchema(z.object({ tagId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    return await listCasesByAdminTag(parsedInput.tagId)
  })

// Private user tags
export const listUserTagsAction = authenticatedAction
  .action(async ({ ctx }) => {
    return await listUserTags(ctx.userId)
  })

export const getCaseUserTagIdsAction = authenticatedAction
  .inputSchema(z.object({ caseId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    return await getCaseUserTagIds(ctx.userId, parsedInput.caseId)
  })

export const ensureUserTagAction = authenticatedAction
  .inputSchema(z.object({ name: z.string().min(1), color: z.string().min(1), description: z.string().trim().optional().nullable() }))
  .action(async ({ parsedInput, ctx }) => {
    return await ensureUserTag(ctx.userId, { name: parsedInput.name, color: parsedInput.color, description: parsedInput.description })
  })

const UpdateTagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
  description: z.string().trim().optional().nullable(),
})

export const updateAdminTagAction = adminOnlyAction
  .inputSchema(UpdateTagSchema)
  .action(async ({ parsedInput }) => {
    return await updateAdminTag(parsedInput)
  })

export const updateUserTagAction = authenticatedAction
  .inputSchema(UpdateTagSchema)
  .action(async ({ parsedInput, ctx }) => {
    return await updateUserTag(ctx.userId, parsedInput)
  })

export const deleteAdminTagAction = adminOnlyAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    return await deleteAdminTag(parsedInput.id)
  })

export const deleteUserTagAction = authenticatedAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    return await deleteUserTag(ctx.userId, parsedInput.id)
  })

export const setCaseUserTagsAction = authenticatedAction
  .inputSchema(z.object({ caseId: z.string().min(1), tagIds: z.array(z.string().min(1)).default([]) }))
  .action(async ({ parsedInput, ctx }) => {
    return await setCaseUserTags(ctx.userId, parsedInput.caseId, parsedInput.tagIds)
  })

export const listCasesByUserTagAction = authenticatedAction
  .inputSchema(z.object({ tagId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    return await listCasesByUserTag(ctx.userId, parsedInput.tagId)
  })
