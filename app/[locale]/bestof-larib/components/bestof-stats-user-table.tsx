import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { UserStatistics } from '@/lib/services/bestof-larib-stats';

type StatsUserTableProps = {
  userStats: UserStatistics[];
  translations: {
    user: string;
    totalCompleted: string;
    beginner: string;
    intermediate: string;
    advanced: string;
    lastActivity: string;
    daysSince: string;
    regularity: string;
    perWeek: string;
    noCasesCompleted: string;
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
        <Badge className='bg-orange-500 hover:bg-orange-600 text-white'>
          {translations.activity.active}
        </Badge>
      );
    }
    return <Badge variant='destructive'>{translations.activity.inactive}</Badge>;
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
            <TableHead className='text-right'>{translations.totalCompleted}</TableHead>
            <TableHead className='text-right'>{translations.beginner}</TableHead>
            <TableHead className='text-right'>{translations.intermediate}</TableHead>
            <TableHead className='text-right'>{translations.advanced}</TableHead>
            <TableHead>{translations.lastActivity}</TableHead>
            <TableHead className='text-right'>{translations.daysSince}</TableHead>
            <TableHead className='text-right'>{translations.regularity}</TableHead>
            <TableHead>{translations.activity.veryActive}</TableHead>
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
              <TableCell className='text-right font-semibold'>{userStat.totalCompleted}</TableCell>
              <TableCell className='text-right'>{userStat.completedByDifficulty.beginner}</TableCell>
              <TableCell className='text-right'>{userStat.completedByDifficulty.intermediate}</TableCell>
              <TableCell className='text-right'>{userStat.completedByDifficulty.advanced}</TableCell>
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
              <TableCell className='text-right'>
                <span className='text-sm'>
                  {userStat.regularityPerWeek} {translations.perWeek}
                </span>
              </TableCell>
              <TableCell>{getActivityBadge(userStat.daysSinceLastActivity)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
