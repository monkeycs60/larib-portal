"use server"
import { z } from 'zod'
import { adminOnlyAction, authenticatedAction } from '@/actions/safe-action'
import { createClinicalCase, ensureDiseaseTag, ensureExamType, updateClinicalCase, deleteClinicalCase } from '@/lib/services/bestof-larib'

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
