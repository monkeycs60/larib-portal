import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/app/i18n/navigation';
import { Eye } from 'lucide-react';
import type { UserCaseHistoryItem } from '@/lib/services/bestof-larib-stats';

type UserCaseHistoryProps = {
  caseHistory: UserCaseHistoryItem[];
  userId: string;
};

export default function UserCaseHistory({ caseHistory, userId }: UserCaseHistoryProps) {
  const getDifficultyBadge = (difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') => {
    const variants = {
      BEGINNER: { variant: 'outline' as const, label: 'Beginner', color: 'text-green-600' },
      INTERMEDIATE: { variant: 'outline' as const, label: 'Intermediate', color: 'text-yellow-600' },
      ADVANCED: { variant: 'outline' as const, label: 'Advanced', color: 'text-red-600' },
    };

    const config = variants[difficulty];
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getLevelIndicator = (level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null) => {
    if (!level) return <span className='text-muted-foreground text-xs'>—</span>;

    const variants = {
      BEGINNER: 'bg-green-500',
      INTERMEDIATE: 'bg-yellow-500',
      ADVANCED: 'bg-red-500',
    };

    return <div className={`size-2.5 rounded-full ${variants[level]}`} />;
  };

  const attemptCountsByCaseId = caseHistory.reduce<Record<string, number>>((acc, item) => {
    acc[item.caseId] = (acc[item.caseId] || 0) + 1;
    return acc;
  }, {});

  const caseAttemptNumbers: Record<string, number> = {};
  const sortedHistory = [...caseHistory];
  for (const item of sortedHistory) {
    if (!caseAttemptNumbers[item.caseId]) {
      caseAttemptNumbers[item.caseId] = 1;
    }
  }

  const getAttemptNumber = (item: UserCaseHistoryItem, index: number): number => {
    const itemsOfSameCase = sortedHistory.filter((h) => h.caseId === item.caseId);
    const itemIndex = itemsOfSameCase.findIndex((h) => h.attemptId === item.attemptId);
    return itemsOfSameCase.length - itemIndex;
  };

  if (caseHistory.length === 0) {
    return (
      <div className='text-center py-6 text-muted-foreground'>
        No case history available
      </div>
    );
  }

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Case Name</TableHead>
            <TableHead>Exam Type</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Submitted Date</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {caseHistory.slice(0, 10).map((item, index) => {
            const totalAttempts = attemptCountsByCaseId[item.caseId];
            const attemptNumber = getAttemptNumber(item, index);
            const showBadge = totalAttempts > 1;

            return (
              <TableRow key={item.attemptId}>
                <TableCell>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>{item.caseName}</span>
                    {showBadge && (
                      <Badge variant='secondary' className='text-xs'>
                        #{attemptNumber}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className='text-sm'>{item.examType || '—'}</span>
                </TableCell>
                <TableCell>{getDifficultyBadge(item.difficulty)}</TableCell>
                <TableCell>
                  <div className='flex items-center justify-center'>
                    {getLevelIndicator(item.personalDifficulty)}
                  </div>
                </TableCell>
                <TableCell>
                  <span className='text-sm'>{new Date(item.submittedAt).toLocaleDateString()}</span>
                </TableCell>
                <TableCell className='text-right'>
                  <Link href={`/bestof-larib/statistics/users/${userId}/attempts/${item.attemptId}`}>
                    <Button variant='ghost' size='sm'>
                      <Eye className='size-4 mr-2' />
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {caseHistory.length > 10 && (
        <div className='p-4 text-center text-sm text-muted-foreground'>
          Showing 10 most recent attempts out of {caseHistory.length} total
        </div>
      )}
    </div>
  );
}
