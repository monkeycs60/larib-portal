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
