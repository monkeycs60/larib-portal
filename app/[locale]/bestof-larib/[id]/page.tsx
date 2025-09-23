import { getTranslations } from 'next-intl/server';
import { getCaseById } from '@/lib/services/bestof-larib';
import { Badge } from '@/components/ui/badge';
import { getTypedSession } from '@/lib/auth-helpers';
import WorkArea, { PrefillState } from './work-area';
import type { CaseAttemptSummary } from '@/lib/services/bestof-larib-attempts';
import { getUserCaseState, listUserCaseAttempts } from '@/lib/services/bestof-larib-attempts';
import { listUserTags, getCaseUserTagIds } from '@/lib/services/bestof-larib-tags';
import BackButton from './components/back-button';

export default async function CaseViewPage({
	params,
	searchParams,
}: {
	params: { locale: string; id: string };
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const t = await getTranslations('bestof');
	const sp = await searchParams;
	const shouldStartNewAttempt = (() => {
		const raw = sp?.newAttempt;
		if (!raw) return false;
		if (Array.isArray(raw)) return raw.some((value) => value === '1' || value === 'true');
		return raw === '1' || raw === 'true';
	})();
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

	const userId = session?.user?.id;
	const [prefillState, attempts, userTags, userTagIds] = userId
		? await Promise.all([
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
			}) as PrefillState),
			listUserCaseAttempts({ userId, caseId: c.id }) as Promise<CaseAttemptSummary[]>,
			listUserTags(userId).then(rows => rows.map(r => ({ id: r.id, name: r.name, color: r.color, description: r.description ?? null }))),
			getCaseUserTagIds(userId, c.id),
		])
		: [null, [], [], []];

	const prefill = (() => {
		if (!prefillState) return null;
		if (!shouldStartNewAttempt) return prefillState;
		return {
			...prefillState,
			analysis: { lvef: '', kinetic: '', lge: '', finalDx: '' },
			report: '',
			validatedAt: null,
		} satisfies PrefillState;
	})();

    return (
        <div className='space-y-4 py-6 px-12 mx-auto'>
            <div className='flex items-center justify-between gap-4'>
                <div className='flex items-center gap-3 flex-wrap'>
                    <BackButton />
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
                meta={{ caseId: c.id, isAdmin, createdAt: c.createdAt }}
                defaults={{ tags: c.tags ?? [], prefill }}
                attempts={attempts}
                userTagData={userId ? { tags: userTags, ids: userTagIds } : undefined}
                rightPane={
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
