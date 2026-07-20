'use client'

import { useTranslations } from 'next-intl'
import { Mail, ArrowRight, Star } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import type { AuthorDetail } from '@/lib/services/publications/authors'

const APP_LABEL_KEY: Record<string, string> = {
  BESTOF_LARIB: 'appBestof',
  CONGES: 'appConges',
  PUBLICATIONS: 'appPublications',
}

export function AuthorDetailPanel({ detail }: { detail: AuthorDetail }) {
  const t = useTranslations('publications.authors.detail')
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-bg-surface p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-coral-600">{t('affiliations')}</h4>
          {detail.affiliations.length === 0 ? (
            <p className="text-sm text-text-muted">{t('noAffiliations')}</p>
          ) : (
            <ol className="space-y-2">
              {detail.affiliations.map((affiliation, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-text-primary">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral-50 text-xs font-bold text-coral-600">{index + 1}</span>
                  <span className="flex-1">{affiliation.raw}</span>
                  {affiliation.isOurs && (
                    <span className="shrink-0 rounded-full border border-coral-200 bg-coral-50 px-2 py-0.5 text-[11px] font-semibold text-coral-600">{t('ours')}</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
        {detail.portalUser && (
          <div className="rounded-xl border border-line bg-bg-surface p-4">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-coral-600">{t('portalAccount')}</h4>
            <div className="flex items-center gap-2">
              <Badge variant={detail.portalUser.active ? 'success' : 'warning'}>{detail.portalUser.active ? t('active') : t('invited')}</Badge>
              {detail.portalUser.position && <span className="text-sm font-medium text-text-primary">{detail.portalUser.position}</span>}
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
              <Mail className="size-4" />
              {detail.portalUser.email}
            </p>
            {detail.portalUser.applications.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {detail.portalUser.applications.map((app) => (
                  <span key={app} className="rounded-full border border-line px-2 py-0.5 text-xs text-text-secondary">{t(APP_LABEL_KEY[app] ?? 'appPublications')}</span>
                ))}
              </div>
            )}
            <Link href="/admin/users" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-coral-600 hover:gap-2">
              {t('openUserManagement')} <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-line bg-bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-coral-600">{t('linkedPublications')}</h4>
          <span className="rounded-full bg-gray-100 px-2 text-xs font-bold text-gray-600">{detail.publications.length}</span>
        </div>
        {detail.publications.length === 0 ? (
          <p className="text-sm text-text-muted">{t('noPublications')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {detail.publications.map((publication) => (
              <li key={publication.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">{publication.title}</p>
                  <p className="text-sm text-text-secondary">{[publication.journal, publication.year].filter(Boolean).join(' · ')}</p>
                </div>
                {publication.isFirstAuthor ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full border border-coral-200 bg-coral-50 px-2 py-0.5 text-xs font-semibold text-coral-600">
                    <Star className="size-3" />
                    {t('firstAuthor')}
                  </span>
                ) : (
                  <Badge variant="neutral" className="shrink-0">{t('coAuthor')}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
