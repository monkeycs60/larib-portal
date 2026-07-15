import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import { siblingsToReject, isRejected } from '@/lib/publications/submission-rules'
import { SUBMISSION_STATUSES, type SubmissionStatusValue } from '@/lib/publications/status-display'

export { SUBMISSION_STATUSES }
export type { SubmissionStatusValue }

// A status that carries a dated decision (anything past "still pending review").
function isPending(status: SubmissionStatusValue): boolean {
  return status === 'SUBMITTED' || status === 'UNDER_REVIEW'
}

function decisionDate(status: SubmissionStatusValue, at: Date): Date | null {
  return isPending(status) ? null : at
}

async function findOrCreateJournalId(journalName: string): Promise<string> {
  const name = journalName.trim()
  const journal = await prisma.journal.upsert({
    where: { name },
    update: {},
    create: { name },
    select: { id: true },
  })
  return journal.id
}

export type AddSubmissionInput = {
  articleId: string
  journalName: string
  submittedAt: Date
  status: SubmissionStatusValue
}

export async function addSubmission(input: AddSubmissionInput): Promise<{ id: string }> {
  const journalId = await findOrCreateJournalId(input.journalName)
  return prisma.$transaction(async (tx) => {
    const priorActive = await tx.submission.findMany({
      where: { articleId: input.articleId, status: { not: 'REJECTED' } },
      select: { id: true, status: true },
    })
    const created = await tx.submission.create({
      data: {
        articleId: input.articleId,
        journalId,
        submittedAt: input.submittedAt,
        status: input.status,
        decidedAt: decisionDate(input.status, input.submittedAt),
      },
      select: { id: true },
    })
    if (!isRejected(input.status) && priorActive.length > 0) {
      await tx.submission.updateMany({
        where: { id: { in: priorActive.map((submission) => submission.id) } },
        data: { status: 'REJECTED', decidedAt: input.submittedAt },
      })
    }
    return created
  })
}

export type UpdateSubmissionStatusInput = {
  submissionId: string
  status: SubmissionStatusValue
  decidedAt: Date | null
}

export async function updateSubmissionStatus(input: UpdateSubmissionStatusInput): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const target = await tx.submission.findUniqueOrThrow({
      where: { id: input.submissionId },
      select: { id: true, articleId: true, submittedAt: true },
    })
    await tx.submission.update({
      where: { id: target.id },
      data: { status: input.status, decidedAt: isPending(input.status) ? null : input.decidedAt },
      select: { id: true },
    })
    if (!isRejected(input.status)) {
      const siblings = await tx.submission.findMany({
        where: { articleId: target.articleId },
        select: { id: true, status: true },
      })
      const rejectIds = siblingsToReject(
        siblings.map((submission) => ({ id: submission.id, status: submission.status as SubmissionStatusValue })),
        target.id,
      )
      if (rejectIds.length > 0) {
        await tx.submission.updateMany({
          where: { id: { in: rejectIds } },
          data: { status: 'REJECTED', decidedAt: input.decidedAt ?? target.submittedAt },
        })
      }
    }
    return { id: target.id }
  })
}

export type UpdateSubmissionInput = {
  submissionId: string
  journalName: string
  submittedAt: Date
}

export async function updateSubmission(input: UpdateSubmissionInput): Promise<{ id: string }> {
  const journalId = await findOrCreateJournalId(input.journalName)
  return prisma.submission.update({
    where: { id: input.submissionId },
    data: { journalId, submittedAt: input.submittedAt },
    select: { id: true },
  })
}

export async function deleteSubmission(submissionId: string): Promise<{ id: string }> {
  return prisma.submission.delete({ where: { id: submissionId }, select: { id: true } })
}

export async function userOwnsSubmission(userId: string, submissionId: string): Promise<boolean> {
  const found = await prisma.submission.findFirst({
    where: { id: submissionId, article: { authorships: { some: { author: { userId } } } } },
    select: { id: true },
  })
  return found != null
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}
