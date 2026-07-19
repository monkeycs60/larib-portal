import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { canAccessApp } from '@/lib/permissions'
import { applicationLink } from '@/lib/application-link'
import { Link } from '@/app/i18n/navigation'
import { listCentres } from '@/lib/services/publications/centres'
import { listLinkableUsers } from '@/lib/services/publications/authors'
import { AddAuthorForm } from '@/app/[locale]/publications/components/add-author-form'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function NewAuthorPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/dashboard'))
  const t = await getTranslations({ locale, namespace: 'publications.authors.add' })
  const [centres, users] = await Promise.all([listCentres(), listLinkableUsers()])

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="space-y-1">
        <nav className="text-sm text-text-secondary">
          <Link href="/publications/authors">{t('breadcrumbRoot')}</Link>
          <span> › {t('title')}</span>
        </nav>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-text-secondary">{t('subtitle')}</p>
      </div>
      <AddAuthorForm
        centres={centres.map((centre) => ({ value: centre.id, label: centre.name }))}
        users={users.map((user) => ({
          value: user.id,
          label: `${user.firstName ?? ''} ${user.lastName ?? ''} (${user.email})`.trim(),
        }))}
      />
    </div>
  )
}
