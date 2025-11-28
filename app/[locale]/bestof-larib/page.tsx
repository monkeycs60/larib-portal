import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import {
  listClinicalCasesWithDisplayTags,
  listExamTypes,
  listDiseaseTags,
  serializeCaseFilters,
  type CaseListFilters,
  type CaseListSortField,
} from '@/lib/services/bestof-larib';
import { listAdminTags, listUserTags } from '@/lib/services/bestof-larib-tags';
import { getTypedSession } from '@/lib/auth-helpers';
import { Link } from '@/app/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ChartBar } from 'lucide-react';
import CreateCaseDialog from './components/create-case-dialog';
import FiltersBar from './components/filters-bar';
import CasesTable from './components/cases-table';
import CasesTableFallback, { type CasesTableTranslations } from './components/cases-table-fallback';
import TagsManagerModal from './components/tags-manager-modal';
import type { BestofCacheKey } from '@/lib/bestof-cache-key';
import { serialiseBestofCacheKey } from '@/lib/bestof-cache-key';

async function BestofLaribPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations('bestof');
  const session = await getTypedSession();
  const sp = await searchParams;

  const asArray = (value: string | string[] | undefined): string[] | undefined => {
    if (!value) return undefined;
    return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : undefined;
  };

  const validDifficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
  const asDifficultyArray = (
    value: string | string[] | undefined,
  ): (typeof validDifficulties)[number][] | undefined => {
    const arr = asArray(value);
    if (!arr?.length) return undefined;
    const filtered = arr.filter((entry) => (validDifficulties as readonly string[]).includes(entry));
    return filtered as (typeof validDifficulties)[number][];
  };

  const isAdmin = session?.user?.role === 'ADMIN';
  const rawStatus = typeof sp?.status === 'string' ? sp.status : undefined;
  const statusFilter: 'PUBLISHED' | 'DRAFT' | undefined =
    isAdmin && rawStatus && ['PUBLISHED', 'DRAFT'].includes(rawStatus)
      ? (rawStatus as 'PUBLISHED' | 'DRAFT')
      : undefined;
  const userProgressFilter: CaseListFilters['userProgress'] = !isAdmin && rawStatus
    ? rawStatus === 'completed'
      ? 'COMPLETED'
      : rawStatus === 'in-progress'
        ? 'IN_PROGRESS'
        : rawStatus === 'not-started'
          ? 'NOT_STARTED'
          : undefined
    : undefined;

  const filters: CaseListFilters = {
    name: typeof sp?.q === 'string' ? sp.q : undefined,
    status: statusFilter,
    examTypeIds: asArray(sp?.examTypeId),
    diseaseTagIds: asArray(sp?.diseaseTagId),
    difficulties: asDifficultyArray(sp?.difficulty),
    createdFrom: typeof sp?.dateFrom === 'string' && sp.dateFrom ? new Date(sp.dateFrom) : undefined,
    createdTo:
      typeof sp?.dateTo === 'string' && sp.dateTo
        ? (() => {
            const d = new Date(sp.dateTo);
            d.setHours(23, 59, 59, 999);
            return d;
          })()
        : undefined,
    firstCompletedFrom: typeof sp?.firstCompletionFrom === 'string' && sp.firstCompletionFrom ? new Date(sp.firstCompletionFrom) : undefined,
    firstCompletedTo:
      typeof sp?.firstCompletionTo === 'string' && sp.firstCompletionTo
        ? (() => {
            const d = new Date(sp.firstCompletionTo);
            d.setHours(23, 59, 59, 999);
            return d;
          })()
        : undefined,
    adminTagIds: asArray(sp?.adminTagId),
    userTagIds: asArray(sp?.userTagId),
    myDifficulty:
      typeof sp?.myDifficulty === 'string' && ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(sp.myDifficulty)
        ? (sp.myDifficulty as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED')
        : undefined,
    userProgress: userProgressFilter,
  };

  const sortField = typeof sp?.sort === 'string' ? (sp.sort as CaseListSortField) : undefined;
  const sortDirection =
    typeof sp?.dir === 'string' && (sp.dir === 'asc' || sp.dir === 'desc') ? sp.dir : undefined;

  const casesPromise = listClinicalCasesWithDisplayTags(
    session?.user?.id,
    filters,
    {
      field: sortField,
      direction: sortDirection,
    },
    {
      includeContent: isAdmin,
    }
  );

  const serializedFilters = serializeCaseFilters(filters);
  const { locale } = await params;
  const cacheKey: BestofCacheKey = {
    locale,
    userId: session?.user?.id ?? null,
    filters: serializedFilters,
    sortField,
    sortDirection,
  };
  const cacheKeyString = serialiseBestofCacheKey(cacheKey);

  const [examTypes, diseaseTags, adminTagsForFilter, adminTagsForDialog, userTagsList] = await Promise.all([
    listExamTypes(),
    listDiseaseTags(),
    isAdmin
      ? listAdminTags().then((rows) => rows.map((row) => ({ id: row.id, name: row.name })))
      : Promise.resolve([]),
    isAdmin
      ? listAdminTags()
      : Promise.resolve([]),
    session?.user?.id
      ? listUserTags(session.user.id).then((rows) => rows.map((row) => ({ id: row.id, name: row.name })))
      : Promise.resolve([]),
  ]);

  const canUsePersonalDifficulty = Boolean(session?.user?.id) && !isAdmin;
  const columnCount = 6 + (canUsePersonalDifficulty ? 2 : 0) + 2;

  const translations: CasesTableTranslations = {
    table: {
      status: t('table.status'),
      name: t('table.name'),
      examType: t('table.examType'),
      disease: t('table.disease'),
      difficulty: t('table.difficulty'),
      createdAt: t('table.createdAt'),
      firstCompletion: t('table.firstCompletion'),
      attempts: t('table.attempts'),
      myDifficulty: t('table.myDifficulty'),
      adminTags: t('table.adminTags'),
      userTags: t('table.userTags'),
      actions: t('table.actions'),
    },
    status: {
      published: t('status.published'),
      draft: t('status.draft'),
      completed: t('status.completed'),
      inProgress: t('status.inProgress'),
      notStarted: t('status.notStarted'),
    },
    difficulty: {
      beginner: t('difficulty.beginner'),
      intermediate: t('difficulty.intermediate'),
      advanced: t('difficulty.advanced'),
    },
    actions: {
      view: t('view'),
      edit: t('edit'),
      startNewAttempt: t('caseView.startNewAttempt'),
    },
    empty: t('empty'),
    t,
  };

  return (
    <div className='space-y-4 py-6 px-8 mx-auto'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold'>{t('title')}</h1>
          <p className='text-sm text-muted-foreground'>{t('subtitle')}</p>
        </div>
        <div className='flex items-center gap-3'>
          <TagsManagerModal isAdmin={isAdmin} />
          {isAdmin ? (
            <>
              <Link href='/bestof-larib/statistics'>
                <Button variant='outline'>
                  <ChartBar className='size-4 mr-2' />
                  Statistics
                </Button>
              </Link>
              <CreateCaseDialog examTypes={examTypes} diseaseTags={diseaseTags} isAdmin={isAdmin} adminTags={adminTagsForDialog} />
            </>
          ) : null}
        </div>
      </div>

      <FiltersBar
        data={{
          examTypes,
          diseaseTags,
          isAdmin,
          adminTags: adminTagsForFilter,
          userTags: userTagsList,
          canUsePersonalDifficulty,
        }}
      />

      <Suspense
        fallback={
          <CasesTableFallback
            cacheKeyString={cacheKeyString}
            isAdmin={isAdmin}
            userId={session?.user?.id ?? null}
            columnCount={columnCount}
            translations={translations}
            examTypes={examTypes}
            diseaseTags={diseaseTags}
            adminTags={adminTagsForDialog}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        }
      >
        <CasesTable
          casesPromise={casesPromise}
          isAdmin={isAdmin}
          userId={session?.user?.id ?? null}
          examTypes={examTypes}
          diseaseTags={diseaseTags}
          adminTags={adminTagsForDialog}
          sortField={sortField}
          sortDirection={sortDirection}
          translations={translations}
          cacheKey={cacheKey}
          cacheKeyString={cacheKeyString}
        />
      </Suspense>
    </div>
  );
}

export default async function BestofLaribPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <BestofLaribPageContent params={params} searchParams={searchParams} />;
}
