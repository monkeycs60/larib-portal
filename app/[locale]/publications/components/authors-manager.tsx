'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Pencil, Trash2, GitMerge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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
})
type EditValues = z.infer<typeof EditSchema>

function authorLabel(author: AuthorListItem): string {
  return `${author.lastName} ${author.firstName}`.trim()
}

export function AuthorsManager({ authors, users }: { authors: AuthorListItem[]; users: LinkableUser[] }) {
  const t = useTranslations('publications')
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<AuthorListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AuthorListItem | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mergeOpen, setMergeOpen] = useState(false)
  const [keepId, setKeepId] = useState<string>('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = needle ? authors.filter((author) => authorLabel(author).toLowerCase().includes(needle)) : authors
    return list.slice(0, 200)
  }, [authors, query])

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
      <div className="flex items-center justify-between gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('authors.search')} className="max-w-sm" />
        <div className="flex items-center gap-2">
          {selected.size > 0 && <span className="text-sm text-text-secondary">{t('authors.selected', { count: selected.size })}</span>}
          <Button variant="outline" size="sm" onClick={openMerge} disabled={selected.size < 2}>
            <GitMerge className="size-4" />
            {t('authors.merge')}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>{t('authors.colName')}</TableHead>
            <TableHead>{t('authors.colPapers')}</TableHead>
            <TableHead>{t('authors.colOrcid')}</TableHead>
            <TableHead>{t('authors.colUser')}</TableHead>
            <TableHead className="text-right">{t('authors.colActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((author) => (
            <TableRow key={author.id}>
              <TableCell>
                <Checkbox checked={selected.has(author.id)} onCheckedChange={() => toggle(author.id)} aria-label={authorLabel(author)} />
              </TableCell>
              <TableCell className="font-medium">
                {authorLabel(author)}
                {author.degrees ? `, ${author.degrees}` : ''}
              </TableCell>
              <TableCell>{author._count.authorships}</TableCell>
              <TableCell>{author.orcid ?? '—'}</TableCell>
              <TableCell>{author.user ? author.user.email : '—'}</TableCell>
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
          ))}
        </TableBody>
      </Table>

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
              <option key={author.id} value={author.id}>{`${authorLabel(author)} (${author._count.authorships})`}</option>
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
