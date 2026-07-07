import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'

type PageParams = {
  params: Promise<{ locale: 'en' | 'fr' }>
}

export default async function PublicationsPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()

  if (!canAccessApp(session.user, 'PUBLICATIONS')) {
    redirect(applicationLink(locale, '/dashboard'))
  }

  const t = await getTranslations({ locale, namespace: 'publications' })

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <p className="text-text-secondary">{t('empty')}</p>
    </div>
  )
}
