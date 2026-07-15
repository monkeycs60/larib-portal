'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { History, Plus, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  SUBMISSION_STATUSES,
  SUBMISSION_STATUS_TONE,
  TONE_DOT_HEX,
  pillClassName,
  type SubmissionStatusValue,
} from '@/lib/publications/status-display'
import type { MyPublicationSubmission } from '@/lib/services/publications/my-publications'
import { addSubmissionAction, updateSubmissionStatusAction } from '../actions'

function isPending(status: SubmissionStatusValue): boolean {
  return status === 'SUBMITTED' || status === 'UNDER_REVIEW'
}

export function SubmissionHistory({
  articleId,
  submissions,
  locale,
}: {
  articleId: string
  submissions: MyPublicationSubmission[]
  locale: string
}) {
  const t = useTranslations('publications')
  const router = useRouter()
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const formatIso = (iso: string | null) => (iso ? fmt.format(new Date(iso)) : '')

  const [addOpen, setAddOpen] = useState(false)
  const [newJournal, setNewJournal] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newStatus, setNewStatus] = useState<SubmissionStatusValue>('SUBMITTED')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [pickStatus, setPickStatus] = useState<SubmissionStatusValue | null>(null)
  const [pickDate, setPickDate] = useState('')

  const addAction = useAction(addSubmissionAction, {
    onSuccess() {
      toast.success(t('myPub.submissionAdded'))
      setAddOpen(false)
      setNewJournal('')
      setNewDate('')
      setNewStatus('SUBMITTED')
      router.refresh()
    },
    onError() {
      toast.error(t('actionError'))
    },
  })

  const statusAction = useAction(updateSubmissionStatusAction, {
    onSuccess() {
      toast.success(t('myPub.statusSaved'))
      setMenuId(null)
      setPickStatus(null)
      setPickDate('')
      router.refresh()
    },
    onError() {
      toast.error(t('actionError'))
    },
  })

  function chooseStatus(submission: MyPublicationSubmission, status: SubmissionStatusValue) {
    if (isPending(status)) {
      statusAction.execute({ submissionId: submission.id, status, decidedAt: null })
    } else {
      setPickStatus(status)
      setPickDate(submission.decidedAt ? submission.decidedAt.slice(0, 10) : '')
    }
  }

  function submitAdd() {
    if (!newJournal.trim() || !newDate) return
    addAction.execute({ articleId, journalName: newJournal.trim(), submittedAt: newDate, status: newStatus })
  }

  return (
    <div className="rounded-xl border border-line bg-gray-50/60 px-4 py-3.5 dark:bg-white/[0.02]">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-text-muted">
          <History className="h-3.5 w-3.5" strokeWidth={2} />
          {t('myPub.submissionHistory')}
        </span>
        <button
          type="button"
          onClick={() => setAddOpen((value) => !value)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-b from-coral-500 to-coral-600 px-3 text-xs font-bold text-white shadow-[0_6px_14px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
          {t('myPub.addSubmission')}
        </button>
      </div>

      {submissions.length > 0 ? (
        <div className="flex flex-col pt-3.5">
          {submissions.map((submission, index) => {
            const tone = SUBMISSION_STATUS_TONE[submission.status]
            const showDecision = !isPending(submission.status) && submission.decidedAt
            const menuOpen = menuId === submission.id
            return (
              <div key={submission.id} className="flex items-stretch gap-3.5">
                <div className="flex w-3.5 shrink-0 flex-col items-center">
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: TONE_DOT_HEX[tone], boxShadow: `0 0 0 3px ${TONE_DOT_HEX[tone]}22` }}
                  />
                  {index < submissions.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-line" />}
                </div>
                <div className="flex flex-1 flex-wrap items-start justify-between gap-2 pb-4">
                  <div>
                    <span className="block text-[13.5px] font-bold text-text-primary">{submission.journalName}</span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      {t('myPub.submittedOn', { date: formatIso(submission.submittedAt) })}
                      {showDecision
                        ? ` · ${t('myPub.decidedOn', {
                            status: t(`myPub.subStatus.${submission.status}`),
                            date: formatIso(submission.decidedAt),
                          })}`
                        : ''}
                    </span>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuId(menuOpen ? null : submission.id)
                        setPickStatus(null)
                        setPickDate('')
                      }}
                      className={cn(pillClassName(tone), 'cursor-pointer')}
                    >
                      {t(`myPub.subStatus.${submission.status}`)}
                      <ChevronDown className="h-3 w-3" strokeWidth={2.4} />
                    </button>

                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setMenuId(null)} />
                        <div className="absolute right-0 top-[calc(100%+6px)] z-40 flex min-w-[210px] flex-col gap-0.5 rounded-xl border border-line bg-bg-surface p-2 shadow-elevation-lg">
                          {pickStatus === null ? (
                            <>
                              <span className="px-1.5 pb-1.5 pt-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-text-muted">
                                {t('myPub.setStatus')}
                              </span>
                              {SUBMISSION_STATUSES.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  disabled={statusAction.isExecuting}
                                  onClick={() => chooseStatus(submission, option)}
                                  className={cn(
                                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-text-primary transition hover:bg-gray-50 dark:hover:bg-white/5',
                                    option === submission.status && 'bg-coral-50 dark:bg-coral-500/10',
                                  )}
                                >
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: TONE_DOT_HEX[SUBMISSION_STATUS_TONE[option]] }}
                                  />
                                  <span className="flex-1 text-left">{t(`myPub.subStatus.${option}`)}</span>
                                  {option === submission.status && <Check className="h-3.5 w-3.5 text-coral-600" strokeWidth={2.6} />}
                                </button>
                              ))}
                            </>
                          ) : (
                            <>
                              <span className="px-1.5 pb-2 pt-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-text-muted">
                                {t('myPub.dateFor', { status: t(`myPub.subStatus.${pickStatus}`) })}
                              </span>
                              <Input type="date" value={pickDate} onChange={(event) => setPickDate(event.target.value)} className="h-9" />
                              <div className="mt-2.5 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPickStatus(null)}
                                  className="h-9 flex-1 rounded-lg border border-line bg-bg-surface text-[12.5px] font-bold text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5"
                                >
                                  {t('myPub.back')}
                                </button>
                                <button
                                  type="button"
                                  disabled={!pickDate || statusAction.isExecuting}
                                  onClick={() =>
                                    statusAction.execute({ submissionId: submission.id, status: pickStatus, decidedAt: pickDate })
                                  }
                                  className="h-9 flex-1 rounded-lg bg-gradient-to-b from-navy-600 to-navy-700 text-[12.5px] font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                                >
                                  {t('myPub.confirm')}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="py-3 text-[13px] text-text-muted">{t('myPub.noSubmission')}</p>
      )}

      {addOpen && (
        <div className="mb-3 mt-1.5 rounded-xl border border-dashed border-coral-200 bg-coral-50/40 p-3.5 dark:border-coral-500/30 dark:bg-coral-500/[0.05]">
          <p className="mb-3 text-[11.5px] font-semibold text-text-muted">{t('myPub.addNote')}</p>
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="flex min-w-[150px] flex-[2] flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-text-secondary">{t('myPub.col.journal')}</span>
              <Input value={newJournal} onChange={(event) => setNewJournal(event.target.value)} placeholder={t('myPub.journalPlaceholder')} className="h-[38px]" />
            </label>
            <label className="flex min-w-[120px] flex-1 flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-text-secondary">{t('myPub.date')}</span>
              <Input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} className="h-[38px]" />
            </label>
            <label className="flex min-w-[140px] flex-1 flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-text-secondary">{t('myPub.col.status')}</span>
              <select
                value={newStatus}
                onChange={(event) => setNewStatus(event.target.value as SubmissionStatusValue)}
                className="h-[38px] rounded-lg border border-line bg-bg-surface px-2.5 text-[13px] font-semibold text-text-primary outline-none focus:border-coral-400"
              >
                {SUBMISSION_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {t(`myPub.subStatus.${option}`)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!newJournal.trim() || !newDate || addAction.isExecuting}
              onClick={submitAdd}
              className="h-[38px] rounded-lg bg-gradient-to-b from-navy-600 to-navy-700 px-4 text-[13px] font-bold text-white shadow-[0_6px_14px_-6px_rgba(19,44,74,0.5)] transition hover:brightness-110 disabled:opacity-50"
            >
              {t('myPub.add')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
