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
import { updateAuthor, deleteAuthor, mergeAuthors, recomputeAuthorCentres, createAuthor, isPrismaKnownError } from '@/lib/services/publications/authors'
import { backfillAffiliations, PUBLICATIONS_CENTRES_TAG, PUBLICATIONS_AFFILIATIONS_TAG } from '@/lib/services/publications/affiliations'
import { renameCentre, setCentreOwn, deleteCentre, mergeCentres } from '@/lib/services/publications/centres'
import { updateArticleStatus, ARTICLE_STATUSES } from '@/lib/services/publications/articles'
import { createJournal, updateJournal, deleteJournal, isPrismaKnownError as isJournalError } from '@/lib/services/publications/journals'
import { searchCrossref } from '@/lib/services/publications/journals-catalog'
import { refreshJournalSjr } from '@/lib/services/publications/sjr'
import { createStudy, updateStudy, deleteStudy, STUDY_STATUSES, PUBLICATIONS_STUDIES_TAG } from '@/lib/services/publications/studies'

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
  centreId: z.string().optional().nullable(),
})

export const updateAuthorAction = appAdminAction('PUBLICATIONS')
  .inputSchema(AuthorInput)
  .action(async ({ parsedInput }) => {
    const updated = await updateAuthor({
      ...parsedInput,
      email: parsedInput.email || null,
      userId: parsedInput.userId || null,
      centreId: parsedInput.centreId || null,
    })
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return updated
  })

export const recomputeAuthorCentresAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({}))
  .action(async () => {
    const result = await recomputeAuthorCentres()
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return result
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

const JournalInput = z.object({
  name: z.string().min(1),
  issn: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  impactFactor: z.number().min(0).max(1000).optional().nullable(),
  sjr: z.number().min(0).max(1000).optional().nullable(),
  url: z.string().optional().nullable(),
})

export const searchCrossrefAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ query: z.string().min(1) }))
  .action(async ({ parsedInput }) => searchCrossref(parsedInput.query))

export const addJournalAction = appAdminAction('PUBLICATIONS')
  .inputSchema(JournalInput)
  .action(async ({ parsedInput }) => {
    try {
      const created = await createJournal(parsedInput)
      revalidateTag(PUBLICATIONS_JOURNALS_TAG)
      return created
    } catch (error) {
      if (isJournalError(error, 'P2002')) throw new Error('JOURNAL_EXISTS')
      throw error
    }
  })

export const updateJournalAction = appAdminAction('PUBLICATIONS')
  .inputSchema(JournalInput.extend({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput
    const updated = await updateJournal(id, rest)
    revalidateTag(PUBLICATIONS_JOURNALS_TAG)
    return updated
  })

export const deleteJournalAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    try {
      const deleted = await deleteJournal(parsedInput.id)
      revalidateTag(PUBLICATIONS_JOURNALS_TAG)
      return deleted
    } catch (error) {
      if (isJournalError(error, 'P2003')) throw new Error('JOURNAL_IN_USE')
      throw error
    }
  })

export const refreshSjrAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({}))
  .action(async () => {
    const result = await refreshJournalSjr()
    revalidateTag(PUBLICATIONS_JOURNALS_TAG)
    return result
  })

export const createAuthorAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    degrees: z.string().optional().nullable(),
    orcid: z.string().optional().nullable(),
    centreId: z.string().optional().nullable(),
  }))
  .action(async ({ parsedInput }) => {
    const created = await createAuthor(parsedInput)
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return created
  })

const StudyInputSchema = z.object({
  title: z.string().min(1),
  acronym: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  domain: z.string().optional().nullable(),
  funding: z.string().optional().nullable(),
  status: z.enum(STUDY_STATUSES),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  piIds: z.array(z.string()),
  coInvestigatorIds: z.array(z.string()),
  centreIds: z.array(z.string()),
})

export const createStudyAction = appAdminAction('PUBLICATIONS')
  .inputSchema(StudyInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const created = await createStudy(parsedInput, ctx.userId)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return created
  })

export const updateStudyAction = appAdminAction('PUBLICATIONS')
  .inputSchema(StudyInputSchema.extend({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput
    const updated = await updateStudy(id, rest)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return updated
  })

export const deleteStudyAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const deleted = await deleteStudy(parsedInput.id)
    revalidateTag(PUBLICATIONS_STUDIES_TAG)
    return deleted
  })
