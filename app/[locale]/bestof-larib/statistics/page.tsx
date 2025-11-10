import { getTranslations } from 'next-intl/server';
import { getTypedSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import {
  getUserStatistics,
  getGlobalStatistics,
  getUserCompletionTrends,
  listAllUsersWithAttempts,
  type StatsFilters,
} from '@/lib/services/bestof-larib-stats';
import { listExamTypes, listDiseaseTags } from '@/lib/services/bestof-larib';
import { listAdminTags } from '@/lib/services/bestof-larib-tags';
import { applicationLink } from '@/lib/application-link';
import { Link } from '@/app/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import BestofStatsFilters from '../components/bestof-stats-filters';
import BestofStatsOverview from '../components/bestof-stats-overview';
import BestofStatsUserTable from '../components/bestof-stats-user-table';
import BestofStatsCharts from '../components/bestof-stats-charts';

async function BestofStatisticsPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations('bestof.statistics');
  const session = await getTypedSession();
  const { locale } = await params;

  if (!session || session.user.role !== 'ADMIN') {
    redirect(applicationLink(locale, '/bestof-larib'));
  }

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

  const filters: StatsFilters = {
    userIds: asArray(sp?.userId),
    examTypeIds: asArray(sp?.examTypeId),
    diseaseTagIds: asArray(sp?.diseaseTagId),
    difficulties: asDifficultyArray(sp?.difficulty),
    adminTagIds: asArray(sp?.adminTagId),
    dateFrom: typeof sp?.dateFrom === 'string' && sp.dateFrom ? new Date(sp.dateFrom) : undefined,
    dateTo:
      typeof sp?.dateTo === 'string' && sp.dateTo
        ? (() => {
            const d = new Date(sp.dateTo);
            d.setHours(23, 59, 59, 999);
            return d;
          })()
        : undefined,
  };

  const [globalStats, userStats, userTrendData, users, examTypes, diseaseTags, adminTags] = await Promise.all([
    getGlobalStatistics(filters),
    getUserStatistics(filters),
    getUserCompletionTrends(filters, 'week'),
    listAllUsersWithAttempts(),
    listExamTypes(),
    listDiseaseTags(),
    listAdminTags().then((rows) => rows.map((row) => ({ id: row.id, name: row.name }))),
  ]);

  const overviewTranslations = {
    totalCases: t('overview.totalCases'),
    activeUsers: t('overview.activeUsers'),
    avgPerUser: t('overview.avgPerUser'),
    mostPracticed: t('overview.mostPracticed'),
  };

  const tableTranslations = {
    user: t('table.user'),
    position: t('table.position'),
    totalCompleted: t('table.totalCompleted'),
    casesByType: t('table.casesByType'),
    beginner: t('table.beginner'),
    intermediate: t('table.intermediate'),
    advanced: t('table.advanced'),
    lastActivity: t('table.lastActivity'),
    daysSince: t('table.daysSince'),
    regularity: t('table.regularity'),
    perWeek: t('perWeek'),
    noCasesCompleted: t('noCasesCompleted'),
    viewProfile: t('table.viewProfile'),
    activity: {
      veryActive: t('activity.veryActive'),
      active: t('activity.active'),
      inactive: t('activity.inactive'),
    },
  };

  const chartsTranslations = {
    byCategory: t('charts.byCategory'),
    overTime: t('charts.overTime'),
    topUsers: t('charts.topUsers'),
    distribution: t('charts.distribution'),
    beginner: t('table.beginner'),
    intermediate: t('table.intermediate'),
    advanced: t('table.advanced'),
  };

  return (
    <div className='space-y-6 py-6 px-8 mx-auto'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='flex items-center gap-3 mb-2'>
            <Link href='/bestof-larib'>
              <Button variant='ghost' size='sm'>
                <ArrowLeft className='size-4 mr-2' />
                Back
              </Button>
            </Link>
          </div>
          <h1 className='text-2xl font-semibold'>{t('title')}</h1>
          <p className='text-sm text-muted-foreground'>{t('subtitle')}</p>
        </div>
      </div>

      <BestofStatsFilters
        data={{
          users,
          examTypes,
          diseaseTags,
          adminTags,
        }}
      />

      <BestofStatsOverview stats={globalStats} translations={overviewTranslations} />

      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>User Statistics</h2>
        <BestofStatsUserTable userStats={userStats} translations={tableTranslations} />
      </div>

      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Charts</h2>
        <BestofStatsCharts userStats={userStats} userTrendData={userTrendData} translations={chartsTranslations} />
      </div>
    </div>
  );
}

export default async function BestofStatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <BestofStatisticsPageContent params={params} searchParams={searchParams} />;
}
