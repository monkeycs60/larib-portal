'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Plus, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SingleSelect } from '@/components/ui/single-select'
import { linkStudyArticleAction, unlinkStudyArticleAction } from '../actions'
import type { StudyDetailData } from '@/lib/services/publications/studies'
import type { DetailOptions } from './study-detail-view'

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ACCEPTED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  UNDER_REVIEW: 'border-[#CBDBFF] bg-[#EEF3FF] text-[#3B6FE0]',
  TO_RESUBMIT: 'border-amber-200 bg-amber-50 text-amber-700',
  IN_PREPARATION: 'border-line bg-gray-100 text-gray-600',
  ABANDONED: 'border-line bg-gray-100 text-gray-500',
}

export function StudyPublicationsSection({ study, options }: { study: StudyDetailData; options: DetailOptions }) {
  const t = useTranslations('publications.studies')
  const tStatus = useTranslations('publications.articles.status')
  const router = useRouter()
  const [linkOpen, setLinkOpen] = useState(false)
  const [articleId, setArticleId] = useState('')

  const link = useAction(linkStudyArticleAction, { onSuccess: () => { toast.success(t('publicationLinked')); setLinkOpen(false); setArticleId(''); router.refresh() }, onError: () => toast.error(t('actionError')) })
  const unlink = useAction(unlinkStudyArticleAction, { onSuccess: () => { toast.success(t('publicationUnlinked')); router.refresh() }, onError: () => toast.error(t('actionError')) })

  const linkedIds = new Set(study.publications.map((publication) => publication.id))
  const available = options.articles.filter((article) => !linkedIds.has(article.id))

  return (
    <section className="rounded-2xl border border-line bg-bg-surface p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-2 w-2 shrink-0 rounded-full bg-coral-500" />
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-coral-600">{t('sectionPublications')}</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">{study.counts.publications}</span>
        <span className="h-px flex-1 bg-line" />
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLinkOpen(true)}><Plus className="size-4" />{t('linkPublication')}</Button>
      </div>

      <div className="space-y-2">
        {study.publications.map((publication) => (
          <div key={publication.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-bg-muted text-text-muted"><FileText className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-text-primary">{publication.title}</span>
              <span className="text-xs text-text-muted">{[publication.journal, publication.year].filter(Boolean).join(' · ') || '—'}</span>
            </div>
            <span className={cn('whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold', STATUS_BADGE[publication.status] ?? STATUS_BADGE.IN_PREPARATION)}>{tStatus(publication.status)}</span>
            <button type="button" aria-label={t('unlinkPublication')} onClick={() => unlink.execute({ studyId: study.id, articleId: publication.id })} className="text-text-muted hover:text-red-600"><X className="size-4" /></button>
          </div>
        ))}
        {study.publications.length === 0 && <p className="py-6 text-center text-sm text-text-muted">{t('noPublications')}</p>}
      </div>

      <Dialog open={linkOpen} onOpenChange={(open) => { if (!open) setLinkOpen(false) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('linkPublication')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <SingleSelect
              options={available.map((article) => ({ value: article.id, label: article.title }))}
              value={articleId}
              onChange={setArticleId}
              searchable
              searchPlaceholder={t('searchPlaceholder')}
              emptyLabel={t('noPublications')}
              placeholder={t('linkPublication')}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkOpen(false)}>{t('cancel')}</Button>
              <Button disabled={!articleId || link.isPending} onClick={() => link.execute({ studyId: study.id, articleId })}>{t('linkPublication')}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
