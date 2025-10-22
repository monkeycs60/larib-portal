import { getTranslations } from 'next-intl/server';
import { getTypedSession } from '@/lib/auth-helpers';
import { redirect, notFound } from 'next/navigation';
import { applicationLink } from '@/lib/application-link';
import { Link } from '@/app/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserStatistics, getUserCaseHistory, getUserExamTypeStats } from '@/lib/services/bestof-larib-stats';
import { prisma } from '@/lib/prisma';
import UserCaseHistory from './components/user-case-history';
import UserExamTypeWidget from './components/user-exam-type-widget';

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const t = await getTranslations('bestof.statistics.userProfile');
  const session = await getTypedSession();
  const { locale, userId } = await params;

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
    },
  });

  if (!user) {
    notFound();
  }

  const displayName = user.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user.name || user.email;

  const [userStats, caseHistory, examTypeStats] = await Promise.all([
    getUserStatistics({ userIds: [userId] }),
    getUserCaseHistory(userId),
    getUserExamTypeStats(userId),
  ]);

  const userStat = userStats[0];

  return (
    <div className='space-y-6 py-6 px-12 mx-auto'>
      <div className='flex items-center justify-between'>
        <div>
          <div className='flex items-center gap-3 mb-2'>
            <Link href='/bestof-larib/statistics'>
              <Button variant='ghost' size='sm'>
                <ArrowLeft className='size-4 mr-2' />
                {t('backToStatistics')}
              </Button>
            </Link>
          </div>
          <h1 className='text-2xl font-semibold'>{displayName}</h1>
          <p className='text-sm text-muted-foreground'>{user.email}</p>
          {user.position && <p className='text-sm text-muted-foreground'>{user.position}</p>}
        </div>
      </div>

      {userStat && (
        <div className='grid gap-4 md:grid-cols-4'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                {t('stats.totalCompleted')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {userStat.uniqueCasesCompleted}
                <span className='text-sm font-normal text-muted-foreground ml-2'>
                  ({userStat.totalAttempts} attempts)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                {t('stats.beginner')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {userStat.completedByDifficulty.beginner.uniqueCases}
                <span className='text-sm font-normal text-muted-foreground ml-2'>
                  ({userStat.completedByDifficulty.beginner.totalAttempts} attempts)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                {t('stats.intermediate')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {userStat.completedByDifficulty.intermediate.uniqueCases}
                <span className='text-sm font-normal text-muted-foreground ml-2'>
                  ({userStat.completedByDifficulty.intermediate.totalAttempts} attempts)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                {t('stats.advanced')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {userStat.completedByDifficulty.advanced.uniqueCases}
                <span className='text-sm font-normal text-muted-foreground ml-2'>
                  ({userStat.completedByDifficulty.advanced.totalAttempts} attempts)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>{t('examTypeStats.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <UserExamTypeWidget examTypeStats={examTypeStats} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('caseHistory.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <UserCaseHistory caseHistory={caseHistory} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
