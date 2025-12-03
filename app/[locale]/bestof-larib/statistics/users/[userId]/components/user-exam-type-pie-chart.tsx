'use client';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell, Legend } from 'recharts';
import type { UserExamTypeStats } from '@/lib/services/bestof-larib-stats';

type UserExamTypePieChartProps = {
  examTypeStats: UserExamTypeStats[];
  translations: {
    title: string;
    noData: string;
  };
};

type PieChartData = {
  name: string;
  value: number;
  color: string;
};

const COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(142, 76%, 36%)',
  'hsl(24, 90%, 55%)',
  'hsl(262, 83%, 58%)',
  'hsl(340, 82%, 52%)',
  'hsl(199, 89%, 48%)',
];

export default function UserExamTypePieChart({ examTypeStats, translations }: UserExamTypePieChartProps) {
  const data: PieChartData[] = examTypeStats.map((stat, index) => ({
    name: stat.examTypeName,
    value: stat.completed,
    color: COLORS[index % COLORS.length],
  }));

  const hasData = data.length > 0 && data.some((item) => item.value > 0);

  const chartConfig: ChartConfig = data.reduce((config, item, index) => {
    config[`item${index}`] = {
      label: item.name,
      color: item.color,
    };
    return config;
  }, {} as ChartConfig);

  if (!hasData) {
    return (
      <div className="h-[180px] flex items-center justify-center text-muted-foreground text-xs">
        {translations.noData}
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[180px] w-full">
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
          cy="40%"
          innerRadius={30}
          outerRadius={55}
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
            fontSize: '10px',
            paddingTop: '4px',
            lineHeight: '1.3'
          }}
          iconType="circle"
          iconSize={5}
          formatter={(value) => <span className="text-foreground text-[10px]">{value}</span>}
        />
      </PieChart>
    </ChartContainer>
  );
}
