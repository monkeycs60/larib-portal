import { getTranslations } from 'next-intl/server';
import { requireAuth } from '@/lib/auth-guard';
import { redirect, notFound } from 'next/navigation';
import { applicationLink } from '@/lib/application-link';
import { Link } from '@/app/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import AttemptReviewForm from './components/attempt-review-form';
import AttemptPanelWrapper from './components/attempt-panel-wrapper';
import { listUserTags } from '@/lib/services/bestof-larib-tags';

async function AttemptReviewPageContent({
  params,
}: {
  params: Promise<{ locale: string; userId: string; attemptId: string }>;
}) {
  const { locale, userId, attemptId } = await params;
  const t = await getTranslations({ locale, namespace: 'bestof.statistics.attemptReview' });
  const session = await requireAuth();

  if (!session || session.user.role !== 'ADMIN') {
    redirect(applicationLink(locale, '/bestof-larib'));
  }

  const [attempt, userCaseSettings, userTags] = await Promise.all([
    prisma.caseAttempt.findUnique({
      where: { id: attemptId },
      include: {
        c: {
          select: {
            id: true,
            name: true,
            pdfUrl: true,
            textContent: true,
            tags: true,
            createdAt: true,
            examType: {
              select: {
                id: true,
                name: true,
              },
            },
            diseaseTag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
    prisma.caseAttempt.findUnique({
      where: { id: attemptId },
      select: { caseId: true },
    }).then(async (att) => {
      if (!att) return null;
      return prisma.userCaseSettings.findUnique({
        where: {
          userId_caseId: {
            userId,
            caseId: att.caseId,
          },
        },
        select: {
          tags: true,
          comments: true,
          personalDifficulty: true,
        },
      });
    }),
    listUserTags(userId).then(rows => rows.map(r => ({ id: r.id, name: r.name, color: r.color, description: r.description ?? null }))),
  ]);

  if (!attempt || attempt.userId !== userId) {
    notFound();
  }

  const [allAttemptsForCase, userTagIds] = await Promise.all([
    prisma.caseAttempt.findMany({
      where: {
        userId,
        caseId: attempt.caseId,
        validatedAt: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        validatedAt: true,
        createdAt: true,
        lvef: true,
        kinetic: true,
        lgePresent: true,
        lgeDetails: true,
        finalDx: true,
        report: true,
      },
    }),
    prisma.userTagOnCase.findMany({
      where: {
        caseId: attempt.caseId,
        tag: {
          userId,
        },
      },
      select: {
        userTagId: true,
      },
    }).then((rows: { userTagId: string }[]) => rows.map((r: { userTagId: string }) => r.userTagId)),
  ]);

  const currentIndex = allAttemptsForCase.findIndex((a) => a.id === attemptId);

  const userName = attempt.user.firstName
    ? `${attempt.user.firstName} ${attempt.user.lastName || ''}`.trim()
    : attempt.user.name || attempt.user.email;

  return (
    <div className='space-y-4 py-6 px-8 mx-auto'>
      <div>
        <div className='flex items-center gap-2 mb-2'>
          <Link href={`/bestof-larib/statistics/users/${userId}`}>
            <Button variant='ghost' size='sm'>
              <ArrowLeft className='size-4 mr-2' />
              {t('back')}
            </Button>
          </Link>
        </div>
        <h1 className='text-xl font-semibold mb-1'>{attempt.c.name}</h1>
        <div className='flex items-center gap-3 text-xs text-muted-foreground'>
          <span>{t('user')}: {userName}</span>
          <span>•</span>
          <span>{t('attempt')} {currentIndex + 1} / {allAttemptsForCase.length}</span>
          {attempt.validatedAt && (
            <>
              <span>•</span>
              <span>{t('submittedOn')}: {new Date(attempt.validatedAt).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>

      <div className='flex gap-4'>
        <div className='w-[320px] shrink-0'>
          <AttemptPanelWrapper
            userId={userId}
            caseId={attempt.caseId}
            createdAt={attempt.c.createdAt}
            tags={userCaseSettings?.tags ?? []}
            comments={userCaseSettings?.comments ?? ''}
            difficulty={(userCaseSettings?.personalDifficulty ?? '') as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | ''}
            userTags={userTags}
            userTagIds={userTagIds}
            attempts={allAttemptsForCase}
          />
        </div>
        <div className='flex-1'>
          <AttemptReviewForm attempt={attempt} />
        </div>
      </div>
    </div>
  );
}

export default async function AttemptReviewPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string; attemptId: string }>;
}) {
  return <AttemptReviewPageContent params={params} />;
}
