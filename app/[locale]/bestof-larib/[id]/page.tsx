import { getTranslations } from 'next-intl/server';
import { getCaseById } from '@/lib/services/bestof-larib';
import { Link } from '@/app/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { getTypedSession } from '@/lib/auth-helpers';
import WorkArea, { PrefillState } from './work-area';
import { getUserCaseState, listUserCaseAttempts } from '@/lib/services/bestof-larib-attempts'

export default async function CaseViewPage({
	params,
}: {
	params: { locale: string; id: string };
}) {
	const t = await getTranslations('bestof');
    const [c, session] = await Promise.all([
        getCaseById(params.id),
        getTypedSession(),
    ]);
    if (!c) return <div className='p-6'>{t('notFound')}</div>;

	const difficultyLabel =
		c.difficulty === 'BEGINNER'
			? 'beginner'
			: c.difficulty === 'INTERMEDIATE'
			? 'intermediate'
			: 'advanced';
	const isAdmin = (session?.user?.role ?? 'USER') === 'ADMIN';

    const userId = session?.user?.id
    const [prefill, attempts] = userId ? await Promise.all([
        getUserCaseState({ userId, caseId: c.id }).then(s => ({
            tags: s.settings?.tags ?? [],
            comments: s.settings?.comments ?? null,
            personalDifficulty: s.settings?.personalDifficulty ?? null,
            analysis: {
                lvef: s.lastAttempt?.lvef ?? undefined,
                kinetic: s.lastAttempt?.kinetic ?? undefined,
                lge: s.lastAttempt?.lge ?? undefined,
                finalDx: s.lastAttempt?.finalDx ?? undefined,
            },
            report: s.lastAttempt?.report ?? null,
            validatedAt: s.lastAttempt?.validatedAt ? new Date(s.lastAttempt.validatedAt).toISOString() : null,
        })),
        listUserCaseAttempts({ userId, caseId: c.id }),
    ]) : [null, []]

    return (
        <div className='space-y-4 py-6 px-12 mx-auto'>
            <div className='flex items-center justify-between gap-4'>
                <div className='flex items-center gap-3 flex-wrap'>
                    <Badge asChild variant='outline'>
                        <Link href={'/bestof-larib'} className='cursor-pointer'>
                            <ArrowLeft className='mr-1' /> {t('back')}
                        </Link>
                    </Badge>
                    <h1 className='text-2xl font-semibold'>{c.name}</h1>
                    {c.examType?.name ? (
                        <Badge variant='secondary'>{c.examType.name}</Badge>
                    ) : null}
                    <Badge
                        variant='outline'
                        className={
                            c.difficulty === 'BEGINNER'
                                ? 'border-green-500 text-green-700'
                                : c.difficulty === 'INTERMEDIATE'
                                ? 'border-amber-500 text-amber-700'
                                : 'border-red-500 text-red-700'
                        }>
                        {t(`difficulty.${difficultyLabel}`)}
                    </Badge>
                </div>
            </div>

            <WorkArea
                caseId={c.id}
                isAdmin={isAdmin}
                createdAt={c.createdAt}
                defaultTags={c.tags ?? []}
                prefill={prefill}
                attempts={attempts as any}
                right={
                    <>
                        <div className='text-sm font-medium mb-2'>
                            {t('content.section')}
                        </div>
                        {c.pdfUrl ? (
                            <iframe src={c.pdfUrl} className='w-full h-[70vh] rounded border' />
                        ) : (
                            <div className='rte text-sm' dangerouslySetInnerHTML={{ __html: c.textContent || '' }} />
                        )}
                    </>
                }
            />
        </div>
    );
}
