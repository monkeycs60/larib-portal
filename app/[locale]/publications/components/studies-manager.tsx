'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { StudyForm } from './study-form'
import { ImportTrialDialog } from './import-trial-dialog'
import { deleteStudyAction } from '../actions'
import type { StudyListItem } from '@/lib/services/publications/studies'
import type { AuthorOption } from '@/lib/services/publications/authors'

export function StudiesManager({
  studies,
  authors,
  centres,
}: {
  studies: StudyListItem[]
  authors: AuthorOption[]
  centres: { id: string; name: string }[]
}) {
  const t = useTranslations('publications')
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<StudyListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudyListItem | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return studies
    return studies.filter((study) => study.title.toLowerCase().includes(needle) || (study.acronym ?? '').toLowerCase().includes(needle))
  }, [studies, query])

  const { executeAsync: execDelete, isExecuting: deleting } = useAction(deleteStudyAction, { onError() { toast.error(t('actionError')) } })

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(study: StudyListItem) {
    setEditing(study)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const res = await execDelete({ id: deleteTarget.id })
    setDeleteTarget(null)
    if (!res?.data) return
    toast.success(t('studies.deleted'))
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('studies.search')} className="max-w-sm" />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><Download className="size-4" />{t('studies.importTrial.trigger')}</Button>
          <Button onClick={openNew}><Plus className="size-4" />{t('studies.new')}</Button>
        </div>
      </div>

      <ImportTrialDialog open={importOpen} onClose={() => setImportOpen(false)} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('studies.colTitle')}</TableHead>
            <TableHead>{t('studies.colStatus')}</TableHead>
            <TableHead>{t('studies.colArticles')}</TableHead>
            <TableHead>{t('studies.colInvestigators')}</TableHead>
            <TableHead>{t('studies.colCentres')}</TableHead>
            <TableHead className="text-right">{t('journals.colActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((study) => (
            <TableRow key={study.id}>
              <TableCell className="font-medium">
                {study.title}
                {study.acronym ? <span className="text-text-secondary"> · {study.acronym}</span> : null}
              </TableCell>
              <TableCell><Badge variant="secondary">{t(`studies.status.${study.status}`)}</Badge></TableCell>
              <TableCell>{study._count.articles}</TableCell>
              <TableCell>{study._count.investigators}</TableCell>
              <TableCell>{study._count.centres}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(study)} aria-label={t('studies.editTitle')}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(study)} aria-label={t('studies.delete')}><Trash2 className="size-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) setFormOpen(false) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? t('studies.editTitle') : t('studies.newTitle')}</DialogTitle>
          </DialogHeader>
          <StudyForm
            key={editing?.id ?? 'new'}
            authors={authors}
            centres={centres}
            study={editing ?? undefined}
            onDone={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('studies.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('studies.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('studies.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>{t('studies.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
