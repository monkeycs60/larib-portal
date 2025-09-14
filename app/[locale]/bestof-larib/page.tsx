import { getTranslations } from 'next-intl/server'
import { listClinicalCases, listExamTypes, listDiseaseTags } from '@/lib/services/bestof-larib'
import { getTypedSession } from '@/lib/auth-helpers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/app/i18n/navigation'
import { Eye, Pencil, Plus } from 'lucide-react'
import DeleteCaseButton from './components/delete-case-button'
import CreateCaseDialog from './components/create-case-dialog'
import TagManagerDialog from './components/tag-manager-dialog'

export default async function BestofLaribPage() {
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
          <CreateCaseDialog examTypes={examTypes} diseaseTags={diseaseTags} />
        ) : null}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.status')}</TableHead>
              <TableHead>{t('table.case')}</TableHead>
              <TableHead>{t('table.examType')}</TableHead>
              <TableHead>{t('table.disease')}</TableHead>
              <TableHead>{t('table.difficulty')}</TableHead>
              <TableHead>{t('table.createdAt')}</TableHead>
              <TableHead>{isAdmin ? t('table.adminTags') : t('table.userTags')}</TableHead>
              <TableHead className="text-right">{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.status === 'PUBLISHED' ? (
                      <Badge className="bg-green-500 text-white border-transparent">{t('status.published')}</Badge>
                    ) : (
                      <Badge className="bg-yellow-400 text-black border-transparent">{t('status.draft')}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.examType?.name ?? '-'}</TableCell>
                  <TableCell>
                    {c.diseaseTag?.name ? (
                      <Badge variant="secondary">{c.diseaseTag.name}</Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      c.difficulty === 'BEGINNER'
                        ? 'border-green-500 text-green-700'
                        : c.difficulty === 'INTERMEDIATE'
                        ? 'border-amber-500 text-amber-700'
                        : 'border-red-500 text-red-700'
                    }>
                      {t(`difficulty.${(c.difficulty === 'BEGINNER' ? 'beginner' : c.difficulty === 'INTERMEDIATE' ? 'intermediate' : 'advanced')}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <TagManagerDialog
                      mode={isAdmin ? 'admin' : 'user'}
                      caseId={c.id}
                      trigger={
                        <Button type="button" size="icon" variant="ghost" aria-label={isAdmin ? 'add admin tag' : 'add user tag'}>
                          <Plus />
                        </Button>
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link href={`/bestof-larib/${c.id}`}>
                      <Button size="sm" variant="secondary"><Eye />{t('view')}</Button>
                    </Link>
                    {isAdmin ? (
                      <>
                        <CreateCaseDialog
                          examTypes={examTypes}
                          diseaseTags={diseaseTags}
                          clinicalCase={{
                            id: c.id,
                            name: c.name,
                            difficulty: c.difficulty,
                            status: c.status,
                            tags: c.tags ?? [],
                            pdfUrl: c.pdfUrl ?? null,
                            pdfKey: c.pdfKey ?? null,
                            textContent: c.textContent ?? null,
                            examType: c.examType ?? null,
                            diseaseTag: c.diseaseTag ?? null,
                          }}
                          trigger={<Button size="sm" variant="outline"><Pencil />{t('edit')}</Button>}
                        />
                        <DeleteCaseButton id={c.id} />
                      </>
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
