'use server'

import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { appAdminAction, appMemberAction, authenticatedAction } from '@/actions/safe-action'
import { canAccessApp, canAdminApp } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { addSubmission, updateSubmissionStatus, updateSubmission, deleteSubmission, userOwnsSubmission, SUBMISSION_STATUSES } from '@/lib/services/publications/submissions'
import { userIsAuthorOfArticle } from '@/lib/services/publications/my-publications'
import { createDraftArticle, updateArticleCore, deleteDraft, userIsFirstAuthor } from '@/lib/services/publications/publication-editor'
import { createAuthorListRequest, resolveAuthorRequest, PUBLICATIONS_REQUESTS_TAG } from '@/lib/services/publications/author-requests'
import { searchByAuthor, fetchByPmids } from '@/lib/services/publications/pubmed'
import {
  importRecords,
  PUBLICATIONS_JOURNALS_TAG,
  PUBLICATIONS_AUTHORS_TAG,
  PUBLICATIONS_ARTICLES_TAG,
} from '@/lib/services/publications/import'
import { updateAuthor, deleteAuthor, mergeAuthors, recomputeAuthorCentres, createAuthor, getAuthorDetail, getAuthorForEdit, isPrismaKnownError } from '@/lib/services/publications/authors'
import { findAuthorDuplicates, matchAuthorsAgainstBank, normalizeName } from '@/lib/services/publications/author-dedup'
import { fetchPublicationByIdentifier } from '@/lib/services/publications/publication-lookup'
import { backfillAffiliations, PUBLICATIONS_CENTRES_TAG, PUBLICATIONS_AFFILIATIONS_TAG } from '@/lib/services/publications/affiliations'
import { renameCentre, setCentreOwn, deleteCentre, mergeCentres, getCentreAuthors, createCentre, updateCentre } from '@/lib/services/publications/centres'
import { updateArticleStatus, updateArticleType, ARTICLE_STATUSES } from '@/lib/services/publications/articles'
import { ARTICLE_TYPE_VALUES } from '@/lib/publications/article-type'
import { createJournal, updateJournal, deleteJournal, isPrismaKnownError as isJournalError } from '@/lib/services/publications/journals'
import { searchCrossref } from '@/lib/services/publications/journals-catalog'
import { refreshJournalSjr } from '@/lib/services/publications/sjr'
import { createStudy, updateStudy, deleteStudy, importClinicalTrialStudy, STUDY_STATUSES, PUBLICATIONS_STUDIES_TAG } from '@/lib/services/publications/studies'
import { fetchClinicalTrial, normaliseNctId } from '@/lib/services/publications/clinicaltrials'

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
  degrees: z.array(z.string()).default([]),
  orcid: z.string().trim().optional().nullable(),
  userId: z.string().optional().nullable(),
  emails: z.array(z.string().email()).default([]),
  centreIds: z.array(z.string()).default([]),
  affiliations: z.array(z.string()).default([]),
})

export const updateAuthorAction = appAdminAction('PUBLICATIONS')
  .inputSchema(AuthorInput)
  .action(async ({ parsedInput }) => {
    const updated = await updateAuthor({
      id: parsedInput.id,
      firstName: parsedInput.firstName,
      lastName: parsedInput.lastName,
      degrees: parsedInput.degrees.length ? parsedInput.degrees.join(', ') : null,
      orcid: parsedInput.orcid || null,
      userId: parsedInput.userId || null,
      emails: parsedInput.emails,
      centreIds: parsedInput.centreIds,
      affiliations: parsedInput.affiliations,
    })
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return updated
  })

export const getAuthorForEditAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => getAuthorForEdit(parsedInput.id))

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

export const getAuthorDetailAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => getAuthorDetail(parsedInput.id))

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

export const createCentreAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ name: z.string().min(1), shortCode: z.string().optional().nullable(), parentOrganisation: z.string().optional().nullable(), city: z.string().optional().nullable(), country: z.string().optional().nullable() }))
  .action(async ({ parsedInput }) => {
    const result = await createCentre(parsedInput)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    return result
  })

export const updateCentreAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), name: z.string().min(1), shortCode: z.string().optional().nullable(), parentOrganisation: z.string().optional().nullable(), city: z.string().optional().nullable(), country: z.string().optional().nullable(), isOwn: z.boolean().default(false) }))
  .action(async ({ parsedInput }) => {
    const result = await updateCentre(parsedInput)
    revalidateTag(PUBLICATIONS_CENTRES_TAG)
    return result
  })

export const getCentreAuthorsAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => getCentreAuthors(parsedInput.id))

export const updateArticleStatusAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), status: z.enum(ARTICLE_STATUSES) }))
  .action(async ({ parsedInput }) => {
    const updated = await updateArticleStatus(parsedInput.id, parsedInput.status)
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return updated
  })

export const updateArticleTypeAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), type: z.enum(ARTICLE_TYPE_VALUES) }))
  .action(async ({ parsedInput }) => {
    const updated = await updateArticleType(parsedInput.id, parsedInput.type)
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

const CreateAuthorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  degrees: z.array(z.string()).default([]),
  emails: z.array(z.string().email()).default([]),
  orcid: z.string().trim().optional().nullable(),
  centreIds: z.array(z.string()).default([]),
  affiliations: z.array(z.string()).default([]),
  userId: z.string().optional().nullable(),
  confirmDuplicate: z.boolean().default(false),
})

export const createAuthorAction = appMemberAction('PUBLICATIONS')
  .inputSchema(CreateAuthorSchema)
  .action(async ({ parsedInput }) => {
    const { orcidMatch, nameMatches } = await findAuthorDuplicates({
      orcid: parsedInput.orcid ?? null,
      firstName: parsedInput.firstName,
      lastName: parsedInput.lastName,
    })
    if (orcidMatch) {
      return { status: 'blocked' as const, reason: 'ORCID' as const, match: { id: orcidMatch.id, firstName: orcidMatch.firstName, lastName: orcidMatch.lastName } }
    }
    if (nameMatches.length > 0 && !parsedInput.confirmDuplicate) {
      return { status: 'warning' as const, reason: 'NAME' as const, matches: nameMatches.map((match) => ({ id: match.id, firstName: match.firstName, lastName: match.lastName })) }
    }
    const created = await createAuthor({
      firstName: parsedInput.firstName,
      lastName: parsedInput.lastName,
      degrees: parsedInput.degrees.length ? parsedInput.degrees.join(', ') : null,
      emails: parsedInput.emails,
      orcid: parsedInput.orcid ?? null,
      centreIds: parsedInput.centreIds,
      affiliations: parsedInput.affiliations,
      userId: parsedInput.userId ?? null,
    })
    revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return { status: 'created' as const, author: created }
  })

export const fetchPublicationAuthorsAction = appMemberAction('PUBLICATIONS')
  .inputSchema(z.object({ identifier: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const publication = await fetchPublicationByIdentifier(parsedInput.identifier)
    const bank = await prisma.author.findMany({ select: { id: true, firstName: true, lastName: true, orcid: true } })
    const authors = matchAuthorsAgainstBank(bank, publication.authors)
    return { publication: { title: publication.title, journal: publication.journal, year: publication.year, doi: publication.doi }, authors }
  })

export const addAuthorsFromPublicationAction = appMemberAction('PUBLICATIONS')
  .inputSchema(z.object({
    authors: z.array(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      orcid: z.string().nullable().optional(),
      affiliationRaw: z.string().nullable().optional(),
    })).min(1),
  }))
  .action(async ({ parsedInput }) => {
    const bank = await prisma.author.findMany({ select: { id: true, firstName: true, lastName: true, orcid: true } })
    const rows = matchAuthorsAgainstBank(bank, parsedInput.authors)
    const toCreate = rows.filter((row) => row.status === 'new')
    const seenKeys = new Set<string>()
    let created = 0
    for (const author of toCreate) {
      const orcid = author.orcid?.trim()
      const dedupKey = orcid
        ? `orcid:${orcid}`
        : `name:${normalizeName(author.firstName)}|${normalizeName(author.lastName)}`
      if (seenKeys.has(dedupKey)) continue
      seenKeys.add(dedupKey)
      await createAuthor({ firstName: author.firstName, lastName: author.lastName, orcid: author.orcid ?? null, affiliations: author.affiliationRaw ? [author.affiliationRaw] : [] })
      created += 1
    }
    if (created > 0) revalidateTag(PUBLICATIONS_AUTHORS_TAG)
    return { created, skipped: rows.length - created }
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

export const previewClinicalTrialAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ nctId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const normalised = normaliseNctId(parsedInput.nctId)
    if (!normalised) return { ok: false as const, error: 'INVALID_NCT_ID' }
    const existing = await prisma.study.findUnique({ where: { nctId: normalised }, select: { id: true } })
    if (existing) return { ok: false as const, error: 'DUPLICATE' }
    try {
      const preview = await fetchClinicalTrial(normalised)
      return { ok: true as const, preview }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'FETCH_FAILED'
      return { ok: false as const, error: reason }
    }
  })

export const importClinicalTrialAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ nctId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const normalised = normaliseNctId(parsedInput.nctId)
    if (!normalised) return { ok: false as const, error: 'INVALID_NCT_ID' }
    try {
      const preview = await fetchClinicalTrial(normalised)
      const result = await importClinicalTrialStudy(preview, ctx.userId)
      revalidateTag(PUBLICATIONS_STUDIES_TAG)
      revalidateTag(PUBLICATIONS_CENTRES_TAG)
      return { ok: true as const, result }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'IMPORT_FAILED'
      return { ok: false as const, error: reason }
    }
  })

// ---- My Publications: submission tracking (user-owned) ----

export const addSubmissionAction = authenticatedAction
  .inputSchema(
    z.object({
      articleId: z.string().min(1),
      journalName: z.string().min(1),
      submittedAt: z.string().min(1),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    if (!(await userIsAuthorOfArticle(ctx.userId, parsedInput.articleId))) throw new Error('Forbidden')
    return addSubmission({
      articleId: parsedInput.articleId,
      journalName: parsedInput.journalName,
      submittedAt: new Date(parsedInput.submittedAt),
    })
  })

export const updateSubmissionStatusAction = authenticatedAction
  .inputSchema(
    z.object({
      submissionId: z.string().min(1),
      status: z.enum(SUBMISSION_STATUSES),
      decidedAt: z.string().min(1).nullable(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    if (!(await userOwnsSubmission(ctx.userId, parsedInput.submissionId))) throw new Error('Forbidden')
    return updateSubmissionStatus({
      submissionId: parsedInput.submissionId,
      status: parsedInput.status,
      decidedAt: parsedInput.decidedAt ? new Date(parsedInput.decidedAt) : null,
    })
  })

// ---- User publication editor ----

export const createDraftArticleAction = authenticatedAction
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    return createDraftArticle(ctx.userId)
  })

export const updateArticleCoreAction = authenticatedAction
  .inputSchema(
    z.object({
      id: z.string().min(1),
      title: z.string(),
      type: z.enum(ARTICLE_TYPE_VALUES),
      status: z.enum(ARTICLE_STATUSES),
      studyId: z.string().nullable(),
      pubmedId: z.string().nullable(),
      doi: z.string().nullable(),
      contributorsNote: z.string().nullable(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const canEdit = canAdminApp(ctx.user, 'PUBLICATIONS') || (await userIsFirstAuthor(ctx.userId, parsedInput.id))
    if (!canEdit) throw new Error('Forbidden')
    const { id, ...rest } = parsedInput
    const updated = await updateArticleCore(id, {
      title: rest.title,
      type: rest.type,
      status: rest.status,
      studyId: rest.studyId || null,
      pubmedId: rest.pubmedId || null,
      doi: rest.doi || null,
      contributorsNote: rest.contributorsNote || null,
    })
    revalidateTag(PUBLICATIONS_ARTICLES_TAG)
    return updated
  })

export const deleteDraftArticleAction = authenticatedAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const canEdit = canAdminApp(ctx.user, 'PUBLICATIONS') || (await userIsFirstAuthor(ctx.userId, parsedInput.id))
    if (!canEdit) throw new Error('Forbidden')
    return deleteDraft(parsedInput.id)
  })

export const updateSubmissionAction = authenticatedAction
  .inputSchema(z.object({ submissionId: z.string().min(1), journalName: z.string().min(1), submittedAt: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    if (!(await userOwnsSubmission(ctx.userId, parsedInput.submissionId))) throw new Error('Forbidden')
    return updateSubmission({
      submissionId: parsedInput.submissionId,
      journalName: parsedInput.journalName,
      submittedAt: new Date(parsedInput.submittedAt),
    })
  })

export const deleteSubmissionAction = authenticatedAction
  .inputSchema(z.object({ submissionId: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    if (!canAccessApp(ctx.user, 'PUBLICATIONS')) throw new Error('Forbidden')
    if (!(await userOwnsSubmission(ctx.userId, parsedInput.submissionId))) throw new Error('Forbidden')
    return deleteSubmission(parsedInput.submissionId)
  })

export const requestAuthorListAction = authenticatedAction
  .inputSchema(z.object({ articleId: z.string().min(1), note: z.string().nullable() }))
  .action(async ({ parsedInput, ctx }) => {
    if (!(await userIsAuthorOfArticle(ctx.userId, parsedInput.articleId))) throw new Error('Forbidden')
    try {
      return await createAuthorListRequest(parsedInput.articleId, ctx.userId, parsedInput.note || null)
    } catch (error) {
      if (error instanceof Error && error.message === 'REQUEST_EXISTS') throw new Error('REQUEST_EXISTS')
      throw error
    }
  })

export const resolveAuthorRequestAction = appAdminAction('PUBLICATIONS')
  .inputSchema(z.object({ id: z.string().min(1), outcome: z.enum(['RESOLVED', 'DISMISSED']) }))
  .action(async ({ parsedInput, ctx }) => {
    const result = await resolveAuthorRequest(parsedInput.id, ctx.userId, parsedInput.outcome)
    revalidateTag(PUBLICATIONS_REQUESTS_TAG)
    return result
  })
