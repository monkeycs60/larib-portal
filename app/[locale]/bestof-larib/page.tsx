import { getTranslations } from 'next-intl/server'
import { listClinicalCasesWithDisplayTags, listExamTypes, listDiseaseTags, type CaseListFilters, type CaseListSortField } from '@/lib/services/bestof-larib'
import { listAdminTags, listUserTags } from '@/lib/services/bestof-larib-tags'
import { getTypedSession } from '@/lib/auth-helpers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/app/i18n/navigation'
import { Eye, Pencil, PlusCircle } from 'lucide-react'
import DeleteCaseButton from './components/delete-case-button'
import CreateCaseDialog from './components/create-case-dialog'
import CaseTagCell from './components/case-tag-cell'
import CaseDifficultyCell from './components/case-difficulty-cell'
import FiltersBar from './components/filters-bar'
import SortHeader from './components/sort-header'
import TableOverlay from './components/table-overlay'
import StartNewAttemptLink from './components/start-new-attempt-link'

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
  const isAdmin = session?.user?.role === 'ADMIN'
  const rawStatus = typeof sp?.status === 'string' ? sp.status : undefined
  const statusFilter: 'PUBLISHED' | 'DRAFT' | undefined = isAdmin && rawStatus && ['PUBLISHED','DRAFT'].includes(rawStatus) ? (rawStatus as 'PUBLISHED' | 'DRAFT') : undefined
  const userProgressFilter: CaseListFilters['userProgress'] = !isAdmin && rawStatus
    ? rawStatus === 'completed'
      ? 'COMPLETED'
      : rawStatus === 'in-progress'
        ? 'IN_PROGRESS'
        : rawStatus === 'not-started'
          ? 'NOT_STARTED'
          : undefined
    : undefined

  const filters: CaseListFilters = {
    name: typeof sp?.q === 'string' ? sp.q : undefined,
    status: statusFilter,
    examTypeIds: asArray(sp?.examTypeId),
    diseaseTagIds: asArray(sp?.diseaseTagId),
    difficulties: asDifficultyArray(sp?.difficulty),
    createdFrom: typeof sp?.dateFrom === 'string' && sp.dateFrom ? new Date(sp.dateFrom) : undefined,
    createdTo: typeof sp?.dateTo === 'string' && sp.dateTo ? (() => { const d = new Date(sp.dateTo); d.setHours(23,59,59,999); return d })() : undefined,
    adminTagIds: asArray(sp?.adminTagId),
    userTagIds: asArray(sp?.userTagId),
    myDifficulty: typeof sp?.myDifficulty === 'string' && ['BEGINNER','INTERMEDIATE','ADVANCED'].includes(sp.myDifficulty) ? (sp.myDifficulty as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') : undefined,
    userProgress: userProgressFilter,
  }
  const sortField = typeof sp?.sort === 'string' ? (sp.sort as CaseListSortField) : undefined
  const sortDirection = typeof sp?.dir === 'string' && (sp.dir === 'asc' || sp.dir === 'desc') ? (sp.dir) : undefined
  const [cases, examTypes, diseaseTags, adminTags, userTagsList] = await Promise.all([
    listClinicalCasesWithDisplayTags(session?.user?.id, filters, { field: sortField, direction: sortDirection }),
    listExamTypes(),
    listDiseaseTags(),
    isAdmin ? listAdminTags().then(rows => rows.map(r => ({ id: r.id, name: r.name }))) : Promise.resolve([]),
    session?.user?.id ? listUserTags(session.user.id).then(rows => rows.map(r => ({ id: r.id, name: r.name }))) : Promise.resolve([]),
  ])
  

  return (
    <div className="space-y-4 py-6 px-12 mx-auto">
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
              cases.map((caseItem) => {
                const progress = caseItem.userAttemptState ?? { hasValidatedAttempt: false, hasDraftAttempt: false }
                const isUserView = Boolean(session?.user?.id) && !isAdmin

                const statusBadge = (() => {
                  if (!isUserView) {
                    const adminBadgeClass = caseItem.status === 'PUBLISHED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                    const adminLabel = caseItem.status === 'PUBLISHED' ? t('status.published') : t('status.draft')
                    return <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${adminBadgeClass}`}>{adminLabel}</Badge>
                  }

                  if (progress.hasValidatedAttempt) {
                    return <Badge className="rounded-full px-3 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">{t('status.completed')}</Badge>
                  }
                  if (progress.hasDraftAttempt) {
                    return <Badge className="rounded-full px-3 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">{t('status.inProgress')}</Badge>
                  }
                  return <Badge className="rounded-full px-3 py-1 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">{t('status.notStarted')}</Badge>
                })()

                return (
							<TableRow key={caseItem.id}>
								<TableCell>{statusBadge}</TableCell>
								<TableCell className='font-medium'>
									{caseItem.name}
								</TableCell>
								<TableCell>{caseItem.examType?.name ?? '-'}</TableCell>
								<TableCell>
									{caseItem.diseaseTag?.name ? (
										<Badge variant='secondary'>
											{caseItem.diseaseTag.name}
										</Badge>
									) : (
										'-'
									)}
								</TableCell>
								<TableCell>
									<Badge
										variant='outline'
										className={
											caseItem.difficulty === 'BEGINNER'
												? 'border-green-500 text-green-700'
												: caseItem.difficulty === 'INTERMEDIATE'
												? 'border-amber-500 text-amber-700'
												: 'border-red-500 text-red-700'
										}>
										{t(
											`difficulty.${
												caseItem.difficulty === 'BEGINNER'
													? 'beginner'
													: caseItem.difficulty === 'INTERMEDIATE'
													? 'intermediate'
													: 'advanced'
											}`
										)}
									</Badge>
								</TableCell>
								<TableCell>
									{new Date(caseItem.createdAt).toLocaleDateString()}
								</TableCell>
								{session?.user?.id && !isAdmin ? (
									<TableCell>
										{typeof caseItem.attemptsCount === 'number'
											? caseItem.attemptsCount
											: 0}
									</TableCell>
								) : null}
								{session?.user?.id && !isAdmin ? (
									<TableCell>
										<CaseDifficultyCell
											key={`${caseItem.id}-${
												caseItem.personalDifficulty ?? 'unset'
											}`}
											caseId={caseItem.id}
											initialDifficulty={
												caseItem.personalDifficulty ?? null
											}
										/>
									</TableCell>
								) : null}
								<TableCell>
									<CaseTagCell
										mode={isAdmin ? 'admin' : 'user'}
										caseId={caseItem.id}
										initialTags={
											isAdmin
												? caseItem.adminTags
												: caseItem.userTags
										}
									/>
								</TableCell>
                  <TableCell>
                    <div className='flex flex-wrap justify-end gap-2'>
                      <Link
                        href={`/bestof-larib/${caseItem.id}`}
                        prefetch
                        className='inline-flex'
                      >
                        <Button size='sm' variant='secondary' className='gap-1'>
                          <Eye />
                          {t('view')}
                        </Button>
                      </Link>
                      {session?.user?.id && !isAdmin ? (
                        <StartNewAttemptLink
                          href={`/bestof-larib/${caseItem.id}?newAttempt=1`}
                          label={t('caseView.startNewAttempt')}
                        >
                          <PlusCircle />
                        </StartNewAttemptLink>
                      ) : null}
                      {isAdmin ? (
                        <>
                          <span className='inline-flex'>
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
                              trigger={
                                <Button size='sm' variant='outline' className='gap-1'>
                                  <Pencil />
                                  {t('edit')}
                                </Button>
                              }
                            />
                          </span>
                          <span className='inline-flex'>
                            <DeleteCaseButton id={caseItem.id} />
                          </span>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
							</TableRow>
						);})
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
