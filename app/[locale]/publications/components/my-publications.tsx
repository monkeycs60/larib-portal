'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { computePublicationStats } from '@/lib/publications/stats'
import { articleGroup, POSITION_BUCKETS, type ArticleGroup } from '@/lib/publications/status-display'
import type { ArticleStatusValue } from '@/lib/services/publications/articles'
import type { MyPublicationItem } from '@/lib/services/publications/my-publications'
import { PublicationsStats } from './publications-stats'
import { PublicationsTable, type SortKey } from './publications-table'
import { PublicationsFilters, type FiltersValue } from './publications-filters'

type Filter = 'all' | ArticleGroup

const TABS: { key: Filter; labelKey: string }[] = [
  { key: 'all', labelKey: 'myPub.tabs.all' },
  { key: 'inProgress', labelKey: 'myPub.tabs.inProgress' },
  { key: 'draft', labelKey: 'myPub.tabs.draft' },
  { key: 'published', labelKey: 'myPub.tabs.published' },
]

const STATUS_SORT: Record<ArticleStatusValue, number> = {
  IN_PREPARATION: 0,
  UNDER_REVIEW: 1,
  TO_RESUBMIT: 2,
  ACCEPTED: 3,
  PUBLISHED: 4,
  ABANDONED: 5,
}

function timeValue(iso: string | null): number {
  return iso ? new Date(iso).getTime() : -Infinity
}

// Alphabetical compare with empty values always sorted last (regardless of direction).
function compareText(a: string | null, b: string | null, direction: number): number {
  const left = a ?? ''
  const right = b ?? ''
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1
  return left.localeCompare(right) * direction
}

export function MyPublications({
  items,
  locale,
  journalNames,
}: {
  items: MyPublicationItem[]
  locale: string
  journalNames: string[]
}) {
  const t = useTranslations('publications')
  const [filter, setFilter] = useState<Filter>('all')
  const [filters, setFilters] = useState<FiltersValue>({
    role: 'all',
    status: 'all',
    study: 'all',
    type: 'all',
    journal: 'all',
  })
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [statsOpen, setStatsOpen] = useState(true)

  const studyOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.studyLabel).filter((label): label is string => label != null))).sort(),
    [items],
  )

  const stats = useMemo(
    () =>
      computePublicationStats(
        items.map((item) => ({
          year: item.year,
          status: item.status,
          positionBucket: item.positionBucket,
          journal: item.currentJournal,
          type: item.type,
        })),
      ),
    [items],
  )

  const counts = useMemo(() => {
    const base: Record<Filter, number> = { all: items.length, inProgress: 0, draft: 0, published: 0, other: 0 }
    for (const item of items) base[articleGroup(item.status)] += 1
    return base
  }, [items])

  const rows = useMemo(() => {
    const filtered = items.filter((item) => {
      if (filter !== 'all' && articleGroup(item.status) !== filter) return false
      if (filters.role !== 'all' && item.positionBucket !== filters.role) return false
      if (filters.status !== 'all' && item.status !== filters.status) return false
      if (filters.type !== 'all' && item.type !== filters.type) return false
      if (filters.journal !== 'all' && item.currentJournal !== filters.journal) return false
      if (filters.study !== 'all') {
        if (filters.study === '__none__' ? item.studyLabel != null : item.studyLabel !== filters.study) return false
      }
      return true
    })
    if (!sortKey) return filtered
    const direction = sortDir === 'desc' ? -1 : 1
    return [...filtered].sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title) * direction
      if (sortKey === 'journal') return compareText(a.currentJournal, b.currentJournal, direction)
      if (sortKey === 'study') return compareText(a.studyLabel, b.studyLabel, direction)
      if (sortKey === 'role')
        return (POSITION_BUCKETS.indexOf(a.positionBucket) - POSITION_BUCKETS.indexOf(b.positionBucket)) * direction
      if (sortKey === 'status') return (STATUS_SORT[a.status] - STATUS_SORT[b.status]) * direction
      return (timeValue(a.lastSubmissionAt) - timeValue(b.lastSubmissionAt)) * direction
    })
  }, [items, filter, filters, sortKey, sortDir])

  function onSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <PublicationsStats
        stats={stats}
        open={statsOpen}
        onToggle={() => setStatsOpen((value) => !value)}
        filters={filters}
        onFilter={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      />

      <div className="flex flex-nowrap items-stretch gap-2 overflow-x-auto pb-0.5">
      <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-line bg-bg-surface p-1 shadow-elevation-xs">
        {TABS.map((tab) => {
          const active = filter === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-bold transition',
                active
                  ? 'bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_6px_14px_-6px_rgba(214,31,85,0.55)]'
                  : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-white/5',
              )}
            >
              {t(tab.labelKey)}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums',
                  active ? 'bg-white/25 text-white' : 'bg-gray-100 text-text-secondary dark:bg-white/10',
                )}
              >
                {counts[tab.key]}
              </span>
            </button>
          )
        })}
      </div>

      <PublicationsFilters
        value={filters}
        studies={studyOptions}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      />
      </div>

      <PublicationsTable
        rows={rows}
        locale={locale}
        journalNames={journalNames}
        expansion={{ isOpen: (id: string) => expanded.has(id), toggle: toggleExpanded }}
        sort={{ key: sortKey, dir: sortDir, onSort }}
      />
    </div>
  )
}
