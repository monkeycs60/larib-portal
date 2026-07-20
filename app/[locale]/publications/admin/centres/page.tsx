import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-guard'
import { applicationLink } from '@/lib/application-link'
import { canAdminApp } from '@/lib/permissions'
import { listCentres } from '@/lib/services/publications/centres'
import { CentresManager } from '@/app/[locale]/publications/components/centres-manager'

type PageParams = {
  params: Promise<{ locale: 'en' | 'fr' }>
}

export default async function PublicationsCentresPage({ params }: PageParams) {
  const { locale } = await params
  const session = await requireAuth()

  if (!canAdminApp(session.user, 'PUBLICATIONS')) {
    redirect(applicationLink(locale, '/publications'))
  }

  const centres = await listCentres()

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden p-4 md:p-6">
      <CentresManager centres={centres} />
    </div>
  )
}
