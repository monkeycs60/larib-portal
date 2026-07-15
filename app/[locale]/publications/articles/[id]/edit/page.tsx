import { redirect, notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAccessApp, canAdminApp } from '@/lib/permissions'
import { getPublicationForEdit, userIsFirstAuthor } from '@/lib/services/publications/publication-editor'
import { listJournalTargets } from '@/lib/services/publications/journal-targets'
import { listStudyOptions } from '@/lib/services/publications/studies'
import { listJournalNames } from '@/lib/services/publications/journals'
import { PublicationEditor } from '@/app/[locale]/publications/components/editor/publication-editor'

type PageParams = { params: Promise<{ locale: 'en' | 'fr'; id: string }> }

export default async function EditPublicationPage({ params }: PageParams) {
  const { locale, id } = await params
  const session = await requireAuth()
  if (!canAccessApp(session.user, 'PUBLICATIONS')) redirect(applicationLink(locale, '/dashboard'))

  const article = await getPublicationForEdit(id)
  if (!article) notFound()

  const isAdmin = canAdminApp(session.user, 'PUBLICATIONS')
  const isFirstAuthor = await userIsFirstAuthor(session.user.id, id)
  if (!isAdmin && !isFirstAuthor) redirect(applicationLink(locale, `/publications/articles/${id}`))

  const [journalTargets, studyOptions, journalNames] = await Promise.all([
    listJournalTargets(id),
    listStudyOptions(),
    listJournalNames(),
  ])

  return (
    <PublicationEditor
      locale={locale}
      article={article}
      journalTargets={journalTargets}
      studyOptions={studyOptions}
      journalNames={journalNames}
      viewer={{ userId: session.user.id, isFirstAuthor, isAdmin }}
    />
  )
}
