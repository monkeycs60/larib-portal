import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { Users, Building2, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { Link } from '@/app/i18n/navigation'
import { BacklogImport } from '@/app/[locale]/publications/components/backlog-import'
import { AdminAuthorRequests } from '@/app/[locale]/publications/components/admin-author-requests'
import { listPendingAuthorRequests } from '@/lib/services/publications/author-requests'
import { countAuthors } from '@/lib/services/publications/authors'
import { countCentres } from '@/lib/services/publications/centres'

type PageParams = {
  params: Promise<{ locale: 'en' | 'fr' }>
}

export default async function PublicationsAdminPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()

  if (!canAdminApp(session.user, 'PUBLICATIONS')) {
    redirect(applicationLink(locale, '/publications'))
  }

  const t = await getTranslations({ locale, namespace: 'publications' })
  const [authorRequests, authorCount, centreCount] = await Promise.all([listPendingAuthorRequests(), countAuthors(), countCentres()])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title={t('import.title')} subtitle={t('import.subtitle')} />
      <AdminAuthorRequests requests={authorRequests} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <Link
          href="/publications/admin/authors"
          className="group block rounded-2xl border border-line bg-bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral-50 text-coral-600">
              <Users className="h-6 w-6" />
            </span>
            <span className="rounded-xl bg-coral-50 px-3 py-1 text-lg font-extrabold text-coral-600">{authorCount}</span>
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-text-primary">{t('authors.add.list.title')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('authors.hubDescription')}</p>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="text-sm font-bold text-coral-600">{t('authors.viewAuthors')}</span>
            <ArrowRight className="h-4 w-4 text-coral-600 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
        <Link
          href="/publications/admin/centres"
          className="group block rounded-2xl border border-line bg-bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral-50 text-coral-600">
              <Building2 className="h-6 w-6" />
            </span>
            <span className="rounded-xl bg-coral-50 px-3 py-1 text-lg font-extrabold text-coral-600">{centreCount}</span>
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-text-primary">{t('centres.title')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('centres.hubDescription')}</p>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="text-sm font-bold text-coral-600">{t('centres.viewCentres')}</span>
            <ArrowRight className="h-4 w-4 text-coral-600 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>
      <div className="flex gap-4">
        <Link href="/publications/admin/articles" className="text-sm font-medium text-navy-600 underline-offset-4 hover:underline">
          {t('articles.manageLink')} →
        </Link>
        <Link href="/publications/admin/journals" className="text-sm font-medium text-navy-600 underline-offset-4 hover:underline">
          {t('journals.manageLink')} →
        </Link>
        <Link href="/publications/admin/studies" className="text-sm font-medium text-navy-600 underline-offset-4 hover:underline">
          {t('studies.manageLink')} →
        </Link>
      </div>
      <BacklogImport />
    </div>
  )
}
