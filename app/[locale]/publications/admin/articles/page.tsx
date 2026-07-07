import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { listArticles } from '@/lib/services/publications/articles'
import { ArticlesList } from '@/app/[locale]/publications/components/articles-list'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function PublicationsArticlesPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))
  const t = await getTranslations({ locale, namespace: 'publications' })
  const articles = await listArticles()
  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title={t('articles.title')} subtitle={t('articles.subtitle')} />
      <ArticlesList articles={articles} />
    </div>
  )
}
