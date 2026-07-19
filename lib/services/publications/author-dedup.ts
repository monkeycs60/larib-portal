import { prisma } from '@/lib/prisma'

export type BankAuthor = { id: string; firstName: string; lastName: string; orcid: string | null }
export type NameQuery = { orcid: string | null; firstName: string; lastName: string }
export type FetchedAuthorLite = { firstName: string; lastName: string; orcid?: string | null }

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function fullKey(firstName: string, lastName: string): string {
  return `${normalizeName(firstName)}|${normalizeName(lastName)}`
}

function normalizeOrcid(orcid: string | null | undefined): string | null {
  if (!orcid) return null
  const trimmed = orcid.trim()
  return trimmed.length ? trimmed : null
}

export function pickDuplicates(
  bank: BankAuthor[],
  query: NameQuery,
): { orcidMatch: BankAuthor | null; nameMatches: BankAuthor[] } {
  const queryOrcid = normalizeOrcid(query.orcid)
  const orcidMatch = queryOrcid
    ? bank.find((author) => normalizeOrcid(author.orcid) === queryOrcid) ?? null
    : null
  if (orcidMatch) return { orcidMatch, nameMatches: [] }
  const key = fullKey(query.firstName, query.lastName)
  const nameMatches = bank.filter((author) => fullKey(author.firstName, author.lastName) === key)
  return { orcidMatch: null, nameMatches }
}

export type MatchedAuthor<T extends FetchedAuthorLite> = T & {
  status: 'existing' | 'new'
  existingId?: string
}

export function matchAuthorsAgainstBank<T extends FetchedAuthorLite>(
  bank: BankAuthor[],
  fetched: T[],
): MatchedAuthor<T>[] {
  return fetched.map((author) => {
    const { orcidMatch, nameMatches } = pickDuplicates(bank, {
      orcid: author.orcid ?? null,
      firstName: author.firstName,
      lastName: author.lastName,
    })
    const existing = orcidMatch ?? nameMatches[0] ?? null
    return existing
      ? { ...author, status: 'existing' as const, existingId: existing.id }
      : { ...author, status: 'new' as const }
  })
}

export async function findAuthorDuplicates(query: NameQuery) {
  const bank = await prisma.author.findMany({
    select: { id: true, firstName: true, lastName: true, orcid: true },
  })
  return pickDuplicates(bank, query)
}
