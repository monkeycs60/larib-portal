'use client';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { UserCompletionTrend } from '@/lib/services/bestof-larib-stats';

type CompletionTrendProps = {
  userTrendData: UserCompletionTrend[];
  translations: {
    noData: string;
  };
};

export default function BestofStatsCompletionTrend({ userTrendData, translations }: CompletionTrendProps) {
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

  if (trendChartData.length === 0 || userTrendData.length === 0) {
    return (
      <div className='h-[400px] flex items-center justify-center text-muted-foreground'>
        {translations.noData}
      </div>
    );
  }

  return (
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
  );
}
