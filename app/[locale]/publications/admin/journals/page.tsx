import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { listJournals } from '@/lib/services/publications/journals'
import { JournalsManager } from '@/app/[locale]/publications/components/journals-manager'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function PublicationsJournalsPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))
  const t = await getTranslations({ locale, namespace: 'publications' })
  const journals = await listJournals()
  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title={t('journals.title')} subtitle={t('journals.subtitle')} />
      <JournalsManager journals={journals} />
    </div>
  )
}
