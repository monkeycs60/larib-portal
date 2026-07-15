import type { ArticleStatusValue } from '@/lib/services/publications/articles'

type HeaderInput = {
  submissions: Array<{ journalName: string; submittedAt: string }>
  publishedJournal: string | null
  publishedAt: string | null
}

// The header pill journal + date are derived from the latest submission, falling
// back to the published journal — never edited directly.
export function deriveHeaderContext(input: HeaderInput): { journal: string | null; at: string | null } {
  const latest = input.submissions.at(-1)
  if (latest) return { journal: latest.journalName, at: latest.submittedAt }
  return { journal: input.publishedJournal, at: input.publishedAt }
}

export function isDraftDeletable(title: string, status: ArticleStatusValue): boolean {
  return title.trim() === '' && status === 'IN_PREPARATION'
}

type RecipientCandidate = { email: string; role: 'ADMIN' | 'USER'; adminApplications: string[] }

// Author-list request emails go to super-admins and PUBLICATIONS app-admins only.
export function pickAuthorRequestRecipients(candidates: RecipientCandidate[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const candidate of candidates) {
    const isAdmin = candidate.role === 'ADMIN' || candidate.adminApplications.includes('PUBLICATIONS')
    if (!isAdmin || seen.has(candidate.email)) continue
    seen.add(candidate.email)
    result.push(candidate.email)
  }
  return result
}
