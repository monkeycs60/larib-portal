import { prisma } from '@/lib/prisma'
import { pickAuthorRequestRecipients } from '@/lib/publications/editor-logic'
import { sendAuthorListRequestEmail } from '@/lib/services/email'

export const PUBLICATIONS_REQUESTS_TAG = 'publications:requests'

export async function createAuthorListRequest(
  articleId: string,
  userId: string,
  note: string | null,
): Promise<{ id: string }> {
  const existing = await prisma.authorListRequest.findFirst({
    where: { articleId, status: 'PENDING' },
    select: { id: true },
  })
  if (existing) throw new Error('REQUEST_EXISTS')

  const request = await prisma.authorListRequest.create({
    data: { articleId, requestedById: userId, note, status: 'PENDING' },
    select: {
      id: true,
      article: { select: { title: true } },
      requestedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  })

  const candidates = await prisma.user.findMany({
    where: { OR: [{ role: 'ADMIN' }, { adminApplications: { has: 'PUBLICATIONS' } }] },
    select: { email: true, role: true, adminApplications: true },
  })
  const recipients = pickAuthorRequestRecipients(
    candidates.map((candidate) => ({
      email: candidate.email,
      role: candidate.role,
      adminApplications: candidate.adminApplications as string[],
    })),
  )
  const requester = request.requestedBy
  const requesterName =
    [requester.firstName, requester.lastName].filter(Boolean).join(' ') || requester.email
  try {
    await sendAuthorListRequestEmail({ recipients, articleTitle: request.article.title, requesterName, note })
  } catch (error) {
    console.error('sendAuthorListRequestEmail failed', error)
  }
  return { id: request.id }
}

export type PendingAuthorRequest = {
  id: string
  articleId: string
  articleTitle: string
  requesterName: string
  note: string | null
  createdAt: Date
}

export async function listPendingAuthorRequests(): Promise<PendingAuthorRequest[]> {
  const rows = await prisma.authorListRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      note: true,
      createdAt: true,
      article: { select: { id: true, title: true } },
      requestedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  })
  return rows.map((row) => ({
    id: row.id,
    articleId: row.article.id,
    articleTitle: row.article.title,
    requesterName:
      [row.requestedBy.firstName, row.requestedBy.lastName].filter(Boolean).join(' ') || row.requestedBy.email,
    note: row.note,
    createdAt: row.createdAt,
  }))
}

export async function resolveAuthorRequest(
  id: string,
  adminId: string,
  outcome: 'RESOLVED' | 'DISMISSED',
): Promise<{ id: string }> {
  return prisma.authorListRequest.update({
    where: { id },
    data: { status: outcome, resolvedAt: new Date(), resolvedById: adminId },
    select: { id: true },
  })
}
