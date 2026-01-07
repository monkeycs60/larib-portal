import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/app/i18n/navigation';
import { Eye } from 'lucide-react';
import type { UserStatistics } from '@/lib/services/bestof-larib-stats';

type StatsUserTableProps = {
  userStats: UserStatistics[];
  translations: {
    user: string;
    position: string;
    totalCompleted: string;
    casesByType: string;
    beginner: string;
    intermediate: string;
    advanced: string;
    lastActivity: string;
    daysSince: string;
    regularity: string;
    perWeek: string;
    noCasesCompleted: string;
    viewProfile: string;
    activity: {
      veryActive: string;
      active: string;
      inactive: string;
    };
  };
};

export default function BestofStatsUserTable({ userStats, translations }: StatsUserTableProps) {
  const getActivityBadge = (daysSince: number | null) => {
    if (daysSince === null) {
      return <Badge variant='outline'>{translations.activity.inactive}</Badge>;
    }
    if (daysSince <= 7) {
      return (
        <Badge className='bg-green-500 hover:bg-green-600 text-white'>
          {translations.activity.veryActive}
        </Badge>
      );
    }
    if (daysSince <= 30) {
      return (
        <Badge className='bg-rose-500 hover:bg-rose-600 text-white'>
          {translations.activity.active}
        </Badge>
      );
    }
    return <Badge variant='destructive'>{translations.activity.inactive}</Badge>;
  };

  const formatCasesByType = (completedByExamType: Record<string, { uniqueCases: number; totalAttempts: number; name: string }>) => {
    const entries = Object.values(completedByExamType);
    if (entries.length === 0) return '—';
    return entries.map((entry) => `${entry.name}: ${entry.uniqueCases ?? 0}`).join(' ');
  };

  if (userStats.length === 0) {
    return (
      <div className='text-center py-12'>
        <p className='text-muted-foreground'>{translations.noCasesCompleted}</p>
      </div>
    );
  }

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{translations.user}</TableHead>
            <TableHead>{translations.position}</TableHead>
            <TableHead className='text-right'>{translations.totalCompleted}</TableHead>
            <TableHead>{translations.casesByType}</TableHead>
            <TableHead className='text-right'>{translations.beginner}</TableHead>
            <TableHead className='text-right'>{translations.intermediate}</TableHead>
            <TableHead className='text-right'>{translations.advanced}</TableHead>
            <TableHead>{translations.lastActivity}</TableHead>
            <TableHead className='text-right'>{translations.daysSince}</TableHead>
            <TableHead>{translations.activity.veryActive}</TableHead>
            <TableHead className='text-right'>{translations.viewProfile}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {userStats.map((userStat) => (
            <TableRow key={userStat.userId}>
              <TableCell>
                <div>
                  <div className='font-medium'>{userStat.userName}</div>
                  <div className='text-xs text-muted-foreground'>{userStat.userEmail}</div>
                </div>
              </TableCell>
              <TableCell>
                <span className='text-sm'>{userStat.userPosition || '—'}</span>
              </TableCell>
              <TableCell className='text-right font-semibold'>{userStat.uniqueCasesCompleted}</TableCell>
              <TableCell>
                <span className='text-sm'>{formatCasesByType(userStat.completedByExamType)}</span>
              </TableCell>
              <TableCell className='text-right'>{userStat.completedByDifficulty.beginner.uniqueCases ?? 0}</TableCell>
              <TableCell className='text-right'>{userStat.completedByDifficulty.intermediate.uniqueCases ?? 0}</TableCell>
              <TableCell className='text-right'>{userStat.completedByDifficulty.advanced.uniqueCases ?? 0}</TableCell>
              <TableCell>
                {userStat.lastCompletedAt ? (
                  <span className='text-sm'>{new Date(userStat.lastCompletedAt).toLocaleDateString()}</span>
                ) : (
                  <span className='text-sm text-muted-foreground'>—</span>
                )}
              </TableCell>
              <TableCell className='text-right'>
                {userStat.daysSinceLastActivity !== null ? (
                  <span className='text-sm'>{userStat.daysSinceLastActivity}d</span>
                ) : (
                  <span className='text-sm text-muted-foreground'>—</span>
                )}
              </TableCell>
              <TableCell>{getActivityBadge(userStat.daysSinceLastActivity)}</TableCell>
              <TableCell className='text-right'>
                <Link href={`/bestof-larib/statistics/users/${userStat.userId}`}>
                  <Button variant='ghost' size='sm'>
                    <Eye className='size-4 mr-2' />
                    {translations.viewProfile}
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
