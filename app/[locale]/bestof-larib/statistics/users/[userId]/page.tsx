import { getTranslations } from 'next-intl/server';
import { requireAuth } from '@/lib/auth-guard';
import { redirect, notFound } from 'next/navigation';
import { applicationLink } from '@/lib/application-link';
import { Link } from '@/app/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserStatistics, getUserCaseHistory, getUserExamTypeStats, getUserCompletionTrends, type StatsFilters } from '@/lib/services/bestof-larib-stats';
import { listExamTypes, listDiseaseTags } from '@/lib/services/bestof-larib';
import { listAdminTags } from '@/lib/services/bestof-larib-tags';
import { prisma } from '@/lib/prisma';
import { CheckCircle2 } from 'lucide-react';
import UserCaseHistory from './components/user-case-history';
import UserExamTypeWidget from './components/user-exam-type-widget';
import UserExamTypePieChart from './components/user-exam-type-pie-chart';
import BestofStatsCompletionTrend from '../../../components/bestof-stats-completion-trend';
import UserProfileFilters from './components/user-profile-filters';

async function UserProfilePageContent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, userId } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'bestof.statistics.userProfile' });
  const session = await requireAuth();

  if (!session || session.user.role !== 'ADMIN') {
    redirect(applicationLink(locale, '/bestof-larib'));
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      name: true,
      position: true,
      createdAt: true,
    },
  });

  const lastActivity = await prisma.caseAttempt.findFirst({
    where: {
      userId,
      validatedAt: { not: null }
    },
    orderBy: { validatedAt: 'desc' },
    select: { validatedAt: true },
  });

  if (!user) {
    notFound();
  }

  const displayName = user.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user.name || user.email;

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

  const filters: Omit<StatsFilters, 'userIds'> = {
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

  const [userStats, caseHistory, examTypeStats, completionTrend, examTypes, diseaseTags, adminTags] = await Promise.all([
    getUserStatistics({ userIds: [userId], ...filters }),
    getUserCaseHistory(userId, filters),
    getUserExamTypeStats(userId),
    getUserCompletionTrends({ userIds: [userId], ...filters }, 'week'),
    listExamTypes(),
    listDiseaseTags(),
    listAdminTags().then((rows) => rows.map((row) => ({ id: row.id, name: row.name }))),
  ]);

  const userStat = userStats[0];

  return (
    <div className='space-y-6 py-6 px-8 mx-auto max-w-screen-2xl'>
      <div>
        <div className='flex items-center gap-2 mb-2'>
          <Link href='/bestof-larib/statistics'>
            <Button variant='ghost' size='sm'>
              <ArrowLeft className='size-4 mr-2' />
              {t('backToStatistics')}
            </Button>
          </Link>
        </div>
        <h1 className='text-xl font-semibold mb-1'>{displayName}</h1>
        <div className='flex items-center gap-3 text-xs text-muted-foreground'>
          <span>{t('position')}: {user.position || '—'}</span>
          <span>•</span>
          <span>{t('enrolledSince')}: {new Date(user.createdAt).toLocaleDateString()}</span>
          {lastActivity && lastActivity.validatedAt && (
            <>
              <span>•</span>
              <span>{t('lastActivity')}: {new Date(lastActivity.validatedAt).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>

      <Card className='h-fit w-fit'>
        <CardContent className='p-3'>
          <div className='flex items-center gap-2.5'>
            <div className='p-1.5 rounded-md bg-primary/10'>
              <CheckCircle2 className='size-5 text-primary' />
            </div>
            <div>
              <div className='text-[10px] text-muted-foreground uppercase tracking-wide'>
                {t('stats.totalCompleted')}
              </div>
              <div className='text-xl font-bold'>{userStat?.uniqueCasesCompleted ?? 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-3 md:grid-cols-2'>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('examTypePieChart.title')}</CardTitle>
          </CardHeader>
          <CardContent className='pb-3'>
            <UserExamTypePieChart
              examTypeStats={examTypeStats}
              translations={{
                title: t('examTypePieChart.title'),
                noData: t('examTypePieChart.noData'),
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('examTypeStats.title')}</CardTitle>
          </CardHeader>
          <CardContent className='pt-4 pb-4'>
            <UserExamTypeWidget examTypeStats={examTypeStats} />
          </CardContent>
        </Card>
      </div>

      <section className='space-y-3'>
        <h2 className='text-base font-semibold'>{t('completionTrend.title')}</h2>
        <UserProfileFilters
          data={{
            examTypes,
            diseaseTags,
            adminTags,
          }}
        />
        <Card>
          <CardContent className='pt-4 pb-4'>
            <BestofStatsCompletionTrend
              userTrendData={completionTrend}
              translations={{ noData: t('completionTrend.noData') }}
            />
          </CardContent>
        </Card>
      </section>

      <section className='space-y-3'>
        <h2 className='text-base font-semibold'>{t('caseHistory.title')}</h2>
        <UserCaseHistory caseHistory={caseHistory} userId={userId} />
      </section>
    </div>
  );
}

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <UserProfilePageContent params={params} searchParams={searchParams} />;
}
