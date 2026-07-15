import { getTranslations } from 'next-intl/server'
import { redirect, notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp, canAdminApp } from '@/lib/permissions'
import { Link } from '@/app/i18n/navigation'
import { PageHeader } from '@/app/[locale]/components/page-header'
import { getArticle } from '@/lib/services/publications/articles'
import { ArticleStatusSelect } from '@/app/[locale]/publications/components/article-status-select'
import { ArticleTypeSelect } from '@/app/[locale]/publications/components/article-type-select'
import { normalizeArticleType } from '@/lib/publications/article-type'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; id: string }> }

export default async function ArticleDetailPage({ params }: PageParams) {
  const { locale, id } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/dashboard'))
  const t = await getTranslations({ locale, namespace: 'publications' })
  const article = await getArticle(id)
  if (!article) notFound()
  const isAdmin = canAdminApp(session.user, 'PUBLICATIONS')
  const formatDate = (date: Date) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Link href="/publications/admin/articles" className="text-sm text-text-secondary hover:underline">{t('articles.backToList')}</Link>
      <PageHeader
        title={article.title}
        subtitle={[article.publishedJournal?.name, article.publishedAt ? new Date(article.publishedAt).getFullYear() : null].filter(Boolean).join(' · ')}
      />

      <div className="flex flex-wrap items-center gap-3">
        {isAdmin ? (
          <ArticleStatusSelect id={article.id} status={article.status} />
        ) : (
          <span className="text-sm text-text-secondary">{t(`articles.status.${article.status}`)}</span>
        )}
        {isAdmin ? (
          <ArticleTypeSelect id={article.id} type={article.type} />
        ) : (
          <span className="text-sm text-text-secondary">{t(`myPub.type.${normalizeArticleType(article.type)}`)}</span>
        )}
        {article.pubmedId && (
          <a className="text-sm text-navy-600 hover:underline" href={`https://pubmed.ncbi.nlm.nih.gov/${article.pubmedId}/`} target="_blank" rel="noreferrer">
            {t('articles.openPubmed')}
          </a>
        )}
        {article.doi && (
          <a className="text-sm text-navy-600 hover:underline" href={`https://doi.org/${article.doi}`} target="_blank" rel="noreferrer">
            {t('articles.openDoi')}
          </a>
        )}
      </div>

      {(article.receivedAt || article.acceptedAt) && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-coral-600">{t('articles.editorialTimeline')}</h2>
          <p className="text-sm text-text-secondary">
            {article.receivedAt ? `${t('articles.received')} ${formatDate(article.receivedAt)}` : null}
            {article.receivedAt && article.acceptedAt ? ' → ' : null}
            {article.acceptedAt ? `${t('articles.accepted')} ${formatDate(article.acceptedAt)}` : null}
            {article.reviewDelayDays != null ? <span className="font-medium text-text"> · {t('articles.reviewDelay', { days: article.reviewDelayDays })}</span> : null}
          </p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-coral-600">{t('articles.authors')}</h2>
        <ol className="space-y-1">
          {article.authorships.map((authorship) => (
            <li key={authorship.order} className="text-sm">
              <span className="font-medium">
                {authorship.author.firstName} {authorship.author.lastName.toUpperCase()}
              </span>
              {authorship.isCorresponding ? <span className="text-text-secondary"> ({t('articles.correspondingShort')})</span> : null}
              {authorship.affiliations.length > 0 && (
                <span className="text-text-secondary">
                  {' — '}
                  {authorship.affiliations.map((link) => link.affiliation.centre?.name ?? t('articles.noCentre')).join(' · ')}
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {article.abstract && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-coral-600">{t('articles.abstract')}</h2>
          <p className="text-sm text-text-secondary whitespace-pre-line">{article.abstract}</p>
        </section>
      )}
    </div>
  )
}
