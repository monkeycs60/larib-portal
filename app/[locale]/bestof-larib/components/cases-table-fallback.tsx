'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/app/i18n/navigation';
import { Eye, Pencil, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useBestofCasesCache } from '@/lib/stores/bestof-cases-cache';
import { formatRelativeTime } from '@/lib/utils';
import CaseDifficultyCell from './case-difficulty-cell';
import CaseTagCell from './case-tag-cell';
import StartNewAttemptLink from './start-new-attempt-link';
import CreateCaseDialog from './create-case-dialog';
import DeleteCaseButton from './delete-case-button';
import SortHeader from './sort-header';
import type { ExamType, DiseaseTag } from '@/lib/services/bestof-larib';

export type CasesTableTranslations = {
  table: {
    status: string;
    name: string;
    examType: string;
    disease: string;
    difficulty: string;
    createdAt: string;
    firstCompletion: string;
    attempts: string;
    myDifficulty: string;
    adminTags: string;
    userTags: string;
    actions: string;
  };
  status: {
    published: string;
    draft: string;
    completed: string;
    inProgress: string;
    notStarted: string;
  };
  difficulty: {
    beginner: string;
    intermediate: string;
    advanced: string;
  };
  actions: {
    view: string;
    edit: string;
    startNewAttempt: string;
  };
  empty: string;
  t: (key: string, values?: Record<string, number>) => string;
};

type AdminTag = { id: string; name: string; color: string; description: string | null };

export default function CasesTableFallback({
  cacheKeyString,
  isAdmin,
  userId,
  columnCount,
  translations,
  examTypes,
  diseaseTags,
  adminTags,
  sortField,
  sortDirection,
}: {
  cacheKeyString: string;
  isAdmin: boolean;
  userId: string | null;
  columnCount: number;
  translations: CasesTableTranslations;
  examTypes: ExamType[];
  diseaseTags: DiseaseTag[];
  adminTags: AdminTag[];
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}) {
  const cachedCases = useBestofCasesCache((state) => state.entries.get(cacheKeyString));
  const isUserView = Boolean(userId) && !isAdmin;

  if (!cachedCases) {
    return (
      <div className='rounded-md border'>
        <div
          className='grid gap-4 border-b bg-muted/30 p-3'
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columnCount }).map((_, index) => (
            <Skeleton key={index} className='h-4 w-full' />
          ))}
        </div>
        <div>
          {Array.from({ length: 8 }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className='grid gap-4 border-b p-3'
              style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columnCount }).map((__, cellIndex) => (
                <Skeleton key={cellIndex} className='h-4 w-full' />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='relative rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortHeader field='status' label={translations.table.status} activeField={sortField} direction={sortDirection} />
            </TableHead>
            <TableHead>
              <SortHeader field='name' label={translations.table.name} activeField={sortField} direction={sortDirection} />
            </TableHead>
            <TableHead>
              <SortHeader field='examType' label={translations.table.examType} activeField={sortField} direction={sortDirection} />
            </TableHead>
            {isAdmin ? (
              <TableHead>
                <SortHeader field='diseaseTag' label={translations.table.disease} activeField={sortField} direction={sortDirection} />
              </TableHead>
            ) : null}
            {isAdmin ? (
              <TableHead>
                <SortHeader field='difficulty' label={translations.table.difficulty} activeField={sortField} direction={sortDirection} />
              </TableHead>
            ) : null}
            <TableHead>
              <SortHeader field='createdAt' label={translations.table.createdAt} activeField={sortField} direction={sortDirection} />
            </TableHead>
            {isUserView ? (
              <TableHead>
                <SortHeader field='firstCompletedAt' label={translations.table.firstCompletion} activeField={sortField} direction={sortDirection} />
              </TableHead>
            ) : null}
            {isUserView ? (
              <TableHead>
                <SortHeader field='attempts' label={translations.table.attempts} activeField={sortField} direction={sortDirection} />
              </TableHead>
            ) : null}
            {isUserView ? (
              <TableHead>
                <SortHeader field='personalDifficulty' label={translations.table.myDifficulty} activeField={sortField} direction={sortDirection} />
              </TableHead>
            ) : null}
            <TableHead>{isAdmin ? translations.table.adminTags : translations.table.userTags}</TableHead>
            <TableHead className='text-right'>{translations.table.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cachedCases.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={
                  6 + (isAdmin ? 1 : 0) + (isUserView ? 2 : 0) + 2
                }
                className='text-center text-sm text-muted-foreground'
              >
                {translations.empty}
              </TableCell>
            </TableRow>
          ) : (
            cachedCases.map((caseItem) => {
              const statusBadge = (() => {
                if (!isUserView) {
                  const adminBadgeClass =
                    caseItem.status === 'PUBLISHED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200';
                  const adminLabel =
                    caseItem.status === 'PUBLISHED'
                      ? translations.status.published
                      : translations.status.draft;
                  return (
                    <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${adminBadgeClass}`}>
                      {adminLabel}
                    </Badge>
                  );
                }
                if (caseItem.userAttemptState?.hasValidatedAttempt) {
                  return (
                    <Badge className='rounded-full px-3 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200'>
                      {translations.status.completed}
                    </Badge>
                  );
                }
                if (caseItem.userAttemptState?.hasDraftAttempt) {
                  return (
                    <Badge className='rounded-full px-3 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200'>
                      {translations.status.inProgress}
                    </Badge>
                  );
                }
                return (
                  <Badge className='rounded-full px-3 py-1 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200'>
                    {translations.status.notStarted}
                  </Badge>
                );
              })();

              return (
                <TableRow key={caseItem.id}>
                  <TableCell>{statusBadge}</TableCell>
                  <TableCell className='font-medium'>{caseItem.name}</TableCell>
                  <TableCell>{caseItem.examType?.name ?? '-'}</TableCell>
                  {isAdmin ? (
                    <TableCell>
                      {caseItem.diseaseTag?.name ? (
                        <Badge variant='secondary'>{caseItem.diseaseTag.name}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  ) : null}
                  {isAdmin ? (
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={
                          caseItem.difficulty === 'BEGINNER'
                            ? 'border-green-500 text-green-700'
                            : caseItem.difficulty === 'INTERMEDIATE'
                            ? 'border-amber-500 text-amber-700'
                            : 'border-red-500 text-red-700'
                        }
                      >
                        {translations.difficulty[
                          caseItem.difficulty === 'BEGINNER'
                            ? 'beginner'
                            : caseItem.difficulty === 'INTERMEDIATE'
                            ? 'intermediate'
                            : 'advanced'
                        ]}
                      </Badge>
                    </TableCell>
                  ) : null}
                  <TableCell>
                    {formatRelativeTime(caseItem.createdAt, translations.t)}
                  </TableCell>
                  {isUserView ? (
                    <TableCell>
                      {caseItem.firstCompletedAt
                        ? formatRelativeTime(caseItem.firstCompletedAt, translations.t)
                        : '-'}
                    </TableCell>
                  ) : null}
                  {isUserView ? (
                    <TableCell>{typeof caseItem.attemptsCount === 'number' ? caseItem.attemptsCount : 0}</TableCell>
                  ) : null}
                  {isUserView ? (
                    <TableCell>
                      <CaseDifficultyCell
                        key={`${caseItem.id}-${caseItem.personalDifficulty ?? 'unset'}`}
                        caseId={caseItem.id}
                        initialDifficulty={caseItem.personalDifficulty ?? null}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <CaseTagCell
                      mode={isAdmin ? 'admin' : 'user'}
                      caseId={caseItem.id}
                      initialTags={isAdmin ? caseItem.adminTags : caseItem.userTags}
                    />
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-wrap justify-end gap-2'>
                      <Link href={`/bestof-larib/${caseItem.id}`} prefetch className='inline-flex'>
                        <Button size='sm' variant='secondary' className='gap-1'>
                          <Eye />
                          {translations.actions.view}
                        </Button>
                      </Link>
                      {isUserView ? (
                        <StartNewAttemptLink
                          href={`/bestof-larib/${caseItem.id}?newAttempt=1`}
                          label={translations.actions.startNewAttempt}
                        >
                          <PlusCircle />
                        </StartNewAttemptLink>
                      ) : null}
                      {isAdmin ? (
                        <>
                          <span className='inline-flex'>
                            <CreateCaseDialog
                              examTypes={examTypes}
                              diseaseTags={diseaseTags}
                              isAdmin={isAdmin}
                              adminTags={adminTags}
                              clinicalCase={{
                                id: caseItem.id,
                                name: caseItem.name,
                                difficulty: caseItem.difficulty,
                                status: caseItem.status,
                                tags: caseItem.tags,
                                pdfUrl: caseItem.pdfUrl ?? null,
                                pdfKey: caseItem.pdfKey ?? null,
                                textContent: caseItem.textContent ?? null,
                                examType: caseItem.examType ?? null,
                                diseaseTag: caseItem.diseaseTag ?? null,
                                adminTags: caseItem.adminTags,
                              }}
                              trigger={
                                <Button size='sm' variant='outline' className='gap-1'>
                                  <Pencil />
                                  {translations.actions.edit}
                                </Button>
                              }
                            />
                          </span>
                          <span className='inline-flex'>
                            <DeleteCaseButton id={caseItem.id} />
                          </span>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
