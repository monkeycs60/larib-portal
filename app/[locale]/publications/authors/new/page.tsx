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
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex gap-4">
        <span aria-hidden className="mt-1 w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
        <div className="space-y-1">
          <nav className="text-sm text-text-muted">
            <Link href="/publications/authors" className="hover:text-coral-600">{t('breadcrumbRoot')}</Link>
            <span className="text-text-muted"> › </span>
            <span className="text-text-secondary">{t('title')}</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('title')}</h1>
          <p className="text-sm text-text-secondary">{t('subtitle')}</p>
        </div>
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
