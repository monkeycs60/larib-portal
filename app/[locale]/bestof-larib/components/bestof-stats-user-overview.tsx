'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell, Legend } from 'recharts';
import type { UserOverviewStatistics } from '@/lib/services/bestof-larib-stats';

type UserOverviewProps = {
  stats: UserOverviewStatistics;
  translations: {
    totalActiveUsers: string;
    usersLast30Days: string;
    usersByPosition: string;
    noData: string;
  };
};

type PieChartData = {
  name: string;
  value: number;
  color: string;
};

function UsersPieChart({
  title,
  data,
  noDataMessage,
}: {
  title: string;
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
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        {hasData ? (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[200px] w-full">
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
                innerRadius={35}
                outerRadius={65}
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
                  fontSize: '11px',
                  paddingTop: '8px',
                  lineHeight: '1.4'
                }}
                iconType="circle"
                iconSize={6}
                formatter={(value) => <span className="text-foreground text-xs">{value}</span>}
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

export default function BestofStatsUserOverview({ stats, translations }: UserOverviewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            {translations.totalActiveUsers}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalActiveUsers}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            {translations.usersLast30Days}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.usersLast30Days}</div>
        </CardContent>
      </Card>

      <UsersPieChart
        title={translations.usersByPosition}
        data={stats.usersByPosition}
        noDataMessage={translations.noData}
      />
    </div>
  );
}
