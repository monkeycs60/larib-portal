import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import { PUBLICATIONS_ARTICLES_TAG } from './import'

export const ARTICLE_STATUSES = ['IN_PREPARATION', 'UNDER_REVIEW', 'TO_RESUBMIT', 'ACCEPTED', 'PUBLISHED', 'ABANDONED'] as const
export type ArticleStatusValue = (typeof ARTICLE_STATUSES)[number]

export type ArticleListItem = Prisma.ArticleGetPayload<{
  select: {
    id: true
    title: true
    status: true
    publishedAt: true
    doi: true
    pubmedId: true
    publishedJournal: { select: { name: true } }
    _count: { select: { authorships: true } }
  }
}>

export async function listArticles(): Promise<ArticleListItem[]> {
  return prisma.article.findMany({
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      status: true,
      publishedAt: true,
      doi: true,
      pubmedId: true,
      publishedJournal: { select: { name: true } },
      _count: { select: { authorships: true } },
    },
  })
}

export type ArticleDetail = Prisma.ArticleGetPayload<{
  select: {
    id: true
    title: true
    abstract: true
    type: true
    status: true
    publishedAt: true
    doi: true
    pubmedId: true
    publishedJournal: { select: { name: true; issn: true } }
    study: { select: { id: true; title: true } }
    authorships: {
      select: {
        order: true
        isCorresponding: true
        author: { select: { id: true; firstName: true; lastName: true; orcid: true } }
        affiliations: {
          select: { order: true; affiliation: { select: { name: true; centre: { select: { name: true; isOwn: true } } } } }
        }
      }
    }
  }
}>

export async function getArticle(id: string): Promise<ArticleDetail | null> {
  return prisma.article.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      abstract: true,
      type: true,
      status: true,
      publishedAt: true,
      doi: true,
      pubmedId: true,
      publishedJournal: { select: { name: true, issn: true } },
      study: { select: { id: true, title: true } },
      authorships: {
        orderBy: { order: 'asc' },
        select: {
          order: true,
          isCorresponding: true,
          author: { select: { id: true, firstName: true, lastName: true, orcid: true } },
          affiliations: {
            orderBy: { order: 'asc' },
            select: { order: true, affiliation: { select: { name: true, centre: { select: { name: true, isOwn: true } } } } },
          },
        },
      },
    },
  })
}

export async function updateArticleStatus(id: string, status: ArticleStatusValue) {
  return prisma.article.update({ where: { id }, data: { status }, select: { id: true } })
}

export { PUBLICATIONS_ARTICLES_TAG }
