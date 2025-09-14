"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
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
}: {
  caseId: string
  isAdmin: boolean
  createdAt: string | Date
  defaultTags: string[]
  prefill: PrefillState | null
  right: React.ReactNode
}) {
  const t = useTranslations('bestof')
  const [collapsed, setCollapsed] = useState(false)

  const [tags, setTags] = useState<string[]>(prefill?.tags ?? defaultTags)
  const [comments, setComments] = useState<string>(prefill?.comments ?? '')
  const [personalDifficulty, setPersonalDifficulty] = useState<Difficulty | ''>((prefill?.personalDifficulty ?? '') as Difficulty | '')

  const [analysis, setAnalysis] = useState<{ lvef?: string; kinetic?: string; lge?: string; finalDx?: string}>(
    prefill?.analysis ?? { lvef: '', kinetic: '', lge: '', finalDx: '' },
  )
  const [analysisKey, setAnalysisKey] = useState(0)
  const [report, setReport] = useState<string>(prefill?.report ?? '')

  const [locked, setLocked] = useState<boolean>(!!prefill?.validatedAt)

  const { execute: saveAll, isExecuting: saving } = useAction(saveAllAction, {
    onError(err: unknown) { const m = (err as any)?.serverError ?? (err as any)?.message ?? t('actionError'); toast.error(m) },
    onSuccess() { toast.success(t('caseView.savedDraft')) },
  })
  const { execute: saveAndValidate, isExecuting: validating } = useAction(saveAllAndValidateAction, {
    onError(err: unknown) { const m = (err as any)?.serverError ?? (err as any)?.message ?? t('actionError'); toast.error(m) },
    onSuccess() { toast.success(t('caseView.validated')); setLocked(true) },
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
    <div className="grid gap-4 xl:grid-cols-[var(--left,320px)_1fr_var(--right,720px)]" style={{
      // shrink left column when collapsed
      // @ts-expect-error CSS var string is fine
      ['--left']: collapsed ? '56px' : '320px',
    }}>
      <div>
        <div className='flex justify-between items-center mb-2'>
          <Button variant='ghost' size='sm' onClick={() => setCollapsed(v => !v)}>
            {collapsed ? t('caseView.sidebar.title') : t('caseView.sidebar.title')}
          </Button>
        </div>
        <CaseInteractionPanel
          isAdmin={isAdmin || locked}
          defaultTags={[]}
          createdAt={createdAt}
          caseId={caseId}
          // controlled values from parent
          tags={tags}
          onTagsChange={setTags}
          comments={comments}
          onCommentsChange={setComments}
          difficulty={personalDifficulty}
          onDifficultyChange={setPersonalDifficulty}
          hideActions
          collapsed={collapsed}
          showStartNewAttempt={locked}
          onStartNewAttempt={() => {
            setLocked(false)
            setAnalysis({ lvef: '', kinetic: '', lge: '', finalDx: '' })
            setReport('')
            setAnalysisKey((k) => k + 1)
          }}
        />
      </div>
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
      <div className='rounded border p-4 h-fit'>
        {right}
      </div>
    </div>
  )
}
