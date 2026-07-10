import { getTranslations } from 'next-intl/server';
import { getCaseById } from '@/lib/services/bestof-larib';
import { Badge } from '@/components/ui/badge';
import { requireAuth } from '@/lib/auth-guard';
import { canAdminApp } from '@/lib/permissions';
import WorkArea, { PrefillState } from './work-area';
import type { CaseAttemptSummary } from '@/lib/services/bestof-larib-attempts';
import { getUserCaseState, listUserCaseAttempts } from '@/lib/services/bestof-larib-attempts';
import { listUserTags, getCaseUserTagIds } from '@/lib/services/bestof-larib-tags';
import BackButton from './components/back-button';
import PdfViewer from './components/pdf-viewer';
import DicomDownloadButton from './components/dicom-download-button';

async function CaseViewPageContent({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string; id: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { locale, id } = await params;
	const t = await getTranslations({ locale, namespace: 'bestof' });
	const sp = await searchParams;
	const shouldStartNewAttempt = (() => {
		const raw = sp?.newAttempt;
		if (!raw) return false;
		if (Array.isArray(raw)) return raw.some((value) => value === '1' || value === 'true');
		return raw === '1' || raw === 'true';
	})();
	const [c, session] = await Promise.all([
		getCaseById(id),
		requireAuth(),
	]);
	if (!c) return <div className='p-6'>{t('notFound')}</div>;

	const difficultyLabel =
		c.difficulty === 'BEGINNER'
			? 'beginner'
			: c.difficulty === 'INTERMEDIATE'
			? 'intermediate'
			: 'advanced';
	const isAdmin = canAdminApp(session.user, 'BESTOF_LARIB');

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
					lgePresent: s.lastAttempt?.lgePresent ?? undefined,
					lgeDetails: s.lastAttempt?.lgeDetails ?? undefined,
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
			analysis: { lvef: '', kinetic: '', lgePresent: false, lgeDetails: '', finalDx: '' },
			report: '',
			validatedAt: null,
		} satisfies PrefillState;
	})();

    return (
        <div className='space-y-4 py-6 px-8 mx-auto'>
            <div className='flex items-center justify-between gap-4'>
                <div className='flex items-center gap-3 flex-wrap'>
                    <BackButton />
                    <h1 className='text-2xl font-semibold'>{c.name}</h1>
                    {c.examType?.name ? (
                        <Badge variant='secondary'>{c.examType.name}</Badge>
                    ) : null}
                    {isAdmin ? (
                        <Badge
                            variant={
                                c.difficulty === 'BEGINNER'
                                    ? 'success'
                                    : c.difficulty === 'INTERMEDIATE'
                                    ? 'warning'
                                    : 'danger'
                            }
                            className='rounded-full px-3 py-1'>
                            {t(`difficulty.${difficultyLabel}`)}
                        </Badge>
                    ) : null}
                    <DicomDownloadButton caseId={c.id} />
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
                            <PdfViewer pdfUrl={c.pdfUrl} isAdmin={isAdmin} className='w-full h-[70vh] rounded border' />
                        ) : (
                            <div className='rte text-sm' dangerouslySetInnerHTML={{ __html: c.textContent || '' }} />
                        )}
                    </>
                }
            />
        </div>
    );
}

export default async function CaseViewPage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string; id: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	return <CaseViewPageContent params={params} searchParams={searchParams} />;
}
