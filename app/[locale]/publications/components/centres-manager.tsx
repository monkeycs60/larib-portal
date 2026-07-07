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
import { Switch } from '@/components/ui/switch'
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
import { renameCentreAction, setCentreOwnAction, mergeCentresAction, deleteCentreAction } from '../actions'
import type { CentreListItem } from '@/lib/services/publications/centres'

const RenameSchema = z.object({ name: z.string().min(1) })
type RenameValues = z.infer<typeof RenameSchema>

export function CentresManager({ centres }: { centres: CentreListItem[] }) {
  const t = useTranslations('publications')
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<CentreListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CentreListItem | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mergeOpen, setMergeOpen] = useState(false)
  const [keepId, setKeepId] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (needle ? centres.filter((centre) => centre.name.toLowerCase().includes(needle)) : centres).slice(0, 300)
  }, [centres, query])

  const { register, handleSubmit, reset } = useForm<RenameValues>({ resolver: zodResolver(RenameSchema) })
  const { executeAsync: execRename, isExecuting: saving } = useAction(renameCentreAction, { onError() { toast.error(t('actionError')) } })
  const { executeAsync: execOwn } = useAction(setCentreOwnAction, { onError() { toast.error(t('actionError')) } })
  const { executeAsync: execMerge, isExecuting: merging } = useAction(mergeCentresAction, { onError() { toast.error(t('actionError')) } })
  const { executeAsync: execDelete, isExecuting: deleting } = useAction(deleteCentreAction, { onError() { toast.error(t('actionError')) } })

  function openRename(centre: CentreListItem) {
    setEditing(centre)
    reset({ name: centre.name })
  }

  const onRename = handleSubmit(async (values) => {
    if (!editing) return
    const res = await execRename({ id: editing.id, name: values.name })
    if (!res?.data) return
    toast.success(t('centres.renamed'))
    setEditing(null)
    router.refresh()
  })

  async function toggleOwn(centre: CentreListItem) {
    const res = await execOwn({ id: centre.id, isOwn: !centre.isOwn })
    if (res?.data) {
      toast.success(t('centres.ownSet'))
      router.refresh()
    }
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
    setKeepId(Array.from(selected)[0] ?? '')
    setMergeOpen(true)
  }

  async function confirmMerge() {
    const res = await execMerge({ keepId, mergeIds: Array.from(selected) })
    setMergeOpen(false)
    if (!res?.data) return
    toast.success(t('centres.merged'))
    setSelected(new Set())
    router.refresh()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const res = await execDelete({ id: deleteTarget.id })
    setDeleteTarget(null)
    if (res?.data) {
      toast.success(t('centres.deleted'))
      router.refresh()
    }
  }

  const selectedCentres = centres.filter((centre) => selected.has(centre.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('centres.search')} className="max-w-sm" />
        <Button variant="outline" size="sm" onClick={openMerge} disabled={selected.size < 2}>
          <GitMerge className="size-4" />
          {t('centres.merge')}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>{t('centres.colName')}</TableHead>
            <TableHead>{t('centres.colOwn')}</TableHead>
            <TableHead>{t('centres.colAffiliations')}</TableHead>
            <TableHead className="text-right">{t('centres.colActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((centre) => (
            <TableRow key={centre.id}>
              <TableCell>
                <Checkbox checked={selected.has(centre.id)} onCheckedChange={() => toggle(centre.id)} aria-label={centre.name} />
              </TableCell>
              <TableCell className="font-medium">{centre.name}</TableCell>
              <TableCell>
                <Switch checked={centre.isOwn} onCheckedChange={() => toggleOwn(centre)} aria-label={t('centres.colOwn')} />
              </TableCell>
              <TableCell>{centre._count.affiliations}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openRename(centre)} aria-label={t('centres.rename')}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(centre)} aria-label={t('centres.delete')}>
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
            <DialogTitle>{t('centres.renameTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onRename} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm text-text-secondary">{t('centres.name')}</label>
              <Input {...register('name')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t('centres.cancel')}</Button>
              <Button type="submit" disabled={saving}>{t('centres.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('centres.mergeTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">{t('centres.mergeChooseKeeper')}</p>
          <Select value={keepId} onChange={(event) => setKeepId(event.target.value)}>
            {selectedCentres.map((centre) => (
              <option key={centre.id} value={centre.id}>{`${centre.name} (${centre._count.affiliations})`}</option>
            ))}
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMergeOpen(false)}>{t('centres.cancel')}</Button>
            <Button onClick={confirmMerge} disabled={merging || !keepId}>{t('centres.mergeConfirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('centres.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('centres.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('centres.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>{t('centres.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
