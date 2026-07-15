import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp } from '@/lib/permissions'
import { listMyPublications } from '@/lib/services/publications/my-publications'
import { listJournalNames } from '@/lib/services/publications/journals'
import { MyPublications } from './components/my-publications'
import { NewPublicationButton } from './components/new-publication-button'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function PublicationsPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/dashboard'))

  const t = await getTranslations({ locale, namespace: 'publications' })
  const [items, journalNames] = await Promise.all([listMyPublications(session.user.id), listJournalNames()])

  return (
    <div className="app-gradient min-h-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-stretch gap-3.5">
            <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{t('title')}</h1>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-text-secondary">{t('myPub.subtitle')}</p>
            </div>
          </div>
          <NewPublicationButton />
        </header>

        <MyPublications items={items} locale={locale} journalNames={journalNames} />
      </div>
    </div>
  )
}
