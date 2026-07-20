import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { getStudyDetail, getStudy } from '@/lib/services/publications/studies'
import { listAuthorOptions } from '@/lib/services/publications/authors'
import { listCentres } from '@/lib/services/publications/centres'
import { listArticles } from '@/lib/services/publications/articles'
import { StudyDetailView } from '@/app/[locale]/publications/components/study-detail-view'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; id: string }> }

export default async function StudyDetailPage({ params }: PageParams) {
  const { locale, id } = await params
  const session = await requireAuth()
  if (!canAdminApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/publications'))

  const [detail, editable, authors, centres, articles] = await Promise.all([
    getStudyDetail(id),
    getStudy(id),
    listAuthorOptions(),
    listCentres(),
    listArticles(),
  ])
  if (!detail || !editable) notFound()

  const centreOptions = centres.map((centre) => ({ id: centre.id, name: centre.name, shortCode: centre.shortCode, city: centre.city, country: centre.country, isOwn: centre.isOwn }))
  const articleOptions = articles.map((article) => ({
    id: article.id,
    title: article.title,
    journal: article.publishedJournal?.name ?? article.submissions[0]?.journal?.name ?? null,
    year: article.publishedAt ? article.publishedAt.getFullYear() : null,
    status: article.status,
  }))

  return (
    <div className="p-4 md:p-6">
      <StudyDetailView
        study={detail}
        editable={editable}
        options={{ centres: centreOptions, authors, articles: articleOptions }}
      />
    </div>
  )
}
