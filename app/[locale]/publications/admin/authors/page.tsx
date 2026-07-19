import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={t('authors.title')} subtitle={t('authors.subtitle')} />
        <Button
          asChild
          className="gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105"
        >
          <Link href="/publications/authors/new">
            <UserPlus className="h-4 w-4" />
            {t('authors.add.list.addButton')}
          </Link>
        </Button>
      </div>
      <AuthorsManager authors={authors} users={users} centres={centres} />
    </div>
  )
}
