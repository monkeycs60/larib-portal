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
    description: true
    domain: true
    funding: true
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
      description: true,
      domain: true,
      funding: true,
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
    nctId: input.nctId ?? null,
    acronym: input.acronym ?? null,
    description: input.description ?? null,
    domain: input.domain ?? null,
    funding: input.funding ?? null,
    status: input.status,
    startDate: input.startDate ? new Date(input.startDate) : null,
    endDate: input.endDate ? new Date(input.endDate) : null,
  }
}

export async function createStudy(input: StudyInput, createdById: string) {
  return prisma.study.create({
    data: {
      ...scalarData(input),
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

export type StudyDetail = Prisma.StudyGetPayload<{
  select: {
    id: true
    title: true
    acronym: true
    description: true
    domain: true
    funding: true
    status: true
    startDate: true
    endDate: true
    investigators: { select: { authorId: true; role: true } }
    centres: { select: { id: true } }
  }
}>

export async function getStudy(id: string): Promise<StudyDetail | null> {
  return prisma.study.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      acronym: true,
      description: true,
      domain: true,
      funding: true,
      status: true,
      startDate: true,
      endDate: true,
      investigators: { select: { authorId: true, role: true } },
      centres: { select: { id: true } },
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
    let primaryCentreIsOwn = false
    for (const centre of data.centres) {
      const existing = await tx.centre.findFirst({ where: { name: { equals: centre.name, mode: 'insensitive' } }, select: { id: true, isOwn: true, city: true, country: true } })
      if (existing) {
        centreIds.push(existing.id)
        if (centreIds.length === 1) primaryCentreIsOwn = existing.isOwn
        if ((!existing.city && centre.city) || (!existing.country && centre.country)) {
          await tx.centre.update({ where: { id: existing.id }, data: { city: existing.city ?? centre.city, country: existing.country ?? centre.country } })
        }
      } else {
        const created = await tx.centre.create({ data: { name: centre.name, city: centre.city, country: centre.country }, select: { id: true } })
        centreIds.push(created.id)
        centresCreated += 1
      }
    }
    const primaryCentreId = centreIds[0] ?? null

    let investigatorsCreated = 0
    const piIds: string[] = []
    const coInvestigatorIds: string[] = []
    for (const person of data.investigators) {
      let author = person.email
        ? await tx.author.findFirst({ where: { OR: [{ emails: { has: person.email } }, { email: { equals: person.email, mode: 'insensitive' } }] }, select: { id: true } })
        : null
      if (!author) {
        author = await tx.author.findFirst({ where: { firstName: { equals: person.firstName, mode: 'insensitive' }, lastName: { equals: person.lastName, mode: 'insensitive' } }, select: { id: true } })
      }
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
            centreId: primaryCentreId,
            centres: primaryCentreId ? { create: [{ centreId: primaryCentreId, isPrimary: true, order: 0 }] } : undefined,
          },
          select: { id: true },
        })
        authorId = created.id
        investigatorsCreated += 1
      }
      if (person.role === 'PI') piIds.push(authorId)
      else coInvestigatorIds.push(authorId)
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
          status: data.status,
          startDate: data.startDate,
          endDate: data.endDate,
          piIds,
          coInvestigatorIds,
          centreIds,
        }),
        createdById,
        investigators: { create: investigatorCreate({ title: data.title, status: data.status, piIds, coInvestigatorIds, centreIds }) },
        centres: { connect: [...new Set(centreIds)].map((id) => ({ id })) },
      },
      select: { id: true },
    })
    return { id: study.id, centresCreated, investigatorsCreated }
  }, { timeout: 20000 })
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}
