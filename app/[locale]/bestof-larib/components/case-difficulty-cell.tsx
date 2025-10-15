"use client"

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { upsertSettingsAction } from '../[id]/actions'
import PersonalDifficultyPicker, { type PersonalDifficultyValue } from './personal-difficulty-picker'
import { getActionErrorMessage } from '@/lib/ui/safe-action-error'
import { useRouter } from '@/app/i18n/navigation'

export default function CaseDifficultyCell({ caseId, initialDifficulty }: { caseId: string; initialDifficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null }) {
  const t = useTranslations('bestof')
  const router = useRouter()
  const [refreshing, startRefresh] = useTransition()

  const initialValue: PersonalDifficultyValue = initialDifficulty ?? ''
  const [current, setCurrent] = useState<PersonalDifficultyValue>(initialValue)
  const [synced, setSynced] = useState<PersonalDifficultyValue>(initialValue)
  const lastRequested = useRef<PersonalDifficultyValue>(initialValue)

  function resolveError(error: unknown) {
    const message = getActionErrorMessage(error, t('actionError'))
    if (message === 'REPORT_TOO_SHORT') return t('errors.reportTooShort')
    return message
  }

  const { execute, isExecuting } = useAction(upsertSettingsAction, {
    onError({ error }) {
      setCurrent(synced)
      toast.error(resolveError(error))
    },
    onSuccess() {
      setSynced(lastRequested.current)
      toast.success(t('caseView.personalDifficultySaved'))
      startRefresh(() => router.refresh())
    },
  })

  async function handleChange(next: PersonalDifficultyValue) {
    if (next === current) return
    setCurrent(next)
    lastRequested.current = next
    await execute({ caseId, personalDifficulty: next || undefined })
  }

  return (
    <PersonalDifficultyPicker
      value={current}
      onChange={handleChange}
      disabled={isExecuting || refreshing}
      isLoading={isExecuting || refreshing}
      minimal
    />
  )
}
