import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'

export type AdminTag = Prisma.AdminTagGetPayload<{ select: { id: true; name: true; color: true; description: true } }>
export type UserTag = Prisma.UserTagGetPayload<{ select: { id: true; name: true; color: true; description: true } }>

export type CaseRef = { id: string; name: string; createdAt: Date }

// Admin tags (shared across admins)
export async function listAdminTags() {
  const tags = await prisma.adminTag.findMany({
    select: { id: true, name: true, color: true, description: true, cases: { select: { caseId: true } } },
    orderBy: { name: 'asc' },
  })
  return tags.map((t) => ({ id: t.id, name: t.name, color: t.color, description: t.description, caseCount: t.cases.length }))
}

export async function ensureAdminTag(input: { name: string; color: string; description?: string | null }) {
  const name = input.name.trim()
  const existing = await prisma.adminTag.findUnique({ where: { name } })
  if (existing) return { id: existing.id, name: existing.name, color: existing.color, description: existing.description ?? null }
  const created = await prisma.adminTag.create({
    data: { id: crypto.randomUUID(), name, color: input.color, description: input.description ?? null },
    select: { id: true, name: true, color: true, description: true },
  })
  return created
}

export async function setCaseAdminTags(caseId: string, tagIds: string[]) {
  await prisma.adminTagOnCase.deleteMany({ where: { caseId } })
  if (tagIds.length) {
    await prisma.adminTagOnCase.createMany({ data: tagIds.map((tagId) => ({ caseId, tagId })) })
  }
  return { caseId, tagIds }
}

export async function getCaseAdminTagIds(caseId: string) {
  const rows = await prisma.adminTagOnCase.findMany({ where: { caseId }, select: { tagId: true } })
  return rows.map((r) => r.tagId)
}

export async function listCasesByAdminTag(tagId: string) {
  const rows = await prisma.adminTagOnCase.findMany({
    where: { tagId },
    include: { c: { select: { id: true, name: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => r.c)
}

// User tags (private per user)
export async function listUserTags(userId: string) {
  const tags = await prisma.userTag.findMany({
    where: { userId },
    select: { id: true, name: true, color: true, description: true, cases: { select: { caseId: true } } },
    orderBy: { name: 'asc' },
  })
  return tags.map((t) => ({ id: t.id, name: t.name, color: t.color, description: t.description, caseCount: t.cases.length }))
}

export async function ensureUserTag(userId: string, input: { name: string; color: string; description?: string | null }) {
  const name = input.name.trim()
  const existing = await prisma.userTag.findFirst({ where: { userId, name } })
  if (existing) return { id: existing.id, name: existing.name, color: existing.color, description: existing.description ?? null }
  const created = await prisma.userTag.create({
    data: { id: crypto.randomUUID(), userId, name, color: input.color, description: input.description ?? null },
    select: { id: true, name: true, color: true, description: true },
  })
  return created
}

export async function setCaseUserTags(userId: string, caseId: string, userTagIds: string[]) {
  // Only allow linking tags that belong to this user
  const owned = await prisma.userTag.findMany({ where: { userId, id: { in: userTagIds } }, select: { id: true } })
  const allowedIds = new Set(owned.map((t) => t.id))
  await prisma.userTagOnCase.deleteMany({ where: { caseId, tag: { userId } } })
  if (userTagIds.length) {
    await prisma.userTagOnCase.createMany({ data: userTagIds.filter((id) => allowedIds.has(id)).map((userTagId) => ({ caseId, userTagId })) })
  }
  return { caseId, userTagIds: Array.from(allowedIds).filter((id) => userTagIds.includes(id)) }
}

export async function getCaseUserTagIds(userId: string, caseId: string) {
  const rows = await prisma.userTagOnCase.findMany({ where: { caseId, tag: { userId } }, select: { userTagId: true } })
  return rows.map((r) => r.userTagId)
}

export async function listCasesByUserTag(userId: string, userTagId: string) {
  const row = await prisma.userTag.findFirst({ where: { id: userTagId, userId }, select: { id: true } })
  if (!row) return []
  const links = await prisma.userTagOnCase.findMany({
    where: { userTagId },
    include: { c: { select: { id: true, name: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return links.map((l) => l.c)
}

