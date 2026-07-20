import { prisma } from '@/lib/prisma'
import { Prisma, type AuthorType } from '@/app/generated/prisma'

export type CentreType = 'HOSPITAL' | 'RESEARCH_UNIT' | 'OTHER'

export function deriveCentreType(name: string): CentreType {
  const lowered = name.toLowerCase()
  if (/\b(inserm|cnrs|umrs?|umr|u\d{3,}|laboratory|laboratoire|research unit|unit[eé] de recherche)\b/.test(lowered)) return 'RESEARCH_UNIT'
  if (/(h[oô]pital|hospital|\bchu\b|\bchr\b|clinic|clinique|ap-?hp|centre hospitalier|medical cent)/.test(lowered)) return 'HOSPITAL'
  return 'OTHER'
}

export type CentreRow = {
  id: string
  name: string
  city: string | null
  country: string | null
  isOwn: boolean
  type: CentreType
  authorsCount: number
  publicationsCount: number
}

export async function listCentres(): Promise<CentreRow[]> {
  const [centres, authorCounts, pubRows] = await Promise.all([
    prisma.centre.findMany({ orderBy: [{ name: 'asc' }], select: { id: true, name: true, city: true, country: true, isOwn: true } }),
    prisma.author.groupBy({ by: ['centreId'], _count: { _all: true }, where: { centreId: { not: null } } }),
    prisma.$queryRaw<{ centreId: string; cnt: bigint }[]>`
      SELECT a."centreId" AS "centreId", COUNT(DISTINCT ash."articleId") AS cnt
      FROM "Affiliation" a
      JOIN "AuthorshipAffiliation" aa ON aa."affiliationId" = a."id"
      JOIN "Authorship" ash ON ash."id" = aa."authorshipId"
      WHERE a."centreId" IS NOT NULL
      GROUP BY a."centreId"`,
  ])
  const authorMap = new Map(authorCounts.map((row) => [row.centreId, row._count._all]))
  const pubMap = new Map(pubRows.map((row) => [row.centreId, Number(row.cnt)]))
  return centres.map((centre) => ({
    ...centre,
    type: deriveCentreType(centre.name),
    authorsCount: authorMap.get(centre.id) ?? 0,
    publicationsCount: pubMap.get(centre.id) ?? 0,
  }))
}

export type CentreAuthor = {
  id: string
  firstName: string
  lastName: string
  degrees: string | null
  type: AuthorType
  publications: number
}

export async function getCentreAuthors(centreId: string): Promise<CentreAuthor[]> {
  const authors = await prisma.author.findMany({
    where: { centreId },
    orderBy: [{ authorships: { _count: 'desc' } }, { lastName: 'asc' }],
    select: { id: true, firstName: true, lastName: true, degrees: true, type: true, _count: { select: { authorships: true } } },
    take: 120,
  })
  return authors.map((author) => ({
    id: author.id,
    firstName: author.firstName,
    lastName: author.lastName,
    degrees: author.degrees,
    type: author.type,
    publications: author._count.authorships,
  }))
}

export async function createCentre(data: { name: string; city?: string | null; country?: string | null }) {
  return prisma.centre.create({
    data: { name: data.name, city: data.city ?? null, country: data.country ?? null },
    select: { id: true },
  })
}

export async function renameCentre(id: string, name: string) {
  return prisma.centre.update({ where: { id }, data: { name }, select: { id: true } })
}

export async function updateCentre(data: { id: string; name: string; city?: string | null; country?: string | null; isOwn?: boolean }) {
  return prisma.centre.update({
    where: { id: data.id },
    data: { name: data.name, city: data.city ?? null, country: data.country ?? null, isOwn: data.isOwn ?? false },
    select: { id: true },
  })
}

export async function setCentreOwn(id: string, isOwn: boolean) {
  return prisma.centre.update({ where: { id }, data: { isOwn }, select: { id: true } })
}

export async function deleteCentre(id: string) {
  return prisma.centre.delete({ where: { id }, select: { id: true } })
}

export async function mergeCentres(keepId: string, mergeIds: string[]): Promise<{ reassigned: number; deleted: number }> {
  const sources = mergeIds.filter((id) => id !== keepId)
  if (sources.length === 0) return { reassigned: 0, deleted: 0 }
  return prisma.$transaction(async (tx) => {
    const reassigned = (await tx.affiliation.updateMany({ where: { centreId: { in: sources } }, data: { centreId: keepId } })).count
    await tx.author.updateMany({ where: { centreId: { in: sources } }, data: { centreId: keepId } })
    await tx.authorCentre.updateMany({ where: { centreId: { in: sources } }, data: { centreId: keepId } })
    await tx.centre.deleteMany({ where: { id: { in: sources } } })
    return { reassigned, deleted: sources.length }
  })
}

export async function countCentres(): Promise<number> {
  return prisma.centre.count()
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}
