import type { UserExamTypeStats } from '@/lib/services/bestof-larib-stats';
import { Progress } from '@/components/ui/progress';

type UserExamTypeWidgetProps = {
  examTypeStats: UserExamTypeStats[];
};

export default function UserExamTypeWidget({ examTypeStats }: UserExamTypeWidgetProps) {
  if (examTypeStats.length === 0) {
    return (
      <div className='text-center py-6 text-muted-foreground'>
        No exam type data available
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {examTypeStats.map((stat) => (
        <div key={stat.examTypeId} className='space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>{stat.examTypeName}</span>
            <span className='text-sm text-muted-foreground'>
              {stat.completed}/{stat.total} ({stat.percentage}%)
            </span>
          </div>
          <Progress value={stat.percentage} className='h-2' />
        </div>
      ))}
    </div>
  );
}
