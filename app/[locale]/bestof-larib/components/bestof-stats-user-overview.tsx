'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Pie, PieChart, Cell, Legend } from 'recharts';
import { ChevronDown, ChevronUp, Calendar, CheckCircle2 } from 'lucide-react';
import type { UserOverviewStatistics } from '@/lib/services/bestof-larib-stats';

type UserOverviewProps = {
  stats: UserOverviewStatistics;
  translations: {
    totalActiveUsers: string;
    usersLast30Days: string;
    usersByPosition: string;
    noData: string;
    showDetails?: string;
    hideDetails?: string;
    lastActivity?: string;
    casesCompleted?: string;
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

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function BestofStatsUserOverview({ stats, translations }: UserOverviewProps) {
  const [isOpen, setIsOpen] = useState(false);

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
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {translations.usersLast30Days}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.usersLast30Days}</div>
              {stats.activeUsersLast30Days.length > 0 && (
                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <span>{isOpen ? (translations.hideDetails || 'Hide details') : (translations.showDetails || 'Show details')}</span>
                  {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </CollapsibleTrigger>
              )}
            </div>
            <CollapsibleContent>
              <div className="border-t pt-3 mt-1 max-h-[300px] overflow-y-auto">
                <div className="space-y-2">
                  {stats.activeUsersLast30Days.map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate">{user.userName}</span>
                        {user.userPosition && (
                          <span className="text-xs text-muted-foreground truncate">{user.userPosition}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0 ml-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="size-3" />
                          <span>{formatDate(user.lastActivityDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="size-3" />
                          <span>
                            {user.casesCompletedOnThatDay} {translations.casesCompleted || 'cases'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>

      <UsersPieChart
        title={translations.usersByPosition}
        data={stats.usersByPosition}
        noDataMessage={translations.noData}
      />
    </div>
  );
}
