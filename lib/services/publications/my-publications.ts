import { prisma } from '@/lib/prisma'
import type { ArticleStatusValue } from './articles'
import {
  authorPositionBucket,
  isFirstAuthor,
  type PositionBucket,
  type SubmissionStatusValue,
} from '@/lib/publications/status-display'
import { normalizeArticleType, type ArticleTypeValue } from '@/lib/publications/article-type'

export type MyPublicationSubmission = {
  id: string
  journalName: string
  submittedAt: string
  status: SubmissionStatusValue
  decidedAt: string | null
}

export type MyPublicationItem = {
  id: string
  title: string
  type: ArticleTypeValue
  status: ArticleStatusValue
  year: number | null
  studyLabel: string | null
  currentJournal: string | null
  currentJournalFull: string | null
  doi: string | null
  order: number
  totalAuthors: number
  positionBucket: PositionBucket
  isFirst: boolean
  authors: string[]
  lastSubmissionAt: string | null
  acceptedAt: string | null
  pendingDays: number | null
  submissions: MyPublicationSubmission[]
}

const DAY_MS = 86_400_000
const ACTIVE_STATUSES: ArticleStatusValue[] = ['UNDER_REVIEW', 'TO_RESUBMIT']

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / DAY_MS))
}

function formatAuthorName(author: { firstName: string; lastName: string }): string {
  const initial = author.firstName.trim().charAt(0)
  return initial ? `${initial}. ${author.lastName}` : author.lastName
}

export async function listMyPublications(userId: string, now: Date = new Date()): Promise<MyPublicationItem[]> {
  const articles = await prisma.article.findMany({
    where: { authorships: { some: { author: { userId } } } },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      doi: true,
      publishedAt: true,
      receivedAt: true,
      acceptedAt: true,
      study: { select: { title: true, acronym: true } },
      publishedJournal: { select: { name: true, abbreviation: true } },
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
      authorships: {
        orderBy: { order: 'asc' },
        select: { order: true, author: { select: { firstName: true, lastName: true, userId: true } } },
      },
    },
  })

  return articles.map((article) => {
    const totalAuthors = article.authorships.length
    const mine = article.authorships.find((authorship) => authorship.author.userId === userId)
    const order = mine?.order ?? 1
    const positionBucket = authorPositionBucket(order, totalAuthors)
    const authors = article.authorships.map((authorship) => formatAuthorName(authorship.author))

    const submissions: MyPublicationSubmission[] = article.submissions.map((submission) => ({
      id: submission.id,
      journalName: submission.journal.abbreviation ?? submission.journal.name,
      submittedAt: submission.submittedAt.toISOString(),
      status: submission.status as SubmissionStatusValue,
      decidedAt: submission.decidedAt ? submission.decidedAt.toISOString() : null,
    }))

    const latest = article.submissions.at(-1) ?? null
    const acceptedSubmission = article.submissions.find((submission) => submission.status === 'ACCEPTED') ?? null

    const latestJournal = latest?.journal ?? article.publishedJournal ?? null
    const currentJournal = latestJournal ? latestJournal.abbreviation ?? latestJournal.name : null
    const currentJournalFull = latestJournal?.name ?? null
    const lastSubmissionDate = latest?.submittedAt ?? article.receivedAt ?? null
    const acceptedDate = article.acceptedAt ?? acceptedSubmission?.decidedAt ?? null

    const isActive = ACTIVE_STATUSES.includes(article.status)
    const pendingDays =
      isActive && !acceptedDate && lastSubmissionDate ? daysBetween(lastSubmissionDate, now) : null

    return {
      id: article.id,
      title: article.title,
      type: normalizeArticleType(article.type),
      status: article.status,
      year: article.publishedAt ? article.publishedAt.getUTCFullYear() : null,
      studyLabel: article.study?.acronym ?? article.study?.title ?? null,
      currentJournal,
      currentJournalFull,
      doi: article.doi,
      order,
      totalAuthors,
      positionBucket,
      isFirst: isFirstAuthor(positionBucket),
      authors,
      lastSubmissionAt: lastSubmissionDate ? lastSubmissionDate.toISOString() : null,
      acceptedAt: acceptedDate ? acceptedDate.toISOString() : null,
      pendingDays,
      submissions,
    }
  })
}

export async function userIsAuthorOfArticle(userId: string, articleId: string): Promise<boolean> {
  const found = await prisma.article.findFirst({
    where: { id: articleId, authorships: { some: { author: { userId } } } },
    select: { id: true },
  })
  return found != null
}
