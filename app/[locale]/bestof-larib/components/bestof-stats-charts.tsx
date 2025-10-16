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
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import type { UserStatistics, UserCompletionTrend } from '@/lib/services/bestof-larib-stats';

const COLORS = {
  beginner: 'hsl(142, 76%, 36%)',
  intermediate: 'hsl(38, 92%, 50%)',
  advanced: 'hsl(0, 84%, 60%)',
  primary: 'hsl(221, 83%, 53%)',
  secondary: 'hsl(262, 83%, 58%)',
};

type StatsChartsProps = {
  userStats: UserStatistics[];
  userTrendData: UserCompletionTrend[];
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

export default function BestofStatsCharts({ userStats, userTrendData, translations }: StatsChartsProps) {
  const topUsers = userStats.slice(0, 10);

  const topUsersData = topUsers.map((user) => ({
    name: user.userName.length > 20 ? `${user.userName.substring(0, 17)}...` : user.userName,
    total: user.uniqueCasesCompleted ?? 0,
  }));

  const topUsersConfig: ChartConfig = {
    total: {
      label: 'Cases',
      color: COLORS.primary,
    },
  };

  const distributionData = userStats.reduce(
    (accumulator, user) => {
      accumulator[0].value += user.completedByDifficulty.beginner.uniqueCases ?? 0;
      accumulator[1].value += user.completedByDifficulty.intermediate.uniqueCases ?? 0;
      accumulator[2].value += user.completedByDifficulty.advanced.uniqueCases ?? 0;
      return accumulator;
    },
    [
      { difficulty: translations.beginner, value: 0, fill: COLORS.beginner },
      { difficulty: translations.intermediate, value: 0, fill: COLORS.intermediate },
      { difficulty: translations.advanced, value: 0, fill: COLORS.advanced },
    ],
  );

  const distributionConfig: ChartConfig = {
    value: {
      label: 'Cases',
    },
    beginner: {
      label: translations.beginner,
      color: COLORS.beginner,
    },
    intermediate: {
      label: translations.intermediate,
      color: COLORS.intermediate,
    },
    advanced: {
      label: translations.advanced,
      color: COLORS.advanced,
    },
  };

  // Transform user trend data into format suitable for multi-line chart
  const allPeriods = new Set<string>();
  userTrendData.forEach((userTrend) => {
    userTrend.trends.forEach((trend) => allPeriods.add(trend.period));
  });

  const sortedPeriods = Array.from(allPeriods).sort();

  const trendChartData = sortedPeriods.map((period) => {
    const dataPoint: Record<string, string | number> = { period };
    userTrendData.forEach((userTrend) => {
      const trendEntry = userTrend.trends.find((t) => t.period === period);
      dataPoint[userTrend.userId] = trendEntry?.cumulativeCount ?? 0;
    });
    return dataPoint;
  });

  const trendConfig: ChartConfig = userTrendData.reduce<ChartConfig>((config, userTrend) => {
    config[userTrend.userId] = {
      label: userTrend.userName,
      color: userTrend.color,
    };
    return config;
  }, {});

  return (
    <div className='grid gap-6 md:grid-cols-2'>
      <Card>
        <CardHeader>
          <CardTitle>{translations.topUsers}</CardTitle>
        </CardHeader>
        <CardContent>
          {topUsersData.length > 0 ? (
            <ChartContainer config={topUsersConfig} className='h-[400px] w-full'>
              <BarChart data={topUsersData} layout='vertical' margin={{ left: 10, right: 20 }}>
                <defs>
                  <linearGradient id='colorGradient' x1='0' y1='0' x2='1' y2='0'>
                    <stop offset='0%' stopColor={COLORS.primary} />
                    <stop offset='100%' stopColor={COLORS.secondary} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray='5 5'
                  stroke='hsl(240 5% 84%)'
                  strokeOpacity={0.3}
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  type='number'
                  stroke='hsl(240 5% 65%)'
                  tick={{ fill: 'hsl(240 5% 45%)', fontSize: 12 }}
                  axisLine={{ strokeWidth: 1.5 }}
                />
                <YAxis
                  dataKey='name'
                  type='category'
                  width={120}
                  stroke='hsl(240 5% 65%)'
                  tick={{ fill: 'hsl(240 5% 45%)', fontSize: 12 }}
                  axisLine={{ strokeWidth: 1.5 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey='total'
                  fill='url(#colorGradient)'
                  radius={8}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className='h-[400px] flex items-center justify-center text-muted-foreground'>
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
            <ChartContainer config={distributionConfig} className='h-[400px] w-full'>
              <BarChart data={distributionData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <defs>
                  <linearGradient id='beginnerGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='hsl(142, 76%, 46%)' />
                    <stop offset='100%' stopColor='hsl(142, 76%, 36%)' />
                  </linearGradient>
                  <linearGradient id='intermediateGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='hsl(38, 92%, 60%)' />
                    <stop offset='100%' stopColor='hsl(38, 92%, 50%)' />
                  </linearGradient>
                  <linearGradient id='advancedGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='hsl(0, 84%, 70%)' />
                    <stop offset='100%' stopColor='hsl(0, 84%, 60%)' />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray='5 5'
                  stroke='hsl(240 5% 84%)'
                  strokeOpacity={0.3}
                />
                <XAxis
                  dataKey='difficulty'
                  stroke='hsl(240 5% 65%)'
                  tick={{ fill: 'hsl(240 5% 45%)', fontSize: 12 }}
                  axisLine={{ strokeWidth: 1.5 }}
                />
                <YAxis
                  stroke='hsl(240 5% 65%)'
                  tick={{ fill: 'hsl(240 5% 45%)', fontSize: 12 }}
                  axisLine={{ strokeWidth: 1.5 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey='value' radius={8}>
                  {distributionData.map((entry, index) => {
                    const gradientId =
                      index === 0
                        ? 'beginnerGradient'
                        : index === 1
                          ? 'intermediateGradient'
                          : 'advancedGradient';
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#${gradientId})`}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className='h-[400px] flex items-center justify-center text-muted-foreground'>
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
          {trendChartData.length > 0 && userTrendData.length > 0 ? (
            <ChartContainer config={trendConfig} className='h-[400px] w-full'>
              <LineChart data={trendChartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id='areaGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='hsl(221, 83%, 53%)' stopOpacity={0.1} />
                    <stop offset='100%' stopColor='hsl(221, 83%, 53%)' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray='5 5'
                  stroke='hsl(240 5% 84%)'
                  strokeOpacity={0.3}
                />
                <XAxis
                  dataKey='period'
                  stroke='hsl(240 5% 65%)'
                  tick={{ fill: 'hsl(240 5% 45%)', fontSize: 12 }}
                  axisLine={{ strokeWidth: 1.5 }}
                />
                <YAxis
                  stroke='hsl(240 5% 65%)'
                  tick={{ fill: 'hsl(240 5% 45%)', fontSize: 12 }}
                  axisLine={{ strokeWidth: 1.5 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {userTrendData.map((userTrend) => (
                  <Line
                    key={userTrend.userId}
                    type='monotone'
                    dataKey={userTrend.userId}
                    stroke={userTrend.color}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: 'white', stroke: userTrend.color }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          ) : (
            <div className='h-[400px] flex items-center justify-center text-muted-foreground'>
              No data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
