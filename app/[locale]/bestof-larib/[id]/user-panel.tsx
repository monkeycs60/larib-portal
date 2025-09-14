"use client"

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import TagInput from '@/components/ui/tag-input'
import { Select } from '@/components/ui/select'
import RichTextEditor from '@/components/ui/rich-text-editor'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { saveAttemptAction, upsertSettingsAction, validateAttemptAction } from './actions'

type Props = {
  isAdmin: boolean
  defaultTags: string[]
  createdAt: string | Date
  caseId: string
  // controlled fields for settings
  tags?: string[]
  onTagsChange?: (v: string[]) => void
  comments?: string
  onCommentsChange?: (v: string) => void
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | ''
  onDifficultyChange?: (v: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | '') => void
  hideActions?: boolean
  collapsed?: boolean
  showStartNewAttempt?: boolean
  onStartNewAttempt?: () => void
}

const AnalysisSchema = z.object({
  lvef: z.string().min(1),
  kinetic: z.string().min(1),
  lge: z.string().min(1),
  finalDx: z.string().min(1),
})

export default function CaseInteractionPanel({ isAdmin, defaultTags, createdAt, caseId, tags: cTags, onTagsChange, comments: cComments, onCommentsChange, difficulty: cDifficulty, onDifficultyChange, hideActions, collapsed, showStartNewAttempt, onStartNewAttempt }: Props) {
  const t = useTranslations('bestof')
  const [tags, setTags] = useState<string[]>(cTags ?? defaultTags)
  const [comment, setComment] = useState(cComments ?? '')
  const [difficulty, setDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | ''>(cDifficulty ?? '')
  const [lastAttemptId, setLastAttemptId] = useState<string | null>(null)

  const { execute: execSettings } = useAction(upsertSettingsAction, {
    onError(err: unknown) { const m = (err as any)?.serverError ?? (err as any)?.message ?? t('actionError'); toast.error(m) },
  })
  const { execute: execValidate, isExecuting: validating } = useAction(validateAttemptAction, {
    onError(err: unknown) { const m = (err as any)?.serverError ?? (err as any)?.message ?? t('actionError'); toast.error(m) },
    onSuccess() { toast.success(t('caseView.validated')) },
  })

  // Local-only default persistence kept to not break external usage; values propagate up when handlers provided
  function onLocalTagsChange(v: string[]) { setTags(v); onTagsChange?.(v) }
  function onLocalCommentsChange(v: string) { setComment(v); onCommentsChange?.(v) }
  function onLocalDifficultyChange(v: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | '') { setDifficulty(v); onDifficultyChange?.(v) }

  const createdLabel = useMemo(() => new Date(createdAt).toLocaleString(), [createdAt])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{t('caseView.sidebar.title')}</span>
            <span className="text-xs text-muted-foreground">{createdLabel}</span>
          </CardTitle>
        </CardHeader>
        {collapsed ? null : (
        <CardContent className="space-y-4">
          <div className="aspect-video w-full bg-black/90 rounded" />

          <div className="space-y-2">
            <div className="font-medium">{t('caseView.attempts')}</div>
            <div className="text-sm text-muted-foreground">{t('caseView.firstTry')}</div>
          </div>

          <div className="space-y-3">
            <div className="font-medium">{t('caseView.personalSettings')}</div>
            <div className="space-y-1">
              <Label>{t('caseView.myTags')}</Label>
              <TagInput value={tags} onChange={onLocalTagsChange} placeholder={t('placeholders.customTags')} disabled={isAdmin} />
            </div>
            <div className="space-y-1">
              <Label>{t('caseView.myDifficulty')}</Label>
              <Select
                value={difficulty}
                onChange={(e) => onLocalDifficultyChange(e.target.value as typeof difficulty)}
                disabled={isAdmin}
              >
                <option value="" disabled>{t('selectPlaceholder')}</option>
                <option value="BEGINNER">{t('difficulty.beginner')}</option>
                <option value="INTERMEDIATE">{t('difficulty.intermediate')}</option>
                <option value="ADVANCED">{t('difficulty.advanced')}</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                {t('caseView.myComments')}
              </Label>
              <Textarea value={comment} onChange={(e) => onLocalCommentsChange(e.target.value)} disabled={isAdmin} placeholder={t('caseView.commentPlaceholder')} />
            </div>
          </div>

          {hideActions ? null : (
            <div className="flex flex-col gap-2 pt-1">
              <Button onClick={async () => { if (isAdmin) return; await execSettings({ caseId, tags, comments: comment, personalDifficulty: difficulty || undefined }); toast.success(t('caseView.savedDraft')) }} disabled={isAdmin}>{t('saveProgress')}</Button>
              <Button onClick={() => { if (isAdmin) return; const id = lastAttemptId ?? (typeof window !== 'undefined' ? (window as any).__lastAttemptId : null); if (!id) { toast.error(t('errors.fieldsRequired')); return } execValidate({ attemptId: id }) }} disabled={isAdmin || validating} variant="secondary">{t('caseView.validateCase')}</Button>
            </div>
          )}
          {showStartNewAttempt ? (
            <div className="pt-2">
              <Button type="button" onClick={onStartNewAttempt} variant="outline" className="w-full">
                {t('caseView.startNewAttempt')}
              </Button>
            </div>
          ) : null}
        </CardContent>
        )}
      </Card>
    </div>
  )
}

export function AnalysisForm({ isAdmin, caseId, values, onChange, hideInlineSave }: { isAdmin: boolean; caseId: string; values?: { lvef?: string; kinetic?: string; lge?: string; finalDx?: string }; onChange?: (v: { lvef?: string; kinetic?: string; lge?: string; finalDx?: string }) => void; hideInlineSave?: boolean }) {
  const t = useTranslations('bestof')
  const { register, handleSubmit, formState, getValues } = useForm<z.infer<typeof AnalysisSchema>>({
    resolver: zodResolver(AnalysisSchema),
    defaultValues: { lvef: values?.lvef ?? '', kinetic: values?.kinetic ?? '', lge: values?.lge ?? '', finalDx: values?.finalDx ?? '' },
    mode: 'onChange',
  })
  const lvefReg = register('lvef')
  const kineticReg = register('kinetic')
  const lgeReg = register('lge')
  const finalDxReg = register('finalDx')
  const { execute: execSave, isExecuting } = useAction(saveAttemptAction, {
    onError() { toast.error(t('actionError')) },
    onSuccess(data) {
      if (data?.attemptId) toast.success(t('caseView.savedDraft'))
    },
  })

  async function onSubmit(values: z.infer<typeof AnalysisSchema>) {
    if (isAdmin) return
    const res = await execSave({ caseId, ...values })
    if (res?.data?.attemptId) {
      // Ensure outer panel sees last attempt id if mounted together
      try { (window as any).__lastAttemptId = res.data.attemptId } catch {}
    }
    onChange?.(values)
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-[180px_1fr] items-center gap-2">
        <Label>{t('caseView.analysis.lvef')}</Label>
        <Input
          {...lvefReg}
          onChange={(e) => { lvefReg.onChange(e); onChange?.({ ...getValues(), lvef: e.target.value }) }}
          aria-invalid={!!formState.errors.lvef}
          disabled={isAdmin}
          placeholder={t('caseView.required')}
        />
      </div>
      <div className="grid grid-cols-[180px_1fr] items-center gap-2">
        <Label>{t('caseView.analysis.kinetic')}</Label>
        <Input
          {...kineticReg}
          onChange={(e) => { kineticReg.onChange(e); onChange?.({ ...getValues(), kinetic: e.target.value }) }}
          aria-invalid={!!formState.errors.kinetic}
          disabled={isAdmin}
          placeholder={t('caseView.required')}
        />
      </div>
      <div className="grid grid-cols-[180px_1fr] items-center gap-2">
        <Label>{t('caseView.analysis.lge')}</Label>
        <Input
          {...lgeReg}
          onChange={(e) => { lgeReg.onChange(e); onChange?.({ ...getValues(), lge: e.target.value }) }}
          aria-invalid={!!formState.errors.lge}
          disabled={isAdmin}
          placeholder={t('caseView.required')}
        />
      </div>
      <div className="grid grid-cols-[180px_1fr] items-center gap-2">
        <Label>{t('caseView.analysis.finalDx')}</Label>
        <Input
          {...finalDxReg}
          onChange={(e) => { finalDxReg.onChange(e); onChange?.({ ...getValues(), finalDx: e.target.value }) }}
          aria-invalid={!!formState.errors.finalDx}
          disabled={isAdmin}
          placeholder={t('caseView.required')}
        />
      </div>
      <div className="text-xs text-muted-foreground">{t('caseView.requiredBeforeValidation')}</div>
      {hideInlineSave ? null : (
        <div className="flex gap-2">
          <Button type="submit" disabled={isAdmin || !formState.isValid || isExecuting}>{t('saveProgress')}</Button>
        </div>
      )}
    </form>
  )
}

export function ClinicalReport({ isAdmin, caseId, value, onChange, hideInlineSave }: { isAdmin: boolean; caseId: string; value?: string; onChange?: (v: string) => void; hideInlineSave?: boolean }) {
  const t = useTranslations('bestof')
  const [valueState, setValueState] = useState(value ?? '')
  const { execute: execSave, isExecuting } = useAction(saveAttemptAction, {
    onError() { toast.error(t('actionError')) },
    onSuccess(data) {
      if (data?.attemptId) toast.success(t('caseView.savedDraft'))
    },
  })

  function save() {
    if (isAdmin) return
    execSave({ caseId, report: valueState })
  }

  return (
    <div className="space-y-3">
      <RichTextEditor value={valueState} onChange={(v) => { setValueState(v); onChange?.(v) }} disabled={isAdmin} />
      {hideInlineSave ? null : (
        <div className="flex gap-2">
          <Button type="button" onClick={save} disabled={isAdmin || isExecuting}>{t('saveProgress')}</Button>
        </div>
      )}
    </div>
  )
}
