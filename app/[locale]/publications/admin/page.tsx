import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { Link } from '@/app/i18n/navigation'
import { BacklogImport } from '@/app/[locale]/publications/components/backlog-import'

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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title={t('import.title')} subtitle={t('import.subtitle')} />
      <div className="flex gap-4">
        <Link href="/publications/admin/authors" className="text-sm font-medium text-navy-600 underline-offset-4 hover:underline">
          {t('authors.manageLink')} →
        </Link>
        <Link href="/publications/admin/centres" className="text-sm font-medium text-navy-600 underline-offset-4 hover:underline">
          {t('centres.manageLink')} →
        </Link>
        <Link href="/publications/admin/articles" className="text-sm font-medium text-navy-600 underline-offset-4 hover:underline">
          {t('articles.manageLink')} →
        </Link>
        <Link href="/publications/admin/journals" className="text-sm font-medium text-navy-600 underline-offset-4 hover:underline">
          {t('journals.manageLink')} →
        </Link>
      </div>
      <BacklogImport />
    </div>
  )
}
