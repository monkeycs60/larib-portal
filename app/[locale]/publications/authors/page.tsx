import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { canAccessApp } from '@/lib/permissions'
import { applicationLink } from '@/lib/application-link'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { listAuthors } from '@/lib/services/publications/authors'

type PageParams = { params: Promise<{ locale: 'en' | 'fr' }> }

export default async function AuthorsPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/dashboard'))
  const t = await getTranslations({ locale, namespace: 'publications.authors.add.list' })
  const authors = await listAuthors()

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button asChild>
          <Link href={applicationLink(locale, '/publications/authors/new')}>{t('addButton')}</Link>
        </Button>
      </div>
      {authors.length === 0 ? (
        <p className="text-text-secondary">{t('empty')}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {authors.map((author) => (
            <li key={author.id} className="flex items-center justify-between px-4 py-3">
              <span>
                {author.firstName} <strong>{author.lastName}</strong>
                {author.degrees ? `, ${author.degrees}` : ''}
              </span>
              <span className="text-sm text-text-secondary">{author.centre?.name ?? ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
