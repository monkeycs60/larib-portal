'use server'

import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { appAdminAction } from '@/actions/safe-action'
import { searchByAuthor, fetchByPmids } from '@/lib/services/publications/pubmed'
import {
  importRecords,
  PUBLICATIONS_JOURNALS_TAG,
  PUBLICATIONS_AUTHORS_TAG,
  PUBLICATIONS_ARTICLES_TAG,
} from '@/lib/services/publications/import'
import { updateAuthor, deleteAuthor, mergeAuthors, isPrismaKnownError } from '@/lib/services/publications/authors'
import { backfillAffiliations, PUBLICATIONS_CENTRES_TAG, PUBLICATIONS_AFFILIATIONS_TAG } from '@/lib/services/publications/affiliations'
import { renameCentre, setCentreOwn, deleteCentre, mergeCentres } from '@/lib/services/publications/centres'
import { updateArticleStatus, ARTICLE_STATUSES } from '@/lib/services/publications/articles'

export const searchBacklogAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ anchor: z.string().min(1), retmax: z.number().int().min(1).max(500).optional() }))
  .action(async ({ parsedInput }) => {
    return searchByAuthor(parsedInput.anchor, parsedInput.retmax ?? 200)
  })

export const importBacklogAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ pmids: z.array(z.string().min(1)).min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const records = await fetchByPmids(parsedInput.pmids)
    const report = await importRecords(records, ctx.userId)
    revalidateTag(PUBLICATIONS_JOURNALS_TAG)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return report
  })

const AuthorInput = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  degrees: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  orcid: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
})

export const updateAuthorAction = appAdminAction('PUBLICATIONS')
  .inputSchema(AuthorInput)
  .action(async ({ parsedInput }) => {
    const updated = await updateAuthor({ ...parsedInput, email: parsedInput.email || null, userId: parsedInput.userId || null })
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return updated
  })

export const deleteAuthorAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    try {
      const deleted = await deleteAuthor(parsedInput.id)
      revalidateTag(PUBLICATIONS_AUTHORS_TAG)
      return deleted
    } catch (error) {
      if (isPrismaKnownError(error, 'P2003')) throw new Error('AUTHOR_IN_USE')
      throw error
    }
  })

export const mergeAuthorsAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ keepId: z.string().min(1), mergeIds: z.array(z.string().min(1)).min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await mergeAuthors(parsedInput.keepId, parsedInput.mergeIds)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return result
  })

export const backfillAffiliationsAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ anchor: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const candidates = await searchByAuthor(parsedInput.anchor, 500)
    const records = await fetchByPmids(candidates.map((candidate) => candidate.pmid))
    const report = await backfillAffiliations(records)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    revalidateTag(PUBLICATIONS_AFFILIATIONS_TAG)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return report
  })

export const renameCentreAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await renameCentre(parsedInput.id, parsedInput.name)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    return result
  })

export const setCentreOwnAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), isOwn: z.boolean() }))
  .action(async ({ parsedInput }) => {
    const result = await setCentreOwn(parsedInput.id, parsedInput.isOwn)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    return result
  })

export const mergeCentresAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ keepId: z.string().min(1), mergeIds: z.array(z.string().min(1)).min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await mergeCentres(parsedInput.keepId, parsedInput.mergeIds)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    return result
  })

export const deleteCentreAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const result = await deleteCentre(parsedInput.id)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    return result
  })

export const updateArticleStatusAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), status: z.enum(ARTICLE_STATUSES) }))
  .action(async ({ parsedInput }) => {
    const updated = await updateArticleStatus(parsedInput.id, parsedInput.status)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return updated
  })
