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
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        {hasData ? (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[200px]">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => value}
                    formatter={(value, name) => [value, name]}
                  />
                }
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
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
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                formatter={(value) => <span className="text-muted-foreground text-xs">{value}</span>}
              />
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
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

  const statusData = stats.casesByStatus.map((item) => ({
    ...item,
    name: item.name === 'DRAFT' ? translations.draft : translations.published,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <DatabaseSummaryCard title={translations.totalCases} value={stats.totalCases} />
        <DatabaseSummaryCard title={translations.totalExamTypes} value={stats.totalExamTypes} />
        <DatabaseSummaryCard title={translations.totalDiagnoses} value={stats.totalDiagnoses} />
        <DatabaseSummaryCard title={translations.totalAdminTags} value={stats.totalAdminTags} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsPieChart
          title={translations.casesByExamType}
          description={`${stats.casesByExamType.reduce((sum, item) => sum + item.value, 0)} ${translations.cases}`}
          data={stats.casesByExamType}
          noDataMessage={translations.noData}
        />
        <StatsPieChart
          title={translations.casesByDifficulty}
          description={`${stats.casesByDifficulty.reduce((sum, item) => sum + item.value, 0)} ${translations.cases}`}
          data={difficultyData}
          noDataMessage={translations.noData}
        />
        <StatsPieChart
          title={translations.casesByStatus}
          description={`${stats.casesByStatus.reduce((sum, item) => sum + item.value, 0)} ${translations.cases}`}
          data={statusData}
          noDataMessage={translations.noData}
        />
        <StatsPieChart
          title={translations.casesByDiagnosis}
          description={`${translations.cases}`}
          data={stats.casesByDiagnosis}
          noDataMessage={translations.noData}
        />
      </div>
    </div>
  );
}
