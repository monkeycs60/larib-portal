'use client'

import { Fragment, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Pencil, Trash2, GitMerge, FileText, Users, MapPin, Activity, Search, Plus, ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { mergeCentresAction, deleteCentreAction, getCentreAuthorsAction } from '../actions'
import type { CentreRow, CentreType, CentreAuthor } from '@/lib/services/publications/centres'
import { CentreAuthorsPanel } from './centre-authors-panel'
import { EditCentreDialog } from './edit-centre-dialog'

const TYPE_TABS = [
  { value: 'ALL' as const, key: 'tabAll' },
  { value: 'OURS' as const, key: 'tabOurs' },
  { value: 'EXTERNAL' as const, key: 'tabExternal' },
]
type OwnFilter = 'ALL' | 'OURS' | 'EXTERNAL'
type SortKey = 'name' | 'type' | 'location' | 'authors' | 'publications'

function centreInitials(name: string): string {
  const cleaned = name.replace(/^(hôpital|hopital|centre|institut|university|université|department|dept|the)\s+/i, '')
  return cleaned.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || name.slice(0, 2).toUpperCase()
}

function typeLabelKey(type: CentreType): string {
  return type === 'HOSPITAL' ? 'typeHospital' : type === 'RESEARCH_UNIT' ? 'typeResearch' : 'typeOther'
}

function sortValue(centre: CentreRow, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return centre.name.toLowerCase()
    case 'type':
      return centre.type
    case 'location':
      return `${centre.country ?? ''} ${centre.city ?? ''}`.toLowerCase()
    case 'authors':
      return centre.authorsCount
    case 'publications':
      return centre.publicationsCount
  }
}

export function CentresManager({ centres }: { centres: CentreRow[] }) {
  const t = useTranslations('publications.centres')
  const tActions = useTranslations('publications')
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [ownFilter, setOwnFilter] = useState<OwnFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<'ALL' | CentreType>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('authors')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mergeOpen, setMergeOpen] = useState(false)
  const [keepId, setKeepId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CentreRow | null>(null)
  const [editCentre, setEditCentre] = useState<CentreRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [authorsByCentre, setAuthorsByCentre] = useState<Record<string, CentreAuthor[]>>({})

  const counts = useMemo(
    () => ({ ALL: centres.length, OURS: centres.filter((centre) => centre.isOwn).length, EXTERNAL: centres.filter((centre) => !centre.isOwn).length }),
    [centres],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return centres.filter((centre) => {
      if (ownFilter === 'OURS' && !centre.isOwn) return false
      if (ownFilter === 'EXTERNAL' && centre.isOwn) return false
      if (typeFilter !== 'ALL' && centre.type !== typeFilter) return false
      if (needle && !centre.name.toLowerCase().includes(needle) && !(centre.city ?? '').toLowerCase().includes(needle)) return false
      return true
    })
  }, [centres, query, ownFilter, typeFilter])

  const sorted = useMemo(() => {
    const direction = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((first, second) => {
      const a = sortValue(first, sortKey)
      const b = sortValue(second, sortKey)
      if (a < b) return -1 * direction
      if (a > b) return 1 * direction
      return first.name.toLowerCase() < second.name.toLowerCase() ? -1 : 1
    })
  }, [filtered, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const { executeAsync: execMerge, isExecuting: merging } = useAction(mergeCentresAction, { onError() { toast.error(tActions('actionError')) } })
  const { executeAsync: execDelete, isExecuting: deleting } = useAction(deleteCentreAction, { onError() { toast.error(tActions('actionError')) } })
  const { executeAsync: execAuthors } = useAction(getCentreAuthorsAction, { onError() { toast.error(tActions('actionError')) } })

  async function toggleExpand(id: string) {
    const isOpen = expanded.has(id)
    setExpanded((previous) => { const next = new Set(previous); if (isOpen) next.delete(id); else next.add(id); return next })
    if (!isOpen && !authorsByCentre[id]) {
      const res = await execAuthors({ id })
      if (res?.data) setAuthorsByCentre((previous) => ({ ...previous, [id]: res.data as CentreAuthor[] }))
    }
  }

  function toggleSelect(id: string) {
    setSelected((previous) => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  async function confirmMerge() {
    const res = await execMerge({ keepId, mergeIds: Array.from(selected) })
    setMergeOpen(false)
    if (!res?.data) return
    toast.success(t('merged'))
    setSelected(new Set())
    router.refresh()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const res = await execDelete({ id: deleteTarget.id })
    setDeleteTarget(null)
    if (res?.data) { toast.success(t('deleted')); router.refresh() }
  }

  function SortHead({ sortKey: key, label, align }: { sortKey: SortKey; label: string; align?: 'right' }) {
    return (
      <TableHead className={align === 'right' ? 'text-right' : undefined}>
        <button type="button" onClick={() => toggleSort(key)} className={cn('inline-flex items-center gap-1 hover:text-text-primary', align === 'right' && 'flex-row-reverse')}>
          {label}
          {sortKey === key ? (sortDir === 'asc' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />) : <ChevronsUpDown className="size-3.5 opacity-40" />}
        </button>
      </TableHead>
    )
  }

  const selectedCentres = centres.filter((centre) => selected.has(centre.id))

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
          <Button variant="outline" onClick={() => { setKeepId(Array.from(selected)[0] ?? ''); setMergeOpen(true) }} disabled={selected.size < 2} className="gap-2">
            <GitMerge className="size-4" />
            {t('merge')}
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105">
            <Plus className="size-4" />
            {t('add')}
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('search')} className="rounded-2xl bg-bg-surface pl-9 shadow-sm" />
        </div>
        <div className="inline-flex rounded-2xl border border-line bg-bg-surface p-1 shadow-sm">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setOwnFilter(tab.value)}
              className={cn('flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-text-secondary transition', ownFilter === tab.value && 'bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_8px_18px_-8px_rgba(214,31,85,0.6)]')}
            >
              {t(tab.key)}
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', ownFilter === tab.value ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600')}>{counts[tab.value]}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-2xl border border-line bg-bg-surface px-3 py-1.5 shadow-sm">
          <span className="text-sm font-bold text-text-primary">{t('filterType')}</span>
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'ALL' | CentreType)} className="w-auto border-0 shadow-none">
            <option value="ALL">{t('filterAll')}</option>
            <option value="HOSPITAL">{t('typeHospital')}</option>
            <option value="RESEARCH_UNIT">{t('typeResearch')}</option>
            <option value="OTHER">{t('typeOther')}</option>
          </Select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-line bg-bg-surface shadow-sm">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-bg-surface [&_th]:shadow-[0_1px_0_0_var(--color-line)]">
            <TableRow>
              <TableHead className="w-10" />
              <SortHead sortKey="name" label={t('colCentre')} />
              <SortHead sortKey="type" label={t('colType')} />
              <SortHead sortKey="location" label={t('colLocation')} />
              <SortHead sortKey="authors" label={t('colAuthors')} />
              <SortHead sortKey="publications" label={t('colPublications')} />
              <TableHead className="text-right">{t('colActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((centre) => (
              <Fragment key={centre.id}>
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => toggleExpand(centre.id)} aria-label={t('expand')} className="rounded p-0.5 text-text-muted hover:text-coral-600">
                        {expanded.has(centre.id) ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </button>
                      <Checkbox checked={selected.has(centre.id)} onCheckedChange={() => toggleSelect(centre.id)} aria-label={centre.name} className="data-[state=checked]:border-coral-600 data-[state=checked]:bg-coral-600" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral-50 text-[11px] font-bold text-coral-600">{centreInitials(centre.name)}</span>
                      <span className="font-medium text-text-primary">{centre.name}</span>
                      {centre.isOwn && <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-b from-coral-500 to-coral-600 text-white"><Activity className="size-3" /></span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={centre.type === 'RESEARCH_UNIT'
                      ? 'inline-block whitespace-nowrap rounded-full border border-[#DDD0FF] bg-[#EDE4FF] px-2.5 py-0.5 text-xs font-semibold text-[#7048E8]'
                      : centre.type === 'HOSPITAL'
                      ? 'inline-block whitespace-nowrap rounded-full border border-coral-200 bg-coral-50 px-2.5 py-0.5 text-xs font-semibold text-coral-600'
                      : 'inline-block whitespace-nowrap rounded-full border border-line bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600'}>
                      {t(typeLabelKey(centre.type))}
                    </span>
                  </TableCell>
                  <TableCell className="text-text-primary">
                    {centre.city || centre.country ? (
                      <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-text-muted" />{[centre.city, centre.country].filter(Boolean).join(', ')}</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-text-primary"><Users className="size-4 text-text-muted" />{centre.authorsCount}</span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-text-primary"><FileText className="size-4 text-text-muted" />{centre.publicationsCount}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditCentre(centre)} aria-label={t('edit')}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(centre)} aria-label={t('delete')}><Trash2 className="size-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expanded.has(centre.id) && (
                  <TableRow>
                    <TableCell colSpan={7} className="bg-gray-25/60 p-4 dark:bg-white/5">
                      {authorsByCentre[centre.id] ? (
                        <CentreAuthorsPanel authors={authorsByCentre[centre.id]} />
                      ) : (
                        <div className="py-6 text-center text-sm text-text-muted">{t('loading')}</div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </table>
      </div>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('mergeTitle')}</DialogTitle></DialogHeader>
          <p className="text-sm text-text-secondary">{t('mergeChooseKeeper')}</p>
          <Select value={keepId} onChange={(event) => setKeepId(event.target.value)}>
            {selectedCentres.map((centre) => (
              <option key={centre.id} value={centre.id}>{`${centre.name} (${centre.authorsCount} · ${centre.publicationsCount})`}</option>
            ))}
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMergeOpen(false)}>{t('cancel')}</Button>
            <Button onClick={confirmMerge} disabled={merging || !keepId}>{t('mergeConfirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditCentreDialog open={editCentre !== null} centre={editCentre} onClose={() => setEditCentre(null)} onSaved={() => setEditCentre(null)} />
      <EditCentreDialog open={createOpen} centre={null} onClose={() => setCreateOpen(false)} onSaved={() => setCreateOpen(false)} />
    </div>
  )
}
