'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Pencil, Trash2, GitMerge, FileText, ChevronUp, ChevronDown, ChevronsUpDown, Search, UserPlus } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { updateAuthorAction, deleteAuthorAction, mergeAuthorsAction } from '../actions'
import type { AuthorListItem, LinkableUser } from '@/lib/services/publications/authors'

const EditSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  degrees: z.string().optional(),
  email: z.string().optional(),
  orcid: z.string().optional(),
  userId: z.string().optional(),
  centreId: z.string().optional(),
})
type EditValues = z.infer<typeof EditSchema>

function authorLabel(author: AuthorListItem): string {
  return `${author.firstName} ${author.lastName.toUpperCase()}`.trim()
}

const AVATAR_PALETTE = [
  'bg-[#FFE4EC] text-[#D61F55]',
  'bg-[#E0EAFF] text-[#3B5BDB]',
  'bg-[#EDE4FF] text-[#7048E8]',
  'bg-[#E3FBEA] text-[#188A42]',
  'bg-[#D8F5F0] text-[#0C8577]',
  'bg-[#FFF0D6] text-[#B7791F]',
]

function avatarClass(seed: string): string {
  let hash = 0
  for (const character of seed) hash = (hash + character.charCodeAt(0)) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[hash]
}

function authorInitials(author: AuthorListItem): string {
  return `${author.firstName.charAt(0)}${author.lastName.charAt(0)}`.toUpperCase()
}

type PortalStatus = 'active' | 'invited' | 'none'

function portalStatus(author: AuthorListItem): PortalStatus {
  if (!author.user) return 'none'
  return author.user.emailVerified ? 'active' : 'invited'
}

const TYPE_TABS = [
  { value: 'ALL' as const, key: 'tabAll' },
  { value: 'OUR_TEAM' as const, key: 'tabOurTeam' },
  { value: 'EXTERNAL' as const, key: 'tabExternal' },
]

type SortKey = 'name' | 'type' | 'centre' | 'papers' | 'portal'

function sortValue(author: AuthorListItem, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return author.lastName.toLowerCase()
    case 'type':
      return author.type
    case 'centre':
      return author.centre?.name?.toLowerCase() ?? ''
    case 'papers':
      return author._count.authorships
    case 'portal':
      return portalStatus(author)
  }
}

export function AuthorsManager({ authors, users, centres }: { authors: AuthorListItem[]; users: LinkableUser[]; centres: { id: string; name: string }[] }) {
  const t = useTranslations('publications')
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'OUR_TEAM' | 'EXTERNAL'>('ALL')
  const [centreFilter, setCentreFilter] = useState('')
  const [portalFilter, setPortalFilter] = useState<'ALL' | PortalStatus>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('papers')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [editing, setEditing] = useState<AuthorListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AuthorListItem | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mergeOpen, setMergeOpen] = useState(false)
  const [keepId, setKeepId] = useState<string>('')

  const typeCounts = useMemo(
    () => ({
      ALL: authors.length,
      OUR_TEAM: authors.filter((author) => author.type === 'OUR_TEAM').length,
      EXTERNAL: authors.filter((author) => author.type === 'EXTERNAL').length,
    }),
    [authors],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return authors
      .filter((author) => {
        if (typeFilter !== 'ALL' && author.type !== typeFilter) return false
        if (centreFilter && author.centreId !== centreFilter) return false
        if (portalFilter !== 'ALL' && portalStatus(author) !== portalFilter) return false
        if (needle && !authorLabel(author).toLowerCase().includes(needle) && !(author.orcid ?? '').toLowerCase().includes(needle)) return false
        return true
      })
  }, [authors, query, typeFilter, centreFilter, portalFilter])

  const sorted = useMemo(() => {
    const direction = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((first, second) => {
      const firstValue = sortValue(first, sortKey)
      const secondValue = sortValue(second, sortKey)
      if (firstValue < secondValue) return -1 * direction
      if (firstValue > secondValue) return 1 * direction
      return first.lastName.toLowerCase() < second.lastName.toLowerCase() ? -1 : 1
    })
  }, [filtered, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function SortHead({ sortKey: key, label, align }: { sortKey: SortKey; label: string; align?: 'right' }) {
    return (
      <TableHead className={align === 'right' ? 'text-right' : undefined}>
        <button type="button" onClick={() => toggleSort(key)} className={cn('inline-flex items-center gap-1 hover:text-text-primary', align === 'right' && 'flex-row-reverse')}>
          {label}
          {sortKey === key ? (
            sortDir === 'asc' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
          ) : (
            <ChevronsUpDown className="size-3.5 opacity-40" />
          )}
        </button>
      </TableHead>
    )
  }

  const { register, handleSubmit, reset } = useForm<EditValues>({ resolver: zodResolver(EditSchema) })

  function openEdit(author: AuthorListItem) {
    setEditing(author)
    reset({
      firstName: author.firstName,
      lastName: author.lastName,
      degrees: author.degrees ?? '',
      email: author.email ?? '',
      orcid: author.orcid ?? '',
      userId: author.userId ?? '',
      centreId: author.centreId ?? '',
    })
  }

  const { executeAsync: execUpdate, isExecuting: saving } = useAction(updateAuthorAction, { onError() { toast.error(t('actionError')) } })
  const { executeAsync: execDelete, isExecuting: deleting } = useAction(deleteAuthorAction, {
    onError({ error }) { toast.error(error?.serverError === 'AUTHOR_IN_USE' ? t('authors.errorInUse') : t('actionError')) },
  })
  const { executeAsync: execMerge, isExecuting: merging } = useAction(mergeAuthorsAction, { onError() { toast.error(t('actionError')) } })

  const onSubmit = handleSubmit(async (values) => {
    if (!editing) return
    const res = await execUpdate({
      id: editing.id,
      firstName: values.firstName,
      lastName: values.lastName,
      degrees: values.degrees || null,
      email: values.email || null,
      orcid: values.orcid || null,
      userId: values.userId || null,
    })
    if (!res?.data) return
    toast.success(t('authors.saved'))
    setEditing(null)
    router.refresh()
  })

  async function confirmDelete() {
    if (!deleteTarget) return
    const res = await execDelete({ id: deleteTarget.id })
    setDeleteTarget(null)
    if (!res?.data) return
    toast.success(t('authors.deleted'))
    router.refresh()
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openMerge() {
    const ids = Array.from(selected)
    setKeepId(ids[0] ?? '')
    setMergeOpen(true)
  }

  async function confirmMerge() {
    const ids = Array.from(selected)
    const res = await execMerge({ keepId, mergeIds: ids })
    setMergeOpen(false)
    if (!res?.data) return
    toast.success(t('authors.merged', { reassigned: res.data.reassigned, deleted: res.data.deleted }))
    setSelected(new Set())
    router.refresh()
  }

  const selectedAuthors = authors.filter((author) => selected.has(author.id))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <span aria-hidden className="mt-1 w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('authors.title')}</h1>
            <p className="text-sm text-text-secondary">{t('authors.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={openMerge} disabled={selected.size < 2} className="gap-2">
            <GitMerge className="size-4" />
            {t('authors.merge')}
          </Button>
          <Button asChild className="gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105">
            <Link href="/publications/authors/new">
              <UserPlus className="size-4" />
              {t('authors.add.list.addButton')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('authors.search')} className="rounded-2xl bg-bg-surface pl-9 shadow-sm" />
        </div>
        <div className="inline-flex rounded-2xl border border-line bg-bg-surface p-1 shadow-sm">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setTypeFilter(tab.value)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-text-secondary transition',
                typeFilter === tab.value && 'bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_8px_18px_-8px_rgba(214,31,85,0.6)]',
              )}
            >
              {t(`authors.${tab.key}`)}
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', typeFilter === tab.value ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600')}>
                {typeCounts[tab.value]}
              </span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-2xl border border-line bg-bg-surface px-3 py-1.5 shadow-sm">
          <span className="text-sm font-bold text-text-primary">{t('authors.filterCentre')}</span>
          <Select value={centreFilter} onChange={(event) => setCentreFilter(event.target.value)} className="w-auto border-0 shadow-none">
            <option value="">{t('authors.filterAll')}</option>
            {centres.map((centre) => (
              <option key={centre.id} value={centre.id}>{centre.name}</option>
            ))}
          </Select>
          <span className="mx-1 h-5 w-px bg-line" />
          <span className="text-sm font-bold text-text-primary">{t('authors.filterPortal')}</span>
          <Select value={portalFilter} onChange={(event) => setPortalFilter(event.target.value as 'ALL' | PortalStatus)} className="w-auto border-0 shadow-none">
            <option value="ALL">{t('authors.filterAll')}</option>
            <option value="active">{t('authors.portalActive')}</option>
            <option value="invited">{t('authors.portalInvited')}</option>
            <option value="none">{t('authors.portalNone')}</option>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-bg-surface shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <SortHead sortKey="name" label={t('authors.colName')} />
              <SortHead sortKey="type" label={t('authors.colType')} />
              <SortHead sortKey="centre" label={t('authors.colCentre')} />
              <SortHead sortKey="papers" label={t('authors.colPapers')} />
              <SortHead sortKey="portal" label={t('authors.colPortal')} />
              <TableHead className="text-right">{t('authors.colActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((author) => {
              const status = portalStatus(author)
              return (
                <TableRow key={author.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(author.id)}
                      onCheckedChange={() => toggle(author.id)}
                      aria-label={authorLabel(author)}
                      className="data-[state=checked]:border-coral-600 data-[state=checked]:bg-coral-600"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold', avatarClass(author.lastName))}>
                        {authorInitials(author)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">{authorLabel(author)}</span>
                          {author.degrees && <span className="text-xs text-text-muted">{author.degrees}</span>}
                        </div>
                        {author.orcid && (
                          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#A6CE39] text-[7px] font-bold text-white">iD</span>
                            {author.orcid}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {author.type === 'OUR_TEAM' ? (
                      <span className="inline-block whitespace-nowrap rounded-full border border-coral-200 bg-coral-50 px-2.5 py-0.5 text-xs font-semibold text-coral-600">{t('authors.typeOurTeam')}</span>
                    ) : (
                      <span className="inline-block whitespace-nowrap rounded-full border border-line bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">{t('authors.typeExternal')}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-text-primary">{author.centre?.name ?? '—'}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-text-primary">
                      <FileText className="size-4 text-text-muted" />
                      {author._count.authorships}
                    </span>
                  </TableCell>
                  <TableCell>
                    {status === 'active' && <Badge variant="success">{t('authors.portalActive')}</Badge>}
                    {status === 'invited' && <Badge variant="warning">{t('authors.portalInvited')}</Badge>}
                    {status === 'none' && <span className="text-text-muted">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(author)} aria-label={t('authors.edit')}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(author)} aria-label={t('authors.delete')}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('authors.editTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('authors.firstName')}</label><Input {...register('firstName')} /></div>
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('authors.lastName')}</label><Input {...register('lastName')} /></div>
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('authors.degrees')}</label><Input {...register('degrees')} /></div>
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('authors.orcid')}</label><Input {...register('orcid')} /></div>
            </div>
            <div className="space-y-1"><label className="text-sm text-text-secondary">{t('authors.email')}</label><Input {...register('email')} /></div>
            <div className="space-y-1">
              <label className="text-sm text-text-secondary">{t('authors.linkUser')}</label>
              <Select {...register('userId')}>
                <option value="">{t('authors.noUser')}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{`${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() || user.email}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-text-secondary">{t('authors.centre')}</label>
              <Select {...register('centreId')}>
                <option value="">{t('authors.noCentre')}</option>
                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>{centre.name}</option>
                ))}
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t('authors.cancel')}</Button>
              <Button type="submit" disabled={saving}>{t('authors.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('authors.mergeTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">{t('authors.mergeChooseKeeper')}</p>
          <Select value={keepId} onChange={(event) => setKeepId(event.target.value)}>
            {selectedAuthors.map((author) => (
              <option key={author.id} value={author.id}>{`${authorLabel(author)}${author.centre ? ` · ${author.centre.name}` : ''} (${author._count.authorships})`}</option>
            ))}
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMergeOpen(false)}>{t('authors.cancel')}</Button>
            <Button onClick={confirmMerge} disabled={merging || !keepId}>{t('authors.mergeConfirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('authors.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('authors.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('authors.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>{t('authors.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
