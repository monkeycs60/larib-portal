'use client'

import { useTranslations } from 'next-intl'
import { ChevronRight, ChevronsUpDown, ArrowUp, ArrowDown, Star, Pencil, Eye, Clock, FileText, ExternalLink } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import { cn } from '@/lib/utils'
import { ARTICLE_STATUS_TONE, pillClassName } from '@/lib/publications/status-display'
import { ARTICLE_TYPE_BADGE } from '@/lib/publications/article-type'
import type { MyPublicationItem } from '@/lib/services/publications/my-publications'
import { SubmissionHistory } from './submission-history'

export type SortKey = 'title' | 'journal' | 'study' | 'role' | 'status' | 'sub'

type Sort = { key: SortKey | null; dir: 'asc' | 'desc'; onSort: (key: SortKey) => void }
type Expansion = { isOpen: (id: string) => boolean; toggle: (id: string) => void }

const GRID = 'grid grid-cols-[minmax(220px,1fr)_150px_112px_124px_120px_156px_88px] items-center gap-3.5'

function formatter(locale: string) {
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  return (iso: string | null) => (iso ? fmt.format(new Date(iso)) : '—')
}

function SortHeader({ label, active, dir, onClick }: { label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] transition',
        active ? 'text-coral-600' : 'text-text-muted hover:text-text-secondary',
      )}
    >
      {label}
      {active ? (
        dir === 'asc' ? <ArrowUp className="h-3 w-3" strokeWidth={2.6} /> : <ArrowDown className="h-3 w-3" strokeWidth={2.6} />
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-40" strokeWidth={2} />
      )}
    </button>
  )
}

function ColLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('text-[11px] font-bold uppercase tracking-[0.06em] text-text-muted', className)}>{children}</span>
  )
}

function AuthorLine({ authors }: { authors: string[] }) {
  if (authors.length === 0) return null
  const first = authors[0]
  const last = authors.length > 1 ? authors[authors.length - 1] : null
  const middle = authors.slice(1, -1)
  return (
    <div className="mt-1 flex min-w-0 items-baseline text-[11.5px] leading-tight text-text-secondary">
      <span className="shrink-0">{first}</span>
      {middle.length > 0 && <span className="min-w-0 truncate">,&nbsp;{middle.join(', ')}</span>}
      {last && <span className="shrink-0">,&nbsp;{last}</span>}
    </div>
  )
}

function DateTag({ label, accepted }: { label: string; accepted?: boolean }) {
  return (
    <span
      className={cn(
        'min-w-[44px] rounded-[5px] px-1.5 py-0.5 text-center text-[9px] font-extrabold uppercase tracking-[0.04em] text-white',
        accepted ? 'bg-[#10B981]' : 'bg-gray-300 dark:bg-white/25',
      )}
    >
      {label}
    </span>
  )
}

function PublicationRow({
  item,
  locale,
  journalNames,
  expanded,
  onToggle,
}: {
  item: MyPublicationItem
  locale: string
  journalNames: string[]
  expanded: boolean
  onToggle: () => void
}) {
  const t = useTranslations('publications')
  const fmt = formatter(locale)

  return (
    <div className={cn('border-b border-line last:border-b-0', expanded && 'bg-coral-50/40 dark:bg-coral-500/[0.05]')}>
      <div className={cn(GRID, 'px-5 py-3.5 transition-colors hover:bg-coral-50/40 dark:hover:bg-coral-500/[0.06]')}>
        <div className="flex min-w-0 items-start gap-2.5">
          <button
            type="button"
            aria-label={t('myPub.toggleHistory')}
            onClick={onToggle}
            className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition',
              expanded
                ? 'border-coral-200 bg-coral-50 text-coral-600 dark:border-coral-500/40 dark:bg-coral-500/15'
                : 'border-line bg-bg-surface text-text-muted',
            )}
          >
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} strokeWidth={2.4} />
          </button>
          <div className="min-w-0">
            <span
              className={cn(
                'mb-1 inline-flex rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide',
                ARTICLE_TYPE_BADGE[item.type],
              )}
            >
              {t(`myPub.type.${item.type}`)}
            </span>
            <span className="block text-sm font-bold leading-snug text-text-primary">{item.title || t('myPub.untitled')}</span>
            <AuthorLine authors={item.authors} />
          </div>
        </div>

        <span
          title={item.currentJournalFull ?? undefined}
          className="text-[13px] font-semibold leading-snug text-text-primary break-words"
        >
          {item.currentJournal ?? '—'}
        </span>

        <div>
          {item.studyLabel ? (
            <span className="inline-flex max-w-full items-center truncate rounded-md border border-[#DDD6FE] bg-[#F5F3FF] px-2.5 py-0.5 text-[11.5px] font-bold text-[#6D28D9] dark:border-[rgba(139,92,246,0.32)] dark:bg-[rgba(139,92,246,0.16)] dark:text-[#C4B5FD]">
              {item.studyLabel}
            </span>
          ) : (
            <span className="text-[13px] text-text-muted">—</span>
          )}
        </div>

        <div>
          {item.isFirst ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-coral-100 bg-coral-50 px-2.5 py-0.5 text-[11.5px] font-bold text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300">
              <Star className="h-3 w-3 fill-current" strokeWidth={0} />
              {t(`myPub.position.${item.positionBucket}`)}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-[11.5px] font-bold text-text-secondary dark:border-white/10 dark:bg-white/10">
              {t(`myPub.position.${item.positionBucket}`)}
            </span>
          )}
        </div>

        <div>
          <span className={pillClassName(ARTICLE_STATUS_TONE[item.status])}>{t(`articles.status.${item.status}`)}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-text-primary tabular-nums">
            <DateTag label={t('myPub.submissionTag')} />
            {fmt(item.lastSubmissionAt)}
          </span>
          {item.acceptedAt ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#047857] tabular-nums dark:text-[#6EE7B7]">
              <DateTag label={t('myPub.acceptedTag')} accepted />
              {fmt(item.acceptedAt)}
            </span>
          ) : item.pendingDays != null ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B45309] tabular-nums dark:text-[#FBBF24]">
              <Clock className="h-3 w-3" strokeWidth={2.2} />
              {t('myPub.pending', { days: item.pendingDays })}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-1.5">
          {item.doi && (
            <a
              href={`https://doi.org/${item.doi}`}
              target="_blank"
              rel="noreferrer"
              title={t('myPub.openSite')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-coral-600 transition hover:bg-coral-50 dark:text-coral-300 dark:hover:bg-white/5"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
          )}
          <Link
            href={item.isFirst ? `/publications/articles/${item.id}/edit` : `/publications/articles/${item.id}`}
            title={item.isFirst ? t('myPub.edit') : t('myPub.view')}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-lg transition',
              item.isFirst
                ? 'bg-gradient-to-b from-navy-600 to-navy-700 text-white shadow-[0_6px_14px_-6px_rgba(19,44,74,0.5)] hover:brightness-110'
                : 'border border-line bg-bg-surface text-text-secondary hover:bg-gray-50 dark:hover:bg-white/5',
            )}
          >
            {item.isFirst ? <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> : <Eye className="h-3.5 w-3.5" strokeWidth={2} />}
          </Link>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4">
          <SubmissionHistory articleId={item.id} submissions={item.submissions} locale={locale} journalNames={journalNames} />
        </div>
      )}
    </div>
  )
}

export function PublicationsTable({
  rows,
  locale,
  journalNames,
  expansion,
  sort,
}: {
  rows: MyPublicationItem[]
  locale: string
  journalNames: string[]
  expansion: Expansion
  sort: Sort
}) {
  const t = useTranslations('publications')

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-bg-surface shadow-elevation-sm">
        <div className="flex flex-col items-center px-8 py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-coral-100 bg-coral-50 text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300">
            <FileText className="h-7 w-7" strokeWidth={1.7} />
          </div>
          <p className="text-[17px] font-bold text-text-primary">{t('myPub.emptyTitle')}</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">{t('myPub.emptyDesc')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-bg-surface shadow-elevation-sm">
      <div className="min-w-[900px]">
        <div className={cn(GRID, 'border-b border-line bg-gray-50/60 px-5 py-3 dark:bg-white/[0.03]')}>
          <SortHeader label={t('myPub.col.title')} active={sort.key === 'title'} dir={sort.dir} onClick={() => sort.onSort('title')} />
          <SortHeader label={t('myPub.col.journal')} active={sort.key === 'journal'} dir={sort.dir} onClick={() => sort.onSort('journal')} />
          <SortHeader label={t('myPub.col.study')} active={sort.key === 'study'} dir={sort.dir} onClick={() => sort.onSort('study')} />
          <SortHeader label={t('myPub.col.role')} active={sort.key === 'role'} dir={sort.dir} onClick={() => sort.onSort('role')} />
          <SortHeader label={t('myPub.col.status')} active={sort.key === 'status'} dir={sort.dir} onClick={() => sort.onSort('status')} />
          <SortHeader label={t('myPub.col.submission')} active={sort.key === 'sub'} dir={sort.dir} onClick={() => sort.onSort('sub')} />
          <ColLabel className="text-right">{t('myPub.col.action')}</ColLabel>
        </div>

        {rows.map((item) => (
          <PublicationRow
            key={item.id}
            item={item}
            locale={locale}
            journalNames={journalNames}
            expanded={expansion.isOpen(item.id)}
            onToggle={() => expansion.toggle(item.id)}
          />
        ))}
      </div>
    </div>
  )
}
