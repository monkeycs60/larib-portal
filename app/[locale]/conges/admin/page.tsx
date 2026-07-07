import { CongesPageContent } from '../conges-page-content'

export default async function CongesAdminPage({ params, searchParams }: {
  params: Promise<{ locale: 'en' | 'fr' }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const sp = await searchParams
  return <CongesPageContent locale={locale} searchParams={sp} adminView={true} />
}
