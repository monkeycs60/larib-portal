import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import { PUBLICATIONS_JOURNALS_TAG } from './import'

export type JournalListItem = Prisma.JournalGetPayload<{
  select: {
    id: true
    name: true
    issn: true
    publisher: true
    impactFactor: true
    sjr: true
    url: true
    _count: { select: { publishedArticles: true; submissions: true } }
  }
}>

export async function listJournals(): Promise<JournalListItem[]> {
  return prisma.journal.findMany({
    orderBy: [{ sjr: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      issn: true,
      publisher: true,
      impactFactor: true,
      sjr: true,
      url: true,
      _count: { select: { publishedArticles: true, submissions: true } },
    },
  })
}

export async function listJournalNames(): Promise<string[]> {
  const journals = await prisma.journal.findMany({ orderBy: { name: 'asc' }, select: { name: true } })
  return journals.map((journal) => journal.name)
}

export type UpsertJournalInput = {
  name: string
  issn?: string | null
  publisher?: string | null
  impactFactor?: number | null
  sjr?: number | null
  url?: string | null
}

export async function createJournal(data: UpsertJournalInput) {
  return prisma.journal.create({
    data: {
      name: data.name,
      issn: data.issn ?? null,
      publisher: data.publisher ?? null,
      impactFactor: data.impactFactor ?? null,
      sjr: data.sjr ?? null,
      url: data.url ?? null,
    },
    select: { id: true },
  })
}

export async function updateJournal(id: string, data: UpsertJournalInput) {
  return prisma.journal.update({
    where: { id },
    data: {
      name: data.name,
      issn: data.issn ?? null,
      publisher: data.publisher ?? null,
      impactFactor: data.impactFactor ?? null,
      sjr: data.sjr ?? null,
      url: data.url ?? null,
    },
    select: { id: true },
  })
}

export async function deleteJournal(id: string) {
  return prisma.journal.delete({ where: { id }, select: { id: true } })
}

export function isPrismaKnownError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}

export { PUBLICATIONS_JOURNALS_TAG }
