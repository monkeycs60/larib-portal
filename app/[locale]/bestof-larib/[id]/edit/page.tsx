import { getTranslations } from 'next-intl/server'
import { getCaseById } from '@/lib/services/bestof-larib'

export default async function CaseEditPage({ params }: { params: { id: string; locale: string } }) {
  const t = await getTranslations('bestof')
  const c = await getCaseById(params.id)
  if (!c) return <div className="p-6">{t('notFound')}</div>
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{t('editCaseTitle', { name: c.name })}</h1>
      <div className="text-muted-foreground">{t('editPlaceholder')}</div>
    </div>
  )
}

