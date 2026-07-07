import type { PubmedAuthor } from '@/types/publications'

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function authorDedupeKey(author: PubmedAuthor): string {
  if (author.orcid) return `orcid:${author.orcid}`
  const initial = (author.initials ?? author.foreName ?? '').trim().charAt(0).toLowerCase()
  return `name:${normalizeName(author.lastName)}|${initial}`
}
