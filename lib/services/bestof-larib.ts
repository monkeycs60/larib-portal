import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'

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

export async function listClinicalCases(): Promise<ClinicalCaseListItem[]> {
  return prisma.clinicalCase.findMany({
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
}

export type CaseDisplayTag = { id: string; name: string; color: string; description: string | null }

export type ClinicalCaseWithDisplayTags = Omit<ClinicalCaseListItem, 'tags'> & {
  adminTags: CaseDisplayTag[]
  userTags: CaseDisplayTag[]
}

export async function listClinicalCasesWithDisplayTags(userId?: string | null): Promise<ClinicalCaseWithDisplayTags[]> {
  const rows = await prisma.clinicalCase.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      difficulty: true,
      status: true,
      // legacy string[] tags kept in DB but not exposed here
      pdfUrl: true,
      pdfKey: true,
      textContent: true,
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
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    difficulty: r.difficulty,
    status: r.status,
    pdfUrl: r.pdfUrl,
    pdfKey: r.pdfKey,
    textContent: r.textContent,
    createdAt: r.createdAt,
    examType: r.examType,
    diseaseTag: r.diseaseTag,
    adminTags: r.adminTags.map((at) => ({ id: at.tag.id, name: at.tag.name, color: at.tag.color, description: at.tag.description ?? null })),
    userTags: r.userTags.map((ut) => ({ id: ut.tag.id, name: ut.tag.name, color: ut.tag.color, description: ut.tag.description ?? null })),
  }))
}

export type ExamType = { id: string; name: string }
export type DiseaseTag = { id: string; name: string }

export async function listExamTypes(): Promise<ExamType[]> {
  return prisma.examType.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
}

export async function listDiseaseTags(): Promise<DiseaseTag[]> {
  return prisma.diseaseTag.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
}

export async function ensureExamType(name: string): Promise<ExamType> {
  const trimmed = name.trim()
  const existing = await prisma.examType.findUnique({ where: { name: trimmed } })
  if (existing) return { id: existing.id, name: existing.name }
  const created = await prisma.examType.create({
    data: { id: crypto.randomUUID(), name: trimmed },
    select: { id: true, name: true },
  })
  return created
}

export async function ensureDiseaseTag(name: string): Promise<DiseaseTag> {
  const trimmed = name.trim()
  const existing = await prisma.diseaseTag.findUnique({ where: { name: trimmed } })
  if (existing) return { id: existing.id, name: existing.name }
  const created = await prisma.diseaseTag.create({
    data: { id: crypto.randomUUID(), name: trimmed },
    select: { id: true, name: true },
  })
  return created
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
      id: crypto.randomUUID(),
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

export async function getCaseById(id: string) {
  return prisma.clinicalCase.findUnique({
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
}
