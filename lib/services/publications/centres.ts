import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'

export type CentreListItem = Prisma.CentreGetPayload<{
  select: { id: true; name: true; city: true; country: true; isOwn: true; _count: { select: { affiliations: true } } }
}>

export async function listCentres(): Promise<CentreListItem[]> {
  return prisma.centre.findMany({
    orderBy: [{ isOwn: 'desc' }, { affiliations: { _count: 'desc' } }, { name: 'asc' }],
    select: { id: true, name: true, city: true, country: true, isOwn: true, _count: { select: { affiliations: true } } },
  })
}

export async function renameCentre(id: string, name: string) {
  return prisma.centre.update({ where: { id }, data: { name }, select: { id: true } })
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
    await tx.centre.deleteMany({ where: { id: { in: sources } } })
    return { reassigned, deleted: sources.length }
  })
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}
