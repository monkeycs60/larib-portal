'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAction } from 'next-safe-action/hooks';
import { ensureUserTagAction, setCaseUserTagsAction } from '../actions';
import { toast } from 'sonner';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { Check, Loader2, Plus } from 'lucide-react';

type Tag = {
	id: string;
	name: string;
	color: string;
	description: string | null;
};

function parseHexColor(color: string) {
	const value = color.replace('#', '');
	if (value.length !== 6) return null;
	const r = Number.parseInt(value.slice(0, 2), 16);
	const g = Number.parseInt(value.slice(2, 4), 16);
	const b = Number.parseInt(value.slice(4, 6), 16);
	if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
	return { r, g, b };
}

function mixWithWhite(hex: string, ratio: number) {
	const rgb = parseHexColor(hex);
	if (!rgb) return hex;
	const mix = (channel: number) =>
		Math.round(channel + (255 - channel) * ratio);
	const toHex = (channel: number) => channel.toString(16).padStart(2, '0');
	const r = mix(rgb.r);
	const g = mix(rgb.g);
	const b = mix(rgb.b);
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getReadableTextColor(hex: string) {
	const rgb = parseHexColor(hex);
	if (!rgb) return '#1f2937';
	const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
	return luminance > 0.6 ? '#1f2937' : '#ffffff';
}

export default function UserTagsSection({
	isAdmin,
	caseId,
	initialTags,
	initialSelectedIds,
}: {
	isAdmin: boolean;
	caseId: string;
	initialTags: Tag[];
	initialSelectedIds: string[];
}) {
	const t = useTranslations('bestof');
	const [tags, setTags] = useState<Tag[]>(initialTags);
	const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
	const [open, setOpen] = useState(false);
	const [newName, setNewName] = useState('');
	const [newColor, setNewColor] = useState('#3b82f6');
	const [newDesc, setNewDesc] = useState('');
	const [isSavingSelection, startSavingSelection] = useTransition();
	const [expanded, setExpanded] = useState(false);

	const save = useAction(setCaseUserTagsAction, {
		onSuccess() {
			toast.success(t('updated'));
		},
		onError() {
			toast.error(t('actionError'));
		},
	});

	function updateSelection(ids: string[]) {
		setSelectedIds(ids);
		if (isAdmin) return;
		startSavingSelection(() => {
			void save.execute({ caseId, tagIds: ids });
		});
	}

	const createTag = useAction(ensureUserTagAction, {
		onSuccess(res) {
			if (!res.data) return;
			const created = res.data as Tag;
			setTags((previous) => [
				...previous.filter((tag) => tag.id !== created.id),
				created,
			]);
			const nextSelected = Array.from(new Set([...selectedIds, created.id]));
			updateSelection(nextSelected);
			toast.success(t('updated'));
			setOpen(false);
			setNewName('');
			setNewDesc('');
		},
		onError() {
			toast.error(t('actionError'));
		},
	});

	useEffect(() => {
		setTags(initialTags);
	}, [initialTags]);
	useEffect(() => {
		setSelectedIds(initialSelectedIds);
	}, [initialSelectedIds]);

	const sortedTags = useMemo(
		() =>
			tags
				.slice()
				.sort((left, right) => left.name.localeCompare(right.name)),
		[tags]
	);
	const isSaving = save.isExecuting || isSavingSelection;
	const hasManyTags = sortedTags.length > 10;

	function handleToggle(tagId: string, pressed: boolean) {
		if (isAdmin) return;
		const nextIds = pressed
			? Array.from(new Set([...selectedIds, tagId]))
			: selectedIds.filter((id) => id !== tagId);
		updateSelection(nextIds);
	}

	function handleCreateTag() {
		const payload = {
			name: newName.trim(),
			color: newColor,
			description: newDesc.trim() || null,
		};
		if (!payload.name) return;
		startSavingSelection(() => {
			void createTag.execute(payload);
		});
	}

	return (
		<div className='space-y-3'>
			<div className='space-y-2'>
				<div
					className={cn(
						'flex flex-wrap gap-2 overflow-y-auto pr-1 transition-all duration-200',
						expanded ? 'max-h-60' : 'max-h-32'
					)}>
					{sortedTags.length === 0 ? (
						<div className='text-sm text-muted-foreground'>
							{t('caseView.noUserTags')}
						</div>
					) : (
						sortedTags.map((tag) => {
							const active = selectedIds.includes(tag.id);
							const activeBackground = mixWithWhite(tag.color, 0.82);
							const activeBorder = mixWithWhite(tag.color, 0.32);
							const inactiveBorder = mixWithWhite(tag.color, 0.88);
							const labelColor = active
								? getReadableTextColor(activeBackground)
								: '#475569';
							return (
								<Toggle
									key={tag.id}
									pressed={active}
									onPressedChange={(pressed) =>
										handleToggle(tag.id, pressed)
									}
									disabled={isAdmin || isSaving}
									aria-label={tag.name}
									className={cn(
										'justify-start rounded-full border px-3 py-1.5 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60',
										active
											? 'shadow-sm'
											: 'bg-background hover:bg-muted/60'
									)}
									style={{
										borderColor: active
											? activeBorder
											: inactiveBorder,
										backgroundColor: active
											? activeBackground
											: undefined,
										color: labelColor,
									}}>
									<span className='flex items-center gap-2'>
										<span
											className='h-2.5 w-2.5 rounded-full'
											style={{ backgroundColor: tag.color }}
										/>
										<span className='max-w-[132px] truncate font-medium'>
											{tag.name}
										</span>
										{active ? <Check className='size-3' /> : null}
									</span>
								</Toggle>
							);
						})
					)}
				</div>
				<div className='flex items-center gap-2'>
					{hasManyTags ? (
						<Button
							type='button'
							variant='ghost'
							size='sm'
							className='h-7 px-2 text-xs'
							onClick={() => setExpanded((previous) => !previous)}>
							{expanded
								? t('caseView.hideTags')
								: t('caseView.showAllTags')}
						</Button>
					) : null}
				</div>
			</div>
			<div className='flex justify-between gap-2 pt-1'>
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger asChild>
						<Button
							type='button'
							variant='outline'
							disabled={isAdmin || isSaving}>
							<Plus className='mr-2 size-4' />
							{t('createTag')}
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>
								{t('createNewTagLabel') || 'Create new tag'}
							</DialogTitle>
						</DialogHeader>
						<div className='space-y-3'>
							<div className='space-y-1'>
								<label className='text-xs'>
									{t('tagNameLabel') || 'Name'}
								</label>
								<Input
									value={newName}
									onChange={(event) => setNewName(event.target.value)}
								/>
							</div>
							<div className='space-y-1'>
								<label className='text-xs'>
									{t('tagColorLabel') || 'Color'}
								</label>
								<div className='flex items-center gap-2'>
									<input
										type='color'
										value={newColor}
										onChange={(event) =>
											setNewColor(event.target.value)
										}
										className='h-9 w-12 rounded border'
									/>
									<Input
										value={newColor}
										onChange={(event) =>
											setNewColor(event.target.value)
										}
										className='font-mono'
									/>
								</div>
							</div>
							<div className='space-y-1'>
								<label className='text-xs'>
									{t('tagDescriptionLabel') || 'Description'}
								</label>
								<Textarea
									value={newDesc}
									onChange={(event) => setNewDesc(event.target.value)}
									placeholder={
										t('tagDescriptionPlaceholder') || 'Optional'
									}
								/>
							</div>
							<div className='flex justify-end'>
								<Button
									onClick={handleCreateTag}
									disabled={!newName.trim() || createTag.isExecuting}>
									{createTag.isExecuting ? (
										<Loader2 className='mr-2 size-4 animate-spin' />
									) : null}
									{t('createTag')}
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
				{/* Auto-save on toggle and create; no explicit Update button */}
			</div>
		</div>
	);
}
