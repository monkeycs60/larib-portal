import { getTranslations } from 'next-intl/server'
import { listClinicalCases, listExamTypes, listDiseaseTags } from '@/lib/services/bestof-larib'
import { getTypedSession } from '@/lib/auth-helpers'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/app/i18n/navigation'
import CreateCaseDialog from './components/create-case-dialog'

export default async function BestofLaribPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations('bestof')
  const [session, cases, examTypes, diseaseTags] = await Promise.all([
    getTypedSession(),
    listClinicalCases(),
    listExamTypes(),
    listDiseaseTags(),
  ])
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="space-y-4 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        {isAdmin ? (
          <CreateCaseDialog locale={params.locale} examTypes={examTypes} diseaseTags={diseaseTags} />
        ) : null}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.case')}</TableHead>
              <TableHead>{t('table.examType')}</TableHead>
              <TableHead>{t('table.disease')}</TableHead>
              <TableHead>{t('table.difficulty')}</TableHead>
              <TableHead>{t('table.status')}</TableHead>
              <TableHead>{t('table.createdAt')}</TableHead>
              <TableHead className="text-right">{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.examType?.name ?? '-'}</TableCell>
                  <TableCell>{c.diseaseTag?.name ?? '-'}</TableCell>
                  <TableCell>{t(`difficulty.${(c.difficulty === 'BEGINNER' ? 'beginner' : c.difficulty === 'INTERMEDIATE' ? 'intermediate' : 'advanced')}`)}</TableCell>
                  <TableCell>{t(`status.${(c.status === 'DRAFT' ? 'draft' : 'published')}`)}</TableCell>
                  <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link href={`/bestof-larib/${c.id}`}>
                      <Button size="sm" variant="secondary">{t('view')}</Button>
                    </Link>
                    {isAdmin ? (
                      <Link href={`/bestof-larib/${c.id}/edit`}>
                        <Button size="sm" variant="outline">{t('edit')}</Button>
                      </Link>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
