import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'

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

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}
