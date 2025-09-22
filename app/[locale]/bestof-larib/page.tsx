import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import {
  listClinicalCasesWithDisplayTags,
  listExamTypes,
  listDiseaseTags,
  type CaseListFilters,
  type CaseListSortField,
} from '@/lib/services/bestof-larib';
import { listAdminTags, listUserTags } from '@/lib/services/bestof-larib-tags';
import { getTypedSession } from '@/lib/auth-helpers';
import { Skeleton } from '@/components/ui/skeleton';
import CreateCaseDialog from './components/create-case-dialog';
import FiltersBar from './components/filters-bar';
import CasesTable from './components/cases-table';

export default async function BestofLaribPage({
  searchParams,
}: {
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

  const casesPromise = listClinicalCasesWithDisplayTags(session?.user?.id, filters, {
    field: sortField,
    direction: sortDirection,
  });

  const [examTypes, diseaseTags, adminTags, userTagsList] = await Promise.all([
    listExamTypes(),
    listDiseaseTags(),
    isAdmin
      ? listAdminTags().then((rows) => rows.map((row) => ({ id: row.id, name: row.name })))
      : Promise.resolve([]),
    session?.user?.id
      ? listUserTags(session.user.id).then((rows) => rows.map((row) => ({ id: row.id, name: row.name })))
      : Promise.resolve([]),
  ]);

  const canUsePersonalDifficulty = Boolean(session?.user?.id) && !isAdmin;

  return (
    <div className='space-y-4 py-6 px-12 mx-auto'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold'>{t('title')}</h1>
          <p className='text-sm text-muted-foreground'>{t('subtitle')}</p>
        </div>
        {isAdmin ? <CreateCaseDialog examTypes={examTypes} diseaseTags={diseaseTags} /> : null}
      </div>

      <FiltersBar
        data={{
          examTypes,
          diseaseTags,
          isAdmin,
          adminTags,
          userTags: userTagsList,
          canUsePersonalDifficulty,
        }}
      />

      <Suspense fallback={<CasesTableFallback isUserView={canUsePersonalDifficulty} />}>
        <CasesTable
          casesPromise={casesPromise}
          isAdmin={isAdmin}
          userId={session?.user?.id ?? null}
          examTypes={examTypes}
          diseaseTags={diseaseTags}
          sortField={sortField}
          sortDirection={sortDirection}
        />
      </Suspense>
    </div>
  );
}

function CasesTableFallback({ isUserView }: { isUserView: boolean }) {
  const columnCount = 6 + (isUserView ? 2 : 0) + 2;
  return (
    <div className='rounded-md border'>
      <div
        className='grid gap-4 border-b bg-muted/30 p-3'
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columnCount }).map((_, index) => (
          <Skeleton key={index} className='h-4 w-full' />
        ))}
      </div>
      <div>
        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className='grid gap-4 border-b p-3'
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columnCount }).map((__, cellIndex) => (
              <Skeleton key={cellIndex} className='h-4 w-full' />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
