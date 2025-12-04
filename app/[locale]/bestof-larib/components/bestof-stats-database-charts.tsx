'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell, Legend } from 'recharts';
import type { DatabaseStatistics } from '@/lib/services/bestof-larib-stats';

type DatabaseChartsProps = {
  stats: DatabaseStatistics;
  translations: {
    casesByExamType: string;
    casesByDifficulty: string;
    casesByStatus: string;
    casesByDiagnosis: string;
    totalCases: string;
    totalExamTypes: string;
    totalDiagnoses: string;
    totalAdminTags: string;
    noData: string;
    cases: string;
    beginner: string;
    intermediate: string;
    advanced: string;
    draft: string;
    published: string;
    completed: string;
  };
};

type PieChartData = {
  name: string;
  value: number;
  color: string;
};

function StatsPieChart({
  title,
  description,
  data,
  noDataMessage,
}: {
  title: string;
  description: string;
  data: PieChartData[];
  noDataMessage: string;
}) {
  const hasData = data.length > 0 && data.some((item) => item.value > 0);

  const chartConfig: ChartConfig = data.reduce((config, item, index) => {
    config[`item${index}`] = {
      label: item.name,
      color: item.color,
    };
    return config;
  }, {} as ChartConfig);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-6">
        {hasData ? (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[280px] w-full">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => value}
                    formatter={(value, name) => (
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{value}</span>
                        <span className="text-muted-foreground">—</span>
                        <span>{name}</span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={45}
                outerRadius={85}
                paddingAngle={2}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                  />
                ))}
              </Pie>
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{
                  fontSize: '12px',
                  paddingTop: '12px',
                  lineHeight: '1.6'
                }}
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-foreground text-xs font-medium">{value}</span>}
              />
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
            {noDataMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DatabaseSummaryCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function BestofStatsDatabaseCharts({ stats, translations }: DatabaseChartsProps) {
  const difficultyData = stats.casesByDifficulty.map((item) => ({
    ...item,
    name:
      item.name === 'BEGINNER'
        ? translations.beginner
        : item.name === 'INTERMEDIATE'
          ? translations.intermediate
          : translations.advanced,
  }));

  return (
    <div className="space-y-6">
      <div className="w-full md:w-64">
        <Card className="bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{translations.totalCases}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-4xl font-bold">{stats.totalCases}</div>
            <div className="text-sm text-muted-foreground">{stats.totalCompletedCases} {translations.completed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatsPieChart
          title={translations.casesByExamType}
          description={`${stats.casesByExamType.reduce((sum, item) => sum + item.value, 0)} ${translations.cases}`}
          data={stats.casesByExamType}
          noDataMessage={translations.noData}
        />
        <StatsPieChart
          title={translations.casesByDiagnosis}
          description={`${stats.casesByDiagnosis.reduce((sum, item) => sum + item.value, 0)} ${translations.cases}`}
          data={stats.casesByDiagnosis}
          noDataMessage={translations.noData}
        />
        <StatsPieChart
          title={translations.casesByDifficulty}
          description={`${stats.casesByDifficulty.reduce((sum, item) => sum + item.value, 0)} ${translations.cases}`}
          data={difficultyData}
          noDataMessage={translations.noData}
        />
      </div>
    </div>
  );
}
