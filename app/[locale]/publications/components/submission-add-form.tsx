'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
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
import type { SubmissionStatusValue } from '@/lib/publications/status-display'
import { addSubmissionAction } from '../actions'
import { JournalField } from './journal-field'

export type ActivePrior = { journalName: string; status: SubmissionStatusValue }

export function SubmissionAddForm({
  articleId,
  journalNames,
  activePrior,
  onAdded,
}: {
  articleId: string
  journalNames: string[]
  activePrior: ActivePrior | null
  onAdded: () => void
}) {
  const t = useTranslations('publications')
  const [journal, setJournal] = useState('')
  const [date, setDate] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const add = useAction(addSubmissionAction, {
    onSuccess() {
      toast.success(t('myPub.submissionAdded'))
      setJournal('')
      setDate('')
      onAdded()
    },
    onError() {
      toast.error(t('actionError'))
    },
  })

  function doAdd() {
    setConfirmOpen(false)
    add.execute({ articleId, journalName: journal.trim(), submittedAt: date })
  }

  function attemptAdd() {
    if (!journal.trim() || !date) return
    if (activePrior) setConfirmOpen(true)
    else doAdd()
  }

  return (
    <div className="rounded-xl border border-dashed border-coral-200 bg-coral-50/40 p-3.5 dark:border-coral-500/30 dark:bg-coral-500/[0.05]">
      <p className="mb-3 text-[11.5px] font-semibold text-text-muted">{t('myPub.addNote')}</p>
      <div className="space-y-2.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-text-secondary">{t('myPub.col.journal')}</span>
          <JournalField value={journal} onChange={setJournal} journalNames={journalNames} placeholder={t('myPub.journalPlaceholder')} />
        </label>
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-text-secondary">{t('myPub.date')}</span>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-9 w-full" />
          </label>
          <button
            type="button"
            disabled={!journal.trim() || !date || add.isExecuting}
            onClick={attemptAdd}
            className="h-9 shrink-0 rounded-lg bg-gradient-to-b from-navy-600 to-navy-700 px-5 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {t('myPub.add')}
          </button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('editor.confirmRejectTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {activePrior
                ? t('editor.confirmRejectBody', {
                    journal: activePrior.journalName,
                    status: t(`myPub.subStatus.${activePrior.status}`),
                  })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('editor.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={doAdd}>{t('editor.confirmReject')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
