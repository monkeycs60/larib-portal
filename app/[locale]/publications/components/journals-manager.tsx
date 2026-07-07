'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { searchCrossrefAction, addJournalAction, updateJournalAction, deleteJournalAction, refreshSjrAction } from '../actions'
import type { JournalListItem } from '@/lib/services/publications/journals'
import type { JournalCandidate } from '@/lib/services/publications/journals-catalog'

const FormSchema = z.object({
  name: z.string().min(1),
  issn: z.string().optional(),
  publisher: z.string().optional(),
  impactFactor: z.string().optional(),
  sjr: z.string().optional(),
  url: z.string().optional(),
})
type FormValues = z.infer<typeof FormSchema>

function num(value: string | undefined): number | null {
  const trimmed = value?.trim()
  return trimmed ? Number(trimmed) : null
}

export function JournalsManager({ journals }: { journals: JournalListItem[] }) {
  const t = useTranslations('publications')
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [crossrefQuery, setCrossrefQuery] = useState('')
  const [candidates, setCandidates] = useState<JournalCandidate[]>([])
  const [editing, setEditing] = useState<JournalListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JournalListItem | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (needle ? journals.filter((journal) => journal.name.toLowerCase().includes(needle)) : journals).slice(0, 300)
  }, [journals, query])

  const { register, handleSubmit, reset } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: { name: '' } })

  const { execute: runSearch, isExecuting: searching } = useAction(searchCrossrefAction, {
    onSuccess({ data }) { setCandidates(data ?? []) },
    onError() { toast.error(t('actionError')) },
  })
  const { executeAsync: execAdd } = useAction(addJournalAction, {
    onError({ error }) { toast.error(error?.serverError === 'JOURNAL_EXISTS' ? t('journals.errorExists') : t('actionError')) },
  })
  const { executeAsync: execUpdate, isExecuting: saving } = useAction(updateJournalAction, { onError() { toast.error(t('actionError')) } })
  const { executeAsync: execDelete, isExecuting: deleting } = useAction(deleteJournalAction, {
    onError({ error }) { toast.error(error?.serverError === 'JOURNAL_IN_USE' ? t('journals.errorInUse') : t('actionError')) },
  })
  const { execute: runRefresh, isExecuting: refreshing } = useAction(refreshSjrAction, {
    onSuccess({ data }) {
      toast.success(data?.hasDataset ? t('journals.refreshDone', { count: data.updated }) : t('journals.refreshNoData'))
      router.refresh()
    },
    onError() { toast.error(t('actionError')) },
  })

  async function addCandidate(candidate: JournalCandidate) {
    const res = await execAdd({ name: candidate.title, issn: candidate.issn, publisher: candidate.publisher })
    if (!res?.data) return
    toast.success(t('journals.created'))
    setCandidates((prev) => prev.filter((entry) => entry !== candidate))
    router.refresh()
  }

  function openEdit(journal: JournalListItem) {
    setEditing(journal)
    reset({
      name: journal.name,
      issn: journal.issn ?? '',
      publisher: journal.publisher ?? '',
      impactFactor: journal.impactFactor != null ? String(journal.impactFactor) : '',
      sjr: journal.sjr != null ? String(journal.sjr) : '',
      url: journal.url ?? '',
    })
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!editing) return
    const res = await execUpdate({
      id: editing.id,
      name: values.name.trim(),
      issn: values.issn?.trim() || null,
      publisher: values.publisher?.trim() || null,
      impactFactor: num(values.impactFactor),
      sjr: num(values.sjr),
      url: values.url?.trim() || null,
    })
    if (!res?.data) return
    toast.success(t('journals.updated'))
    setEditing(null)
    router.refresh()
  })

  async function confirmDelete() {
    if (!deleteTarget) return
    const res = await execDelete({ id: deleteTarget.id })
    setDeleteTarget(null)
    if (!res?.data) return
    toast.success(t('journals.deleted'))
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={crossrefQuery} onChange={(event) => setCrossrefQuery(event.target.value)} placeholder={t('journals.crossrefPlaceholder')} className="max-w-sm" />
        <Button onClick={() => runSearch({ query: crossrefQuery })} disabled={searching || crossrefQuery.trim().length === 0}>{t('journals.crossref')}</Button>
        <Button variant="outline" onClick={() => runRefresh({})} disabled={refreshing}>{t('journals.refreshSjr')}</Button>
      </div>

      {candidates.length > 0 && (
        <div className="space-y-1 rounded-lg border border-line bg-bg-surface p-3">
          {candidates.map((candidate, index) => (
            <div key={`${candidate.issn ?? candidate.title}-${index}`} className="flex items-center justify-between gap-2 text-sm">
              <span>{candidate.title}{candidate.issn ? ` · ${candidate.issn}` : ''}{candidate.publisher ? ` · ${candidate.publisher}` : ''}</span>
              <Button size="sm" variant="outline" onClick={() => addCandidate(candidate)}><Plus className="size-4" />{t('journals.add')}</Button>
            </div>
          ))}
        </div>
      )}

      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('journals.search')} className="max-w-sm" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('journals.colName')}</TableHead>
            <TableHead>{t('journals.colIssn')}</TableHead>
            <TableHead>{t('journals.colPublisher')}</TableHead>
            <TableHead>{t('journals.colImpactFactor')}</TableHead>
            <TableHead>{t('journals.colSjr')}</TableHead>
            <TableHead className="text-right">{t('journals.colActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((journal) => (
            <TableRow key={journal.id}>
              <TableCell className="font-medium">{journal.name}</TableCell>
              <TableCell>{journal.issn ?? '—'}</TableCell>
              <TableCell>{journal.publisher ?? '—'}</TableCell>
              <TableCell>{journal.impactFactor ?? '—'}</TableCell>
              <TableCell>{journal.sjr ?? '—'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(journal)} aria-label={t('journals.edit')}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(journal)} aria-label={t('journals.delete')}><Trash2 className="size-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('journals.editTitle')}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1"><label className="text-sm text-text-secondary">{t('journals.name')}</label><Input required {...register('name')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('journals.issn')}</label><Input {...register('issn')} /></div>
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('journals.publisher')}</label><Input {...register('publisher')} /></div>
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('journals.impactFactor')}</label><Input type="number" step="0.001" {...register('impactFactor')} /></div>
              <div className="space-y-1"><label className="text-sm text-text-secondary">{t('journals.sjr')}</label><Input type="number" step="0.001" {...register('sjr')} /></div>
            </div>
            <div className="space-y-1"><label className="text-sm text-text-secondary">{t('journals.url')}</label><Input {...register('url')} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t('journals.cancel')}</Button>
              <Button type="submit" disabled={saving}>{t('journals.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('journals.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('journals.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('journals.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>{t('journals.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
