'use client'

import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PublicationStats } from '@/lib/publications/stats'
import { ARTICLE_STATUS_TONE, TONE_DOT_HEX } from '@/lib/publications/status-display'
import { ARTICLE_TYPE_BAR_HEX } from '@/lib/publications/article-type'
import type { FiltersValue } from './publications-filters'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-extrabold uppercase tracking-[0.07em] text-text-muted">{children}</span>
}

function StatBar({
  label,
  count,
  pct,
  color,
  active,
  onClick,
}: {
  label: string
  count: number
  pct: number
  color: { hex?: string; className?: string }
  active?: boolean
  onClick?: () => void
}) {
  const content = (
    <>
      <span
        className={cn(
          'w-[104px] shrink-0 truncate text-[11.5px] font-semibold',
          active ? 'text-coral-600 dark:text-coral-300' : 'text-text-secondary',
        )}
        title={label}
      >
        {label}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-md bg-gray-100 dark:bg-white/10">
        <div className={cn('h-full rounded-md', color.className)} style={{ width: `${pct}%`, backgroundColor: color.hex }} />
      </div>
      <span className="w-4 text-right text-xs font-extrabold text-text-primary tabular-nums">{count}</span>
    </>
  )
  if (!onClick) return <div className="flex items-center gap-2.5">{content}</div>
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        '-mx-1.5 flex w-full items-center gap-2.5 rounded-md px-1.5 py-0.5 text-left transition',
        active ? 'bg-coral-50 dark:bg-coral-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5',
      )}
    >
      {content}
    </button>
  )
}

export function PublicationsStats({
  stats,
  open,
  onToggle,
  filters,
  onFilter,
}: {
  stats: PublicationStats
  open: boolean
  onToggle: () => void
  filters: FiltersValue
  onFilter: (patch: Partial<FiltersValue>) => void
}) {
  const t = useTranslations('publications')
  const maxYear = Math.max(1, ...stats.perYear.map((entry) => entry.count))
  const maxStatus = Math.max(1, ...stats.byStatus.map((entry) => entry.count))
  const maxPosition = Math.max(1, ...stats.byPosition.map((entry) => entry.count))
  const maxJournal = Math.max(1, ...stats.byJournal.map((entry) => entry.count))
  const maxType = Math.max(1, ...stats.byType.map((entry) => entry.count))
  const coral = { className: 'bg-gradient-to-r from-coral-500 to-coral-600' }
  const navy = { className: 'bg-gradient-to-r from-navy-500 to-navy-600' }
  const toggle = (key: keyof FiltersValue, value: string) => () =>
    onFilter({ [key]: filters[key] === value ? 'all' : value })

  return (
    <div className="rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
      <div className={cn('flex items-center justify-between gap-3', open && 'mb-4')}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold leading-none tracking-tight text-text-primary tabular-nums">
            {stats.total}
          </span>
          <span className="text-[12.5px] font-semibold text-text-secondary">{t('myPub.stats.publications')}</span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-bg-surface px-3 text-xs font-bold text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5"
        >
          {open ? t('myPub.stats.hide') : t('myPub.stats.show')}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} strokeWidth={2.4} />
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <SectionLabel>{t('myPub.stats.perYear')}</SectionLabel>
            {stats.perYear.length === 0 ? (
              <p className="mt-3 text-xs text-text-muted">{t('myPub.stats.noYear')}</p>
            ) : (
              <div className="mt-3 flex h-28 items-end gap-1.5">
                {stats.perYear.map((entry) => (
                  <div key={entry.year} className="flex h-full w-7 flex-col items-center justify-end gap-1.5">
                    <span className="text-xs font-extrabold text-text-primary tabular-nums">{entry.count}</span>
                    <div
                      className="w-full max-w-[18px] rounded-t-md bg-gradient-to-b from-coral-500 to-coral-600"
                      style={{ height: entry.count === 0 ? 3 : Math.round((entry.count / maxYear) * 84) }}
                    />
                    <span className="text-[11px] font-semibold text-text-muted tabular-nums">{entry.year}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionLabel>{t('myPub.stats.byStatus')}</SectionLabel>
            <div className="mt-3 flex flex-col gap-2.5">
              {stats.byStatus.map((entry) => (
                <StatBar
                  key={entry.status}
                  label={t(`articles.status.${entry.status}`)}
                  count={entry.count}
                  pct={Math.round((entry.count / maxStatus) * 100)}
                  color={{ hex: TONE_DOT_HEX[ARTICLE_STATUS_TONE[entry.status]] }}
                  active={filters.status === entry.status}
                  onClick={toggle('status', entry.status)}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>{t('myPub.stats.byPosition')}</SectionLabel>
            <div className="mt-3 flex flex-col gap-2.5">
              {stats.byPosition.map((entry) => (
                <StatBar
                  key={entry.bucket}
                  label={t(`myPub.position.${entry.bucket}`)}
                  count={entry.count}
                  pct={Math.round((entry.count / maxPosition) * 100)}
                  color={entry.count > 0 ? coral : {}}
                  active={filters.role === entry.bucket}
                  onClick={toggle('role', entry.bucket)}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>{t('myPub.stats.byJournal')}</SectionLabel>
            <div className="mt-3 flex flex-col gap-2.5">
              {stats.byJournal.length === 0 ? (
                <p className="text-xs text-text-muted">{t('myPub.stats.noJournal')}</p>
              ) : (
                stats.byJournal.map((entry) => (
                  <StatBar
                    key={entry.journal}
                    label={entry.journal}
                    count={entry.count}
                    pct={Math.round((entry.count / maxJournal) * 100)}
                    color={navy}
                    active={filters.journal === entry.journal}
                    onClick={toggle('journal', entry.journal)}
                  />
                ))
              )}
            </div>
          </div>

          <div>
            <SectionLabel>{t('myPub.stats.byType')}</SectionLabel>
            <div className="mt-3 flex flex-col gap-2.5">
              {stats.byType.map((entry) => (
                <StatBar
                  key={entry.type}
                  label={t(`myPub.type.${entry.type}`)}
                  count={entry.count}
                  pct={Math.round((entry.count / maxType) * 100)}
                  color={{ hex: ARTICLE_TYPE_BAR_HEX[entry.type] }}
                  active={filters.type === entry.type}
                  onClick={toggle('type', entry.type)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
