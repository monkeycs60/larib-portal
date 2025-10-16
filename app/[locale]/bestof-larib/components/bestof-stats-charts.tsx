'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { UserStatistics, CaseCompletionTrend } from '@/lib/services/bestof-larib-stats';

type StatsChartsProps = {
  userStats: UserStatistics[];
  trendData: CaseCompletionTrend[];
  translations: {
    byCategory: string;
    overTime: string;
    topUsers: string;
    distribution: string;
    beginner: string;
    intermediate: string;
    advanced: string;
  };
};

export default function BestofStatsCharts({ userStats, trendData, translations }: StatsChartsProps) {
  const topUsers = userStats.slice(0, 10);

  const topUsersData = topUsers.map((user) => ({
    name: user.userName.length > 20 ? `${user.userName.substring(0, 17)}...` : user.userName,
    total: user.totalCompleted,
  }));

  const topUsersConfig: ChartConfig = {
    total: {
      label: 'Cases',
      color: 'hsl(var(--chart-1))',
    },
  };

  const distributionData = userStats.reduce(
    (accumulator, user) => {
      accumulator[0].value += user.completedByDifficulty.beginner;
      accumulator[1].value += user.completedByDifficulty.intermediate;
      accumulator[2].value += user.completedByDifficulty.advanced;
      return accumulator;
    },
    [
      { difficulty: translations.beginner, value: 0, fill: 'hsl(var(--chart-1))' },
      { difficulty: translations.intermediate, value: 0, fill: 'hsl(var(--chart-2))' },
      { difficulty: translations.advanced, value: 0, fill: 'hsl(var(--chart-3))' },
    ],
  );

  const distributionConfig: ChartConfig = {
    value: {
      label: 'Cases',
    },
    beginner: {
      label: translations.beginner,
      color: 'hsl(var(--chart-1))',
    },
    intermediate: {
      label: translations.intermediate,
      color: 'hsl(var(--chart-2))',
    },
    advanced: {
      label: translations.advanced,
      color: 'hsl(var(--chart-3))',
    },
  };

  const trendChartData = trendData.map((trend) => ({
    period: trend.period,
    count: trend.count,
  }));

  const trendConfig: ChartConfig = {
    count: {
      label: 'Cases',
      color: 'hsl(var(--chart-1))',
    },
  };

  return (
    <div className='grid gap-6 md:grid-cols-2'>
      <Card>
        <CardHeader>
          <CardTitle>{translations.topUsers}</CardTitle>
        </CardHeader>
        <CardContent>
          {topUsersData.length > 0 ? (
            <ChartContainer config={topUsersConfig} className='h-[300px] w-full'>
              <BarChart data={topUsersData} layout='vertical'>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis type='number' />
                <YAxis dataKey='name' type='category' width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey='total' fill='var(--color-total)' radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className='h-[300px] flex items-center justify-center text-muted-foreground'>
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{translations.distribution}</CardTitle>
        </CardHeader>
        <CardContent>
          {distributionData.some((d) => d.value > 0) ? (
            <ChartContainer config={distributionConfig} className='h-[300px] w-full'>
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='difficulty' />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey='value' fill='var(--color-value)' radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className='h-[300px] flex items-center justify-center text-muted-foreground'>
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      <Card className='md:col-span-2'>
        <CardHeader>
          <CardTitle>{translations.overTime}</CardTitle>
        </CardHeader>
        <CardContent>
          {trendChartData.length > 0 ? (
            <ChartContainer config={trendConfig} className='h-[300px] w-full'>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='period' />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type='monotone' dataKey='count' stroke='var(--color-count)' strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className='h-[300px] flex items-center justify-center text-muted-foreground'>
              No data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
