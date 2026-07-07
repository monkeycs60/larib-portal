import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { listAuthors, listLinkableUsers } from '@/lib/services/publications/authors'
import { listCentres } from '@/lib/services/publications/centres'
import { AuthorsManager } from '@/app/[locale]/publications/components/authors-manager'

type PageParams = {
  params: Promise<{ locale: 'en' | 'fr' }>
}

export default async function PublicationsAuthorsPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()

  if (!canAdminApp(session.user, 'PUBLICATIONS')) {
    redirect(applicationLink(locale, '/publications'))
  }

  const t = await getTranslations({ locale, namespace: 'publications' })
  const [authors, users, centres] = await Promise.all([listAuthors(), listLinkableUsers(), listCentres()])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title={t('authors.title')} subtitle={t('authors.subtitle')} />
      <AuthorsManager authors={authors} users={users} centres={centres} />
    </div>
  )
}
