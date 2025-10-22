'use client';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { TagInput } from '@/components/ui/tag-input';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { createCaseAction, createDiseaseTagAction, createExamTypeAction, updateCaseAction, setCaseAdminTagsAction, ensureAdminTagAction, deleteExamTypesAction, deleteDiseaseTagsAction } from '../actions';
import { toast } from 'sonner';
import DeletableSelectManager from './deletable-select-manager';

const FormSchema = z.object({
	name: z.string().min(1),
	examType: z.string().optional(),
	diseaseTag: z.string().optional(),
	difficulty: z
		.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
		.default('BEGINNER'),
	tags: z.array(z.string()).default([]),
	textContent: z.string().optional(),
	pdfUrl: z.string().url().optional(),
	pdfKey: z.string().optional(),
});

// Important: use z.input here to align with zodResolver's input type (defaults may allow undefined in input)
type FormValues = z.input<typeof FormSchema>;

type Option = { id: string; name: string };

type AdminTag = { id: string; name: string; color: string; description: string | null };

type ClinicalCase = {
  id: string;
  name: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  status: 'DRAFT' | 'PUBLISHED';
  tags: string[];
  pdfUrl: string | null;
  pdfKey: string | null;
  textContent: string | null;
  examType?: Option | null;
  diseaseTag?: Option | null;
  adminTags?: AdminTag[];
}

export default function CreateCaseDialog({
  examTypes,
  diseaseTags,
  trigger,
  clinicalCase,
  isAdmin,
  adminTags,
}: {
  examTypes: Option[];
  diseaseTags: Option[];
  trigger?: ReactNode;
  clinicalCase?: ClinicalCase;
  isAdmin?: boolean;
  adminTags?: AdminTag[];
}) {
	const t = useTranslations('bestof');
	const [open, setOpen] = useState(false);
	const [examList, setExamList] = useState(examTypes);
	const [diseaseList, setDiseaseList] = useState(diseaseTags);
	const [pdfUploading, setPdfUploading] = useState(false);
	const [statusToCreate, setStatusToCreate] = useState<'DRAFT' | 'PUBLISHED'>(
		clinicalCase?.status ?? 'PUBLISHED'
	);
	const [selectedAdminTags, setSelectedAdminTags] = useState<string[]>(
		clinicalCase?.adminTags?.map((tag) => tag.id) ?? []
	);
	const [tagDialogOpen, setTagDialogOpen] = useState(false);
	const [newTagName, setNewTagName] = useState('');
	const [newTagColor, setNewTagColor] = useState('#3b82f6');
	const [newTagDescription, setNewTagDescription] = useState('');
	const [localAdminTags, setLocalAdminTags] = useState<AdminTag[]>(adminTags ?? []);

  const { register, handleSubmit, setValue, reset, watch, control } =
    useForm<FormValues>({
      resolver: zodResolver(FormSchema),
    defaultValues: clinicalCase
            ? {
                    name: clinicalCase.name,
                    examType: clinicalCase.examType?.name,
                    diseaseTag: clinicalCase.diseaseTag?.name,
                    difficulty: clinicalCase.difficulty,
                    tags: clinicalCase.tags ?? [],
                    textContent: clinicalCase.textContent ?? undefined,
                    pdfUrl: clinicalCase.pdfUrl ?? undefined,
                    pdfKey: clinicalCase.pdfKey ?? undefined,
            }
            : { difficulty: 'BEGINNER' },
		});

	const pdfUrl = watch('pdfUrl');
	const textContent = watch('textContent');
	const hasText = (() => {
		const s = (textContent || '')
			.replace(/<[^>]*>/g, '')
			.replace(/&nbsp;/g, ' ')
			.trim();
		return s.length > 0;
	})();
	const tags = watch('tags') || [];

  const { execute: execCreate, isExecuting: creatingCase } = useAction(createCaseAction, {
    onSuccess() {
      toast.success(t('created'));
      window.location.reload();
    },
    onError({ error }) {
      const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError');
      toast.error(msg);
    },
  });
  const { execute: execUpdate, isExecuting: updatingCase } = useAction(updateCaseAction, {
    onSuccess() {
      toast.success(t('updated'));
      window.location.reload();
    },
    onError({ error }) {
      const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError');
      toast.error(msg);
    },
  });
  const { execute: execSetAdminTags, isExecuting: settingTags } = useAction(setCaseAdminTagsAction, {
    onError({ error }) {
      const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError');
      toast.error(msg);
    },
  });
  const { execute: execEnsureAdminTag, isExecuting: creatingTag } = useAction(ensureAdminTagAction, {
    onSuccess(res) {
      const created = res.data as AdminTag | undefined;
      if (!created) return;
      setLocalAdminTags((previous) => [...previous, created].sort((tagA, tagB) => tagA.name.localeCompare(tagB.name)));
      setSelectedAdminTags((previous) => [...previous, created.id]);
      setNewTagName('');
      setNewTagColor('#3b82f6');
      setNewTagDescription('');
      setTagDialogOpen(false);
      toast.success(t('updated'));
    },
    onError({ error }) {
      const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError');
      toast.error(msg);
    },
  });
  const isExecuting = creatingCase || updatingCase || settingTags || creatingTag;

	const { execute: execCreateExam, isExecuting: creatingExam } = useAction(
		createExamTypeAction,
		{
			onSuccess(res) {
				const createdExam = res.data;
				if (!createdExam) return;
				setExamList((previous) => {
					const next = previous.filter((examType) => examType.id !== createdExam.id);
					next.push(createdExam);
					next.sort((leftExam, rightExam) => leftExam.name.localeCompare(rightExam.name));
					return next;
				});
				setValue('examType', createdExam.name, {
					shouldDirty: true,
					shouldValidate: true,
				});
			},
		}
	);
	const { execute: execCreateDisease, isExecuting: creatingDisease } =
		useAction(createDiseaseTagAction, {
			onSuccess(res) {
				const createdDisease = res.data;
				if (!createdDisease) return;
				setDiseaseList((previous) => {
					const next = previous.filter((disease) => disease.id !== createdDisease.id);
					next.push(createdDisease);
					next.sort((leftDisease, rightDisease) => leftDisease.name.localeCompare(rightDisease.name));
					return next;
				});
				setValue('diseaseTag', createdDisease.name, {
					shouldDirty: true,
					shouldValidate: true,
				});
			},
		});

	const [manageExamTypesOpen, setManageExamTypesOpen] = useState(false);
	const [manageDiseaseTagsOpen, setManageDiseaseTagsOpen] = useState(false);
	const [selectedExamTypeIds, setSelectedExamTypeIds] = useState<string[]>([]);
	const [selectedDiseaseTagIds, setSelectedDiseaseTagIds] = useState<string[]>([]);
	const [confirmDeleteExamTypesOpen, setConfirmDeleteExamTypesOpen] = useState(false);
	const [confirmDeleteDiseaseTagsOpen, setConfirmDeleteDiseaseTagsOpen] = useState(false);

	const { execute: execDeleteExamTypes, isExecuting: deletingExamTypes } = useAction(
		deleteExamTypesAction,
		{
			onSuccess(res) {
				const deleted = res.data?.deleted ?? 0;
				setExamList((previous) => previous.filter((exam) => !res.data));
				toast.success(t('itemsDeleted', { count: deleted }));
				setManageExamTypesOpen(false);
			},
			onError({ error }) {
				const errorMessage = error?.serverError;
				if (typeof errorMessage === 'string') {
					const match = errorMessage.match(/(\d+)\s+case/);
					if (match) {
						const count = Number.parseInt(match[1], 10);
						toast.error(t('deleteError', { count }));
						return;
					}
				}
				toast.error(t('deleteGenericError'));
			},
		}
	);

	const { execute: execDeleteDiseaseTags, isExecuting: deletingDiseaseTags } = useAction(
		deleteDiseaseTagsAction,
		{
			onSuccess(res) {
				const deleted = res.data?.deleted ?? 0;
				setDiseaseList((previous) => previous.filter((disease) => !res.data));
				toast.success(t('itemsDeleted', { count: deleted }));
				setManageDiseaseTagsOpen(false);
			},
			onError({ error }) {
				const errorMessage = error?.serverError;
				if (typeof errorMessage === 'string') {
					const match = errorMessage.match(/(\d+)\s+case/);
					if (match) {
						const count = Number.parseInt(match[1], 10);
						toast.error(t('deleteError', { count }));
						return;
					}
				}
				toast.error(t('deleteGenericError'));
			},
		}
	);

	const handleDeleteExamTypes = async () => {
		if (selectedExamTypeIds.length === 0) return;
		await execDeleteExamTypes({ ids: selectedExamTypeIds });
		setExamList((previous) => previous.filter((exam) => !selectedExamTypeIds.includes(exam.id)));
		setSelectedExamTypeIds([]);
		setConfirmDeleteExamTypesOpen(false);
	};

	const handleDeleteDiseaseTags = async () => {
		if (selectedDiseaseTagIds.length === 0) return;
		await execDeleteDiseaseTags({ ids: selectedDiseaseTagIds });
		setDiseaseList((previous) => previous.filter((disease) => !selectedDiseaseTagIds.includes(disease.id)));
		setSelectedDiseaseTagIds([]);
		setConfirmDeleteDiseaseTagsOpen(false);
	};

	const handleCreateExamType = async (name: string) => {
		await execCreateExam({ name });
	};

	const handleCreateDiseaseTag = async (name: string) => {
		await execCreateDisease({ name });
	};

	async function uploadPdf(file: File) {
		if (file.type !== 'application/pdf') {
			toast.error(t('errors.invalidPdf'));
			return;
		}
		if (file.size > 20 * 1024 * 1024) {
			toast.error(t('errors.pdfTooLarge'));
			return;
		}
		setPdfUploading(true);
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/uploads/clinical-pdf', {
				method: 'POST',
				body: fd,
			});
			if (!res.ok) throw new Error('upload_failed');
			const data = (await res.json()) as { url: string; key: string };
			setValue('pdfUrl', data.url);
			setValue('pdfKey', data.key);
			toast.success(t('pdfUploaded'));
		} catch (e: unknown) {
			console.error(e);
			toast.error(t('errors.uploadFailed') + ' ' + e);
		} finally {
			setPdfUploading(false);
		}
	}

	function clearPdf() {
		setValue('pdfUrl', undefined);
		setValue('pdfKey', undefined);
	}

	function handleCreateTag(event: React.FormEvent) {
		event.preventDefault();
		const name = newTagName.trim();
		if (!name) {
			toast.error(t('errors.fieldsRequired'));
			return;
		}
		void execEnsureAdminTag({
			name,
			color: newTagColor,
			description: newTagDescription.trim() || null,
		});
	}

	const onSubmit = handleSubmit(async (values) => {
		// Allow saving draft without content; enforce for published only
		if (statusToCreate === 'PUBLISHED') {
			if (!values.pdfUrl && !values.textContent) {
				toast.error(t('errors.contentRequired'));
				return;
			}
			// Require exam & disease for publish
			if (!values.examType || !values.diseaseTag) {
				toast.error(t('errors.fieldsRequired'));
				return;
			}
		}
		// Always enforce exclusivity
		if (values.pdfUrl && values.textContent) {
			toast.error(t('errors.exclusive'));
			return;
		}

    if (clinicalCase) {
      await execUpdate({
        id: clinicalCase.id,
        name: values.name,
        examTypeName: values.examType || null,
        diseaseTagName: values.diseaseTag || null,
        difficulty: values.difficulty || 'BEGINNER',
        tags: values.tags,
        pdfUrl: values.pdfUrl || null,
        pdfKey: values.pdfKey || null,
        textContent: values.textContent || null,
        status: statusToCreate,
      });
      if (isAdmin && adminTags) {
        await execSetAdminTags({
          caseId: clinicalCase.id,
          tagIds: selectedAdminTags,
        });
      }
    } else {
      const result = await execCreate({
        name: values.name,
        examTypeName: values.examType || null,
        diseaseTagName: values.diseaseTag || null,
        difficulty: values.difficulty || 'BEGINNER',
        tags: values.tags,
        pdfUrl: values.pdfUrl || null,
        pdfKey: values.pdfKey || null,
        textContent: values.textContent || null,
        status: statusToCreate,
      });
      if (isAdmin && adminTags && result?.data?.id) {
        await execSetAdminTags({
          caseId: result.data.id,
          tagIds: selectedAdminTags,
        });
      }
    }
		setOpen(false);
		reset();
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next && clinicalCase) {
					reset({
						name: clinicalCase.name,
						examType: clinicalCase.examType?.name,
						diseaseTag: clinicalCase.diseaseTag?.name,
						difficulty: clinicalCase.difficulty,
						tags: clinicalCase.tags ?? [],
						textContent: clinicalCase.textContent ?? undefined,
						pdfUrl: clinicalCase.pdfUrl ?? undefined,
						pdfKey: clinicalCase.pdfKey ?? undefined,
					});
					setStatusToCreate(clinicalCase.status);
					setSelectedAdminTags(clinicalCase.adminTags?.map((tag) => tag.id) ?? []);
					setLocalAdminTags(adminTags ?? []);
				}
				if (next && !clinicalCase) {
					setLocalAdminTags(adminTags ?? []);
				}
			}}
		>
			<DialogTrigger asChild>
				{trigger ? trigger : <Button>{t('createCase')}</Button>}
			</DialogTrigger>
			<DialogContent
				size='large'
				className='max-h-[90vh] overflow-y-auto max-w-[1400px] w-full'>
            <DialogHeader>
                <DialogTitle>
                    {clinicalCase ? t('editCaseTitle', { name: clinicalCase.name }) : t('createDialog.title')}
                </DialogTitle>
            </DialogHeader>
				<form className='space-y-4' onSubmit={onSubmit}>
					<section className='space-y-3'>
						<div className='grid md:grid-cols-2 gap-3'>
							<div>
								<label className='block text-sm mb-1'>
									{t('fields.caseName')}
								</label>
								<Input required {...register('name')} />
							</div>
							<div>
								<div className='flex items-center justify-between'>
									<label className='block text-sm mb-1'>
										{t('fields.examType')}
									</label>
									{isAdmin && (
										<button
											type='button'
											className='text-xs text-blue-600'
											onClick={() => setManageExamTypesOpen(true)}>
											Manage
										</button>
									)}
								</div>
								<Controller
									name='examType'
									control={control}
									render={({ field }) => (
										<Select
											{...field}
											value={field.value ?? ''}
										>
										<option value=''>{t('selectPlaceholder')}</option>
										{examList.map((examTypeOption) => (
											<option key={examTypeOption.id} value={examTypeOption.name}>
												{examTypeOption.name}
											</option>
										))}
										</Select>
									)}
								/>
							</div>
							<div>
								<label className='block text-sm mb-1'>
									{t('fields.difficulty')}
								</label>
								<Select {...register('difficulty')}>
									<option value='BEGINNER'>
										{t('difficulty.beginner')}
									</option>
									<option value='INTERMEDIATE'>
										{t('difficulty.intermediate')}
									</option>
									<option value='ADVANCED'>
										{t('difficulty.advanced')}
									</option>
								</Select>
							</div>
							<div>
								<div className='flex items-center justify-between'>
									<label className='block text-sm mb-1'>
										{t('fields.disease')}
									</label>
									{isAdmin && (
										<button
											type='button'
											className='text-xs text-blue-600'
											onClick={() => setManageDiseaseTagsOpen(true)}>
											Manage
										</button>
									)}
								</div>
								<Controller
									name='diseaseTag'
									control={control}
									render={({ field }) => (
										<Select
											{...field}
											value={field.value ?? ''}
										>
										<option value=''>{t('selectPlaceholder')}</option>
										{diseaseList.map((diseaseTagOption) => (
											<option key={diseaseTagOption.id} value={diseaseTagOption.name}>
												{diseaseTagOption.name}
											</option>
										))}
										</Select>
									)}
								/>
							</div>
						</div>
					</section>

					<section className='space-y-3'>
						{isAdmin && adminTags ? (
							<div>
								<div className='flex items-center justify-between mb-1'>
									<label className='block text-sm'>
										Admin Tags
									</label>
									<Button
										type='button'
										size='sm'
										variant='ghost'
										onClick={() => setTagDialogOpen(true)}
									>
										<Plus className='size-4 mr-1' />
										Create New Tag
									</Button>
								</div>

								<div className='border rounded p-3 space-y-2'>
									<div className='flex flex-wrap gap-2'>
										{selectedAdminTags.length === 0 ? (
											<span className='text-sm text-muted-foreground'>No tags selected</span>
										) : (
											localAdminTags
												.filter((tag) => selectedAdminTags.includes(tag.id))
												.map((tag) => (
													<div
														key={tag.id}
														className='inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-white'
														style={{ backgroundColor: tag.color }}
													>
														<span>{tag.name}</span>
														<button
															type='button'
															onClick={() => {
																setSelectedAdminTags((previous) => previous.filter((tagId) => tagId !== tag.id));
															}}
															className='hover:opacity-80'
														>
															×
														</button>
													</div>
												))
										)}
									</div>
									<div className='border-t pt-2'>
										<div className='text-xs font-medium mb-2'>Available tags:</div>
										<div className='flex flex-wrap gap-2 max-h-32 overflow-y-auto'>
											{localAdminTags
												.filter((tag) => !selectedAdminTags.includes(tag.id))
												.sort((tagA, tagB) => tagA.name.localeCompare(tagB.name))
												.map((tag) => (
													<button
														key={tag.id}
														type='button'
														onClick={() => {
															setSelectedAdminTags((previous) => [...previous, tag.id]);
														}}
														className='inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-white hover:opacity-80'
														style={{ backgroundColor: tag.color }}
													>
														<span>{tag.name}</span>
														<span>+</span>
													</button>
												))}
										</div>
									</div>
								</div>
							</div>
						) : (
							<div>
								<label className='block text-sm mb-1'>
									{t('fields.customTags')}
								</label>
								<TagInput
									value={tags}
									onChange={(next) => setValue('tags', next)}
									placeholder={t('placeholders.customTags')}
									disabled={isExecuting}
									max={10}
								/>
								<div className='text-xs text-muted-foreground mt-1'>
									{t('hints.tags')}
								</div>
							</div>
						)}
					</section>

					<section className='space-y-3'>
						<div className='text-sm font-medium'>
							{t('content.section')}
						</div>
						<div className='text-sm text-muted-foreground'>
							{t('content.helper')}
						</div>

						<div className='border rounded-md p-4'>
							<div className='text-sm font-medium mb-2'>
								{t('content.pdf')}
							</div>
							{pdfUrl ? (
								<div className='flex items-center justify-between bg-muted px-3 py-2 rounded'>
									<div className='text-sm truncate mr-3'>
										{t('content.pdfSelected')}
									</div>
									<div className='flex gap-2 items-center'>
										<a
											href={pdfUrl}
											target='_blank'
											rel='noreferrer'
											className='text-xs text-blue-600 underline'>
											{t('view')}
										</a>
										<Button
											type='button'
											size='sm'
											variant='ghost'
											onClick={clearPdf}>
											{t('remove')}
										</Button>
									</div>
								</div>
							) : (
								<label className='block border border-dashed rounded p-6 text-center cursor-pointer'>
									<div className='text-sm text-muted-foreground'>
										{t('content.pdfDrop')}
									</div>
									<input
										type='file'
										accept='application/pdf'
										className='hidden'
										onChange={(e) => {
											const f = e.target.files?.[0];
											if (f) void uploadPdf(f);
										}}
										disabled={pdfUploading || hasText}
									/>
								</label>
							)}
							<div className='text-xs text-muted-foreground mt-1'>
								{t('content.pdfHint')}
							</div>
							{hasText ? (
								<div className='mt-2 text-yellow-700 bg-yellow-50 border border-yellow-200 text-sm rounded p-2'>
									{t('errors.exclusivePdfDisabled')}
								</div>
							) : null}
						</div>

						<div>
							<div className='text-sm font-medium mb-1'>
								{t('content.text')}
							</div>
							<RichTextEditor
								value={textContent}
								onChange={(html) => setValue('textContent', html)}
								placeholder={t('placeholders.textContent')}
								disabled={!!pdfUrl}
							/>
							{!pdfUrl && !textContent ? (
								<div className='mt-2 text-yellow-700 bg-yellow-50 border border-yellow-200 text-sm rounded p-2'>
									{t('errors.contentRequired')}
								</div>
							) : null}
							{pdfUrl ? (
								<div className='mt-2 text-yellow-700 bg-yellow-50 border border-yellow-200 text-sm rounded p-2'>
									{t('errors.exclusiveTextDisabled')}
								</div>
							) : null}
						</div>
					</section>

            <DialogFooter className='gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(false)}>
                {t('cancel')}
              </Button>
              {clinicalCase ? null : (
                <Button
                  type='submit'
                  variant='secondary'
                  disabled={isExecuting}
                  onClick={() => setStatusToCreate('DRAFT')}>
                  {isExecuting && statusToCreate === 'DRAFT' ? t('saving') : t('saveProgress')}
                </Button>
              )}
              <Button
                type='submit'
                disabled={isExecuting}
                onClick={() => setStatusToCreate('PUBLISHED')}>
                {clinicalCase
                  ? isExecuting
                    ? t('saving')
                    : t('update')
                  : isExecuting
                    ? t('creating')
                    : t('create')}
              </Button>
            </DialogFooter>
				</form>
			</DialogContent>

			<Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>Create New Admin Tag</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleCreateTag} className='space-y-4'>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>Name</label>
							<Input
								value={newTagName}
								onChange={(event) => setNewTagName(event.target.value)}
								placeholder='e.g. Must-know'
								autoFocus
							/>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>Color</label>
							<div className='flex items-center gap-2'>
								<input
									type='color'
									value={newTagColor}
									onChange={(event) => setNewTagColor(event.target.value)}
									className='h-10 w-14 rounded border cursor-pointer'
								/>
								<Input
									value={newTagColor}
									onChange={(event) => setNewTagColor(event.target.value)}
									className='font-mono'
								/>
							</div>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>Description (Optional)</label>
							<Textarea
								value={newTagDescription}
								onChange={(event) => setNewTagDescription(event.target.value)}
								placeholder='Optional description...'
								rows={3}
							/>
						</div>
						<DialogFooter>
							<Button
								type='button'
								variant='outline'
								onClick={() => {
									setTagDialogOpen(false);
									setNewTagName('');
									setNewTagColor('#3b82f6');
									setNewTagDescription('');
								}}
								disabled={creatingTag}
							>
								Cancel
							</Button>
							<Button type='submit' disabled={creatingTag}>
								{creatingTag ? 'Creating...' : 'Create Tag'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={manageExamTypesOpen} onOpenChange={setManageExamTypesOpen}>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>Manage Exam Types</DialogTitle>
					</DialogHeader>
					<DeletableSelectManager
						options={examList}
						onDelete={handleDeleteExamTypes}
						onCreate={handleCreateExamType}
						disabled={deletingExamTypes || creatingExam}
						deleting={deletingExamTypes}
						creating={creatingExam}
						createLabel={t('addNewExamPrompt')}
						createPlaceholder={t('addNewExamPrompt')}
						selectedIds={selectedExamTypeIds}
						onSelectedIdsChange={setSelectedExamTypeIds}
					/>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setManageExamTypesOpen(false)}
							disabled={deletingExamTypes || creatingExam}
						>
							Close
						</Button>
						<Button
							type='button'
							variant='destructive'
							onClick={() => setConfirmDeleteExamTypesOpen(true)}
							disabled={deletingExamTypes || creatingExam || selectedExamTypeIds.length === 0}
						>
							{deletingExamTypes ? t('deletingItems') : t('deleteSelected')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={manageDiseaseTagsOpen} onOpenChange={setManageDiseaseTagsOpen}>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>Manage Disease Tags</DialogTitle>
					</DialogHeader>
					<DeletableSelectManager
						options={diseaseList}
						onDelete={handleDeleteDiseaseTags}
						onCreate={handleCreateDiseaseTag}
						disabled={deletingDiseaseTags || creatingDisease}
						deleting={deletingDiseaseTags}
						creating={creatingDisease}
						createLabel={t('addNewDiseasePrompt')}
						createPlaceholder={t('addNewDiseasePrompt')}
						selectedIds={selectedDiseaseTagIds}
						onSelectedIdsChange={setSelectedDiseaseTagIds}
					/>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setManageDiseaseTagsOpen(false)}
							disabled={deletingDiseaseTags || creatingDisease}
						>
							Close
						</Button>
						<Button
							type='button'
							variant='destructive'
							onClick={() => setConfirmDeleteDiseaseTagsOpen(true)}
							disabled={deletingDiseaseTags || creatingDisease || selectedDiseaseTagIds.length === 0}
						>
							{deletingDiseaseTags ? t('deletingItems') : t('deleteSelected')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={confirmDeleteExamTypesOpen} onOpenChange={setConfirmDeleteExamTypesOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('confirmDeleteItems', { count: selectedExamTypeIds.length })}</AlertDialogTitle>
						<AlertDialogDescription>{t('confirmDeleteItemsDesc')}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteExamTypes} className='bg-destructive text-white hover:bg-destructive/90'>
							{t('delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={confirmDeleteDiseaseTagsOpen} onOpenChange={setConfirmDeleteDiseaseTagsOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('confirmDeleteItems', { count: selectedDiseaseTagIds.length })}</AlertDialogTitle>
						<AlertDialogDescription>{t('confirmDeleteItemsDesc')}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteDiseaseTags} className='bg-destructive text-white hover:bg-destructive/90'>
							{t('delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Dialog>
	);
}
