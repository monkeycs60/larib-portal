'use client';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/app/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SingleSelect } from '@/components/ui/single-select';
import { MultiSelect } from '@/components/ui/multiselect';
import { useBestofLoadingStore } from '@/lib/stores/bestof-loading';

type ExamType = { id: string; name: string };
type DiseaseTag = { id: string; name: string };
type SimpleTag = { id: string; name: string };

export default function FiltersBar({
  data,
}: {
  data: {
    examTypes: ExamType[];
    diseaseTags: DiseaseTag[];
    isAdmin?: boolean;
    adminTags?: SimpleTag[];
    userTags?: SimpleTag[];
    canUsePersonalDifficulty?: boolean;
  };
}) {
    const { examTypes, diseaseTags, isAdmin = false, adminTags = [], userTags = [], canUsePersonalDifficulty = false } = data;
	const t = useTranslations('bestof');
	const router = useRouter();
	const pathname = usePathname();

	const url = new URL(
		typeof window !== 'undefined' ? window.location.href : 'http://localhost'
	);
	const qp = url.searchParams;

	const [q, setQ] = useState(qp.get('q') ?? '');
	const rawStatus = qp.get('status') ?? '';
	const allowedStatusValues = isAdmin ? ['PUBLISHED','DRAFT'] : ['completed','in-progress','not-started'];
	const [status, setStatus] = useState(allowedStatusValues.includes(rawStatus) ? rawStatus : '');
    const qpArray = (key: string) => {
        const all = url.searchParams.getAll(key);
        const single = url.searchParams.get(key);
        if (all && all.length > 1) return all;
        return single ? [single] : [];
    };
    const [examTypeIds, setExamTypeIds] = useState<string[]>(qpArray('examTypeId'));
    const [diseaseTagIds, setDiseaseTagIds] = useState<string[]>(qpArray('diseaseTagId'));
    const [difficulties, setDifficulties] = useState<string[]>(qpArray('difficulty'));
    const [adminTagIds, setAdminTagIds] = useState<string[]>(qpArray('adminTagId'));
    const [userTagIds, setUserTagIds] = useState<string[]>(qpArray('userTagId'));
	const [myDifficulty, setMyDifficulty] = useState(qp.get('myDifficulty') ?? '');
	const [dateFrom, setDateFrom] = useState(qp.get('dateFrom') ?? '');
	const [dateTo, setDateTo] = useState(qp.get('dateTo') ?? '');
	const [datePreset, setDatePreset] = useState(qp.get('datePreset') ?? '');
	const [firstCompletionFrom, setFirstCompletionFrom] = useState(qp.get('firstCompletionFrom') ?? '');
	const [firstCompletionTo, setFirstCompletionTo] = useState(qp.get('firstCompletionTo') ?? '');
	const [firstCompletionPreset, setFirstCompletionPreset] = useState(qp.get('firstCompletionPreset') ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const setOverlayLoading = useBestofLoadingStore((s) => s.setLoading);

	function resetFilters() {
		setQ('');
		setStatus('');
        setExamTypeIds([]);
        setDiseaseTagIds([]);
        setDifficulties([]);
        setAdminTagIds([]);
        setUserTagIds([]);
        setMyDifficulty('');
		setDateFrom('');
		setDateTo('');
		setDatePreset('');
		setFirstCompletionFrom('');
		setFirstCompletionTo('');
		setFirstCompletionPreset('');
		const current = new URLSearchParams(
			typeof window !== 'undefined' ? window.location.search : ''
		);
		const sort = current.get('sort');
		const dir = current.get('dir');
		const next = new URLSearchParams();
		if (sort) next.set('sort', sort);
		if (dir) next.set('dir', dir);
		const qs = next.toString();
		router.push(qs ? `${pathname}?${qs}` : pathname);
	}

	function pushWith(partial: Partial<Record<string, string | string[]>>) {
        const current = new URLSearchParams(
            typeof window !== 'undefined' ? window.location.search : ''
        );
        setOverlayLoading(true);
        if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = setTimeout(() => setOverlayLoading(false), 1500);
        [
            'q',
            'status',
            'examTypeId',
            'diseaseTagId',
            'difficulty',
            'adminTagId',
            'userTagId',
            'myDifficulty',
            'dateFrom',
            'dateTo',
            'datePreset',
            'firstCompletionFrom',
            'firstCompletionTo',
            'firstCompletionPreset',
        ].forEach((k) => current.delete(k));
        const merged = {
            q: q.trim(),
            status,
            examTypeId: examTypeIds,
            diseaseTagId: diseaseTagIds,
            difficulty: difficulties,
            adminTagId: adminTagIds,
            userTagId: userTagIds,
            myDifficulty,
            dateFrom,
            dateTo,
            datePreset,
            firstCompletionFrom,
            firstCompletionTo,
            firstCompletionPreset,
            ...partial,
        };
        if (merged.q) current.set('q', merged.q);
        if (merged.status) current.set('status', merged.status);
        if (merged.examTypeId) {
            const v = merged.examTypeId;
            (Array.isArray(v) ? v : [v]).forEach((val) => current.append('examTypeId', val));
        }
        if (merged.diseaseTagId) {
            const v = merged.diseaseTagId;
            (Array.isArray(v) ? v : [v]).forEach((val) => current.append('diseaseTagId', val));
        }
        if (merged.difficulty) {
            const v = merged.difficulty;
            (Array.isArray(v) ? v : [v]).forEach((val) => current.append('difficulty', val));
        }
        if (merged.adminTagId) {
            const v = merged.adminTagId;
            (Array.isArray(v) ? v : [v]).forEach((val) => current.append('adminTagId', val));
        }
        if (merged.userTagId) {
            const v = merged.userTagId;
            (Array.isArray(v) ? v : [v]).forEach((val) => current.append('userTagId', val));
        }
        if (merged.myDifficulty) current.set('myDifficulty', merged.myDifficulty);
        if (merged.dateFrom) current.set('dateFrom', merged.dateFrom);
        if (merged.dateTo) current.set('dateTo', merged.dateTo);
        if (merged.datePreset) current.set('datePreset', merged.datePreset);
        if (merged.firstCompletionFrom) current.set('firstCompletionFrom', merged.firstCompletionFrom);
        if (merged.firstCompletionTo) current.set('firstCompletionTo', merged.firstCompletionTo);
        if (merged.firstCompletionPreset) current.set('firstCompletionPreset', merged.firstCompletionPreset);
        router.push(`${pathname}?${current.toString()}`);
    }

	function formatYYYYMMDD(d: Date) {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${dd}`;
	}

	function computeDateRangeFromPreset(preset: string, fallbackFrom: string, fallbackTo: string): { from: string; to: string } {
		const now = new Date();
		const startOfDay = (d: Date) => {
			const c = new Date(d);
			c.setHours(0, 0, 0, 0);
			return c;
		};
		const endOfDay = (d: Date) => {
			const c = new Date(d);
			c.setHours(23, 59, 59, 999);
			return c;
		};
		const startOfWeek = (d: Date) => {
			const c = new Date(d);
			const day = c.getDay() || 7;
			c.setDate(c.getDate() - (day - 1));
			return startOfDay(c);
		};
		const endOfWeek = (d: Date) => {
			const c = startOfWeek(d);
			c.setDate(c.getDate() + 6);
			return endOfDay(c);
		};
		const startOfMonth = (d: Date) =>
			new Date(d.getFullYear(), d.getMonth(), 1);
		const endOfMonth = (d: Date) =>
			endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));

		switch (preset) {
			case 'today':
				return { from: formatYYYYMMDD(now), to: formatYYYYMMDD(now) };
			case 'yesterday': {
				const yesterday = new Date(now);
				yesterday.setDate(now.getDate() - 1);
				return { from: formatYYYYMMDD(yesterday), to: formatYYYYMMDD(yesterday) };
			}
			case 'last7': {
				const startDate = new Date(now);
				startDate.setDate(now.getDate() - 6);
				return { from: formatYYYYMMDD(startDate), to: formatYYYYMMDD(now) };
			}
			case 'last30': {
				const startDate = new Date(now);
				startDate.setDate(now.getDate() - 29);
				return { from: formatYYYYMMDD(startDate), to: formatYYYYMMDD(now) };
			}
			case 'thisWeek':
				return { from: formatYYYYMMDD(startOfWeek(now)), to: formatYYYYMMDD(endOfWeek(now)) };
			case 'lastWeek': {
				const lastWeekRef = new Date(now);
				lastWeekRef.setDate(now.getDate() - 7);
				return { from: formatYYYYMMDD(startOfWeek(lastWeekRef)), to: formatYYYYMMDD(endOfWeek(lastWeekRef)) };
			}
			case 'thisMonth':
				return { from: formatYYYYMMDD(startOfMonth(now)), to: formatYYYYMMDD(endOfMonth(now)) };
			case 'lastMonth': {
				const ref = new Date(now.getFullYear(), now.getMonth() - 1, 1);
				return { from: formatYYYYMMDD(startOfMonth(ref)), to: formatYYYYMMDD(endOfMonth(ref)) };
			}
			case '':
				return { from: '', to: '' };
			default:
				return { from: fallbackFrom, to: fallbackTo };
		}
	}

	function applyPreset(preset: string) {
		const { from, to } = computeDateRangeFromPreset(preset, dateFrom, dateTo);
		setDateFrom(from);
		setDateTo(to);
		pushWith({ datePreset: preset, dateFrom: from, dateTo: to });
	}

	function applyFirstCompletionPreset(preset: string) {
		const { from, to } = computeDateRangeFromPreset(preset, firstCompletionFrom, firstCompletionTo);
		setFirstCompletionFrom(from);
		setFirstCompletionTo(to);
		pushWith({ firstCompletionPreset: preset, firstCompletionFrom: from, firstCompletionTo: to });
	}

	return (
		<div className='flex flex-wrap items-end gap-3'>
            <div className='flex-1 min-w-40'>
				<label className='block text-xs mb-1'>{t('filters.search')}</label>
				<Input
					value={q}
					onChange={(e) => {
						const next = e.target.value;
						setQ(next);
						if (debounceRef.current) clearTimeout(debounceRef.current);
						debounceRef.current = setTimeout(() => {
							pushWith({ q: next.trim() });
						}, 400);
					}}
					placeholder={t('filters.searchPlaceholder')}
				/>
			</div>
            {isAdmin ? (
                <div className='min-w-52'>
                    <label className='block text-xs mb-1'>{t('filters.adminTag')}</label>
                    <MultiSelect
                        options={adminTags.map(tag => ({ label: tag.name, value: tag.id }))}
                        defaultValue={adminTagIds}
                        onValueChange={(vals) => { setAdminTagIds(vals); pushWith({ adminTagId: vals, userTagId: [] }); }}
                        placeholder={t('filters.any')}
                        maxCount={3}
                        responsive
                    />
                </div>
            ) : (
                userTags.length > 0 ? (
                    <div className='min-w-52'>
                        <label className='block text-xs mb-1'>{t('filters.userTag')}</label>
                        <MultiSelect
                            options={userTags.map(tag => ({ label: tag.name, value: tag.id }))}
                            defaultValue={userTagIds}
                            onValueChange={(vals) => { setUserTagIds(vals); pushWith({ userTagId: vals, adminTagId: [] }); }}
                            placeholder={t('filters.any')}
                            maxCount={3}
                            responsive
                        />
                    </div>
                ) : null
            )}
            <div className='min-w-44'>
                <label className='block text-xs mb-1'>{t('filters.status')}</label>
                <SingleSelect
                    value={status}
					onChange={(value) => {
						setStatus(value);
						pushWith({ status: value });
					}}
					options={[
						{ value: '', label: t('filters.any') },
						...(isAdmin ? [
						  { value: 'PUBLISHED', label: t('status.published') },
						  { value: 'DRAFT', label: t('status.draft') },
						] : [
						  { value: 'completed', label: t('status.completed') },
						  { value: 'in-progress', label: t('status.inProgress') },
						  { value: 'not-started', label: t('status.notStarted') },
						])
					]}
					placeholder={t('filters.any')}
				/>
			</div>
            <div className='min-w-52'>
                <label className='block text-xs mb-1'>{t('filters.exam')}</label>
                <MultiSelect
                    options={examTypes.map(ex => ({ label: ex.name, value: ex.id }))}
                    defaultValue={examTypeIds}
                    onValueChange={(vals) => { setExamTypeIds(vals); pushWith({ examTypeId: vals }); }}
                    placeholder={t('filters.any')}
                    maxCount={2}
                    responsive
                />
            </div>
            {isAdmin ? (
                <div className='min-w-52'>
                    <label className='block text-xs mb-1'>{t('filters.disease')}</label>
                    <MultiSelect
                        options={diseaseTags.map(d => ({ label: d.name, value: d.id }))}
                        defaultValue={diseaseTagIds}
                        onValueChange={(vals) => { setDiseaseTagIds(vals); pushWith({ diseaseTagId: vals }); }}
                        placeholder={t('filters.any')}
                        maxCount={2}
                        responsive
                    />
                </div>
            ) : null}
            {isAdmin ? (
                <div className='min-w-52'>
                    <label className='block text-xs mb-1'>
                        {t('filters.difficulty')}
                    </label>
                    <MultiSelect
                        options={[
                            { label: t('difficulty.beginner'), value: 'BEGINNER' },
                            { label: t('difficulty.intermediate'), value: 'INTERMEDIATE' },
                            { label: t('difficulty.advanced'), value: 'ADVANCED' },
                        ]}
                        defaultValue={difficulties}
                        onValueChange={(vals) => { setDifficulties(vals); pushWith({ difficulty: vals }); }}
                        placeholder={t('filters.any')}
                        maxCount={3}
                        responsive
                    />
                </div>
            ) : null}
			{canUsePersonalDifficulty ? (
				<div className='min-w-fit'>
					<label className='block text-xs mb-1'>{t('filters.myDifficulty')}</label>
					<div className='flex items-center gap-2 h-9 px-3 border rounded-md bg-background'>
						{[
							{ value: '', colorClass: 'bg-muted-foreground/30', label: t('filters.any') },
							{ value: 'BEGINNER', colorClass: 'bg-emerald-500', label: t('difficulty.beginner') },
							{ value: 'INTERMEDIATE', colorClass: 'bg-rose-500', label: t('difficulty.intermediate') },
							{ value: 'ADVANCED', colorClass: 'bg-red-500', label: t('difficulty.advanced') },
						].map((option) => (
							<button
								key={option.value || 'any'}
								type='button'
								onClick={() => {
									setMyDifficulty(option.value);
									pushWith({ myDifficulty: option.value });
								}}
								className={`h-4 w-4 rounded-full transition-all hover:scale-110 ${option.colorClass} ${
									myDifficulty === option.value ? 'ring-2 ring-offset-2 ring-foreground' : ''
								}`}
								aria-label={option.label}
								title={option.label}
							/>
						))}
					</div>
				</div>
			) : null}
			<div className='min-w-44'>
				<label className='block text-xs mb-1'>
					{t('filters.createdAtRange')}
				</label>
				<SingleSelect
					value={datePreset}
					onChange={(value) => {
						setDatePreset(value);
						applyPreset(value);
					}}
					options={[
						{ value: '', label: t('filters.any') },
						{ value: 'today', label: t('filters.today') },
						{ value: 'yesterday', label: t('filters.yesterday') },
						{ value: 'thisWeek', label: t('filters.thisWeek') },
						{ value: 'lastWeek', label: t('filters.lastWeek') },
						{ value: 'thisMonth', label: t('filters.thisMonth') },
						{ value: 'lastMonth', label: t('filters.lastMonth') },
						{ value: 'last7', label: t('filters.last7') },
						{ value: 'last30', label: t('filters.last30') },
						{ value: 'custom', label: t('filters.custom') },
					]}
					placeholder={t('filters.any')}
				/>
			</div>
			{datePreset === 'custom' ? (
				<>
					<div className='min-w-44'>
						<label className='block text-xs mb-1'>
							{t('filters.dateFrom')}
						</label>
						<Input
							type='date'
							value={dateFrom}
							onChange={(e) => {
								setDateFrom(e.target.value);
								pushWith({
									dateFrom: e.target.value,
									datePreset: 'custom',
								});
							}}
						/>
					</div>
					<div className='min-w-44'>
						<label className='block text-xs mb-1'>
							{t('filters.dateTo')}
						</label>
						<Input
							type='date'
							value={dateTo}
							onChange={(e) => {
								setDateTo(e.target.value);
								pushWith({
									dateTo: e.target.value,
									datePreset: 'custom',
								});
							}}
						/>
					</div>
				</>
			) : null}
			{!isAdmin ? (
				<>
					<div className='min-w-44'>
						<label className='block text-xs mb-1'>
							{t('filters.firstCompletionRange')}
						</label>
						<SingleSelect
							value={firstCompletionPreset}
							onChange={(value) => {
								setFirstCompletionPreset(value);
								applyFirstCompletionPreset(value);
							}}
							options={[
								{ value: '', label: t('filters.any') },
								{ value: 'today', label: t('filters.today') },
								{ value: 'yesterday', label: t('filters.yesterday') },
								{ value: 'thisWeek', label: t('filters.thisWeek') },
								{ value: 'lastWeek', label: t('filters.lastWeek') },
								{ value: 'thisMonth', label: t('filters.thisMonth') },
								{ value: 'lastMonth', label: t('filters.lastMonth') },
								{ value: 'last7', label: t('filters.last7') },
								{ value: 'last30', label: t('filters.last30') },
								{ value: 'custom', label: t('filters.custom') },
							]}
							placeholder={t('filters.any')}
						/>
					</div>
					{firstCompletionPreset === 'custom' ? (
						<>
							<div className='min-w-44'>
								<label className='block text-xs mb-1'>
									{t('filters.dateFrom')}
								</label>
								<Input
									type='date'
									value={firstCompletionFrom}
									onChange={(e) => {
										setFirstCompletionFrom(e.target.value);
										pushWith({
											firstCompletionFrom: e.target.value,
											firstCompletionPreset: 'custom',
										});
									}}
								/>
							</div>
							<div className='min-w-44'>
								<label className='block text-xs mb-1'>
									{t('filters.dateTo')}
								</label>
								<Input
									type='date'
									value={firstCompletionTo}
									onChange={(e) => {
										setFirstCompletionTo(e.target.value);
										pushWith({
											firstCompletionTo: e.target.value,
											firstCompletionPreset: 'custom',
										});
									}}
								/>
							</div>
						</>
					) : null}
				</>
			) : null}
			<div className='ml-auto flex gap-2'>
				<Button variant='outline' onClick={resetFilters}>
					{t('filters.reset')}
				</Button>
			</div>
		</div>
	);
}
