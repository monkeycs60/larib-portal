import type { ArticleStatusValue } from '@/lib/services/publications/articles'
import { POSITION_BUCKETS, type PositionBucket } from './status-display'
import { ARTICLE_TYPE_VALUES, type ArticleTypeValue } from './article-type'

export type StatItem = {
  year: number | null
  status: ArticleStatusValue
  positionBucket: PositionBucket
  journal: string | null
  type: ArticleTypeValue
}

export type YearCount = { year: number; count: number }
export type StatusCount = { status: ArticleStatusValue; count: number }
export type PositionCount = { bucket: PositionBucket; count: number }
export type JournalCount = { journal: string; count: number }
export type TypeCount = { type: ArticleTypeValue; count: number }

export type PublicationStats = {
  total: number
  undated: number
  perYear: YearCount[]
  byStatus: StatusCount[]
  byPosition: PositionCount[]
  byJournal: JournalCount[]
  byType: TypeCount[]
}

const TOP_JOURNALS = 6

const MAX_YEAR_BARS = 12

const STATUS_DISPLAY_ORDER: ArticleStatusValue[] = [
  'PUBLISHED',
  'UNDER_REVIEW',
  'ACCEPTED',
  'TO_RESUBMIT',
  'IN_PREPARATION',
  'ABANDONED',
]

export function computePublicationStats(items: StatItem[]): PublicationStats {
  const years = items.map((item) => item.year).filter((year): year is number => year != null)
  let perYear: YearCount[] = []
  if (years.length > 0) {
    const max = Math.max(...years)
    const min = Math.min(...years)
    const start = max - min + 1 > MAX_YEAR_BARS ? max - MAX_YEAR_BARS + 1 : min
    const counts = new Map<number, number>()
    for (const year of years) counts.set(year, (counts.get(year) ?? 0) + 1)
    for (let year = start; year <= max; year += 1) {
      perYear.push({ year, count: counts.get(year) ?? 0 })
    }
  }

  const statusCounts = new Map<ArticleStatusValue, number>()
  for (const item of items) statusCounts.set(item.status, (statusCounts.get(item.status) ?? 0) + 1)
  const byStatus: StatusCount[] = STATUS_DISPLAY_ORDER.filter((status) => (statusCounts.get(status) ?? 0) > 0).map(
    (status) => ({ status, count: statusCounts.get(status) ?? 0 }),
  )

  const positionCounts = new Map<PositionBucket, number>()
  for (const item of items) positionCounts.set(item.positionBucket, (positionCounts.get(item.positionBucket) ?? 0) + 1)
  const byPosition: PositionCount[] = POSITION_BUCKETS.map((bucket) => ({
    bucket,
    count: positionCounts.get(bucket) ?? 0,
  }))

  const journalCounts = new Map<string, number>()
  for (const item of items) {
    if (!item.journal) continue
    journalCounts.set(item.journal, (journalCounts.get(item.journal) ?? 0) + 1)
  }
  const byJournal: JournalCount[] = [...journalCounts.entries()]
    .map(([journal, count]) => ({ journal, count }))
    .sort((a, b) => b.count - a.count || a.journal.localeCompare(b.journal))
    .slice(0, TOP_JOURNALS)

  const typeCounts = new Map<ArticleTypeValue, number>()
  for (const item of items) typeCounts.set(item.type, (typeCounts.get(item.type) ?? 0) + 1)
  const byType: TypeCount[] = ARTICLE_TYPE_VALUES.map((type) => ({ type, count: typeCounts.get(type) ?? 0 }))

  const undated = items.length - years.length

  return { total: items.length, undated, perYear, byStatus, byPosition, byJournal, byType }
}
