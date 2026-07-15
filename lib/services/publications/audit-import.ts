import { prisma } from '@/lib/prisma'
import type { SubmissionStatusValue } from '@/lib/publications/status-display'
import type { ArticleStatusValue } from './articles'

export type AuditAuthorInput = { name: string; isCorresponding?: boolean }
export type AuditSubmission = { journalName: string; submittedAt: string; status: SubmissionStatusValue }
export type AuditPaper = {
  title: string
  articleStatus: ArticleStatusValue
  authors: AuditAuthorInput[]
  submissions: AuditSubmission[]
  notes?: string
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function splitAuthorName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: '', lastName: parts[0] }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

export type AuditPlan = { toCreate: AuditPaper[]; skipped: { title: string }[] }

export function planAuditWrite(existingTitles: string[], papers: AuditPaper[]): AuditPlan {
  const existing = new Set(existingTitles.map(normalizeTitle))
  const seen = new Set<string>()
  const toCreate: AuditPaper[] = []
  const skipped: { title: string }[] = []
  for (const paper of papers) {
    const key = normalizeTitle(paper.title)
    if (existing.has(key) || seen.has(key)) {
      skipped.push({ title: paper.title })
      continue
    }
    seen.add(key)
    toCreate.push(paper)
  }
  return { toCreate, skipped }
}

export type AuditReport = { createdArticleIds: string[]; skippedTitles: string[]; authorsCreated: number }

async function upsertJournalId(journalName: string): Promise<string> {
  const name = journalName.trim()
  const journal = await prisma.journal.upsert({ where: { name }, update: {}, create: { name }, select: { id: true } })
  return journal.id
}

async function findOrCreateAuthorId(input: AuditAuthorInput, counter: { created: number }): Promise<string> {
  const { firstName, lastName } = splitAuthorName(input.name)
  const found = await prisma.author.findFirst({
    where: {
      firstName: { equals: firstName, mode: 'insensitive' },
      lastName: { equals: lastName, mode: 'insensitive' },
    },
    select: { id: true },
  })
  if (found) return found.id
  const created = await prisma.author.create({ data: { firstName, lastName }, select: { id: true } })
  counter.created += 1
  return created.id
}

export async function importAuditPapers(papers: AuditPaper[], createdById: string): Promise<AuditReport> {
  const existing = await prisma.article.findMany({ select: { title: true } })
  const plan = planAuditWrite(existing.map((article) => article.title), papers)
  const createdArticleIds: string[] = []
  const counter = { created: 0 }

  for (const paper of plan.toCreate) {
    const article = await prisma.article.create({
      data: { title: paper.title, status: paper.articleStatus, createdById },
      select: { id: true },
    })

    for (const [index, author] of paper.authors.entries()) {
      const authorId = await findOrCreateAuthorId(author, counter)
      await prisma.authorship.create({
        data: { articleId: article.id, authorId, order: index + 1, isCorresponding: author.isCorresponding ?? false },
      })
    }

    for (const submission of paper.submissions) {
      const journalId = await upsertJournalId(submission.journalName)
      await prisma.submission.create({
        data: {
          articleId: article.id,
          journalId,
          submittedAt: new Date(submission.submittedAt),
          status: submission.status,
          notes: paper.notes ?? null,
        },
      })
    }

    createdArticleIds.push(article.id)
  }

  return { createdArticleIds, skippedTitles: plan.skipped.map((entry) => entry.title), authorsCreated: counter.created }
}
