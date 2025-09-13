import { getTranslations } from 'next-intl/server'
import { getCaseById } from '@/lib/services/bestof-larib'
import { Link } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTypedSession } from '@/lib/auth-helpers'
import CaseInteractionPanel, { AnalysisForm, ClinicalReport } from './user-panel'

export default async function CaseViewPage({ params }: { params: { locale: string; id: string } }) {
  const t = await getTranslations('bestof')
  const [c, session] = await Promise.all([
    getCaseById(params.id),
    getTypedSession(),
  ])
  if (!c) return <div className="p-6">{t('notFound')}</div>

  const difficultyLabel = c.difficulty === 'BEGINNER' ? 'beginner' : c.difficulty === 'INTERMEDIATE' ? 'intermediate' : 'advanced'
  const isAdmin = (session?.user?.role ?? 'USER') === 'ADMIN'

  return (
    <div className="space-y-4 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold">{c.name}</h1>
          {c.examType?.name ? <Badge variant="secondary">{c.examType.name}</Badge> : null}
          <Badge variant="outline" className={
            c.difficulty === 'BEGINNER'
              ? 'border-green-500 text-green-700'
              : c.difficulty === 'INTERMEDIATE'
              ? 'border-amber-500 text-amber-700'
              : 'border-red-500 text-red-700'
          }>
            {t(`difficulty.${difficultyLabel}`)}
          </Badge>
        </div>
        <Link href={'/bestof-larib'}><Button variant="outline">{t('back')}</Button></Link>
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-[360px_1fr_380px]">
        <CaseInteractionPanel
          isAdmin={isAdmin}
          defaultTags={c.tags ?? []}
          createdAt={c.createdAt}
        />

        <div className="space-y-4">
          <section className="rounded border p-4">
            <div className="font-medium mb-3">{t('caseView.myAnalysis')}</div>
            <AnalysisForm isAdmin={isAdmin} caseId={c.id} />
          </section>

          <section className="rounded border p-4">
            <div className="font-medium mb-3">{t('caseView.myClinicalReport')}</div>
            <ClinicalReport isAdmin={isAdmin} caseId={c.id} />
          </section>
        </div>

        <div className="rounded border p-4 h-fit">
          <div className="text-sm font-medium mb-2">{t('content.section')}</div>
          {c.pdfUrl ? (
            <iframe src={c.pdfUrl} className="w-full h-[70vh] rounded border" />
          ) : (
            <div className="rte text-sm" dangerouslySetInnerHTML={{ __html: c.textContent || '' }} />
          )}
        </div>
      </div>
    </div>
  )
}
