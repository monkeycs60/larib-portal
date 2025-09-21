import { getTranslations } from 'next-intl/server'
import { listClinicalCasesWithDisplayTags, listExamTypes, listDiseaseTags, type CaseListFilters, type CaseListSortField } from '@/lib/services/bestof-larib'
import { listAdminTags, listUserTags } from '@/lib/services/bestof-larib-tags'
import { getTypedSession } from '@/lib/auth-helpers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/app/i18n/navigation'
import { Eye, Pencil } from 'lucide-react'
import DeleteCaseButton from './components/delete-case-button'
import CreateCaseDialog from './components/create-case-dialog'
import CaseTagCell from './components/case-tag-cell'
import FiltersBar from './components/filters-bar'
import SortHeader from './components/sort-header'
import TableOverlay from './components/table-overlay'

export default async function BestofLaribPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations('bestof')
  const session = await getTypedSession()
  const sp = await searchParams
  const asArray = (value: string | string[] | undefined): string[] | undefined => {
    if (!value) return undefined
    return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : undefined
  }
  const validDifficulties = ['BEGINNER','INTERMEDIATE','ADVANCED'] as const
  const asDifficultyArray = (value: string | string[] | undefined): (typeof validDifficulties)[number][] | undefined => {
    const arr = asArray(value)
    if (!arr?.length) return undefined
    const filtered = arr.filter((v) => (validDifficulties as readonly string[]).includes(v))
    return filtered as (typeof validDifficulties)[number][]
  }
  const filters: CaseListFilters = {
    name: typeof sp?.q === 'string' ? sp.q : undefined,
    status: typeof sp?.status === 'string' && ['PUBLISHED','DRAFT'].includes(sp.status) ? (sp.status as 'PUBLISHED' | 'DRAFT') : undefined,
    examTypeIds: asArray(sp?.examTypeId),
    diseaseTagIds: asArray(sp?.diseaseTagId),
    difficulties: asDifficultyArray(sp?.difficulty),
    createdFrom: typeof sp?.dateFrom === 'string' && sp.dateFrom ? new Date(sp.dateFrom) : undefined,
    createdTo: typeof sp?.dateTo === 'string' && sp.dateTo ? (() => { const d = new Date(sp.dateTo); d.setHours(23,59,59,999); return d })() : undefined,
    adminTagIds: asArray(sp?.adminTagId),
    userTagIds: asArray(sp?.userTagId),
    myDifficulty: typeof sp?.myDifficulty === 'string' && ['BEGINNER','INTERMEDIATE','ADVANCED'].includes(sp.myDifficulty) ? (sp.myDifficulty as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') : undefined,
  }
  const sortField = typeof sp?.sort === 'string' ? (sp.sort as CaseListSortField) : undefined
  const sortDirection = typeof sp?.dir === 'string' && (sp.dir === 'asc' || sp.dir === 'desc') ? (sp.dir) : undefined
  const isAdmin = session?.user?.role === 'ADMIN'
  const [cases, examTypes, diseaseTags, adminTags, userTagsList] = await Promise.all([
    listClinicalCasesWithDisplayTags(session?.user?.id, filters, { field: sortField, direction: sortDirection }),
    listExamTypes(),
    listDiseaseTags(),
    isAdmin ? listAdminTags().then(rows => rows.map(r => ({ id: r.id, name: r.name }))) : Promise.resolve([]),
    session?.user?.id ? listUserTags(session.user.id).then(rows => rows.map(r => ({ id: r.id, name: r.name }))) : Promise.resolve([]),
  ])
  

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

      <FiltersBar
        data={{
          examTypes,
          diseaseTags,
          isAdmin,
          adminTags,
          userTags: userTagsList,
          canUsePersonalDifficulty: Boolean(session?.user?.id) && !isAdmin,
        }}
      />

      <div className="relative rounded-md border">
        <TableOverlay />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortHeader field="status" label={t('table.status')} activeField={sortField} direction={sortDirection} /></TableHead>
              <TableHead><SortHeader field="name" label={t('table.name')} activeField={sortField} direction={sortDirection} /></TableHead>
              <TableHead><SortHeader field="examType" label={t('table.examType')} activeField={sortField} direction={sortDirection} /></TableHead>
              <TableHead><SortHeader field="diseaseTag" label={t('table.disease')} activeField={sortField} direction={sortDirection} /></TableHead>
              <TableHead><SortHeader field="difficulty" label={t('table.difficulty')} activeField={sortField} direction={sortDirection} /></TableHead>
              <TableHead><SortHeader field="createdAt" label={t('table.createdAt')} activeField={sortField} direction={sortDirection} /></TableHead>
              {session?.user?.id && !isAdmin ? (<TableHead><SortHeader field="attempts" label={t('table.attempts')} activeField={sortField} direction={sortDirection} /></TableHead>) : null}
              {session?.user?.id && !isAdmin ? (<TableHead><SortHeader field="personalDifficulty" label={t('table.myDifficulty')} activeField={sortField} direction={sortDirection} /></TableHead>) : null}
              <TableHead>{isAdmin ? t('table.adminTags') : t('table.userTags')}</TableHead>
              <TableHead className="text-right">{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6 + ((session?.user?.id && !isAdmin) ? 2 : 0) + 2} className="text-center text-sm text-muted-foreground">
                  {t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              cases.map((caseItem) => (
                <TableRow key={caseItem.id}>
                  <TableCell>
                    {caseItem.status === 'PUBLISHED' ? (
                      <Badge className="bg-green-500 text-white border-transparent">{t('status.published')}</Badge>
                    ) : (
                      <Badge className="bg-yellow-400 text-black border-transparent">{t('status.draft')}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{caseItem.name}</TableCell>
                  <TableCell>{caseItem.examType?.name ?? '-'}</TableCell>
                  <TableCell>
                    {caseItem.diseaseTag?.name ? (
                      <Badge variant="secondary">{caseItem.diseaseTag.name}</Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      caseItem.difficulty === 'BEGINNER'
                        ? 'border-green-500 text-green-700'
                        : caseItem.difficulty === 'INTERMEDIATE'
                        ? 'border-amber-500 text-amber-700'
                        : 'border-red-500 text-red-700'
                    }>
                      {t(`difficulty.${(caseItem.difficulty === 'BEGINNER' ? 'beginner' : caseItem.difficulty === 'INTERMEDIATE' ? 'intermediate' : 'advanced')}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(caseItem.createdAt).toLocaleDateString()}</TableCell>
                  {session?.user?.id && !isAdmin ? (
                    <TableCell>{typeof caseItem.attemptsCount === 'number' ? caseItem.attemptsCount : 0}</TableCell>
                  ) : null}
                  {session?.user?.id && !isAdmin ? (
                    <TableCell>
                      {caseItem.personalDifficulty ? (
                        <Badge variant="outline" className={
                          caseItem.personalDifficulty === 'BEGINNER'
                            ? 'border-green-500 text-green-700'
                            : caseItem.personalDifficulty === 'INTERMEDIATE'
                            ? 'border-amber-500 text-amber-700'
                            : 'border-red-500 text-red-700'
                        }>
                          {t(`difficulty.${(caseItem.personalDifficulty === 'BEGINNER' ? 'beginner' : caseItem.personalDifficulty === 'INTERMEDIATE' ? 'intermediate' : 'advanced')}`)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <CaseTagCell
                      mode={isAdmin ? 'admin' : 'user'}
                      caseId={caseItem.id}
                      initialTags={isAdmin ? caseItem.adminTags : caseItem.userTags}
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link href={`/bestof-larib/${caseItem.id}`}>
                      <Button size="sm" variant="secondary"><Eye />{t('view')}</Button>
                    </Link>
                    {isAdmin ? (
                      <>
                        <CreateCaseDialog
                          examTypes={examTypes}
                          diseaseTags={diseaseTags}
                          clinicalCase={{
                            id: caseItem.id,
                            name: caseItem.name,
                            difficulty: caseItem.difficulty,
                            status: caseItem.status,
                            tags: [],
                            pdfUrl: caseItem.pdfUrl ?? null,
                            pdfKey: caseItem.pdfKey ?? null,
                            textContent: caseItem.textContent ?? null,
                            examType: caseItem.examType ?? null,
                            diseaseTag: caseItem.diseaseTag ?? null,
                          }}
                          trigger={<Button size="sm" variant="outline"><Pencil />{t('edit')}</Button>}
                        />
                        <DeleteCaseButton id={caseItem.id} />
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
