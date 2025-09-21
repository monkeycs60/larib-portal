"use client"

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import UserTagsSection from './user-tags-section'
import RichTextEditor from '@/components/ui/rich-text-editor'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { saveAttemptAction, upsertSettingsAction, validateAttemptAction } from './actions'
import { CheckCircle2, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getActionErrorMessage } from '@/lib/ui/safe-action-error'
import { useBestofAttemptStore } from '@/lib/stores/bestof-attempts'
import PersonalDifficultyPicker from '../components/personal-difficulty-picker'
import { htmlToPlainText } from '@/lib/html'

type UserTagRef = { id: string; name: string; color: string; description: string | null }

type CaseInteractionPanelConfig = {
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
  // user tag picker data
  userTags?: UserTagRef[]
  userTagIds?: string[]
  hideActions?: boolean
  showStartNewAttempt?: boolean
  onStartNewAttempt?: () => void
  attempts?: Array<{ id: string; createdAt: string | Date; validatedAt: string | Date | null; lvef: string | null; kinetic: string | null; lge: string | null; finalDx: string | null; report: string | null }>
  onSelectAttempt?: (a: { id: string; createdAt: string | Date; validatedAt: string | Date | null; lvef: string | null; kinetic: string | null; lge: string | null; finalDx: string | null; report: string | null }) => void
}

const AnalysisSchema = z.object({
  lvef: z.string().min(1),
  kinetic: z.string().min(1),
  lge: z.string().min(1),
  finalDx: z.string().min(1),
})

export default function CaseInteractionPanel({ config }: { config: CaseInteractionPanelConfig }) {
  const t = useTranslations('bestof')
  const {
    isAdmin,
    defaultTags,
    caseId,
    tags: cTags,
    onTagsChange,
    comments: cComments,
    onCommentsChange,
    difficulty: cDifficulty,
    onDifficultyChange,
    hideActions,
    showStartNewAttempt,
    onStartNewAttempt,
    attempts = [],
    onSelectAttempt,
  } = config

  const [tags, setTags] = useState<string[]>(cTags ?? defaultTags)
  const [comment, setComment] = useState(cComments ?? '')
  const [difficulty, setDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | ''>(cDifficulty ?? '')
  const [lastAttemptId, setLastAttemptId] = useState<string | null>(null)

  function resolveError(error: unknown) {
    const message = getActionErrorMessage(error, t('actionError'))
    if (message === 'REPORT_TOO_SHORT') return t('errors.reportTooShort')
    return message
  }

  const { execute: execSettings } = useAction(upsertSettingsAction, {
    onError({ error }) { toast.error(resolveError(error)) },
  })
  const { execute: execValidate, isExecuting: validating } = useAction(validateAttemptAction, {
    onError({ error }) { toast.error(resolveError(error)) },
    onSuccess() { toast.success(t('caseView.validated')) },
  })

  // Debounced auto-save for personal settings (no useEffect)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function scheduleSave(next?: { tags?: string[]; comments?: string; difficulty?: typeof difficulty }) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const payload = {
        caseId,
        tags: next?.tags ?? tags,
        comments: (next?.comments ?? comment) || undefined,
        personalDifficulty: (next?.difficulty ?? difficulty) || undefined,
      }
      try { await execSettings(payload) } catch {}
    }, 500)
  }

  // Local state update + notify parent + debounced save
  function onLocalTagsChange(v: string[]) {
    setTags(v)
    onTagsChange?.(v)
    if (!isAdmin) scheduleSave({ tags: v })
  }
  function onLocalCommentsChange(v: string) { setComment(v); onCommentsChange?.(v); if (!isAdmin) scheduleSave({ comments: v }) }
  function onLocalDifficultyChange(v: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | '') { setDifficulty(v); onDifficultyChange?.(v); if (!isAdmin) scheduleSave({ difficulty: v }) }

  // createdAt is available in props if later needed in UI

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">

          <div className="space-y-2">
            <div className="font-medium">{t('caseView.attempts')}</div>
            <div className="flex flex-col gap-2 max-h-44 overflow-auto pr-1">
              {attempts.filter((attempt) => !!attempt.validatedAt).length === 0 ? (
                <div className="text-sm text-muted-foreground">{t('caseView.noAttempts')}</div>
              ) : attempts
                  .filter((attempt) => !!attempt.validatedAt)
                  .sort((leftAttempt, rightAttempt) => new Date(leftAttempt.createdAt).getTime() - new Date(rightAttempt.createdAt).getTime())
                  .map((attempt, index) => {
                    const num = index + 1
                    const date = new Date(attempt.createdAt)
                    const dt = `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${date.toLocaleDateString()}`
                    return (
                      <button
                        key={attempt.id}
                        type="button"
                        onClick={() => { setLastAttemptId(attempt.id); useBestofAttemptStore.getState().setLastAttemptId(caseId, attempt.id); onSelectAttempt?.(attempt) }}
                        className={cn("w-full rounded border p-2 text-left hover:bg-accent/50 transition", "flex items-center justify-between")}
                      >
                        <div className="text-sm">
                          <div className="font-medium">Attempt {num}</div>
                          <div className="text-xs text-muted-foreground">{dt}</div>
                        </div>
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="size-4" />
                          <Eye className="size-4 text-muted-foreground" />
                        </div>
                      </button>
                    )
                  })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-medium">{t('caseView.personalSettings')}</div>
            <div className="space-y-1">
              <Label>{t('caseView.myTags')}</Label>
              {Array.isArray(config.userTags) && Array.isArray(config.userTagIds) ? (
                <UserTagsSection
                  isAdmin={isAdmin}
                  caseId={caseId}
                  initialTags={config.userTags}
                  initialSelectedIds={config.userTagIds}
                  onSelectionChange={onLocalTagsChange}
                />
              ) : (<div className="text-xs text-muted-foreground">-</div>)}
            </div>
            <div className="space-y-1">
              <Label>{t('caseView.myDifficulty')}</Label>
              <PersonalDifficultyPicker value={difficulty} onChange={onLocalDifficultyChange} disabled={isAdmin} />
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
              <Button onClick={() => { if (isAdmin) return; const id = lastAttemptId ?? useBestofAttemptStore.getState().getLastAttemptId(caseId) ?? null; if (!id) { toast.error(t('errors.fieldsRequired')); return } execValidate({ attemptId: id }) }} disabled={isAdmin || validating} variant="secondary">{t('caseView.validateCase')}</Button>
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
    onSuccess(res) {
      if (res.data?.attemptId) {
        toast.success(t('caseView.savedDraft'))
        try { useBestofAttemptStore.getState().setLastAttemptId(caseId, res.data.attemptId) } catch {}
      }
    },
  })

  async function onSubmit(values: z.infer<typeof AnalysisSchema>) {
    if (isAdmin) return
    await execSave({ caseId, ...values })
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
  function resolveError(error: unknown) {
    const message = getActionErrorMessage(error, t('actionError'))
    if (message === 'REPORT_TOO_SHORT') return t('errors.reportTooShort')
    return message
  }

  const { execute: execSave, isExecuting } = useAction(saveAttemptAction, {
    onError({ error }) { toast.error(resolveError(error)) },
    onSuccess(res) {
      if (res.data?.attemptId) toast.success(t('caseView.savedDraft'))
    },
  })

  function save() {
    if (isAdmin) return
    const raw = value ?? ''
    const plainText = htmlToPlainText(raw)
    if (plainText.length < 10) {
      toast.error(t('errors.reportTooShort'))
      return
    }
    execSave({ caseId, report: raw })
  }

  return (
    <div className="space-y-3">
      <RichTextEditor value={value ?? ''} onChange={(v) => { onChange?.(v) }} disabled={isAdmin} />
      {hideInlineSave ? null : (
        <div className="flex gap-2">
          <Button type="button" onClick={save} disabled={isAdmin || isExecuting}>{t('saveProgress')}</Button>
        </div>
      )}
    </div>
  )
}
