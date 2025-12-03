import { getTranslations } from 'next-intl/server';
import { requireAuth } from '@/lib/auth-guard';
import { redirect } from 'next/navigation';
import {
  getUserStatistics,
  getGlobalStatistics,
  getUserCompletionTrends,
  getDatabaseStatistics,
  getUserOverviewStatistics,
  listAllUsersWithAttempts,
  type StatsFilters,
} from '@/lib/services/bestof-larib-stats';
import { listExamTypes, listDiseaseTags } from '@/lib/services/bestof-larib';
import { listAdminTags } from '@/lib/services/bestof-larib-tags';
import { applicationLink } from '@/lib/application-link';
import { Link } from '@/app/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import BestofStatsFilters from '../components/bestof-stats-filters';
import BestofStatsUserTable from '../components/bestof-stats-user-table';
import BestofStatsDatabaseCharts from '../components/bestof-stats-database-charts';
import BestofStatsUserOverview from '../components/bestof-stats-user-overview';
import BestofStatsCompletionTrend from '../components/bestof-stats-completion-trend';

async function BestofStatisticsPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'bestof.statistics' });
  const session = await requireAuth();

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

  const [globalStats, userStats, userTrendData, databaseStats, userOverviewStats, users, examTypes, diseaseTags, adminTags] = await Promise.all([
    getGlobalStatistics(filters),
    getUserStatistics(filters),
    getUserCompletionTrends(filters, 'week'),
    getDatabaseStatistics(),
    getUserOverviewStatistics(),
    listAllUsersWithAttempts(),
    listExamTypes(),
    listDiseaseTags(),
    listAdminTags().then((rows) => rows.map((row) => ({ id: row.id, name: row.name }))),
  ]);

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

  const databaseChartsTranslations = {
    casesByExamType: t('database.casesByExamType'),
    casesByDifficulty: t('database.casesByDifficulty'),
    casesByStatus: t('database.casesByStatus'),
    casesByDiagnosis: t('database.casesByDiagnosis'),
    totalCases: t('database.totalCases'),
    totalExamTypes: t('database.totalExamTypes'),
    totalDiagnoses: t('database.totalDiagnoses'),
    totalAdminTags: t('database.totalAdminTags'),
    noData: t('database.noData'),
    cases: t('database.cases'),
    beginner: t('table.beginner'),
    intermediate: t('table.intermediate'),
    advanced: t('table.advanced'),
    draft: t('database.draft'),
    published: t('database.published'),
    completed: t('database.completed'),
  };

  const userOverviewTranslations = {
    totalActiveUsers: t('userOverview.totalActiveUsers'),
    usersLast30Days: t('userOverview.usersLast30Days'),
    usersByPosition: t('userOverview.usersByPosition'),
    noData: t('database.noData'),
  };

  return (
    <div className='space-y-8 py-6 px-8 mx-auto max-w-screen-2xl'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='flex items-center gap-3 mb-2'>
            <Link href='/bestof-larib'>
              <Button variant='ghost' size='sm'>
                <ArrowLeft className='size-4 mr-2' />
                {t('back')}
              </Button>
            </Link>
          </div>
          <h1 className='text-2xl font-semibold'>{t('title')}</h1>
          <p className='text-sm text-muted-foreground'>{t('subtitle')}</p>
        </div>
      </div>

      <section className='space-y-4'>
        <div className='flex items-center gap-2'>
          <h2 className='text-lg font-semibold'>{t('sections.database')}</h2>
        </div>
        <BestofStatsDatabaseCharts stats={databaseStats} translations={databaseChartsTranslations} />
      </section>

      <hr className='border-border' />

      <section className='space-y-4'>
        <div className='flex items-center gap-2'>
          <h2 className='text-lg font-semibold'>{t('sections.userOverview')}</h2>
        </div>
        <BestofStatsUserOverview stats={userOverviewStats} translations={userOverviewTranslations} />
      </section>

      <hr className='border-border' />

      <section className='space-y-4'>
        <div className='flex items-center gap-2'>
          <h2 className='text-lg font-semibold'>{t('sections.userActivity')}</h2>
        </div>

        <BestofStatsFilters
          data={{
            users,
            examTypes,
            diseaseTags,
            adminTags,
          }}
        />

        <div className='space-y-4'>
          <h3 className='text-base font-medium text-muted-foreground'>{t('sections.completionTrend')}</h3>
          <Card>
            <CardHeader>
              <CardTitle>{chartsTranslations.overTime}</CardTitle>
            </CardHeader>
            <CardContent>
              <BestofStatsCompletionTrend
                userTrendData={userTrendData}
                translations={{ noData: t('database.noData') }}
              />
            </CardContent>
          </Card>
        </div>

        <div className='space-y-4'>
          <h3 className='text-base font-medium text-muted-foreground'>{t('sections.userStats')}</h3>
          <BestofStatsUserTable userStats={userStats} translations={tableTranslations} />
        </div>
      </section>
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
