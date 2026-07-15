import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import type { ArticleStatusValue } from './articles'
import { PUBLICATIONS_ARTICLES_TAG } from './import'
import { ARTICLE_TYPE_VALUES, type ArticleTypeValue } from '@/lib/publications/article-type'

export { PUBLICATIONS_ARTICLES_TAG, ARTICLE_TYPE_VALUES }

async function findOrCreateAuthorForUser(userId: string): Promise<string> {
  const existing = await prisma.author.findFirst({ where: { userId }, select: { id: true } })
  if (existing) return existing.id
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  })
  const author = await prisma.author.create({
    data: {
      firstName: user.firstName ?? user.email.split('@')[0],
      lastName: user.lastName ?? '',
      userId,
    },
    select: { id: true },
  })
  return author.id
}

export async function createDraftArticle(userId: string): Promise<{ id: string }> {
  const authorId = await findOrCreateAuthorForUser(userId)
  return prisma.article.create({
    data: {
      title: '',
      status: 'IN_PREPARATION',
      type: 'ORIGINAL',
      createdById: userId,
      authorships: { create: { authorId, order: 1, isCorresponding: true } },
    },
    select: { id: true },
  })
}

export async function userIsFirstAuthor(userId: string, articleId: string): Promise<boolean> {
  const found = await prisma.authorship.findFirst({
    where: { articleId, order: 1, author: { userId } },
    select: { articleId: true },
  })
  return found != null
}

export type PublicationEditData = NonNullable<Awaited<ReturnType<typeof getPublicationForEdit>>>

export async function getPublicationForEdit(articleId: string) {
  return prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      studyId: true,
      pubmedId: true,
      doi: true,
      contributorsNote: true,
      publishedAt: true,
      publishedJournal: { select: { name: true, abbreviation: true } },
      authorships: {
        orderBy: { order: 'asc' },
        select: {
          order: true,
          isCorresponding: true,
          author: {
            select: {
              firstName: true,
              lastName: true,
              degrees: true,
              userId: true,
              centre: { select: { name: true } },
              defaultAffiliation: { select: { name: true } },
            },
          },
        },
      },
      submissions: {
        orderBy: { submittedAt: 'asc' },
        select: {
          id: true,
          submittedAt: true,
          status: true,
          decidedAt: true,
          journal: { select: { name: true, abbreviation: true } },
        },
      },
      authorRequests: { where: { status: 'PENDING' }, select: { id: true } },
    },
  })
}

export type UpdateArticleCoreInput = {
  title: string
  type: ArticleTypeValue
  status: ArticleStatusValue
  studyId: string | null
  pubmedId: string | null
  doi: string | null
  contributorsNote: string | null
}

export async function updateArticleCore(articleId: string, input: UpdateArticleCoreInput) {
  return prisma.article.update({
    where: { id: articleId },
    data: {
      title: input.title,
      type: input.type,
      status: input.status,
      studyId: input.studyId,
      pubmedId: input.pubmedId,
      doi: input.doi,
      contributorsNote: input.contributorsNote,
    },
    select: { id: true },
  })
}

export async function deleteDraft(articleId: string): Promise<{ deleted: boolean }> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { title: true, status: true },
  })
  if (!article) return { deleted: false }
  if (article.title.trim() !== '' || article.status !== 'IN_PREPARATION') return { deleted: false }
  await prisma.article.delete({ where: { id: articleId } })
  return { deleted: true }
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}
