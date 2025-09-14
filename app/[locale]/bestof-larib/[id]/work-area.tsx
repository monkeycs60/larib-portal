"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'
import { saveAllAction, saveAllAndValidateAction } from './actions'
import CaseInteractionPanel from './user-panel'
import { AnalysisForm, ClinicalReport } from './user-panel'

type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type PrefillState = {
  tags: string[]
  comments: string | null
  personalDifficulty: Difficulty | null
  analysis: { lvef?: string; kinetic?: string; lge?: string; finalDx?: string }
  report?: string | null
  validatedAt?: string | null
}

export default function WorkArea({
  caseId,
  isAdmin,
  createdAt,
  defaultTags,
  prefill,
  right,
  attempts,
}: {
  caseId: string
  isAdmin: boolean
  createdAt: string | Date
  defaultTags: string[]
  prefill: PrefillState | null
  right: React.ReactNode
  attempts: Array<{ id: string; createdAt: string | Date; validatedAt: string | Date | null; lvef: string | null; kinetic: string | null; lge: string | null; finalDx: string | null; report: string | null }>
}) {
  const t = useTranslations('bestof')

  const [tags, setTags] = useState<string[]>(prefill?.tags ?? defaultTags)
  const [comments, setComments] = useState<string>(prefill?.comments ?? '')
  const [personalDifficulty, setPersonalDifficulty] = useState<Difficulty | ''>((prefill?.personalDifficulty ?? '') as Difficulty | '')

  const [analysis, setAnalysis] = useState<{ lvef?: string; kinetic?: string; lge?: string; finalDx?: string}>(
    prefill?.analysis ?? { lvef: '', kinetic: '', lge: '', finalDx: '' },
  )
  const [analysisKey, setAnalysisKey] = useState(0)
  const [report, setReport] = useState<string>(prefill?.report ?? '')

  const [locked, setLocked] = useState<boolean>(!!prefill?.validatedAt)
  const [attemptItems, setAttemptItems] = useState(attempts)

  const { execute: saveAll, isExecuting: saving } = useAction(saveAllAction, {
    onError(err: unknown) { const m = (err as any)?.serverError ?? (err as any)?.message ?? t('actionError'); toast.error(m) },
    onSuccess() { toast.success(t('caseView.savedDraft')) },
  })
  const { execute: saveAndValidate, isExecuting: validating } = useAction(saveAllAndValidateAction, {
    onError(err: unknown) { const m = (err as any)?.serverError ?? (err as any)?.message ?? t('actionError'); toast.error(m) },
    onSuccess(data) {
      toast.success(t('caseView.validated'))
      setLocked(true)
      const now = new Date()
      const newItem = { id: data?.attemptId ?? crypto.randomUUID(), createdAt: now, validatedAt: now, lvef: analysis.lvef ?? null, kinetic: analysis.kinetic ?? null, lge: analysis.lge ?? null, finalDx: analysis.finalDx ?? null, report: report ?? null }
      setAttemptItems(prev => [...prev.filter(a => a.id !== newItem.id), newItem])
    },
  })

  function onSave() {
    if (isAdmin || locked) return
    const pd: Difficulty | null = personalDifficulty ? personalDifficulty : null
    return saveAll({
      caseId,
      tags,
      personalDifficulty: pd,
      comments: comments || null,
      analysis,
      report,
    })
  }

  function onValidate() {
    if (isAdmin || locked) return
    if (!analysis.lvef || !analysis.kinetic || !analysis.lge || !analysis.finalDx) {
      toast.error(t('errors.fieldsRequired'))
      return
    }
    const pd: Difficulty | null = personalDifficulty ? personalDifficulty : null
    return saveAndValidate({
      caseId,
      tags,
      personalDifficulty: pd,
      comments: comments || null,
      analysis,
      report,
    })
  }

  return (
    <div className='flex gap-4'>
      <div className='w-[320px] shrink-0'>
        <CaseInteractionPanel
          isAdmin={isAdmin}
          defaultTags={[]}
          createdAt={createdAt}
          caseId={caseId}
          tags={tags}
          onTagsChange={setTags}
          comments={comments}
          onCommentsChange={setComments}
          difficulty={personalDifficulty}
          onDifficultyChange={setPersonalDifficulty}
          hideActions
          attempts={attemptItems}
          onSelectAttempt={(att) => {
            setAnalysis({ lvef: att.lvef ?? '', kinetic: att.kinetic ?? '', lge: att.lge ?? '', finalDx: att.finalDx ?? '' })
            setReport(att.report ?? '')
            setLocked(!!att.validatedAt)
            setAnalysisKey(k => k + 1)
          }}
          showStartNewAttempt
          onStartNewAttempt={() => {
            setLocked(false)
            setAnalysis({ lvef: '', kinetic: '', lge: '', finalDx: '' })
            setReport('')
            setAnalysisKey((k) => k + 1)
          }}
        />
      </div>
      <ResizablePanelGroup direction='horizontal' className='flex-1 gap-4'>
        <ResizablePanel defaultSize={55} minSize={35}>
          <div className='space-y-4'>
            <section className='rounded border p-4'>
              <div className='font-medium mb-3'>{t('caseView.myAnalysis')}</div>
              <AnalysisForm
                key={analysisKey}
                isAdmin={isAdmin || locked}
                caseId={caseId}
                values={analysis}
                onChange={setAnalysis}
                hideInlineSave
              />
            </section>
            <section className='rounded border p-4'>
              <div className='font-medium mb-3'>{t('caseView.myClinicalReport')}</div>
              <ClinicalReport
                isAdmin={isAdmin || locked}
                caseId={caseId}
                value={report}
                onChange={setReport}
                hideInlineSave
              />
              <div className='flex justify-end gap-3 pt-4'>
                <Button onClick={onSave} disabled={isAdmin || locked || saving}>{t('saveProgress')}</Button>
                <Button onClick={onValidate} variant='secondary' disabled={isAdmin || locked || validating}>{t('caseView.validateCase')}</Button>
              </div>
            </section>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={45} minSize={20}>
          <div className='rounded border p-4 h-fit'>
            {right}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
