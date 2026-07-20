'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { RefreshCw, Plus, Search, Building2, User, Users, FileText, ArrowRight, ChevronUp, ChevronDown, ChevronsUpDown, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Link } from '@/app/i18n/navigation'
import { StudyForm } from './study-form'
import { ImportTrialDialog } from './import-trial-dialog'
import { type StudyListItem, type StudyStatusValue } from '@/lib/services/publications/studies'
import type { AuthorOption } from '@/lib/services/publications/authors'

type StatusFilter = 'ALL' | StudyStatusValue
type SortKey = 'study' | 'status' | 'sites' | 'patients' | 'invest' | 'pubs'

const STATUS_TABS: StatusFilter[] = ['ALL', 'ONGOING', 'PLANNED', 'COMPLETED', 'STOPPED']

const STATUS_BADGE: Record<StudyStatusValue, string> = {
  ONGOING: 'border-coral-200 bg-coral-50 text-coral-600',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  PLANNED: 'border-line bg-gray-100 text-gray-600',
  STOPPED: 'border-red-200 bg-red-50 text-red-600',
}
const STATUS_DOT: Record<StudyStatusValue, string> = {
  ONGOING: 'bg-coral-500',
  COMPLETED: 'bg-emerald-500',
  PLANNED: 'bg-gray-400',
  STOPPED: 'bg-red-500',
}

function monthYear(value: Date | string | null): string | null {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function sortValue(study: StudyListItem, key: SortKey): string | number {
  switch (key) {
    case 'study':
      return (study.acronym ?? study.title).toLowerCase()
    case 'status':
      return study.status
    case 'sites':
      return study._count.centres
    case 'patients':
      return study.enrollment ?? -1
    case 'invest':
      return study._count.investigators
    case 'pubs':
      return study._count.articles
  }
}

export function StudiesManager({
  studies,
  authors,
  centres,
}: {
  studies: StudyListItem[]
  authors: AuthorOption[]
  centres: { id: string; name: string }[]
}) {
  const t = useTranslations('publications.studies')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('study')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = { ALL: studies.length, PLANNED: 0, ONGOING: 0, COMPLETED: 0, STOPPED: 0 }
    for (const study of studies) base[study.status] += 1
    return base
  }, [studies])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return studies.filter((study) => {
      if (statusFilter !== 'ALL' && study.status !== statusFilter) return false
      if (!needle) return true
      return (
        study.title.toLowerCase().includes(needle) ||
        (study.acronym ?? '').toLowerCase().includes(needle) ||
        (study.nctId ?? '').toLowerCase().includes(needle)
      )
    })
  }, [studies, query, statusFilter])

  const sorted = useMemo(() => {
    const direction = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((first, second) => {
      const a = sortValue(first, sortKey)
      const b = sortValue(second, sortKey)
      if (a < b) return -1 * direction
      if (a > b) return 1 * direction
      return first.title.toLowerCase() < second.title.toLowerCase() ? -1 : 1
    })
  }, [filtered, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortHead({ sortKey: key, label, align }: { sortKey: SortKey; label: string; align?: 'right' }) {
    return (
      <TableHead className={align === 'right' ? 'text-right' : undefined}>
        <button type="button" onClick={() => toggleSort(key)} className={cn('inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-text-muted hover:text-text-primary', align === 'right' && 'flex-row-reverse')}>
          {label}
          {sortKey === key ? (sortDir === 'asc' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />) : <ChevronsUpDown className="size-3.5 opacity-40" />}
        </button>
      </TableHead>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <span aria-hidden className="mt-1 w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('title')}</h1>
            <p className="max-w-xl text-sm text-text-secondary">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <RefreshCw className="size-4" />
            {t('importTrial.trigger')}
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105">
            <Plus className="size-4" />
            {t('new')}
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} className="rounded-2xl bg-bg-surface pl-9 shadow-sm" />
        </div>
        <div className="inline-flex flex-wrap rounded-2xl border border-line bg-bg-surface p-1 shadow-sm">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={cn('flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-text-secondary transition', statusFilter === tab && 'bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_8px_18px_-8px_rgba(214,31,85,0.6)]')}
            >
              {tab === 'ALL' ? t('tabAll') : t(`status.${tab}`)}
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', statusFilter === tab ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600')}>{counts[tab]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-line bg-bg-surface shadow-sm">
        <div className="flex items-center gap-2 px-6 pt-5 pb-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-coral-600">{t('title')}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">{sorted.length}</span>
        </div>
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-bg-surface [&_th]:shadow-[0_1px_0_0_var(--color-line)]">
            <TableRow>
              <SortHead sortKey="study" label={t('colStudy')} />
              <SortHead sortKey="status" label={t('colStatus')} />
              <SortHead sortKey="sites" label={t('colSites')} />
              <SortHead sortKey="patients" label={t('colPatients')} />
              <SortHead sortKey="invest" label={t('colInvest')} />
              <SortHead sortKey="pubs" label={t('colPubs')} />
              <TableHead className="text-right text-xs font-bold uppercase tracking-wide text-text-muted">{t('colOpen')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((study) => {
              const start = monthYear(study.startDate)
              const end = monthYear(study.endDate)
              const range = start ? `${start} → ${end ?? '…'}` : t('startTbd')
              return (
                <TableRow key={study.id} className="group">
                  <TableCell className="max-w-md">
                    <div className="flex items-center gap-2">
                      <Link href={`/publications/admin/studies/${study.id}`} className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line text-text-muted transition group-hover:border-coral-200 group-hover:text-coral-600">
                        <ArrowRight className="size-4" />
                      </Link>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <Link href={`/publications/admin/studies/${study.id}`} className="truncate font-semibold text-text-primary hover:text-coral-600">{study.title}</Link>
                          {study.nctId && <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#CBDBFF] bg-[#EEF3FF] px-1.5 py-0.5 text-[10px] font-bold text-[#3B6FE0]"><RotateCw className="size-2.5" />NCT</span>}
                        </span>
                        <span className="block truncate text-xs text-text-muted">
                          {study.acronym && <span className="font-bold text-coral-600">{study.acronym}</span>}
                          {study.acronym && ' · '}{range}
                        </span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold', STATUS_BADGE[study.status])}>
                      <span className={cn('size-1.5 rounded-full', STATUS_DOT[study.status])} />
                      {t(`status.${study.status}`)}
                    </span>
                  </TableCell>
                  <TableCell><span className="inline-flex items-center gap-1.5 text-text-primary"><Building2 className="size-4 text-text-muted" />{study._count.centres}</span></TableCell>
                  <TableCell><span className="inline-flex items-center gap-1.5 text-text-primary"><User className="size-4 text-text-muted" />{study.enrollment != null ? study.enrollment.toLocaleString('en-US') : '—'}</span></TableCell>
                  <TableCell><span className="inline-flex items-center gap-1.5 text-text-primary"><Users className="size-4 text-text-muted" />{study._count.investigators}</span></TableCell>
                  <TableCell><span className="inline-flex items-center gap-1.5 text-text-primary"><FileText className="size-4 text-text-muted" />{study._count.articles}</span></TableCell>
                  <TableCell className="text-right">
                    <Link href={`/publications/admin/studies/${study.id}`} aria-label={t('colOpen')} className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-text-muted transition hover:border-coral-200 hover:text-coral-600">
                      <ArrowRight className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
            {sorted.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-text-muted">{t('empty')}</TableCell></TableRow>
            )}
          </TableBody>
        </table>
      </div>

      <ImportTrialDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) setCreateOpen(false) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('newTitle')}</DialogTitle>
          </DialogHeader>
          <StudyForm authors={authors} centres={centres} onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
