import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { listCentres } from '@/lib/services/publications/centres'
import { CentresManager } from '@/app/[locale]/publications/components/centres-manager'

type PageParams = {
  params: Promise<{ locale: 'en' | 'fr' }>
}

export default async function PublicationsCentresPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()

  if (!canAdminApp(session.user, 'PUBLICATIONS')) {
    redirect(applicationLink(locale, '/publications'))
  }

  const t = await getTranslations({ locale, namespace: 'publications' })
  const centres = await listCentres()

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title={t('centres.title')} subtitle={t('centres.subtitle')} />
      <CentresManager centres={centres} />
    </div>
  )
}
