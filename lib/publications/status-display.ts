import type { ArticleStatusValue } from '@/lib/services/publications/articles'

export type StatusTone = 'success' | 'info' | 'warning' | 'violet' | 'muted' | 'danger'

export const SUBMISSION_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'MINOR_REVISIONS',
  'MAJOR_REVISIONS',
  'ACCEPTED',
  'REJECTED',
] as const
export type SubmissionStatusValue = (typeof SUBMISSION_STATUSES)[number]

// Client-safe status list (display order) — avoids importing the prisma-backed
// ARTICLE_STATUSES from the services layer into client components.
export const ARTICLE_STATUS_VALUES: ArticleStatusValue[] = [
  'PUBLISHED',
  'ACCEPTED',
  'UNDER_REVIEW',
  'TO_RESUBMIT',
  'IN_PREPARATION',
  'ABANDONED',
]

export const ARTICLE_STATUS_TONE: Record<ArticleStatusValue, StatusTone> = {
  IN_PREPARATION: 'muted',
  UNDER_REVIEW: 'info',
  TO_RESUBMIT: 'warning',
  ACCEPTED: 'success',
  PUBLISHED: 'success',
  ABANDONED: 'danger',
}

export const SUBMISSION_STATUS_TONE: Record<SubmissionStatusValue, StatusTone> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  MINOR_REVISIONS: 'violet',
  MAJOR_REVISIONS: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
}

// Full class strings (light + dark) so Tailwind can detect them. Colors mirror the
// approved Claude Design palette for the "Mes Publications" view.
export const TONE_PILL_CLASS: Record<StatusTone, string> = {
  success:
    'text-[#047857] bg-[#ECFDF5] border-[#A7F3D0] dark:text-[#6EE7B7] dark:bg-[rgba(16,185,129,0.15)] dark:border-[rgba(16,185,129,0.3)]',
  info: 'text-[#1D4ED8] bg-[#EFF6FF] border-[#BFDBFE] dark:text-[#93C5FD] dark:bg-[rgba(59,130,246,0.16)] dark:border-[rgba(59,130,246,0.32)]',
  warning:
    'text-[#EA580C] bg-[#FFF3E9] border-[#FDBA74] dark:text-[#FDBA74] dark:bg-[rgba(234,88,12,0.16)] dark:border-[rgba(234,88,12,0.32)]',
  violet:
    'text-[#7C3AED] bg-[#F5F3FF] border-[#DDD6FE] dark:text-[#C4B5FD] dark:bg-[rgba(124,58,237,0.18)] dark:border-[rgba(124,58,237,0.34)]',
  muted:
    'text-[#64748B] bg-[#F1F5F9] border-[#E2E8F0] dark:text-[#CBD5E1] dark:bg-[rgba(148,163,184,0.16)] dark:border-[rgba(148,163,184,0.28)]',
  danger:
    'text-[#DC2626] bg-[#FEF2F2] border-[#FECACA] dark:text-[#FCA5A5] dark:bg-[rgba(239,68,68,0.15)] dark:border-[rgba(239,68,68,0.3)]',
}

export const TONE_DOT_HEX: Record<StatusTone, string> = {
  success: '#10B981',
  info: '#3B82F6',
  warning: '#EA580C',
  violet: '#7C3AED',
  muted: '#94A3B8',
  danger: '#EF4444',
}

export type PositionBucket = 'first' | 'second' | 'third' | 'second_last' | 'last' | 'middle'

export const POSITION_BUCKETS: PositionBucket[] = [
  'first',
  'second',
  'third',
  'middle',
  'second_last',
  'last',
]

// Which slot an author occupies among `total` signers. `last` and `second_last`
// take precedence over `second`/`third` so a short author list never double-labels.
export function authorPositionBucket(order: number, total: number): PositionBucket {
  if (total <= 1) return 'first'
  if (order <= 1) return 'first'
  if (order >= total) return 'last'
  if (order === total - 1) return 'second_last'
  if (order === 2) return 'second'
  if (order === 3) return 'third'
  return 'middle'
}

export function isFirstAuthor(bucket: PositionBucket): boolean {
  return bucket === 'first'
}

export const PILL_BASE =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold leading-none whitespace-nowrap'

export function pillClassName(tone: StatusTone): string {
  return `${PILL_BASE} ${TONE_PILL_CLASS[tone]}`
}

export type ArticleGroup = 'draft' | 'inProgress' | 'published' | 'other'

export function articleGroup(status: ArticleStatusValue): ArticleGroup {
  if (status === 'IN_PREPARATION') return 'draft'
  if (status === 'PUBLISHED') return 'published'
  if (status === 'UNDER_REVIEW' || status === 'TO_RESUBMIT' || status === 'ACCEPTED') return 'inProgress'
  return 'other'
}
