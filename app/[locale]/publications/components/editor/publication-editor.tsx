'use client'

import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Save, ChevronRight } from 'lucide-react'
import { Link, useRouter } from '@/app/i18n/navigation'
import { cn } from '@/lib/utils'
import { ARTICLE_STATUSES } from '@/lib/services/publications/articles'
import { ARTICLE_TYPE_VALUES, normalizeArticleType } from '@/lib/publications/article-type'
import { isDraftDeletable } from '@/lib/publications/editor-logic'
import type { PublicationEditData } from '@/lib/services/publications/publication-editor'
import type { JournalTargetItem } from '@/lib/services/publications/journal-targets'
import type { StudyOption } from '@/lib/services/publications/studies'
import { updateArticleCoreAction, deleteDraftArticleAction } from '../../actions'
import { EditorHeader } from './editor-header'
import { EditorAuthors } from './editor-authors'
import { EditorReferences } from './editor-references'
import { EditorSubmissions } from './editor-submissions'
import { EditorJournalQueue } from './editor-journal-queue'

const FormSchema = z.object({
  title: z.string(),
  type: z.enum(ARTICLE_TYPE_VALUES),
  status: z.enum(ARTICLE_STATUSES),
  studyId: z.string(),
  pubmedId: z.string(),
  doi: z.string(),
  contributorsNote: z.string(),
})

export type EditorFormValues = z.infer<typeof FormSchema>
export type EditorForm = UseFormReturn<EditorFormValues>
export type EditorViewer = { userId: string; isFirstAuthor: boolean; isAdmin: boolean }

export function PublicationEditor({
  locale,
  article,
  journalTargets,
  studyOptions,
  viewer,
}: {
  locale: string
  article: PublicationEditData
  journalTargets: JournalTargetItem[]
  studyOptions: StudyOption[]
  viewer: EditorViewer
}) {
  const t = useTranslations('publications')
  const router = useRouter()

  const defaults: EditorFormValues = {
    title: article.title,
    type: normalizeArticleType(article.type),
    status: article.status,
    studyId: article.studyId ?? '',
    pubmedId: article.pubmedId ?? '',
    doi: article.doi ?? '',
    contributorsNote: article.contributorsNote ?? '',
  }
  const form = useForm<EditorFormValues>({ resolver: zodResolver(FormSchema), defaultValues: defaults })
  const { isDirty } = form.formState

  const save = useAction(updateArticleCoreAction, {
    onSuccess() {
      toast.success(t('editor.saved'))
      form.reset(form.getValues())
      router.refresh()
    },
    onError() {
      toast.error(t('editor.actionError'))
    },
  })

  const removeDraft = useAction(deleteDraftArticleAction, {
    onSuccess() {
      toast.success(t('editor.deleted'))
      router.push('/publications')
    },
    onError() {
      toast.error(t('editor.actionError'))
    },
  })

  const onSave = form.handleSubmit((values) => {
    save.execute({
      id: article.id,
      title: values.title.trim(),
      type: values.type,
      status: values.status,
      studyId: values.studyId || null,
      pubmedId: values.pubmedId.trim() || null,
      doi: values.doi.trim() || null,
      contributorsNote: values.contributorsNote.trim() || null,
    })
  })

  function onDiscard() {
    if (isDirty) {
      form.reset(defaults)
      return
    }
    if (isDraftDeletable(article.title, article.status)) {
      removeDraft.execute({ id: article.id })
      return
    }
    router.push('/publications')
  }

  return (
    <div className="app-gradient min-h-full px-4 py-6 md:px-8">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap items-center gap-1.5 text-sm">
            <Link href="/publications" className="font-semibold text-text-secondary hover:underline">
              {t('title')}
            </Link>
            <ChevronRight className="h-4 w-4 text-text-muted" />
            <span className="font-semibold text-text-primary">{t('editor.editPublication')}</span>
            {isDirty && (
              <span className="ml-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#B45309] dark:text-[#FBBF24]">
                <span className="h-2 w-2 rounded-full bg-current" />
                {t('editor.unsavedChanges')}
              </span>
            )}
          </nav>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onDiscard}
              disabled={removeDraft.isExecuting}
              className="inline-flex h-11 items-center rounded-xl border border-line bg-bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-gray-50 dark:hover:bg-white/5"
            >
              {t('editor.discard')}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={save.isExecuting || !isDirty}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-coral-500 to-coral-600 px-5 text-sm font-bold text-white shadow-[0_8px_18px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105 disabled:opacity-50"
            >
              <Save className="h-4 w-4" strokeWidth={2.2} />
              {t('editor.save')}
            </button>
          </div>
        </div>

        <EditorHeader article={article} viewer={viewer} form={form} studyOptions={studyOptions} />

        <div className={cn('grid grid-cols-1 gap-5 lg:grid-cols-2')}>
          <div className="space-y-5">
            <EditorAuthors article={article} viewer={viewer} form={form} />
            <EditorReferences form={form} studyOptions={studyOptions} />
          </div>
          <div className="space-y-5">
            <EditorSubmissions articleId={article.id} submissions={article.submissions} locale={locale} />
            <EditorJournalQueue targets={journalTargets} />
          </div>
        </div>
      </div>
    </div>
  )
}
