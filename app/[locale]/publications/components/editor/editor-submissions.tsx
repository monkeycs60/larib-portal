'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
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
import {
  SUBMISSION_STATUSES,
  SUBMISSION_STATUS_TONE,
  TONE_DOT_HEX,
  pillClassName,
  type SubmissionStatusValue,
} from '@/lib/publications/status-display'
import type { PublicationEditData } from '@/lib/services/publications/publication-editor'
import {
  addSubmissionAction,
  updateSubmissionAction,
  updateSubmissionStatusAction,
  deleteSubmissionAction,
} from '../../actions'

type SubmissionRow = PublicationEditData['submissions'][number]

function isPending(status: SubmissionStatusValue): boolean {
  return status === 'SUBMITTED' || status === 'UNDER_REVIEW'
}

export function EditorSubmissions({
  articleId,
  submissions,
  locale,
}: {
  articleId: string
  submissions: SubmissionRow[]
  locale: string
}) {
  const t = useTranslations('publications')
  const router = useRouter()
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const formatIso = (value: string | null) => (value ? fmt.format(new Date(value)) : '')

  const [addOpen, setAddOpen] = useState(false)
  const [newJournal, setNewJournal] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newStatus, setNewStatus] = useState<SubmissionStatusValue>('SUBMITTED')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [pickStatus, setPickStatus] = useState<SubmissionStatusValue | null>(null)
  const [pickDate, setPickDate] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editJournal, setEditJournal] = useState('')
  const [editDate, setEditDate] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const done = () => router.refresh()
  const add = useAction(addSubmissionAction, {
    onSuccess() { toast.success(t('editor.submissionAdded')); setAddOpen(false); setNewJournal(''); setNewDate(''); setNewStatus('SUBMITTED'); done() },
    onError() { toast.error(t('editor.actionError')) },
  })
  const setStatus = useAction(updateSubmissionStatusAction, {
    onSuccess() { toast.success(t('editor.statusSaved')); setMenuId(null); setPickStatus(null); done() },
    onError() { toast.error(t('editor.actionError')) },
  })
  const edit = useAction(updateSubmissionAction, {
    onSuccess() { toast.success(t('editor.submissionSaved')); setEditId(null); done() },
    onError() { toast.error(t('editor.actionError')) },
  })
  const remove = useAction(deleteSubmissionAction, {
    onSuccess() { toast.success(t('editor.submissionDeleted')); setDeleteId(null); done() },
    onError() { toast.error(t('editor.actionError')) },
  })

  function chooseStatus(row: SubmissionRow, status: SubmissionStatusValue) {
    if (isPending(status)) setStatus.execute({ submissionId: row.id, status, decidedAt: null })
    else { setPickStatus(status); setPickDate(row.decidedAt ? row.decidedAt.toISOString().slice(0, 10) : '') }
  }

  function openEdit(row: SubmissionRow) {
    setEditId(row.id)
    setEditJournal(row.journal.abbreviation ?? row.journal.name)
    setEditDate(row.submittedAt.toISOString().slice(0, 10))
  }

  return (
    <div className="rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-coral-600">
            <span className="h-2 w-2 rounded-full bg-coral-500" />
            {t('editor.submissionsTitle')}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-extrabold text-text-secondary tabular-nums dark:bg-white/10">
            {submissions.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen((value) => !value)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-b from-coral-500 to-coral-600 px-3 text-xs font-bold text-white shadow-[0_6px_14px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
          {t('editor.addSubmission')}
        </button>
      </div>
      <p className="mt-2 text-sm text-text-secondary">{t('editor.submissionsHint')}</p>

      {addOpen && (
        <div className="mt-3 rounded-xl border border-dashed border-coral-200 bg-coral-50/40 p-3.5 dark:border-coral-500/30 dark:bg-coral-500/[0.05]">
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="flex min-w-[140px] flex-[2] flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-text-secondary">{t('myPub.col.journal')}</span>
              <Input value={newJournal} onChange={(event) => setNewJournal(event.target.value)} placeholder={t('myPub.journalPlaceholder')} className="h-9" />
            </label>
            <label className="flex min-w-[120px] flex-1 flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-text-secondary">{t('myPub.date')}</span>
              <Input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} className="h-9" />
            </label>
            <label className="flex min-w-[130px] flex-1 flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-text-secondary">{t('myPub.col.status')}</span>
              <select value={newStatus} onChange={(event) => setNewStatus(event.target.value as SubmissionStatusValue)} className="h-9 rounded-lg border border-line bg-bg-surface px-2.5 text-[13px] font-semibold text-text-primary outline-none focus:border-coral-400">
                {SUBMISSION_STATUSES.map((option) => (
                  <option key={option} value={option}>{t(`myPub.subStatus.${option}`)}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!newJournal.trim() || !newDate || add.isExecuting}
              onClick={() => add.execute({ articleId, journalName: newJournal.trim(), submittedAt: newDate, status: newStatus })}
              className="h-9 rounded-lg bg-gradient-to-b from-navy-600 to-navy-700 px-4 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {t('myPub.add')}
            </button>
          </div>
        </div>
      )}

      {submissions.length === 0 ? (
        <p className="py-4 text-[13px] text-text-muted">{t('editor.noSubmission')}</p>
      ) : (
        <div className="mt-4 flex flex-col">
          {submissions.map((row, index) => {
            const status = row.status as SubmissionStatusValue
            const tone = SUBMISSION_STATUS_TONE[status]
            const showDecision = !isPending(status) && row.decidedAt
            return (
              <div key={row.id} className="flex items-stretch gap-3.5">
                <div className="flex w-3.5 shrink-0 flex-col items-center">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: TONE_DOT_HEX[tone], boxShadow: `0 0 0 3px ${TONE_DOT_HEX[tone]}22` }} />
                  {index < submissions.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-line" />}
                </div>
                <div className="flex flex-1 flex-col gap-2 pb-4">
                  {editId === row.id ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <Input value={editJournal} onChange={(event) => setEditJournal(event.target.value)} className="h-9 min-w-[150px] flex-[2]" />
                      <Input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} className="h-9 min-w-[130px] flex-1" />
                      <button type="button" disabled={!editJournal.trim() || !editDate || edit.isExecuting} onClick={() => edit.execute({ submissionId: row.id, journalName: editJournal.trim(), submittedAt: editDate })} className="h-9 rounded-lg bg-gradient-to-b from-navy-600 to-navy-700 px-3 text-[12.5px] font-bold text-white disabled:opacity-50">{t('editor.saveSubmission')}</button>
                      <button type="button" onClick={() => setEditId(null)} className="h-9 rounded-lg border border-line px-3 text-[12.5px] font-bold text-text-secondary">{t('editor.cancel')}</button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="block text-[13.5px] font-bold text-text-primary">{row.journal.abbreviation ?? row.journal.name}</span>
                        <span className="mt-0.5 block text-xs text-text-muted">
                          {t('myPub.submittedOn', { date: formatIso(row.submittedAt.toISOString()) })}
                          {showDecision ? ` · ${t('myPub.decidedOn', { status: t(`myPub.subStatus.${status}`), date: formatIso(row.decidedAt!.toISOString()) })}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="relative">
                          <button type="button" onClick={() => { setMenuId(menuId === row.id ? null : row.id); setPickStatus(null) }} className={cn(pillClassName(tone), 'cursor-pointer')}>
                            {t(`myPub.subStatus.${status}`)}
                            <ChevronDown className="h-3 w-3" strokeWidth={2.4} />
                          </button>
                          {menuId === row.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setMenuId(null)} />
                              <div className="absolute right-0 top-[calc(100%+6px)] z-40 flex min-w-[210px] flex-col gap-0.5 rounded-xl border border-line bg-bg-surface p-2 shadow-elevation-lg">
                                {pickStatus === null ? (
                                  SUBMISSION_STATUSES.map((option) => (
                                    <button key={option} type="button" disabled={setStatus.isExecuting} onClick={() => chooseStatus(row, option)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-text-primary transition hover:bg-gray-50 dark:hover:bg-white/5', option === status && 'bg-coral-50 dark:bg-coral-500/10')}>
                                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TONE_DOT_HEX[SUBMISSION_STATUS_TONE[option]] }} />
                                      <span className="flex-1 text-left">{t(`myPub.subStatus.${option}`)}</span>
                                      {option === status && <Check className="h-3.5 w-3.5 text-coral-600" strokeWidth={2.6} />}
                                    </button>
                                  ))
                                ) : (
                                  <>
                                    <span className="px-1.5 pb-2 pt-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-text-muted">{t('myPub.dateFor', { status: t(`myPub.subStatus.${pickStatus}`) })}</span>
                                    <Input type="date" value={pickDate} onChange={(event) => setPickDate(event.target.value)} className="h-9" />
                                    <div className="mt-2.5 flex gap-2">
                                      <button type="button" onClick={() => setPickStatus(null)} className="h-9 flex-1 rounded-lg border border-line text-[12.5px] font-bold text-text-secondary">{t('myPub.back')}</button>
                                      <button type="button" disabled={!pickDate || setStatus.isExecuting} onClick={() => setStatus.execute({ submissionId: row.id, status: pickStatus, decidedAt: pickDate })} className="h-9 flex-1 rounded-lg bg-gradient-to-b from-navy-600 to-navy-700 text-[12.5px] font-bold text-white disabled:opacity-50">{t('myPub.confirm')}</button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <button type="button" onClick={() => openEdit(row)} title={t('editor.editSubmission')} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5">
                          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <button type="button" onClick={() => setDeleteId(row.id)} title={t('editor.deleteSubmission')} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-surface text-danger-600 transition hover:bg-danger-50 dark:hover:bg-white/5">
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('editor.deleteSubmission')}</AlertDialogTitle>
            <AlertDialogDescription>{t('editor.deleteSubmissionConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('editor.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && remove.execute({ submissionId: deleteId })}>{t('editor.deleteSubmission')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
