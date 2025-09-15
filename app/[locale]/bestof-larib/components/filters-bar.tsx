'use client';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/app/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

type ExamType = { id: string; name: string };
type DiseaseTag = { id: string; name: string };

export default function FiltersBar({
	examTypes,
	diseaseTags,
}: {
	examTypes: ExamType[];
	diseaseTags: DiseaseTag[];
}) {
	const t = useTranslations('bestof');
	const router = useRouter();
	const pathname = usePathname();

	const url = new URL(
		typeof window !== 'undefined' ? window.location.href : 'http://localhost'
	);
	const qp = url.searchParams;

	const [q, setQ] = useState(qp.get('q') ?? '');
	const [status, setStatus] = useState(qp.get('status') ?? '');
	const [examTypeId, setExamTypeId] = useState(qp.get('examTypeId') ?? '');
	const [diseaseTagId, setDiseaseTagId] = useState(
		qp.get('diseaseTagId') ?? ''
	);
	const [difficulty, setDifficulty] = useState(qp.get('difficulty') ?? '');
	const [dateFrom, setDateFrom] = useState(qp.get('dateFrom') ?? '');
	const [dateTo, setDateTo] = useState(qp.get('dateTo') ?? '');
	const [datePreset, setDatePreset] = useState(qp.get('datePreset') ?? '');
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	function resetFilters() {
		setQ('');
		setStatus('');
		setExamTypeId('');
		setDiseaseTagId('');
		setDifficulty('');
		setDateFrom('');
		setDateTo('');
		setDatePreset('');
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

	function pushWith(partial: Partial<Record<string, string>>) {
		const current = new URLSearchParams(
			typeof window !== 'undefined' ? window.location.search : ''
		);
		// remove existing filters
		[
			'q',
			'status',
			'examTypeId',
			'diseaseTagId',
			'difficulty',
			'dateFrom',
			'dateTo',
			'datePreset',
		].forEach((k) => current.delete(k));
		// re-add from state merged with partial
		const merged = {
			q: q.trim(),
			status,
			examTypeId,
			diseaseTagId,
			difficulty,
			dateFrom,
			dateTo,
			datePreset,
			...partial,
		};
		if (merged.q) current.set('q', merged.q);
		if (merged.status) current.set('status', merged.status);
		if (merged.examTypeId) current.set('examTypeId', merged.examTypeId);
		if (merged.diseaseTagId) current.set('diseaseTagId', merged.diseaseTagId);
		if (merged.difficulty) current.set('difficulty', merged.difficulty);
		if (merged.dateFrom) current.set('dateFrom', merged.dateFrom);
		if (merged.dateTo) current.set('dateTo', merged.dateTo);
		if (merged.datePreset) current.set('datePreset', merged.datePreset);
		router.push(`${pathname}?${current.toString()}`);
	}

	function formatYYYYMMDD(d: Date) {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${dd}`;
	}

	function applyPreset(preset: string) {
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
		}; // Monday
		const endOfWeek = (d: Date) => {
			const c = startOfWeek(d);
			c.setDate(c.getDate() + 6);
			return endOfDay(c);
		};
		const startOfMonth = (d: Date) =>
			new Date(d.getFullYear(), d.getMonth(), 1);
		const endOfMonth = (d: Date) =>
			endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));

		let from = '';
		let to = '';
		switch (preset) {
			case 'today':
				from = formatYYYYMMDD(now);
				to = formatYYYYMMDD(now);
				break;
			case 'yesterday': {
				const y = new Date(now);
				y.setDate(now.getDate() - 1);
				from = formatYYYYMMDD(y);
				to = formatYYYYMMDD(y);
				break;
			}
			case 'last7': {
				const s = new Date(now);
				s.setDate(now.getDate() - 6);
				from = formatYYYYMMDD(s);
				to = formatYYYYMMDD(now);
				break;
			}
			case 'last30': {
				const s = new Date(now);
				s.setDate(now.getDate() - 29);
				from = formatYYYYMMDD(s);
				to = formatYYYYMMDD(now);
				break;
			}
			case 'thisWeek':
				from = formatYYYYMMDD(startOfWeek(now));
				to = formatYYYYMMDD(endOfWeek(now));
				break;
			case 'lastWeek': {
				const lastWeekRef = new Date(now);
				lastWeekRef.setDate(now.getDate() - 7);
				from = formatYYYYMMDD(startOfWeek(lastWeekRef));
				to = formatYYYYMMDD(endOfWeek(lastWeekRef));
				break;
			}
			case 'thisMonth':
				from = formatYYYYMMDD(startOfMonth(now));
				to = formatYYYYMMDD(endOfMonth(now));
				break;
			case 'lastMonth': {
				const ref = new Date(now.getFullYear(), now.getMonth() - 1, 1);
				from = formatYYYYMMDD(startOfMonth(ref));
				to = formatYYYYMMDD(endOfMonth(ref));
				break;
			}
			case '':
				from = '';
				to = '';
				break;
			default:
				// custom: leave as-is
				from = dateFrom;
				to = dateTo;
		}
		setDateFrom(from);
		setDateTo(to);
		pushWith({ datePreset: preset, dateFrom: from, dateTo: to });
	}

	return (
		<div className='flex flex-wrap items-end gap-3'>
			<div className='flex-1 min-w-56'>
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
			<div>
				<label className='block text-xs mb-1'>{t('filters.status')}</label>
				<Select
					value={status}
					onChange={(e) => {
						setStatus(e.target.value);
						pushWith({ status: e.target.value });
					}}>
					<option value=''>{t('filters.any')}</option>
					<option value='PUBLISHED'>{t('status.published')}</option>
					<option value='DRAFT'>{t('status.draft')}</option>
				</Select>
			</div>
			<div>
				<label className='block text-xs mb-1'>{t('filters.exam')}</label>
				<Select
					value={examTypeId}
					onChange={(e) => {
						setExamTypeId(e.target.value);
						pushWith({ examTypeId: e.target.value });
					}}>
					<option value=''>{t('filters.any')}</option>
					{examTypes.map((ex) => (
						<option key={ex.id} value={ex.id}>
							{ex.name}
						</option>
					))}
				</Select>
			</div>
			<div>
				<label className='block text-xs mb-1'>{t('filters.disease')}</label>
				<Select
					value={diseaseTagId}
					onChange={(e) => {
						setDiseaseTagId(e.target.value);
						pushWith({ diseaseTagId: e.target.value });
					}}>
					<option value=''>{t('filters.any')}</option>
					{diseaseTags.map((d) => (
						<option key={d.id} value={d.id}>
							{d.name}
						</option>
					))}
				</Select>
			</div>
			<div>
				<label className='block text-xs mb-1'>
					{t('filters.difficulty')}
				</label>
				<Select
					value={difficulty}
					onChange={(e) => {
						setDifficulty(e.target.value);
						pushWith({ difficulty: e.target.value });
					}}>
					<option value=''>{t('filters.any')}</option>
					<option value='BEGINNER'>{t('difficulty.beginner')}</option>
					<option value='INTERMEDIATE'>
						{t('difficulty.intermediate')}
					</option>
					<option value='ADVANCED'>{t('difficulty.advanced')}</option>
				</Select>
			</div>
			<div>
				<label className='block text-xs mb-1'>
					{t('filters.dateRange')}
				</label>
				<Select
					value={datePreset}
					onChange={(e) => {
						const v = e.target.value;
						setDatePreset(v);
						applyPreset(v);
					}}>
					<option value=''>{t('filters.any')}</option>
					<option value='today'>{t('filters.today')}</option>
					<option value='yesterday'>{t('filters.yesterday')}</option>
					<option value='thisWeek'>{t('filters.thisWeek')}</option>
					<option value='lastWeek'>{t('filters.lastWeek')}</option>
					<option value='thisMonth'>{t('filters.thisMonth')}</option>
					<option value='lastMonth'>{t('filters.lastMonth')}</option>
					<option value='last7'>{t('filters.last7')}</option>
					<option value='last30'>{t('filters.last30')}</option>
					<option value='custom'>{t('filters.custom')}</option>
				</Select>
			</div>
			{datePreset === 'custom' ? (
				<>
					<div>
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
					<div>
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
			<div className='ml-auto flex gap-2'>
				<Button variant='outline' onClick={resetFilters}>
					{t('filters.reset')}
				</Button>
			</div>
		</div>
	);
}
