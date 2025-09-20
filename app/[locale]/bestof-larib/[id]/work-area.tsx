"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'
import { saveAllAction, saveAllAndValidateAction } from './actions'
import CaseInteractionPanel from './user-panel'
import { AnalysisForm, ClinicalReport } from './user-panel'
import type { CaseAttemptSummary } from '@/lib/services/bestof-larib-attempts'
import { getActionErrorMessage } from '@/lib/ui/safe-action-error'

type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type PrefillState = {
  tags: string[]
  comments: string | null
  personalDifficulty: Difficulty | null
  analysis: { lvef?: string; kinetic?: string; lge?: string; finalDx?: string }
  report?: string | null
  validatedAt?: string | null
}

export default function WorkArea({ meta, defaults, rightPane, attempts, userTagData }: { meta: { caseId: string; isAdmin: boolean; createdAt: string | Date }; defaults: { tags: string[]; prefill: PrefillState | null }; rightPane: React.ReactNode; attempts: CaseAttemptSummary[]; userTagData?: { tags: { id: string; name: string; color: string; description: string | null }[]; ids: string[] } }) {
  const t = useTranslations('bestof')

  const { caseId, isAdmin, createdAt } = meta
  const prefill = defaults.prefill
  const defaultTags = defaults.tags

  const [tags, setTags] = useState<string[]>(prefill?.tags ?? defaultTags)
  const [comments, setComments] = useState<string>(prefill?.comments ?? '')
  const [personalDifficulty, setPersonalDifficulty] = useState<Difficulty | ''>((prefill?.personalDifficulty ?? '') as Difficulty | '')

  const [analysis, setAnalysis] = useState<{ lvef?: string; kinetic?: string; lge?: string; finalDx?: string}>(
    prefill?.analysis ?? { lvef: '', kinetic: '', lge: '', finalDx: '' },
  )
  const [analysisKey, setAnalysisKey] = useState(0)
  const [report, setReport] = useState<string>(prefill?.report ?? '')
  const [reportKey, setReportKey] = useState(0)

  const [locked, setLocked] = useState<boolean>(!!prefill?.validatedAt)
  const [attemptItems, setAttemptItems] = useState<CaseAttemptSummary[]>(attempts)

  const { execute: saveAll, isExecuting: saving } = useAction(saveAllAction, {
    onError({ error }) { toast.error(getActionErrorMessage(error, t('actionError'))) },
    onSuccess() { toast.success(t('caseView.savedDraft')) },
  })
  const { execute: saveAndValidate, isExecuting: validating } = useAction(saveAllAndValidateAction, {
    onError({ error }) { toast.error(getActionErrorMessage(error, t('actionError'))) },
    onSuccess(res) {
      toast.success(t('caseView.validated'))
      setLocked(true)
      const now = new Date()
      const newItem = { id: res.data?.attemptId ?? crypto.randomUUID(), createdAt: now, validatedAt: now, lvef: analysis.lvef ?? null, kinetic: analysis.kinetic ?? null, lge: analysis.lge ?? null, finalDx: analysis.finalDx ?? null, report: report ?? null }
      setAttemptItems(previousAttempts => [...previousAttempts.filter(attemptItem => attemptItem.id !== newItem.id), newItem])
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
					config={{
						isAdmin,
						defaultTags: [],
						createdAt,
						caseId,
						tags,
						onTagsChange: setTags,
						comments,
						onCommentsChange: setComments,
						difficulty: personalDifficulty,
						onDifficultyChange: setPersonalDifficulty,
						userTags: userTagData?.tags,
						userTagIds: userTagData?.ids,
						hideActions: true,
						attempts: attemptItems,
						onSelectAttempt: (selectedAttempt) => {
							setAnalysis({
								lvef: selectedAttempt.lvef ?? '',
								kinetic: selectedAttempt.kinetic ?? '',
								lge: selectedAttempt.lge ?? '',
								finalDx: selectedAttempt.finalDx ?? '',
							});
							setReport(selectedAttempt.report ?? '');
							setLocked(!!selectedAttempt.validatedAt);
							setAnalysisKey((key) => key + 1);
							setReportKey((key) => key + 1);
						},
						showStartNewAttempt: true,
						onStartNewAttempt: () => {
							setLocked(false);
							setAnalysis({
								lvef: '',
								kinetic: '',
								lge: '',
								finalDx: '',
							});
							setReport('');
							setAnalysisKey((key) => key + 1);
							setReportKey((key) => key + 1);
						},
					}}
				/>
			</div>
			<ResizablePanelGroup direction='horizontal' className='flex-1 gap-4'>
				<ResizablePanel defaultSize={55} minSize={35}>
					<div className='space-y-4'>
						<section className='rounded border p-4'>
							<div className='font-medium mb-3 flex items-center gap-2'>
								<span>{t('caseView.myAnalysis')}</span>
								<Badge variant='secondary'>
									{locked
										? t('caseView.attemptValidated')
										: t('caseView.attemptDraft')}
								</Badge>
							</div>
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
							<div className='font-medium mb-3 flex items-center gap-2'>
								<span>{t('caseView.myClinicalReport')}</span>
								<Badge variant='secondary'>
									{locked
										? t('caseView.attemptValidated')
										: t('caseView.attemptDraft')}
								</Badge>
							</div>
							<ClinicalReport
								key={reportKey}
								isAdmin={isAdmin || locked}
								caseId={caseId}
								value={report}
								onChange={setReport}
								hideInlineSave
							/>
							<div className='flex justify-end gap-3 pt-4'>
								<Button
									onClick={onSave}
									variant='secondary'
									disabled={isAdmin || locked || saving}>
									{t('saveProgress')}
								</Button>
								<Button
									onClick={onValidate}
									disabled={isAdmin || locked || validating}>
									{t('caseView.validateCase')}
								</Button>
							</div>
						</section>
					</div>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel defaultSize={45} minSize={20}>
					<div className='rounded border p-4 h-fit'>{rightPane}</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
  );
}
