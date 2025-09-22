import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import { CASES_TAG, caseDetailTag, userCasesTag } from './bestof-larib'

export const ADMIN_TAGS_TAG = 'bestof:admin-tags'
const CASE_ADMIN_TAGS_PREFIX = 'bestof:case-admin-tags'
const USER_TAGS_PREFIX = 'bestof:user-tags'
const USER_CASE_TAGS_PREFIX = 'bestof:user-case-tags'

export const caseAdminTagsTag = (caseId: string) => `${CASE_ADMIN_TAGS_PREFIX}:${caseId}`
export const userTagsTag = (userId: string) => `${USER_TAGS_PREFIX}:${userId}`
export const caseUserTagsTag = (userId: string, caseId: string) => `${USER_CASE_TAGS_PREFIX}:${userId}:${caseId}`

export type AdminTag = Prisma.AdminTagGetPayload<{ select: { id: true; name: true; color: true; description: true } }>
export type UserTag = Prisma.UserTagGetPayload<{ select: { id: true; name: true; color: true; description: true } }>

export type CaseRef = { id: string; name: string; createdAt: Date }

const fetchAdminTags = async () => {
  const tags = await prisma.adminTag.findMany({
    select: { id: true, name: true, color: true, description: true, cases: { select: { caseId: true } } },
    orderBy: { name: 'asc' },
  })
  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    description: tag.description,
    caseCount: tag.cases.length,
  }))
}

const listAdminTagsCached = unstable_cache(fetchAdminTags, ['bestof:admin-tags:list'], {
  tags: [ADMIN_TAGS_TAG, CASES_TAG],
})

export async function listAdminTags() {
  return listAdminTagsCached()
}

export async function ensureAdminTag(input: { name: string; color: string; description?: string | null }) {
  const name = input.name.trim()
  const existing = await prisma.adminTag.findUnique({ where: { name } })
  if (existing) return { id: existing.id, name: existing.name, color: existing.color, description: existing.description ?? null }
  const created = await prisma.adminTag.create({
    data: { id: randomUUID(), name, color: input.color, description: input.description ?? null },
    select: { id: true, name: true, color: true, description: true },
  })
  return created
}

export async function updateAdminTag(input: { id: string; name: string; color: string; description?: string | null }) {
  const tag = await prisma.adminTag.findUnique({ where: { id: input.id }, select: { id: true, name: true } })
  if (!tag) throw new Error('ADMIN_TAG_NOT_FOUND')
  const trimmed = input.name.trim()
  if (trimmed !== tag.name) {
    const duplicate = await prisma.adminTag.findUnique({ where: { name: trimmed } })
    if (duplicate) throw new Error('ADMIN_TAG_NAME_TAKEN')
  }
  const updated = await prisma.adminTag.update({
    where: { id: input.id },
    data: { name: trimmed, color: input.color, description: input.description ?? null },
    select: { id: true, name: true, color: true, description: true },
  })
  return updated
}

export async function deleteAdminTag(id: string) {
  const tag = await prisma.adminTag.findUnique({ where: { id }, select: { id: true } })
  if (!tag) throw new Error('ADMIN_TAG_NOT_FOUND')
  await prisma.adminTag.delete({ where: { id } })
  return { id }
}

export async function setCaseAdminTags(caseId: string, tagIds: string[]) {
  await prisma.adminTagOnCase.deleteMany({ where: { caseId } })
  if (tagIds.length) {
    await prisma.adminTagOnCase.createMany({ data: tagIds.map((tagId) => ({ caseId, tagId })) })
  }
  return { caseId, tagIds }
}

const cachedCaseAdminTagIds = cache(async (caseId: string) =>
  unstable_cache(
    async () => {
      const rows = await prisma.adminTagOnCase.findMany({ where: { caseId }, select: { tagId: true } })
      return rows.map((row) => row.tagId)
    },
    ['bestof:case-admin-tags', caseId],
    { tags: [caseAdminTagsTag(caseId), CASES_TAG, caseDetailTag(caseId)] },
  )(),
)

export async function getCaseAdminTagIds(caseId: string) {
  return cachedCaseAdminTagIds(caseId)
}

const cachedCasesByAdminTag = cache(async (tagId: string) =>
  unstable_cache(
    async () => {
      const rows = await prisma.adminTagOnCase.findMany({
        where: { tagId },
        include: { c: { select: { id: true, name: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
      })
      return rows.map((row) => row.c)
    },
    ['bestof:cases-by-admin-tag', tagId],
    { tags: [ADMIN_TAGS_TAG, CASES_TAG] },
  )(),
)

export async function listCasesByAdminTag(tagId: string) {
  return cachedCasesByAdminTag(tagId)
}

const cachedUserTags = cache(async (userId: string) =>
  unstable_cache(
    async () => {
      const tags = await prisma.userTag.findMany({
        where: { userId },
        select: { id: true, name: true, color: true, description: true, cases: { select: { caseId: true } } },
        orderBy: { name: 'asc' },
      })
      return tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        description: tag.description,
        caseCount: tag.cases.length,
      }))
    },
    ['bestof:user-tags', userId],
    { tags: [userTagsTag(userId)] },
  )(),
)

export async function listUserTags(userId: string) {
  return cachedUserTags(userId)
}

export async function ensureUserTag(userId: string, input: { name: string; color: string; description?: string | null }) {
  const name = input.name.trim()
  const existing = await prisma.userTag.findFirst({ where: { userId, name } })
  if (existing) return { id: existing.id, name: existing.name, color: existing.color, description: existing.description ?? null }
  const created = await prisma.userTag.create({
    data: { id: randomUUID(), userId, name, color: input.color, description: input.description ?? null },
    select: { id: true, name: true, color: true, description: true },
  })
  return created
}

export async function updateUserTag(userId: string, input: { id: string; name: string; color: string; description?: string | null }) {
  const tag = await prisma.userTag.findFirst({ where: { id: input.id, userId }, select: { id: true, name: true } })
  if (!tag) throw new Error('USER_TAG_NOT_FOUND')
  const trimmed = input.name.trim()
  if (trimmed !== tag.name) {
    const duplicate = await prisma.userTag.findFirst({ where: { userId, name: trimmed }, select: { id: true } })
    if (duplicate) throw new Error('USER_TAG_NAME_TAKEN')
  }
  const updated = await prisma.userTag.update({
    where: { id: input.id },
    data: { name: trimmed, color: input.color, description: input.description ?? null },
    select: { id: true, name: true, color: true, description: true },
  })
  return updated
}

export async function deleteUserTag(userId: string, id: string) {
  const tag = await prisma.userTag.findFirst({ where: { id, userId }, select: { id: true } })
  if (!tag) throw new Error('USER_TAG_NOT_FOUND')
  await prisma.userTag.delete({ where: { id } })
  return { id }
}

export async function setCaseUserTags(userId: string, caseId: string, userTagIds: string[]) {
  const owned = await prisma.userTag.findMany({ where: { userId, id: { in: userTagIds } }, select: { id: true } })
  const allowedIds = new Set(owned.map((tag) => tag.id))
  await prisma.userTagOnCase.deleteMany({ where: { caseId, tag: { userId } } })
  if (userTagIds.length) {
    await prisma.userTagOnCase.createMany({
      data: userTagIds.filter((id) => allowedIds.has(id)).map((userTagId) => ({ caseId, userTagId })),
    })
  }
  return { caseId, userTagIds: Array.from(allowedIds).filter((id) => userTagIds.includes(id)) }
}

const cachedCaseUserTagIds = cache(async (userId: string, caseId: string) =>
  unstable_cache(
    async () => {
      const rows = await prisma.userTagOnCase.findMany({ where: { caseId, tag: { userId } }, select: { userTagId: true } })
      return rows.map((row) => row.userTagId)
    },
    ['bestof:case-user-tags', userId, caseId],
    { tags: [caseUserTagsTag(userId, caseId), userTagsTag(userId), userCasesTag(userId), caseDetailTag(caseId)] },
  )(),
)

export async function getCaseUserTagIds(userId: string, caseId: string) {
  return cachedCaseUserTagIds(userId, caseId)
}

const cachedCasesByUserTag = cache(async (userId: string, userTagId: string) =>
  unstable_cache(
    async () => {
      const tag = await prisma.userTag.findFirst({ where: { id: userTagId, userId }, select: { id: true } })
      if (!tag) return [] as CaseRef[]
      const links = await prisma.userTagOnCase.findMany({
        where: { userTagId },
        include: { c: { select: { id: true, name: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
      })
      return links.map((link) => link.c)
    },
    ['bestof:cases-by-user-tag', userId, userTagId],
    { tags: [userTagsTag(userId), userCasesTag(userId)] },
  )(),
)

export async function listCasesByUserTag(userId: string, userTagId: string) {
  return cachedCasesByUserTag(userId, userTagId)
}
