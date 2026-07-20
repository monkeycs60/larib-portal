import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import type { ClinicalTrialImport } from './clinicaltrials'

export const PUBLICATIONS_STUDIES_TAG = 'publications:studies'
export const STUDY_STATUSES = ['PLANNED', 'ONGOING', 'COMPLETED', 'STOPPED'] as const
export type StudyStatusValue = (typeof STUDY_STATUSES)[number]

export type StudyListItem = Prisma.StudyGetPayload<{
  select: {
    id: true
    title: true
    acronym: true
    nctId: true
    description: true
    domain: true
    funding: true
    enrollment: true
    status: true
    startDate: true
    endDate: true
    investigators: { select: { authorId: true; role: true } }
    centres: { select: { id: true } }
    _count: { select: { articles: true; investigators: true; centres: true } }
  }
}>

export async function listStudies(): Promise<StudyListItem[]> {
  return prisma.study.findMany({
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      acronym: true,
      nctId: true,
      description: true,
      domain: true,
      funding: true,
      enrollment: true,
      status: true,
      startDate: true,
      endDate: true,
      investigators: { select: { authorId: true, role: true } },
      centres: { select: { id: true } },
      _count: { select: { articles: true, investigators: true, centres: true } },
    },
  })
}

export type StudyOption = { id: string; label: string }

export async function listStudyOptions(): Promise<StudyOption[]> {
  const studies = await prisma.study.findMany({
    orderBy: [{ acronym: 'asc' }, { title: 'asc' }],
    select: { id: true, title: true, acronym: true },
  })
  return studies.map((study) => ({ id: study.id, label: study.acronym ?? study.title }))
}

export type StudyInput = {
  title: string
  nctId?: string | null
  acronym?: string | null
  description?: string | null
  domain?: string | null
  funding?: string | null
  enrollment?: number | null
  status: StudyStatusValue
  startDate?: string | null
  endDate?: string | null
  piIds: string[]
  coInvestigatorIds: string[]
  centreIds: string[]
}

function investigatorCreate(input: StudyInput): Array<{ authorId: string; role: 'PI' | 'CO_INVESTIGATOR' }> {
  const seen = new Set<string>()
  const rows: Array<{ authorId: string; role: 'PI' | 'CO_INVESTIGATOR' }> = []
  for (const authorId of input.piIds) {
    if (seen.has(authorId)) continue
    seen.add(authorId)
    rows.push({ authorId, role: 'PI' })
  }
  for (const authorId of input.coInvestigatorIds) {
    if (seen.has(authorId)) continue
    seen.add(authorId)
    rows.push({ authorId, role: 'CO_INVESTIGATOR' })
  }
  return rows
}

function scalarData(input: StudyInput) {
  return {
    title: input.title,
    acronym: input.acronym ?? null,
    description: input.description ?? null,
    domain: input.domain ?? null,
    funding: input.funding ?? null,
    enrollment: input.enrollment ?? null,
    status: input.status,
    startDate: input.startDate ? new Date(input.startDate) : null,
    endDate: input.endDate ? new Date(input.endDate) : null,
  }
}

export async function createStudy(input: StudyInput, createdById: string) {
  return prisma.study.create({
    data: {
      ...scalarData(input),
      nctId: input.nctId ?? null,
      createdById,
      investigators: { create: investigatorCreate(input) },
      centres: { connect: input.centreIds.map((id) => ({ id })) },
    },
    select: { id: true },
  })
}

export async function updateStudy(id: string, input: StudyInput) {
  return prisma.$transaction(async (tx) => {
    await tx.studyInvestigator.deleteMany({ where: { studyId: id } })
    return tx.study.update({
      where: { id },
      data: {
        ...scalarData(input),
        investigators: { create: investigatorCreate(input) },
        centres: { set: input.centreIds.map((centreId) => ({ id: centreId })) },
      },
      select: { id: true },
    })
  })
}

export async function getStudy(id: string): Promise<StudyListItem | null> {
  return prisma.study.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      acronym: true,
      nctId: true,
      description: true,
      domain: true,
      funding: true,
      enrollment: true,
      status: true,
      startDate: true,
      endDate: true,
      investigators: { select: { authorId: true, role: true } },
      centres: { select: { id: true } },
      _count: { select: { articles: true, investigators: true, centres: true } },
    },
  })
}

export async function deleteStudy(id: string) {
  return prisma.study.delete({ where: { id }, select: { id: true } })
}

export type ClinicalTrialImportResult = { id: string; centresCreated: number; investigatorsCreated: number }

export async function importClinicalTrialStudy(data: ClinicalTrialImport, createdById: string): Promise<ClinicalTrialImportResult> {
  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.study.findUnique({ where: { nctId: data.nctId }, select: { id: true } })
    if (duplicate) throw new Error('DUPLICATE')

    let centresCreated = 0
    const centreIds: string[] = []
    const centreIdByFacility = new Map<string, string>()
    let primaryCentreIsOwn = false
    for (const centre of data.centres) {
      const existing = await tx.centre.findFirst({ where: { name: { equals: centre.name, mode: 'insensitive' } }, select: { id: true, isOwn: true, city: true, country: true } })
      let centreId: string
      if (existing) {
        centreId = existing.id
        if (centreIds.length === 0) primaryCentreIsOwn = existing.isOwn
        if ((!existing.city && centre.city) || (!existing.country && centre.country)) {
          await tx.centre.update({ where: { id: existing.id }, data: { city: existing.city ?? centre.city, country: existing.country ?? centre.country } })
        }
      } else {
        const created = await tx.centre.create({ data: { name: centre.name, city: centre.city, country: centre.country }, select: { id: true } })
        centreId = created.id
        centresCreated += 1
      }
      centreIds.push(centreId)
      centreIdByFacility.set(centre.name.toLowerCase(), centreId)
    }
    const primaryCentreId = centreIds[0] ?? null

    let investigatorsCreated = 0
    const investigatorRows: Array<{ authorId: string; role: 'PI' | 'CO_INVESTIGATOR'; centreId: string | null }> = []
    const seenAuthorIds = new Set<string>()
    for (const person of data.investigators) {
      let author = person.email
        ? await tx.author.findFirst({ where: { OR: [{ emails: { has: person.email } }, { email: { equals: person.email, mode: 'insensitive' } }] }, select: { id: true } })
        : null
      if (!author) {
        author = await tx.author.findFirst({ where: { firstName: { equals: person.firstName, mode: 'insensitive' }, lastName: { equals: person.lastName, mode: 'insensitive' } }, select: { id: true } })
      }
      const centreId = (person.centreName && centreIdByFacility.get(person.centreName.toLowerCase())) || primaryCentreId
      let authorId = author?.id
      if (!authorId) {
        const emails = person.email ? [person.email] : []
        const created = await tx.author.create({
          data: {
            firstName: person.firstName,
            lastName: person.lastName,
            degrees: person.degrees,
            type: primaryCentreIsOwn ? 'OUR_TEAM' : 'EXTERNAL',
            emails,
            email: emails[0] ?? null,
            centreId,
            centres: centreId ? { create: [{ centreId, isPrimary: true, order: 0 }] } : undefined,
          },
          select: { id: true },
        })
        authorId = created.id
        investigatorsCreated += 1
      }
      if (seenAuthorIds.has(authorId)) continue
      seenAuthorIds.add(authorId)
      investigatorRows.push({ authorId, role: person.role, centreId })
    }

    const study = await tx.study.create({
      data: {
        ...scalarData({
          title: data.title,
          nctId: data.nctId,
          acronym: data.acronym,
          description: data.description,
          domain: data.domain,
          funding: data.funding,
          enrollment: data.enrollment,
          status: data.status,
          startDate: data.startDate,
          endDate: data.endDate,
          piIds: [],
          coInvestigatorIds: [],
          centreIds,
        }),
        nctId: data.nctId,
        createdById,
        lastSyncedAt: new Date(),
        investigators: { create: investigatorRows },
        centres: { connect: [...new Set(centreIds)].map((id) => ({ id })) },
      },
      select: { id: true },
    })
    return { id: study.id, centresCreated, investigatorsCreated }
  }, { timeout: 20000 })
}

export type StudyRoleValue = 'PI' | 'CO_INVESTIGATOR'

export type StudyInvestigatorRow = {
  authorId: string
  firstName: string
  lastName: string
  degrees: string | null
  email: string | null
  role: StudyRoleValue
}

export type StudyDetailCentre = {
  id: string
  name: string
  shortCode: string | null
  city: string | null
  country: string | null
  isOwn: boolean
  investigators: StudyInvestigatorRow[]
}

export type StudyPublicationRow = {
  id: string
  title: string
  journal: string | null
  year: number | null
  status: string
}

export type StudyDetailData = {
  id: string
  title: string
  acronym: string | null
  nctId: string | null
  description: string | null
  domain: string | null
  funding: string | null
  enrollment: number | null
  status: StudyStatusValue
  startDate: Date | null
  endDate: Date | null
  lastSyncedAt: Date | null
  createdAt: Date
  centres: StudyDetailCentre[]
  unassignedInvestigators: StudyInvestigatorRow[]
  publications: StudyPublicationRow[]
  counts: { centres: number; investigators: number; publications: number }
}

export async function getStudyDetail(id: string): Promise<StudyDetailData | null> {
  const study = await prisma.study.findUnique({
    where: { id },
    select: {
      id: true, title: true, acronym: true, nctId: true, description: true, domain: true,
      funding: true, enrollment: true, status: true, startDate: true, endDate: true,
      lastSyncedAt: true, createdAt: true,
      centres: { orderBy: { name: 'asc' }, select: { id: true, name: true, shortCode: true, city: true, country: true, isOwn: true } },
      investigators: {
        select: { role: true, centreId: true, author: { select: { id: true, firstName: true, lastName: true, degrees: true, email: true, emails: true } } },
      },
      articles: {
        orderBy: [{ publishedAt: 'desc' }],
        select: { id: true, title: true, status: true, publishedAt: true, publishedJournal: { select: { name: true } } },
      },
    },
  })
  if (!study) return null

  const toRow = (row: (typeof study.investigators)[number]): StudyInvestigatorRow => ({
    authorId: row.author.id,
    firstName: row.author.firstName,
    lastName: row.author.lastName,
    degrees: row.author.degrees,
    email: row.author.email ?? row.author.emails[0] ?? null,
    role: row.role,
  })
  const orderRole = (row: StudyInvestigatorRow) => (row.role === 'PI' ? 0 : 1)

  const linkedCentreIds = new Set(study.centres.map((centre) => centre.id))
  const centres: StudyDetailCentre[] = study.centres.map((centre) => ({
    ...centre,
    investigators: study.investigators.filter((row) => row.centreId === centre.id).map(toRow).sort((a, b) => orderRole(a) - orderRole(b)),
  }))
  const unassignedInvestigators = study.investigators
    .filter((row) => !row.centreId || !linkedCentreIds.has(row.centreId))
    .map(toRow)
    .sort((a, b) => orderRole(a) - orderRole(b))

  const publications: StudyPublicationRow[] = study.articles.map((article) => ({
    id: article.id,
    title: article.title,
    journal: article.publishedJournal?.name ?? null,
    year: article.publishedAt ? article.publishedAt.getFullYear() : null,
    status: article.status,
  }))

  return {
    id: study.id, title: study.title, acronym: study.acronym, nctId: study.nctId, description: study.description,
    domain: study.domain, funding: study.funding, enrollment: study.enrollment, status: study.status,
    startDate: study.startDate, endDate: study.endDate, lastSyncedAt: study.lastSyncedAt, createdAt: study.createdAt,
    centres, unassignedInvestigators, publications,
    counts: { centres: study.centres.length, investigators: study.investigators.length, publications: study.articles.length },
  }
}

export async function setStudyStatus(id: string, status: StudyStatusValue) {
  return prisma.study.update({ where: { id }, data: { status }, select: { id: true } })
}

export async function linkCentreToStudy(studyId: string, centreId: string) {
  return prisma.study.update({ where: { id: studyId }, data: { centres: { connect: { id: centreId } } }, select: { id: true } })
}

export async function unlinkCentreFromStudy(studyId: string, centreId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.studyInvestigator.updateMany({ where: { studyId, centreId }, data: { centreId: null } })
    return tx.study.update({ where: { id: studyId }, data: { centres: { disconnect: { id: centreId } } }, select: { id: true } })
  })
}

export async function setStudyInvestigator(studyId: string, authorId: string, role: StudyRoleValue, centreId: string | null) {
  return prisma.studyInvestigator.upsert({
    where: { studyId_authorId: { studyId, authorId } },
    create: { studyId, authorId, role, centreId },
    update: { role, centreId },
    select: { studyId: true },
  })
}

export async function removeStudyInvestigator(studyId: string, authorId: string) {
  return prisma.studyInvestigator.delete({ where: { studyId_authorId: { studyId, authorId } }, select: { studyId: true } })
}

export async function linkArticleToStudy(studyId: string, articleId: string) {
  return prisma.study.update({ where: { id: studyId }, data: { articles: { connect: { id: articleId } } }, select: { id: true } })
}

export async function unlinkArticleFromStudy(studyId: string, articleId: string) {
  return prisma.study.update({ where: { id: studyId }, data: { articles: { disconnect: { id: articleId } } }, select: { id: true } })
}

export async function countStudies(): Promise<number> {
  return prisma.study.count()
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}
