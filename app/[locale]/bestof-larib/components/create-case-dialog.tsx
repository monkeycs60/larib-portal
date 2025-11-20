'use client';
import { useState, useRef, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
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
import { Plus, Settings } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { createCaseAction, createDiseaseTagAction, createExamTypeAction, updateCaseAction, setCaseAdminTagsAction, deleteExamTypesAction, deleteDiseaseTagsAction, listAdminTagsAction, updateExamTypeAction, updateDiseaseTagAction } from '../actions';
import { toast } from 'sonner';
import DeletableSelectManager from './deletable-select-manager';
import TagsManagerModal from './tags-manager-modal';

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
	const router = useRouter();
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
	const [localAdminTags, setLocalAdminTags] = useState<AdminTag[]>(adminTags ?? []);
	const tagsManagerTriggerRef = useRef<HTMLButtonElement>(null);
	const [hasDataChanges, setHasDataChanges] = useState(false);

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

  const { executeAsync: execCreate, isExecuting: creatingCase } = useAction(createCaseAction, {
    onError({ error }) {
      const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError');
      toast.error(msg);
    },
  });
  const { executeAsync: execUpdate, isExecuting: updatingCase } = useAction(updateCaseAction, {
    onError({ error }) {
      const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError');
      toast.error(msg);
    },
  });
  const { executeAsync: execSetAdminTags, isExecuting: settingTags } = useAction(setCaseAdminTagsAction, {
    onError({ error }) {
      const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError');
      toast.error(msg);
    },
  });
  const { execute: execListAdminTags } = useAction(listAdminTagsAction, {
    onSuccess(res) {
      const tags = Array.isArray(res.data) ? (res.data as AdminTag[]) : [];
      setLocalAdminTags(tags);
    },
  });
  const isExecuting = creatingCase || updatingCase || settingTags;

	function handleTagsManagerClose() {
		void execListAdminTags();
	}

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
				setHasDataChanges(true);
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
				setHasDataChanges(true);
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
				toast.success(t('itemsDeleted', { count: deleted }));
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
				toast.success(t('itemsDeleted', { count: deleted }));
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

	const { execute: execUpdateExamType, isExecuting: updatingExamType } = useAction(
		updateExamTypeAction,
		{
			onSuccess(res) {
				const updated = res.data;
				if (!updated) return;
				const oldExam = examList.find((exam) => exam.id === updated.id);
				const currentValue = watch('examType');
				if (oldExam && currentValue === oldExam.name) {
					setValue('examType', updated.name, { shouldDirty: true });
				}
				setExamList((previous) => {
					const next = previous.map((exam) =>
						exam.id === updated.id ? updated : exam
					);
					next.sort((leftExam, rightExam) => leftExam.name.localeCompare(rightExam.name));
					return next;
				});
				setHasDataChanges(true);
				toast.success(t('updated'));
			},
			onError({ error }) {
				const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError');
				toast.error(msg);
			},
		}
	);

	const { execute: execUpdateDiseaseTag, isExecuting: updatingDiseaseTag } = useAction(
		updateDiseaseTagAction,
		{
			onSuccess(res) {
				const updated = res.data;
				if (!updated) return;
				const oldDisease = diseaseList.find((disease) => disease.id === updated.id);
				const currentValue = watch('diseaseTag');
				if (oldDisease && currentValue === oldDisease.name) {
					setValue('diseaseTag', updated.name, { shouldDirty: true });
				}
				setDiseaseList((previous) => {
					const next = previous.map((disease) =>
						disease.id === updated.id ? updated : disease
					);
					next.sort((leftDisease, rightDisease) => leftDisease.name.localeCompare(rightDisease.name));
					return next;
				});
				setHasDataChanges(true);
				toast.success(t('updated'));
			},
			onError({ error }) {
				const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError');
				toast.error(msg);
			},
		}
	);

	const handleDeleteExamTypes = async () => {
		if (selectedExamTypeIds.length === 0) return;
		await execDeleteExamTypes({ ids: selectedExamTypeIds });
		setExamList((previous) => previous.filter((exam) => !selectedExamTypeIds.includes(exam.id)));
		setSelectedExamTypeIds([]);
		setConfirmDeleteExamTypesOpen(false);
		setManageExamTypesOpen(false);
		setHasDataChanges(true);
	};

	const handleDeleteDiseaseTags = async () => {
		if (selectedDiseaseTagIds.length === 0) return;
		await execDeleteDiseaseTags({ ids: selectedDiseaseTagIds });
		setDiseaseList((previous) => previous.filter((disease) => !selectedDiseaseTagIds.includes(disease.id)));
		setSelectedDiseaseTagIds([]);
		setConfirmDeleteDiseaseTagsOpen(false);
		setManageDiseaseTagsOpen(false);
		setHasDataChanges(true);
	};

	const handleCreateExamType = async (name: string) => {
		await execCreateExam({ name });
	};

	const handleCreateDiseaseTag = async (name: string) => {
		await execCreateDisease({ name });
	};

	const handleUpdateExamType = async (id: string, name: string) => {
		await execUpdateExamType({ id, name });
	};

	const handleUpdateDiseaseTag = async (id: string, name: string) => {
		await execUpdateDiseaseTag({ id, name });
	};

	async function uploadPdf(file: File) {
		if (file.type !== 'application/pdf') {
			toast.error(t('errors.invalidPdf'));
			return;
		}
		if (file.size > 30 * 1024 * 1024) {
			toast.error(t('errors.pdfTooLarge'));
			return;
		}
		setPdfUploading(true);
		try {
			const signedUrlRes = await fetch('/api/uploads/clinical-pdf-signed', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					filename: file.name,
					contentType: file.type,
				}),
			});
			if (!signedUrlRes.ok) throw new Error('signed_url_failed');
			const signedUrlData = (await signedUrlRes.json()) as {
				uploadUrl: string;
				key: string;
				publicUrl: string;
			};

			const uploadRes = await fetch(signedUrlData.uploadUrl, {
				method: 'PUT',
				body: file,
				headers: {
					'Content-Type': file.type,
				},
			});

			if (!uploadRes.ok) {
				if (file.size <= 4.5 * 1024 * 1024) {
					console.warn('Direct upload failed, trying fallback for small file...');
					const fd = new FormData();
					fd.append('file', file);
					const fallbackRes = await fetch('/api/uploads/clinical-pdf', {
						method: 'POST',
						body: fd,
					});
					if (!fallbackRes.ok) throw new Error('fallback_upload_failed');
					const fallbackData = (await fallbackRes.json()) as { url: string; key: string };
					setValue('pdfUrl', fallbackData.url);
					setValue('pdfKey', fallbackData.key);
					toast.success(t('pdfUploaded'));
					return;
				}
				throw new Error('upload_failed');
			}

			setValue('pdfUrl', signedUrlData.publicUrl);
			setValue('pdfKey', signedUrlData.key);
			toast.success(t('pdfUploaded'));
		} catch (e: unknown) {
			console.error(e);
			const errorMessage = e instanceof Error ? e.message : String(e);
			if (errorMessage.includes('CORS') || errorMessage.includes('cors')) {
				toast.error(t('errors.uploadFailed') + ' - CORS configuration needed on R2. See docs/R2_CORS_CONFIGURATION.md');
			} else {
				toast.error(t('errors.uploadFailed') + ' ' + errorMessage);
			}
		} finally {
			setPdfUploading(false);
		}
	}

	function clearPdf() {
		setValue('pdfUrl', undefined);
		setValue('pdfKey', undefined);
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
      const updateResult = await execUpdate({
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
      if (!updateResult?.data) return;
      if (isAdmin && adminTags) {
        await execSetAdminTags({
          caseId: clinicalCase.id,
          tagIds: selectedAdminTags,
        });
      }
      toast.success(t('updated'));
      setOpen(false);
      reset();
      router.refresh();
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
      const createdId = result?.data?.id;
      if (!createdId) return;
      if (isAdmin && adminTags) {
        await execSetAdminTags({
          caseId: createdId,
          tagIds: selectedAdminTags,
        });
      }
      toast.success(t('created'));
      setOpen(false);
      reset();
      router.refresh();
    }
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
					if (isAdmin) {
						void execListAdminTags();
					}
				}
				if (next && !clinicalCase) {
					if (isAdmin) {
						void execListAdminTags();
					}
				}
				if (!next && hasDataChanges) {
					router.refresh();
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
										onClick={() => tagsManagerTriggerRef.current?.click()}
									>
										<Settings className='size-4 mr-1' />
										{t('tagsManager')}
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

			<Dialog open={manageExamTypesOpen} onOpenChange={setManageExamTypesOpen}>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>{t('manageExamTypes')}</DialogTitle>
					</DialogHeader>
					<DeletableSelectManager
						options={examList}
						onDelete={handleDeleteExamTypes}
						onCreate={handleCreateExamType}
						onUpdate={handleUpdateExamType}
						disabled={deletingExamTypes || creatingExam || updatingExamType}
						deleting={deletingExamTypes}
						creating={creatingExam}
						updating={updatingExamType}
						createLabel={t('addNewExamPrompt')}
						createPlaceholder={t('addNewExamPrompt')}
						createButtonLabel={t('createExamTypeCta')}
						selectedIds={selectedExamTypeIds}
						onSelectedIdsChange={setSelectedExamTypeIds}
					/>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setManageExamTypesOpen(false)}
							disabled={deletingExamTypes || creatingExam || updatingExamType}
						>
							{t('close')}
						</Button>
						<Button
							type='button'
							variant='destructive'
							onClick={() => setConfirmDeleteExamTypesOpen(true)}
							disabled={deletingExamTypes || creatingExam || updatingExamType || selectedExamTypeIds.length === 0}
						>
							{deletingExamTypes ? t('deletingItems') : t('deleteSelected')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={manageDiseaseTagsOpen} onOpenChange={setManageDiseaseTagsOpen}>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>{t('manageDiagnosis')}</DialogTitle>
					</DialogHeader>
					<DeletableSelectManager
						options={diseaseList}
						onDelete={handleDeleteDiseaseTags}
						onCreate={handleCreateDiseaseTag}
						onUpdate={handleUpdateDiseaseTag}
						disabled={deletingDiseaseTags || creatingDisease || updatingDiseaseTag}
						deleting={deletingDiseaseTags}
						creating={creatingDisease}
						updating={updatingDiseaseTag}
						createLabel={t('addNewDiseasePrompt')}
						createPlaceholder={t('addNewDiseasePrompt')}
						createButtonLabel={t('createDiseaseCta')}
						selectedIds={selectedDiseaseTagIds}
						onSelectedIdsChange={setSelectedDiseaseTagIds}
					/>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setManageDiseaseTagsOpen(false)}
							disabled={deletingDiseaseTags || creatingDisease || updatingDiseaseTag}
						>
							{t('close')}
						</Button>
						<Button
							type='button'
							variant='destructive'
							onClick={() => setConfirmDeleteDiseaseTagsOpen(true)}
							disabled={deletingDiseaseTags || creatingDisease || updatingDiseaseTag || selectedDiseaseTagIds.length === 0}
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

			{isAdmin && adminTags && (
				<TagsManagerModal
					isAdmin={true}
					trigger={
						<button
							ref={tagsManagerTriggerRef}
							style={{ display: 'none' }}
							type='button'
							aria-hidden='true'
						/>
					}
					onClose={handleTagsManagerClose}
					disableRouterRefresh={true}
				/>
			)}
		</Dialog>
	);
}
