'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Check, X, Inbox } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import type { PendingAuthorRequest } from '@/lib/services/publications/author-requests'
import { resolveAuthorRequestAction } from '../actions'

export function AdminAuthorRequests({ requests }: { requests: PendingAuthorRequest[] }) {
  const t = useTranslations('publications')
  const locale = useLocale()
  const router = useRouter()
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  const resolve = useAction(resolveAuthorRequestAction, {
    onSuccess({ input }) {
      toast.success(input?.outcome === 'DISMISSED' ? t('adminRequests.dismissed') : t('adminRequests.resolved'))
      router.refresh()
    },
    onError() {
      toast.error(t('actionError'))
    },
  })

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-bg-surface p-5 shadow-elevation-xs">
      <div className="flex items-center gap-2.5">
        <Inbox className="h-4 w-4 text-coral-500" strokeWidth={2} />
        <h2 className="text-sm font-bold uppercase tracking-wider text-coral-600">{t('adminRequests.title')}</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-extrabold text-text-secondary tabular-nums dark:bg-white/10">
          {requests.length}
        </span>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-text-muted">{t('adminRequests.empty')}</p>
      ) : (
        <ul className="space-y-2.5">
          {requests.map((request) => (
            <li key={request.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line p-3.5">
              <div className="min-w-0">
                <Link
                  href={`/publications/articles/${request.articleId}`}
                  className="text-sm font-semibold text-navy-600 underline-offset-4 hover:underline"
                >
                  {request.articleTitle || t('myPub.untitled')}
                </Link>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {t('adminRequests.requestedBy', { name: request.requesterName })} · {fmt.format(request.createdAt)}
                </p>
                {request.note && <p className="mt-1.5 whitespace-pre-line text-sm text-text-secondary">{request.note}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={resolve.isExecuting}
                  onClick={() => resolve.execute({ id: request.id, outcome: 'RESOLVED' })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-b from-navy-600 to-navy-700 px-3 text-[13px] font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
                  {t('adminRequests.resolve')}
                </button>
                <button
                  type="button"
                  disabled={resolve.isExecuting}
                  onClick={() => resolve.execute({ id: request.id, outcome: 'DISMISSED' })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-bg-surface px-3 text-[13px] font-bold text-text-secondary transition hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/5"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                  {t('adminRequests.dismiss')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
