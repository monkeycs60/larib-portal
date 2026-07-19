import { prisma } from '@/lib/prisma'
import { Prisma, type AuthorType } from '@/app/generated/prisma'
import { planAuthorshipMerge } from './authors-merge'
import { pickPrimaryCentre } from './author-centre'
import { PUBLICATIONS_AUTHORS_TAG, PUBLICATIONS_ARTICLES_TAG } from './import'

export type AuthorListItem = Prisma.AuthorGetPayload<{
  select: {
    id: true
    firstName: true
    lastName: true
    initials: true
    degrees: true
    email: true
    orcid: true
    type: true
    userId: true
    centreId: true
    user: { select: { id: true; firstName: true; lastName: true; email: true; emailVerified: true } }
    centre: { select: { id: true; name: true } }
    _count: { select: { authorships: true } }
  }
}>

export async function listAuthors(): Promise<AuthorListItem[]> {
  return prisma.author.findMany({
    orderBy: [{ authorships: { _count: 'desc' } }, { lastName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      initials: true,
      degrees: true,
      email: true,
      orcid: true,
      type: true,
      userId: true,
      centreId: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true, emailVerified: true } },
      centre: { select: { id: true, name: true } },
      _count: { select: { authorships: true } },
    },
  })
}

export async function countAuthors(): Promise<number> {
  return prisma.author.count()
}

export type LinkableUser = { id: string; firstName: string | null; lastName: string | null; email: string }

export async function listLinkableUsers(): Promise<LinkableUser[]> {
  return prisma.user.findMany({
    orderBy: [{ lastName: 'asc' }, { email: 'asc' }],
    select: { id: true, firstName: true, lastName: true, email: true },
  })
}

export type UpdateAuthorInput = {
  id: string
  firstName: string
  lastName: string
  degrees?: string | null
  email?: string | null
  orcid?: string | null
  userId?: string | null
  centreId?: string | null
}

export async function updateAuthor(data: UpdateAuthorInput) {
  const type = await resolveAuthorType(data.centreId ?? null)
  return prisma.author.update({
    where: { id: data.id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      degrees: data.degrees ?? null,
      email: data.email ?? null,
      orcid: data.orcid ?? null,
      userId: data.userId ?? null,
      centreId: data.centreId ?? null,
      type,
    },
    select: { id: true },
  })
}

export type CreateAuthorInput = {
  firstName: string
  lastName: string
  type?: AuthorType
  degrees?: string | null
  emails?: string[]
  orcid?: string | null
  centreId?: string | null
  centreIds?: string[]
  affiliations?: string[]
  userId?: string | null
}

export function buildAuthorCreateData(input: CreateAuthorInput): Prisma.AuthorUncheckedCreateInput {
  const emails = (input.emails ?? []).map((email) => email.trim()).filter(Boolean)
  const centreIds = input.centreIds ?? (input.centreId ? [input.centreId] : [])
  const affiliations = (input.affiliations ?? []).map((raw) => raw.trim()).filter(Boolean)
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    type: input.type ?? 'OUR_TEAM',
    degrees: input.degrees ?? null,
    emails,
    email: emails[0] ?? null,
    orcid: input.orcid ?? null,
    centreId: centreIds[0] ?? null,
    userId: input.userId ?? null,
    centres: {
      create: centreIds.map((centreId, index) => ({
        centreId,
        isPrimary: index === 0,
        order: index,
      })),
    },
    paperAffiliations: {
      create: affiliations.map((raw, index) => ({ raw, order: index })),
    },
  }
}

export async function resolveAuthorType(centreId: string | null | undefined): Promise<AuthorType> {
  if (!centreId) return 'EXTERNAL'
  const centre = await prisma.centre.findUnique({ where: { id: centreId }, select: { isOwn: true } })
  return centre?.isOwn ? 'OUR_TEAM' : 'EXTERNAL'
}

export async function createAuthor(input: CreateAuthorInput) {
  const primaryCentreId = input.centreIds?.[0] ?? input.centreId ?? null
  const type = await resolveAuthorType(primaryCentreId)
  return prisma.author.create({
    data: buildAuthorCreateData({ ...input, type }),
    select: { id: true, firstName: true, lastName: true },
  })
}

export type AuthorOption = { id: string; firstName: string; lastName: string; centreId: string | null }

export async function listAuthorOptions(): Promise<AuthorOption[]> {
  return prisma.author.findMany({
    orderBy: [{ lastName: 'asc' }],
    select: { id: true, firstName: true, lastName: true, centreId: true },
  })
}

export async function deleteAuthor(id: string) {
  return prisma.author.delete({ where: { id }, select: { id: true } })
}

export async function mergeAuthors(
  keepId: string,
  mergeIds: string[],
): Promise<{ reassigned: number; dropped: number; deleted: number }> {
  const sources = mergeIds.filter((id) => id !== keepId)
  if (sources.length === 0) return { reassigned: 0, dropped: 0, deleted: 0 }

  return prisma.$transaction(async (tx) => {
    const keeperArticleIds = (
      await tx.authorship.findMany({ where: { authorId: keepId }, select: { articleId: true } })
    ).map((authorship) => authorship.articleId)
    let reassigned = 0
    let dropped = 0
    for (const sourceId of sources) {
      const sourceAuthorships = await tx.authorship.findMany({
        where: { authorId: sourceId },
        select: { id: true, articleId: true },
      })
      const plan = planAuthorshipMerge(keeperArticleIds, sourceAuthorships)
      if (plan.dropIds.length) await tx.authorship.deleteMany({ where: { id: { in: plan.dropIds } } })
      if (plan.reassignIds.length) {
        await tx.authorship.updateMany({ where: { id: { in: plan.reassignIds } }, data: { authorId: keepId } })
        keeperArticleIds.push(
          ...sourceAuthorships.filter((authorship) => plan.reassignIds.includes(authorship.id)).map((authorship) => authorship.articleId),
        )
      }
      reassigned += plan.reassignIds.length
      dropped += plan.dropIds.length
    }
    await tx.author.deleteMany({ where: { id: { in: sources } } })
    return { reassigned, dropped, deleted: sources.length }
  })
}

export async function recomputeAuthorCentres(): Promise<{ updated: number }> {
  const links = await prisma.authorshipAffiliation.findMany({
    select: { authorship: { select: { authorId: true } }, affiliation: { select: { centreId: true } } },
  })
  const ownCentres = new Set((await prisma.centre.findMany({ where: { isOwn: true }, select: { id: true } })).map((centre) => centre.id))
  const byAuthor = new Map<string, string[]>()
  for (const link of links) {
    if (!link.affiliation.centreId) continue
    const list = byAuthor.get(link.authorship.authorId) ?? []
    list.push(link.affiliation.centreId)
    byAuthor.set(link.authorship.authorId, list)
  }
  let updated = 0
  for (const [authorId, centreIds] of byAuthor) {
    const primary = pickPrimaryCentre(centreIds, ownCentres)
    if (primary) {
      await prisma.author.update({ where: { id: authorId }, data: { centreId: primary } })
      updated += 1
    }
  }
  return { updated }
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}

export { PUBLICATIONS_AUTHORS_TAG, PUBLICATIONS_ARTICLES_TAG }
