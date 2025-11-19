"use server"
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { adminOnlyAction, authenticatedAction } from '@/actions/safe-action'
import {
  CASES_TAG,
  DISEASE_TAGS_TAG,
  EXAM_TYPES_TAG,
  caseDetailTag,
  userCasesTag,
  createClinicalCase,
  deleteClinicalCase,
  deleteDiseaseTags,
  deleteExamTypes,
  ensureDiseaseTag,
  ensureExamType,
  updateClinicalCase,
  updateDiseaseTag,
  updateExamType,
} from '@/lib/services/bestof-larib'
import {
  ADMIN_TAGS_TAG,
  ensureAdminTag,
  ensureUserTag,
  caseAdminTagsTag,
  caseUserTagsTag,
  getCaseAdminTagIds,
  getCaseUserTagIds,
  listAdminTags,
  listCasesByAdminTag,
  listCasesByUserTag,
  listUserTags,
  setCaseAdminTags,
  setCaseUserTags,
  userTagsTag,
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
    revalidateTag(CASES_TAG)
    revalidateTag(caseDetailTag(created.id))
    revalidateTag(EXAM_TYPES_TAG)
    revalidateTag(DISEASE_TAGS_TAG)
    return created
  })

export const createExamTypeAction = adminOnlyAction
  .inputSchema(z.object({ name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const ex = await ensureExamType(parsedInput.name)
    revalidateTag(EXAM_TYPES_TAG)
    return ex
  })

export const createDiseaseTagAction = adminOnlyAction
  .inputSchema(z.object({ name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const d = await ensureDiseaseTag(parsedInput.name)
    revalidateTag(DISEASE_TAGS_TAG)
    return d
  })

export const deleteExamTypesAction = adminOnlyAction
  .inputSchema(z.object({ ids: z.array(z.string().min(1)).min(1) }))
  .action(async ({ parsedInput }) => {
    await deleteExamTypes(parsedInput.ids)
    revalidateTag(EXAM_TYPES_TAG)
    return { deleted: parsedInput.ids.length }
  })

export const deleteDiseaseTagsAction = adminOnlyAction
  .inputSchema(z.object({ ids: z.array(z.string().min(1)).min(1) }))
  .action(async ({ parsedInput }) => {
    await deleteDiseaseTags(parsedInput.ids)
    revalidateTag(DISEASE_TAGS_TAG)
    return { deleted: parsedInput.ids.length }
  })

export const updateExamTypeAction = adminOnlyAction
  .inputSchema(z.object({ id: z.string().min(1), name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const updated = await updateExamType(parsedInput.id, parsedInput.name)
    revalidateTag(EXAM_TYPES_TAG)
    return updated
  })

export const updateDiseaseTagAction = adminOnlyAction
  .inputSchema(z.object({ id: z.string().min(1), name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const updated = await updateDiseaseTag(parsedInput.id, parsedInput.name)
    revalidateTag(DISEASE_TAGS_TAG)
    return updated
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
    revalidateTag(CASES_TAG)
    revalidateTag(caseDetailTag(parsedInput.id))
    return updated
  })

export const deleteCaseAction = adminOnlyAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const deleted = await deleteClinicalCase(parsedInput.id)
    revalidateTag(CASES_TAG)
    revalidateTag(caseDetailTag(parsedInput.id))
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
    const created = await ensureAdminTag({ name: parsedInput.name, color: parsedInput.color, description: parsedInput.description })
    revalidateTag(ADMIN_TAGS_TAG)
    revalidateTag(CASES_TAG)
    return created
  })

export const setCaseAdminTagsAction = adminOnlyAction
  .inputSchema(z.object({ caseId: z.string().min(1), tagIds: z.array(z.string().min(1)).default([]) }))
  .action(async ({ parsedInput }) => {
    const result = await setCaseAdminTags(parsedInput.caseId, parsedInput.tagIds)
    revalidateTag(caseAdminTagsTag(parsedInput.caseId))
    revalidateTag(ADMIN_TAGS_TAG)
    revalidateTag(CASES_TAG)
    revalidateTag(caseDetailTag(parsedInput.caseId))
    return result
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
    const tag = await ensureUserTag(ctx.userId, { name: parsedInput.name, color: parsedInput.color, description: parsedInput.description })
    revalidateTag(userTagsTag(ctx.userId))
    revalidateTag(userCasesTag(ctx.userId))
    return tag
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
    const updated = await updateAdminTag(parsedInput)
    revalidateTag(ADMIN_TAGS_TAG)
    revalidateTag(CASES_TAG)
    return updated
  })

export const updateUserTagAction = authenticatedAction
  .inputSchema(UpdateTagSchema)
  .action(async ({ parsedInput, ctx }) => {
    const updated = await updateUserTag(ctx.userId, parsedInput)
    revalidateTag(userTagsTag(ctx.userId))
    revalidateTag(userCasesTag(ctx.userId))
    return updated
  })

export const deleteAdminTagAction = adminOnlyAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await deleteAdminTag(parsedInput.id)
    revalidateTag(ADMIN_TAGS_TAG)
    revalidateTag(CASES_TAG)
    return result
  })

export const deleteUserTagAction = authenticatedAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const result = await deleteUserTag(ctx.userId, parsedInput.id)
    revalidateTag(userTagsTag(ctx.userId))
    revalidateTag(userCasesTag(ctx.userId))
    return result
  })

export const setCaseUserTagsAction = authenticatedAction
  .inputSchema(z.object({ caseId: z.string().min(1), tagIds: z.array(z.string().min(1)).default([]) }))
  .action(async ({ parsedInput, ctx }) => {
    const result = await setCaseUserTags(ctx.userId, parsedInput.caseId, parsedInput.tagIds)
    revalidateTag(caseUserTagsTag(ctx.userId, parsedInput.caseId))
    revalidateTag(userTagsTag(ctx.userId))
    revalidateTag(userCasesTag(ctx.userId))
    revalidateTag(caseDetailTag(parsedInput.caseId))
    return result
  })

export const listCasesByUserTagAction = authenticatedAction
  .inputSchema(z.object({ tagId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    return await listCasesByUserTag(ctx.userId, parsedInput.tagId)
  })
