import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GlobalStatistics } from '@/lib/services/bestof-larib-stats';

type StatsOverviewProps = {
  stats: GlobalStatistics;
  translations: {
    totalCases: string;
    activeUsers: string;
    avgPerUser: string;
    mostPracticed: string;
  };
};

export default function BestofStatsOverview({ stats, translations }: StatsOverviewProps) {
  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium text-muted-foreground'>{translations.totalCases}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-semibold'>{stats.totalCasesCompleted}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium text-muted-foreground'>{translations.activeUsers}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-semibold'>{stats.totalUniqueUsers}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium text-muted-foreground'>{translations.avgPerUser}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-semibold'>{stats.averageCasesPerUser}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium text-muted-foreground'>{translations.mostPracticed}</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.mostPracticedCase ? (
            <>
              <div className='text-lg font-semibold truncate'>{stats.mostPracticedCase.name}</div>
              <div className='text-sm text-muted-foreground'>
                {stats.mostPracticedCase.completionCount} completions
              </div>
            </>
          ) : (
            <div className='text-sm text-muted-foreground'>—</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
