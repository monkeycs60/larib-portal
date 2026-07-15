'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import type { StudyOption } from '@/lib/services/publications/studies'
import type { EditorForm } from './publication-editor'

export function EditorReferences({ form, studyOptions }: { form: EditorForm; studyOptions: StudyOption[] }) {
  const t = useTranslations('publications')
  return (
    <div className="rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
      <span className="inline-flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-coral-600">
        <span className="h-2 w-2 rounded-full bg-coral-500" />
        {t('editor.referencesTitle')}
      </span>
      <p className="mt-2 text-sm text-text-secondary">{t('editor.referencesSubtitle')}</p>

      <div className="mt-4 space-y-3">
        <label className="grid grid-cols-[80px_1fr] items-center gap-3">
          <span className="text-sm font-semibold text-text-secondary">{t('editor.pmid')}</span>
          <Input {...form.register('pubmedId')} placeholder={t('editor.addPmid')} />
        </label>
        <label className="grid grid-cols-[80px_1fr] items-center gap-3">
          <span className="text-sm font-semibold text-text-secondary">{t('editor.doi')}</span>
          <Input {...form.register('doi')} placeholder={t('editor.addDoi')} />
        </label>
        <label className="grid grid-cols-[80px_1fr] items-center gap-3">
          <span className="text-sm font-semibold text-text-secondary">{t('editor.linkedStudy')}</span>
          <select
            {...form.register('studyId')}
            className="h-10 rounded-lg border border-line bg-bg-surface px-3 text-sm text-text-primary outline-none focus:border-coral-400"
          >
            <option value="">{t('editor.selectStudy')}</option>
            {studyOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
