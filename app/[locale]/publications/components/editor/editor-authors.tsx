'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { UserPlus, Mail, Send, User } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import type { PublicationEditData } from '@/lib/services/publications/publication-editor'
import { requestAuthorListAction } from '../../actions'
import type { EditorForm, EditorViewer } from './publication-editor'
import { CollapsibleCard } from './collapsible-card'

function degreeBadges(degrees: string | null): string[] {
  if (!degrees) return []
  return degrees
    .split(/[,;]/)
    .map((value) => value.trim())
    .filter(Boolean)
}

export function EditorAuthors({
  article,
  viewer,
  form,
}: {
  article: PublicationEditData
  viewer: EditorViewer
  form: EditorForm
}) {
  const t = useTranslations('publications')
  const router = useRouter()
  const alreadyRequested = article.authorRequests.length > 0

  const request = useAction(requestAuthorListAction, {
    onSuccess() {
      toast.success(t('editor.requestSent'))
      router.refresh()
    },
    onError({ error }) {
      if (error.serverError === 'REQUEST_EXISTS') toast.error(t('editor.alreadyRequested'))
      else toast.error(t('editor.actionError'))
    },
  })

  return (
    <CollapsibleCard
      title={
        <>
          <span className="inline-flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-coral-600">
            <span className="h-2 w-2 rounded-full bg-coral-500" />
            {t('editor.authorsTitle')}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-extrabold text-text-secondary tabular-nums dark:bg-white/10">
            {article.authorships.length}
          </span>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{t('editor.authorsManagedByAdmin')}</p>

      <ol className="mt-4 space-y-3">
        {article.authorships.map((authorship) => {
          const author = authorship.author
          const isYou = author.userId === viewer.userId
          const place = author.centre?.name ?? author.defaultAffiliation?.name ?? null
          return (
            <li key={authorship.order} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[11px] font-bold text-text-secondary tabular-nums dark:bg-white/10">
                {authorship.order}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-text-primary">
                    {author.firstName} {author.lastName.toUpperCase()}
                  </span>
                  {degreeBadges(author.degrees).map((degree) => (
                    <span
                      key={degree}
                      className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-text-secondary dark:bg-white/10"
                    >
                      {degree}
                    </span>
                  ))}
                  {isYou && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-coral-100 bg-coral-50 px-2 py-0.5 text-[10.5px] font-bold text-coral-600 dark:border-coral-500/30 dark:bg-coral-500/15 dark:text-coral-300">
                      <User className="h-3 w-3" strokeWidth={2.4} />
                      {t('editor.you')}
                    </span>
                  )}
                  {authorship.isCorresponding && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-gray-50 px-2 py-0.5 text-[10.5px] font-bold text-text-secondary dark:bg-white/5">
                      <Mail className="h-3 w-3" strokeWidth={2.2} />
                      {t('editor.corresponding')}
                    </span>
                  )}
                </div>
                {place && <span className="mt-0.5 block text-xs text-text-muted">{place}</span>}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-5 border-t border-dashed border-line pt-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-coral-50 text-coral-500 dark:bg-coral-500/15 dark:text-coral-300">
            <UserPlus className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">{t('editor.contributorsLabel')}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{t('editor.contributorsHint')}</p>
          </div>
        </div>
        <Textarea
          {...form.register('contributorsNote')}
          rows={3}
          placeholder={t('editor.contributorsPlaceholder')}
          className="mt-3 resize-y"
        />
      </div>

      <button
        type="button"
        disabled={alreadyRequested || request.isExecuting}
        onClick={() => request.execute({ articleId: article.id, note: form.getValues('contributorsNote').trim() || null })}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-coral-500 to-coral-600 text-sm font-bold text-white shadow-[0_8px_18px_-6px_rgba(214,31,85,0.55)] transition hover:brightness-105 disabled:opacity-60"
      >
        <Send className="h-4 w-4" strokeWidth={2.2} />
        {alreadyRequested ? t('editor.alreadyRequested') : t('editor.requestAuthorList')}
      </button>
    </CollapsibleCard>
  )
}
