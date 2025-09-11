import { getTranslations } from 'next-intl/server'
import { getCaseById } from '@/lib/services/bestof-larib'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { applicationLink } from '@/lib/application-link'
import { Badge } from '@/components/ui/badge'

export default async function CaseViewPage({ params }: { params: { locale: string; id: string } }) {
  const t = await getTranslations('bestof')
  const c = await getCaseById(params.id)
  if (!c) return <div className="p-6">{t('notFound')}</div>

  const difficultyLabel = c.difficulty === 'BEGINNER' ? 'beginner' : c.difficulty === 'INTERMEDIATE' ? 'intermediate' : 'advanced'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{c.name}</h1>
        <Link href={applicationLink(params.locale, '/bestof-larib')}><Button variant="outline">{t('back')}</Button></Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded border p-3 space-y-3 h-fit">
          <div className="text-sm">
            <div className="text-muted-foreground">{t('fields.examType')}</div>
            <div className="font-medium">{c.examType?.name || '-'}</div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground">{t('fields.disease')}</div>
            <div className="font-medium">{c.diseaseTag?.name || '-'}</div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground">{t('fields.difficulty')}</div>
            <div className="font-medium">{t(`difficulty.${difficultyLabel}`)}</div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground">Tags</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {(c.tags || []).length === 0 ? <span className="text-muted-foreground">-</span> : c.tags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(c.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="lg:col-span-2 rounded border p-3">
          <div className="text-sm font-medium mb-2">{c.pdfUrl ? t('content.pdf') : t('content.text')}</div>
          {c.pdfUrl ? (
            <iframe src={c.pdfUrl} className="w-full h-[70vh] rounded border" />
          ) : (
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: c.textContent || '' }} />
          )}
        </div>
      </div>
    </div>
  )
}
