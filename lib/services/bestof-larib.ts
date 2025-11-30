import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createHash, randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'

const hashKey = (value: unknown): string => createHash('sha1').update(JSON.stringify(value)).digest('hex')

export const CASES_TAG = 'bestof:cases'
export const EXAM_TYPES_TAG = 'bestof:exam-types'
export const DISEASE_TAGS_TAG = 'bestof:disease-tags'
const CASE_DETAIL_TAG_PREFIX = 'bestof:case'
const USER_CASES_TAG_PREFIX = 'bestof:user-cases'

export const caseDetailTag = (caseId: string) => `${CASE_DETAIL_TAG_PREFIX}:${caseId}`
export const userCasesTag = (userId: string) => `${USER_CASES_TAG_PREFIX}:${userId}`

export type ClinicalCaseListItem = Prisma.ClinicalCaseGetPayload<{
  select: {
    id: true
    name: true
    difficulty: true
    status: true
    tags: true
    pdfUrl: true
    pdfKey: true
    textContent: true
    createdAt: true
    examType: { select: { id: true, name: true } }
    diseaseTag: { select: { id: true, name: true } }
  }
}>

const listClinicalCasesQuery = async (): Promise<ClinicalCaseListItem[]> =>
  prisma.clinicalCase.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      difficulty: true,
      status: true,
      tags: true,
      pdfUrl: true,
      pdfKey: true,
      textContent: true,
      createdAt: true,
      examType: { select: { id: true, name: true } },
      diseaseTag: { select: { id: true, name: true } },
    },
  })

const listClinicalCasesCached = unstable_cache(listClinicalCasesQuery, ['bestof:cases:list'], {
  tags: [CASES_TAG],
})

export async function listClinicalCases(): Promise<ClinicalCaseListItem[]> {
  return listClinicalCasesCached()
}

export type CaseDisplayTag = { id: string; name: string; color: string; description: string | null }

export type UserAttemptState = {
  hasValidatedAttempt: boolean
  hasDraftAttempt: boolean
}

export type ClinicalCaseWithDisplayTags = ClinicalCaseListItem & {
  adminTags: CaseDisplayTag[]
  userTags: CaseDisplayTag[]
  attemptsCount?: number
  personalDifficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null
  userAttemptState?: UserAttemptState
  firstCompletedAt?: Date | null
}

export type CaseListFilters = {
  name?: string
  status?: 'DRAFT' | 'PUBLISHED'
  examTypeIds?: string[]
  diseaseTagIds?: string[]
  difficulties?: Array<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>
  createdFrom?: Date
  createdTo?: Date
  firstCompletedFrom?: Date
  firstCompletedTo?: Date
  adminTagIds?: string[]
  userTagIds?: string[]
  myDifficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  userProgress?: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED'
}

export type CaseListSortField =
  | 'name'
  | 'status'
  | 'difficulty'
  | 'createdAt'
  | 'examType'
  | 'diseaseTag'
  | 'attempts'
  | 'personalDifficulty'
  | 'firstCompletedAt'
export type CaseListSort = { field?: CaseListSortField; direction?: 'asc' | 'desc' }

export type SerializedCaseFilters = {
  name?: string
  status?: 'DRAFT' | 'PUBLISHED'
  examTypeIds?: string[]
  diseaseTagIds?: string[]
  difficulties?: Array<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>
  createdFrom?: string | null
  createdTo?: string | null
  firstCompletedFrom?: string | null
  firstCompletedTo?: string | null
  adminTagIds?: string[]
  userTagIds?: string[]
  myDifficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  userProgress?: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED'
}

export const serializeCaseFilters = (filters: CaseListFilters | undefined): SerializedCaseFilters => ({
  name: filters?.name,
  status: filters?.status,
  examTypeIds: filters?.examTypeIds ? [...filters.examTypeIds].sort() : undefined,
  diseaseTagIds: filters?.diseaseTagIds ? [...filters.diseaseTagIds].sort() : undefined,
  difficulties: filters?.difficulties ? [...filters.difficulties].sort() : undefined,
  createdFrom: filters?.createdFrom ? filters.createdFrom.toISOString() : undefined,
  createdTo: filters?.createdTo ? filters.createdTo.toISOString() : undefined,
  firstCompletedFrom: filters?.firstCompletedFrom ? filters.firstCompletedFrom.toISOString() : undefined,
  firstCompletedTo: filters?.firstCompletedTo ? filters.firstCompletedTo.toISOString() : undefined,
  adminTagIds: filters?.adminTagIds ? [...filters.adminTagIds].sort() : undefined,
  userTagIds: filters?.userTagIds ? [...filters.userTagIds].sort() : undefined,
  myDifficulty: filters?.myDifficulty,
  userProgress: filters?.userProgress,
})

export const deserializeCaseFilters = (filters: SerializedCaseFilters): CaseListFilters => ({
  name: filters.name,
  status: filters.status,
  examTypeIds: filters.examTypeIds,
  diseaseTagIds: filters.diseaseTagIds,
  difficulties: filters.difficulties,
  createdFrom: filters.createdFrom ? new Date(filters.createdFrom) : undefined,
  createdTo: filters.createdTo ? new Date(filters.createdTo) : undefined,
  firstCompletedFrom: filters.firstCompletedFrom ? new Date(filters.firstCompletedFrom) : undefined,
  firstCompletedTo: filters.firstCompletedTo ? new Date(filters.firstCompletedTo) : undefined,
  adminTagIds: filters.adminTagIds,
  userTagIds: filters.userTagIds,
  myDifficulty: filters.myDifficulty,
  userProgress: filters.userProgress,
})

export type ClinicalCasesLoadInput = {
  userId: string | null
  filters: CaseListFilters | undefined
  sort?: CaseListSort
  includeContent: boolean
}

type ClinicalCasesCacheArgs = {
  userId: string | null
  filters: SerializedCaseFilters | null
  sort: CaseListSort | null
  includeContent: boolean
}

const buildClinicalCasesTags = (userId: string | null): string[] =>
  userId ? [CASES_TAG, userCasesTag(userId)] : [CASES_TAG]

const fetchClinicalCases = async ({
  userId,
  filters,
  sort,
  includeContent,
}: ClinicalCasesLoadInput): Promise<ClinicalCaseWithDisplayTags[]> => {
  const where = {
    name: filters?.name ? { contains: filters.name, mode: 'insensitive' } : undefined,
    status: filters?.status ?? undefined,
    examTypeId: filters?.examTypeIds?.length ? { in: filters.examTypeIds } : undefined,
    diseaseTagId: filters?.diseaseTagIds?.length ? { in: filters.diseaseTagIds } : undefined,
    difficulty: filters?.difficulties?.length ? { in: filters.difficulties } : undefined,
    createdAt:
      filters?.createdFrom || filters?.createdTo
        ? {
            gte: filters?.createdFrom ?? undefined,
            lte: filters?.createdTo ?? undefined,
          }
        : undefined,
    adminTags: filters?.adminTagIds?.length ? { some: { tagId: { in: filters.adminTagIds } } } : undefined,
    userTags:
      filters?.userTagIds?.length && userId ? { some: { tag: { id: { in: filters.userTagIds }, userId } } } : undefined,
    UserCaseSettings:
      filters?.myDifficulty && userId ? { some: { userId, personalDifficulty: filters.myDifficulty } } : undefined,
  }

  const orderBy = (() => {
    const direction = sort?.direction ?? 'desc'
    switch (sort?.field) {
      case 'name':
        return { name: direction }
      case 'status':
        return { status: direction }
      case 'difficulty':
        return { difficulty: direction }
      case 'createdAt':
        return { createdAt: direction }
      case 'examType':
        return { examType: { name: direction } }
      case 'diseaseTag':
        return { diseaseTag: { name: direction } }
      default:
        return { createdAt: 'desc' as const }
    }
  })()

  const rows = await prisma.clinicalCase.findMany({
    where,
    orderBy,
    select: {
      id: true,
      name: true,
      difficulty: true,
      status: true,
      tags: true,
      ...(includeContent
        ? {
            pdfUrl: true,
            pdfKey: true,
            textContent: true,
          }
        : {}),
      createdAt: true,
      examType: { select: { id: true, name: true } },
      diseaseTag: { select: { id: true, name: true } },
      adminTags: { include: { tag: { select: { id: true, name: true, color: true, description: true } } } },
      userTags: {
        include: { tag: { select: { id: true, name: true, color: true, description: true, userId: true } } },
        where: userId ? { tag: { userId } } : undefined,
      },
    },
  })

  let base: ClinicalCaseWithDisplayTags[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    difficulty: row.difficulty,
    status: row.status,
    tags: row.tags,
    ...(includeContent
      ? {
          pdfUrl: 'pdfUrl' in row ? row.pdfUrl ?? null : null,
          pdfKey: 'pdfKey' in row ? row.pdfKey ?? null : null,
          textContent: 'textContent' in row ? row.textContent ?? null : null,
        }
      : {}),
    createdAt: row.createdAt,
    examType: row.examType,
    diseaseTag: row.diseaseTag,
    adminTags: row.adminTags
      .map((adminTag) => ({
        id: adminTag.tag.id,
        name: adminTag.tag.name,
        color: adminTag.tag.color,
        description: adminTag.tag.description ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    userTags: row.userTags
      .map((userTag) => ({
        id: userTag.tag.id,
        name: userTag.tag.name,
        color: userTag.tag.color,
        description: userTag.tag.description ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }))

  if (userId && base.length > 0) {
    const caseIds = base.map((entry) => entry.id)
    const [settings, attemptRows] = await Promise.all([
      prisma.userCaseSettings.findMany({
        where: { userId, caseId: { in: caseIds } },
        select: { caseId: true, personalDifficulty: true },
      }),
      prisma.caseAttempt.findMany({
        where: { userId, caseId: { in: caseIds } },
        select: { caseId: true, validatedAt: true },
      }),
    ])

    const difficultyByCase = new Map<string, 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null>(
      settings.map((setting) => [setting.caseId, setting.personalDifficulty]),
    )

    const summaryByCase = attemptRows.reduce<
      Map<string, { validated: number; hasValidated: boolean; hasDraft: boolean; firstCompletedAt: Date | null }>
    >(
      (accumulator, attempt) => {
        const current = accumulator.get(attempt.caseId) ?? {
          validated: 0,
          hasValidated: false,
          hasDraft: false,
          firstCompletedAt: null,
        }
        const hasValidated = current.hasValidated || attempt.validatedAt !== null
        const hasDraft = current.hasDraft || attempt.validatedAt === null
        const validated = attempt.validatedAt !== null ? current.validated + 1 : current.validated
        const firstCompletedAt =
          attempt.validatedAt !== null
            ? current.firstCompletedAt === null || attempt.validatedAt < current.firstCompletedAt
              ? attempt.validatedAt
              : current.firstCompletedAt
            : current.firstCompletedAt
        accumulator.set(attempt.caseId, { validated, hasValidated, hasDraft, firstCompletedAt })
        return accumulator
      },
      new Map(),
    )

    base = base.map((entry) => {
      const summary = summaryByCase.get(entry.id)
      const state: UserAttemptState = {
        hasValidatedAttempt: summary?.hasValidated ?? false,
        hasDraftAttempt: summary?.hasDraft ?? false,
      }
      return {
        ...entry,
        attemptsCount: summary?.validated ?? 0,
        personalDifficulty: difficultyByCase.get(entry.id) ?? null,
        userAttemptState: state,
        firstCompletedAt: summary?.firstCompletedAt ?? null,
      }
    })
  }

  if (userId && filters?.userProgress) {
    base = base.filter((entry) => {
      const state = entry.userAttemptState ?? { hasValidatedAttempt: false, hasDraftAttempt: false }
      if (filters.userProgress === 'COMPLETED') return state.hasValidatedAttempt
      if (filters.userProgress === 'IN_PROGRESS') return state.hasDraftAttempt && !state.hasValidatedAttempt
      return !state.hasDraftAttempt && !state.hasValidatedAttempt
    })
  }

  if (userId && (filters?.firstCompletedFrom || filters?.firstCompletedTo)) {
    base = base.filter((entry) => {
      const firstCompleted = entry.firstCompletedAt
      if (!firstCompleted) return false
      if (filters.firstCompletedFrom && firstCompleted < filters.firstCompletedFrom) return false
      if (filters.firstCompletedTo && firstCompleted > filters.firstCompletedTo) return false
      return true
    })
  }

  if (sort?.field === 'attempts') {
    const direction = sort.direction === 'asc' ? 1 : -1
    base.sort((a, b) => ((a.attemptsCount ?? 0) - (b.attemptsCount ?? 0)) * direction)
  } else if (sort?.field === 'personalDifficulty') {
    const order = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2 } as const
    const direction = sort.direction === 'asc' ? 1 : -1
    base.sort(
      (a, b) => (order[a.personalDifficulty ?? 'BEGINNER'] - order[b.personalDifficulty ?? 'BEGINNER']) * direction,
    )
  } else if (sort?.field === 'firstCompletedAt') {
    const direction = sort.direction === 'asc' ? 1 : -1
    base.sort((a, b) => {
      const aTime = a.firstCompletedAt?.getTime() ?? 0
      const bTime = b.firstCompletedAt?.getTime() ?? 0
      return (aTime - bTime) * direction
    })
  } else if (sort?.field === 'name') {
    const direction = sort.direction === 'desc' ? -1 : 1
    base.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * direction)
  }

  return base
}

const cachedClinicalCases = cache(async (serializedArgs: string): Promise<ClinicalCaseWithDisplayTags[]> => {
  const payload = JSON.parse(serializedArgs) as ClinicalCasesCacheArgs
  const tags = buildClinicalCasesTags(payload.userId)
  const filters = payload.filters ? deserializeCaseFilters(payload.filters) : undefined
  const key = hashKey(payload)

  return unstable_cache(
    () =>
      fetchClinicalCases({
        userId: payload.userId,
        filters,
        sort: payload.sort ?? undefined,
        includeContent: payload.includeContent,
      }),
    ['bestof:cases', key],
    { tags },
  )()
})

export const loadClinicalCases = async ({
  userId,
  filters,
  sort,
  includeContent,
}: ClinicalCasesLoadInput): Promise<ClinicalCaseWithDisplayTags[]> => {
  const serializedFilters = filters ? serializeCaseFilters(filters) : null
  const cacheArgs: ClinicalCasesCacheArgs = {
    userId,
    filters: serializedFilters,
    sort: sort ?? null,
    includeContent,
  }

  return cachedClinicalCases(JSON.stringify(cacheArgs))
}

export async function listClinicalCasesWithDisplayTags(
  userId?: string | null,
  filters?: CaseListFilters,
  sort?: CaseListSort,
  options?: { includeContent?: boolean },
): Promise<ClinicalCaseWithDisplayTags[]> {
  return loadClinicalCases({
    userId: userId ?? null,
    filters,
    sort,
    includeContent: Boolean(options?.includeContent),
  })
}

export type ExamType = { id: string; name: string }
export type DiseaseTag = { id: string; name: string }

const listExamTypesCached = unstable_cache(
  () => prisma.examType.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ['bestof:exam-types:list'],
  { tags: [EXAM_TYPES_TAG] },
)

export async function listExamTypes(): Promise<ExamType[]> {
  return listExamTypesCached()
}

const listDiseaseTagsCached = unstable_cache(
  () => prisma.diseaseTag.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ['bestof:disease-tags:list'],
  { tags: [DISEASE_TAGS_TAG] },
)

export async function listDiseaseTags(): Promise<DiseaseTag[]> {
  return listDiseaseTagsCached()
}

export async function ensureExamType(name: string): Promise<ExamType> {
  const trimmed = name.trim()
  const existing = await prisma.examType.findUnique({ where: { name: trimmed } })
  if (existing) return { id: existing.id, name: existing.name }
  const created = await prisma.examType.create({
    data: { id: randomUUID(), name: trimmed },
    select: { id: true, name: true },
  })
  return created
}

export async function ensureDiseaseTag(name: string): Promise<DiseaseTag> {
  const trimmed = name.trim()
  const existing = await prisma.diseaseTag.findUnique({ where: { name: trimmed } })
  if (existing) return { id: existing.id, name: existing.name }
  const created = await prisma.diseaseTag.create({
    data: { id: randomUUID(), name: trimmed },
    select: { id: true, name: true },
  })
  return created
}

export async function updateExamType(id: string, name: string): Promise<ExamType> {
  const trimmed = name.trim()
  const updated = await prisma.examType.update({
    where: { id },
    data: { name: trimmed },
    select: { id: true, name: true },
  })
  return updated
}

export async function updateDiseaseTag(id: string, name: string): Promise<DiseaseTag> {
  const trimmed = name.trim()
  const updated = await prisma.diseaseTag.update({
    where: { id },
    data: { name: trimmed },
    select: { id: true, name: true },
  })
  return updated
}

export type CreateClinicalCaseInput = {
  name: string
  examTypeName?: string | null
  diseaseTagName?: string | null
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  tags?: string[]
  pdfUrl?: string | null
  pdfKey?: string | null
  textContent?: string | null
  status: 'DRAFT' | 'PUBLISHED'
  createdById: string
}

export async function createClinicalCase(data: CreateClinicalCaseInput) {
  const exam = data.examTypeName ? await ensureExamType(data.examTypeName) : null
  const disease = data.diseaseTagName ? await ensureDiseaseTag(data.diseaseTagName) : null
  const created = await prisma.clinicalCase.create({
    data: {
      id: randomUUID(),
      name: data.name,
      difficulty: data.difficulty,
      status: data.status,
      tags: data.tags ?? [],
      pdfUrl: data.pdfUrl ?? null,
      pdfKey: data.pdfKey ?? null,
      textContent: data.textContent ?? null,
      examTypeId: exam?.id,
      diseaseTagId: disease?.id,
      createdById: data.createdById,
    },
    select: {
      id: true,
      name: true,
      status: true,
    },
  })
  return created
}

export type UpdateClinicalCaseInput = {
  id: string
  name: string
  examTypeName?: string | null
  diseaseTagName?: string | null
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  tags?: string[]
  pdfUrl?: string | null
  pdfKey?: string | null
  textContent?: string | null
  status: 'DRAFT' | 'PUBLISHED'
}

export async function updateClinicalCase(data: UpdateClinicalCaseInput) {
  const exam = data.examTypeName ? await ensureExamType(data.examTypeName) : null
  const disease = data.diseaseTagName ? await ensureDiseaseTag(data.diseaseTagName) : null
  const updated = await prisma.clinicalCase.update({
    where: { id: data.id },
    data: {
      name: data.name,
      difficulty: data.difficulty,
      status: data.status,
      tags: data.tags ?? [],
      pdfUrl: data.pdfUrl ?? null,
      pdfKey: data.pdfKey ?? null,
      textContent: data.textContent ?? null,
      examTypeId: exam?.id,
      diseaseTagId: disease?.id,
    },
    select: { id: true },
  })
  return updated
}

export async function deleteClinicalCase(id: string) {
  await prisma.clinicalCase.delete({ where: { id } })
  return { id }
}

const fetchCaseById = async (id: string) =>
  prisma.clinicalCase.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      difficulty: true,
      status: true,
      tags: true,
      textContent: true,
      pdfUrl: true,
      createdAt: true,
      examType: { select: { id: true, name: true } },
      diseaseTag: { select: { id: true, name: true } },
    },
  })

const cachedCaseById = cache(async (id: string) =>
  unstable_cache(() => fetchCaseById(id), ['bestof:case', id], {
    tags: [CASES_TAG, caseDetailTag(id)],
  })(),
)

export async function getCaseById(id: string) {
  return cachedCaseById(id)
}

export async function deleteExamTypes(ids: string[]): Promise<void> {
  if (ids.length === 0) return

  const casesUsingExamTypes = await prisma.clinicalCase.findFirst({
    where: { examTypeId: { in: ids } },
    select: { id: true },
  })

  if (casesUsingExamTypes) {
    const count = await prisma.clinicalCase.count({
      where: { examTypeId: { in: ids } },
    })
    throw new Error(`Cannot delete exam types: ${count} case(s) are using them`)
  }

  await prisma.examType.deleteMany({
    where: { id: { in: ids } },
  })
}

export async function deleteDiseaseTags(ids: string[]): Promise<void> {
  if (ids.length === 0) return

  const casesUsingDiseaseTags = await prisma.clinicalCase.findFirst({
    where: { diseaseTagId: { in: ids } },
    select: { id: true },
  })

  if (casesUsingDiseaseTags) {
    const count = await prisma.clinicalCase.count({
      where: { diseaseTagId: { in: ids } },
    })
    throw new Error(`Cannot delete disease tags: ${count} case(s) are using them`)
  }

  await prisma.diseaseTag.deleteMany({
    where: { id: { in: ids } },
  })
}
