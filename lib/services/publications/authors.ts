import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import { planAuthorshipMerge } from './authors-merge'
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
    userId: true
    user: { select: { id: true; firstName: true; lastName: true; email: true } }
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
      userId: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      _count: { select: { authorships: true } },
    },
  })
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
}

export async function updateAuthor(data: UpdateAuthorInput) {
  return prisma.author.update({
    where: { id: data.id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      degrees: data.degrees ?? null,
      email: data.email ?? null,
      orcid: data.orcid ?? null,
      userId: data.userId ?? null,
    },
    select: { id: true },
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

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}

export { PUBLICATIONS_AUTHORS_TAG, PUBLICATIONS_ARTICLES_TAG }
