import { getTranslations } from 'next-intl/server'
import { getCaseById } from '@/lib/services/bestof-larib'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { applicationLink } from '@/lib/application-link'

export default async function CaseViewPage({ params }: { params: { locale: string; id: string } }) {
  const t = await getTranslations('bestof')
  const c = await getCaseById(params.id)
  if (!c) return <div className="p-6">{t('notFound')}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{c.name}</h1>
          <p className="text-sm text-muted-foreground">
            {c.examType?.name || '-'} • {c.diseaseTag?.name || '-'} • {t(`difficulty.${(c.difficulty === 'BEGINNER' ? 'beginner' : c.difficulty === 'INTERMEDIATE' ? 'intermediate' : 'advanced')}`)}
          </p>
        </div>
        <Link href={applicationLink(params.locale, '/bestof-larib')}><Button variant="outline">{t('back')}</Button></Link>
      </div>

      {c.pdfUrl ? (
        <div className="rounded border p-3">
          <div className="text-sm font-medium mb-2">{t('content.pdf')}</div>
          <iframe src={c.pdfUrl} className="w-full h-[70vh] rounded border" />
        </div>
      ) : null}

      {c.textContent ? (
        <div className="rounded border p-3">
          <div className="text-sm font-medium mb-2">{t('content.text')}</div>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">{c.textContent}</div>
        </div>
      ) : null}
    </div>
  )
}
