'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Star, GraduationCap, Clock, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ARTICLE_STATUSES } from '@/lib/services/publications/articles'
import { ARTICLE_STATUS_TONE, TONE_DOT_HEX } from '@/lib/publications/status-display'
import { ARTICLE_TYPE_VALUES } from '@/lib/publications/article-type'
import { deriveHeaderContext } from '@/lib/publications/editor-logic'
import type { PublicationEditData } from '@/lib/services/publications/publication-editor'
import type { StudyOption } from '@/lib/services/publications/studies'
import type { EditorForm, EditorViewer } from './publication-editor'

function relativeMonths(from: Date, locale: string): string {
  const months = Math.round((Date.now() - from.getTime()) / (1000 * 60 * 60 * 24 * 30))
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-months, 'month')
}

export function EditorHeader({
  article,
  viewer,
  form,
  studyOptions,
}: {
  article: PublicationEditData
  viewer: EditorViewer
  form: EditorForm
  studyOptions: StudyOption[]
}) {
  const t = useTranslations('publications')
  const locale = useLocale()
  const status = form.watch('status')
  const studyId = form.watch('studyId')
  const studyLabel = studyOptions.find((option) => option.id === studyId)?.label ?? null

  const header = deriveHeaderContext({
    submissions: article.submissions.map((submission) => ({
      journalName: submission.journal.abbreviation ?? submission.journal.name,
      submittedAt: submission.submittedAt.toISOString(),
    })),
    publishedJournal: article.publishedJournal
      ? article.publishedJournal.abbreviation ?? article.publishedJournal.name
      : null,
    publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
  })
  const headerDate = header.at ? new Date(header.at) : null
  const year = headerDate ? headerDate.getUTCFullYear() : null
  const tone = ARTICLE_STATUS_TONE[status]

  return (
    <div className="rounded-2xl border border-line bg-bg-surface p-6 shadow-elevation-xs">
      <div className="flex items-stretch gap-4">
        <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-coral-100 bg-coral-50 px-3 py-1 text-[11.5px] font-bold uppercase tracking-wide text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300">
              <Star className="h-3 w-3 fill-current" strokeWidth={0} />
              {viewer.isFirstAuthor ? t('editor.firstAuthorCanEdit') : t('editor.adminCanEdit')}
            </span>
            {year && <span className="text-sm font-bold text-text-secondary tabular-nums">{year}</span>}
            {studyLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-3 py-1 text-[11.5px] font-bold text-[#6D28D9] dark:border-[rgba(139,92,246,0.32)] dark:bg-[rgba(139,92,246,0.16)] dark:text-[#C4B5FD]">
                <GraduationCap className="h-3.5 w-3.5" strokeWidth={2} />
                {t('editor.studyChip', { study: studyLabel })}
              </span>
            )}
          </div>

          <div className="group relative">
            <textarea
              {...form.register('title')}
              rows={2}
              placeholder={t('editor.titlePlaceholder')}
              className="w-full resize-none border-0 bg-transparent p-0 pr-8 text-2xl font-extrabold leading-tight tracking-tight text-text-primary outline-none placeholder:text-text-muted md:text-3xl"
            />
            <Pencil className="pointer-events-none absolute right-0 top-1.5 h-4 w-4 text-coral-400 opacity-0 transition group-focus-within:opacity-100" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <label className="flex items-center gap-2 text-[13px] font-semibold text-text-secondary">
              {t('myPub.col.type')}
              <select
                {...form.register('type')}
                className="h-9 rounded-lg border border-line bg-bg-surface px-2.5 text-[13px] font-semibold text-text-primary outline-none focus:border-coral-400"
              >
                {ARTICLE_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {t(`myPub.type.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-text-secondary">
              {t('myPub.col.status')}
              <select
                {...form.register('status')}
                className="h-9 rounded-lg border border-line bg-bg-surface px-2.5 text-[13px] font-semibold text-text-primary outline-none focus:border-coral-400"
              >
                {ARTICLE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {t(`articles.status.${value}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: TONE_DOT_HEX[tone] }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TONE_DOT_HEX[tone] }} />
              {t(`articles.status.${status}`)}
              {header.journal && (
                <span className="text-text-secondary">
                  {t('editor.atJournal', { journal: header.journal })}
                </span>
              )}
            </span>
            {headerDate && (
              <span className="inline-flex items-center gap-1.5 text-sm text-text-muted">
                <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(headerDate)} ·{' '}
                {relativeMonths(headerDate, locale)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
