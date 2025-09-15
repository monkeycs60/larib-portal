import { getTranslations } from 'next-intl/server'
import { listClinicalCasesWithDisplayTags, listExamTypes, listDiseaseTags, type CaseListFilters, type CaseListSortField } from '@/lib/services/bestof-larib'
import { listAdminTags, listUserTags } from '@/lib/services/bestof-larib-tags'
import { getTypedSession } from '@/lib/auth-helpers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/app/i18n/navigation'
import { Eye, Pencil, Plus } from 'lucide-react'
import DeleteCaseButton from './components/delete-case-button'
import CreateCaseDialog from './components/create-case-dialog'
import TagManagerDialog from './components/tag-manager-dialog'
import FiltersBar from './components/filters-bar'
import SortHeader from './components/sort-header'

export default async function BestofLaribPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const t = await getTranslations('bestof')
  const session = await getTypedSession()
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
    name: typeof searchParams?.q === 'string' ? searchParams?.q : undefined,
    status: typeof searchParams?.status === 'string' && ['PUBLISHED','DRAFT'].includes(searchParams.status) ? (searchParams.status as 'PUBLISHED' | 'DRAFT') : undefined,
    examTypeIds: asArray(searchParams?.examTypeId),
    diseaseTagIds: asArray(searchParams?.diseaseTagId),
    difficulties: asDifficultyArray(searchParams?.difficulty),
    createdFrom: typeof searchParams?.dateFrom === 'string' && searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined,
    createdTo: typeof searchParams?.dateTo === 'string' && searchParams.dateTo ? (() => { const d = new Date(searchParams.dateTo); d.setHours(23,59,59,999); return d })() : undefined,
    adminTagId: typeof searchParams?.adminTagId === 'string' ? searchParams?.adminTagId : undefined,
    userTagIds: asArray(searchParams?.userTagId),
    myDifficulty: typeof searchParams?.myDifficulty === 'string' && ['BEGINNER','INTERMEDIATE','ADVANCED'].includes(searchParams.myDifficulty) ? (searchParams.myDifficulty as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') : undefined,
  }
  const sortField = typeof searchParams?.sort === 'string' ? (searchParams.sort as CaseListSortField) : undefined
  const sortDirection = typeof searchParams?.dir === 'string' && (searchParams.dir === 'asc' || searchParams.dir === 'desc') ? (searchParams.dir) : undefined
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
          canUsePersonalDifficulty: Boolean(session?.user?.id),
        }}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortHeader field="status" label={t('table.status')} activeField={sortField} direction={sortDirection} /></TableHead>
              <TableHead><SortHeader field="name" label={t('table.name')} activeField={sortField} direction={sortDirection} /></TableHead>
              <TableHead><SortHeader field="examType" label={t('table.examType')} activeField={sortField} direction={sortDirection} /></TableHead>
              <TableHead><SortHeader field="diseaseTag" label={t('table.disease')} activeField={sortField} direction={sortDirection} /></TableHead>
              <TableHead><SortHeader field="difficulty" label={t('table.difficulty')} activeField={sortField} direction={sortDirection} /></TableHead>
              <TableHead><SortHeader field="createdAt" label={t('table.createdAt')} activeField={sortField} direction={sortDirection} /></TableHead>
              {session?.user?.id ? (<TableHead><SortHeader field="attempts" label={t('table.attempts')} activeField={sortField} direction={sortDirection} /></TableHead>) : null}
              {session?.user?.id ? (<TableHead><SortHeader field="personalDifficulty" label={t('table.myDifficulty')} activeField={sortField} direction={sortDirection} /></TableHead>) : null}
              <TableHead>{isAdmin ? t('table.adminTags') : t('table.userTags')}</TableHead>
              <TableHead className="text-right">{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6 + (session?.user?.id ? 2 : 0) + 2} className="text-center text-sm text-muted-foreground">
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
                  {session?.user?.id ? (
                    <TableCell>{typeof caseItem.attemptsCount === 'number' ? caseItem.attemptsCount : 0}</TableCell>
                  ) : null}
                  {session?.user?.id ? (
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
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex flex-wrap gap-1">
                        {(isAdmin ? caseItem.adminTags : caseItem.userTags).map((tag) => (
                          <Badge key={tag.id} className="border-transparent text-white" style={{ backgroundColor: tag.color }}>
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                      <TagManagerDialog
                        mode={isAdmin ? 'admin' : 'user'}
                        caseId={caseItem.id}
                        trigger={
                          <Button type="button" size="icon" variant="ghost" aria-label={isAdmin ? 'add admin tag' : 'add user tag'}>
                            <Plus />
                          </Button>
                        }
                      />
                    </div>
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
