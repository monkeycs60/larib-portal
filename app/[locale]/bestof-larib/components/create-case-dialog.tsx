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
import { tagChipStyle } from '@/lib/tag-color';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { TagInput } from '@/components/ui/tag-input';
import { Plus, Settings, FilePlus2, Check, FileText, Type, UploadCloud, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  caseNumber: number;
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

const DIFFICULTY_OPTIONS = [
  { value: 'BEGINNER', dotClass: 'bg-success-500' },
  { value: 'INTERMEDIATE', dotClass: 'bg-warn-500' },
  { value: 'ADVANCED', dotClass: 'bg-danger-500' },
] as const;

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
	const [reportMode, setReportMode] = useState<'pdf' | 'text'>(clinicalCase?.textContent ? 'text' : 'pdf');

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
	const difficulty = watch('difficulty') ?? 'BEGINNER';

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
					setSelectedAdminTags([]);
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
			<DialogContent className='sm:max-w-2xl p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col'>
				<div className='relative bg-bg-surface px-6 py-4'>
					<span className='absolute left-0 top-0 h-full w-1 rounded-l-lg bg-coral-500' />
					<div className='flex items-start gap-3'>
						<div className='rounded-xl bg-coral-50 p-2.5 text-coral-600'>
							<FilePlus2 className='h-5 w-5' />
						</div>
						<DialogHeader className='gap-0.5'>
							<DialogTitle className='text-lg font-bold'>
								{clinicalCase ? t('editCaseTitle', { name: clinicalCase.name }) : t('createDialog.title')}
							</DialogTitle>
							<p className='text-sm text-text-secondary'>{t('createDialog.subtitle')}</p>
						</DialogHeader>
					</div>
				</div>
				<form className='flex flex-1 min-h-0 flex-col' onSubmit={onSubmit}>
					<div className='flex-1 overflow-y-auto bg-bg-app px-6 py-5 space-y-4'>
						{clinicalCase ? (
							<div className='rounded-lg border border-line bg-bg-surface p-4 text-sm'>
								<div className='font-medium text-text-primary'>{t('dicom.caseNumber')}: {String(clinicalCase.caseNumber).padStart(4, '0')}</div>
								{clinicalCase.examType ? (
									<div className='text-text-secondary mt-1'>
										{t('dicom.ftpPath', { path: `bestof/${clinicalCase.examType.name}/${String(clinicalCase.caseNumber).padStart(4, '0')}/` })}
									</div>
								) : null}
							</div>
						) : null}

					<section className='rounded-xl border border-line bg-bg-surface p-5'>
						<div className='flex items-center gap-2 mb-4'>
							<span className='h-1.5 w-1.5 rounded-full bg-coral-500' />
							<span className='text-xs font-semibold uppercase tracking-wide text-coral-600'>{t('sectionCaseDetails')}</span>
							<span className='h-px flex-1 bg-line ml-2' />
						</div>
						<div className='space-y-4'>
							<div>
								<label className='block text-sm font-medium text-text-primary mb-1.5'>{t('fields.caseName')}</label>
								<Input required placeholder={t('placeholders.caseName')} {...register('name')} />
							</div>
							<div className='grid md:grid-cols-2 gap-4'>
								<div>
									<div className='flex items-center justify-between mb-1.5'>
										<label className='block text-sm font-medium text-text-primary'>{t('fields.examType')}</label>
										{isAdmin && (
											<button type='button' className='text-xs font-medium text-coral-600' onClick={() => setManageExamTypesOpen(true)}>
												{t('manage')}
											</button>
										)}
									</div>
									<Controller
										name='examType'
										control={control}
										render={({ field }) => (
											<Select {...field} value={field.value ?? ''}>
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
									<div className='flex items-center justify-between mb-1.5'>
										<label className='block text-sm font-medium text-text-primary'>{t('fields.disease')}</label>
										{isAdmin && (
											<button type='button' className='text-xs font-medium text-coral-600' onClick={() => setManageDiseaseTagsOpen(true)}>
												{t('manage')}
											</button>
										)}
									</div>
									<Controller
										name='diseaseTag'
										control={control}
										render={({ field }) => (
											<Select {...field} value={field.value ?? ''}>
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
							<div>
								<label className='block text-sm font-medium text-text-primary mb-1.5'>{t('fields.difficulty')}</label>
								<div className='grid grid-cols-3 gap-2'>
									{DIFFICULTY_OPTIONS.map((option) => {
										const selected = difficulty === option.value
										return (
											<button
												key={option.value}
												type='button'
												onClick={() => setValue('difficulty', option.value, { shouldDirty: true })}
												className={cn(
													'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer',
													selected
														? 'border-navy-700 bg-navy-50 text-text-primary ring-1 ring-navy-700'
														: 'border-line bg-bg-surface text-text-secondary hover:bg-gray-50'
												)}
											>
												<span className={cn('h-2 w-2 rounded-full', option.dotClass)} />
												{option.value === 'BEGINNER'
													? t('difficulty.beginner')
													: option.value === 'INTERMEDIATE'
														? t('difficulty.intermediate')
														: t('difficulty.advanced')}
											</button>
										)
									})}
								</div>
							</div>
						</div>
					</section>

					<section className='rounded-xl border border-line bg-bg-surface p-5'>
						{isAdmin && adminTags ? (
							<div>
								<div className='flex items-center gap-2 mb-4'>
									<span className='h-1.5 w-1.5 rounded-full bg-coral-500' />
									<span className='text-xs font-semibold uppercase tracking-wide text-coral-600'>{t('table.adminTags')}</span>
									{selectedAdminTags.length > 0 && (
										<span className='rounded-full bg-coral-50 text-coral-600 text-xs font-semibold px-2 py-0.5'>{t('selectedCount', { count: selectedAdminTags.length })}</span>
									)}
									<span className='h-px flex-1 bg-line mx-2' />
									<Button
										type='button'
										size='sm'
										variant='ghost'
										className='text-coral-600 hover:text-coral-700'
										onClick={() => tagsManagerTriggerRef.current?.click()}
									>
										<Settings className='size-4 mr-1' />
										{t('tagsManager')}
									</Button>
								</div>

								<div className='rounded-lg border border-line bg-bg-app px-3 py-2.5 min-h-11 flex flex-wrap gap-2 items-center'>
									{selectedAdminTags.length === 0 ? (
										<span className='text-sm text-text-secondary'>{t('caseView.noTagsSelected')}</span>
									) : (
										localAdminTags
											.filter((tag) => selectedAdminTags.includes(tag.id))
											.map((tag) => (
												<div
													key={tag.id}
													className='inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium'
													style={tagChipStyle(tag.color)}
												>
													<span>{tag.name}</span>
													<button
														type='button'
														onClick={() => {
															setSelectedAdminTags((previous) => previous.filter((tagId) => tagId !== tag.id));
														}}
														className='hover:opacity-70 cursor-pointer'
													>
														×
													</button>
												</div>
											))
									)}
								</div>

								<div className='mt-3'>
									<div className='text-xs font-medium text-text-secondary mb-2'>{t('availableTags')}</div>
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
													className='inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium hover:opacity-80 cursor-pointer'
													style={tagChipStyle(tag.color)}
												>
													<span>{tag.name}</span>
													<Plus className='size-3' />
												</button>
											))}
									</div>
								</div>
							</div>
						) : (
							<div>
								<div className='flex items-center gap-2 mb-4'>
									<span className='h-1.5 w-1.5 rounded-full bg-coral-500' />
									<span className='text-xs font-semibold uppercase tracking-wide text-coral-600'>{t('fields.customTags')}</span>
									<span className='h-px flex-1 bg-line ml-2' />
								</div>
								<TagInput
									value={tags}
									onChange={(next) => setValue('tags', next)}
									placeholder={t('placeholders.customTags')}
									disabled={isExecuting}
									max={10}
								/>
								<div className='text-xs text-text-secondary mt-2'>
									{t('hints.tags')}
								</div>
							</div>
						)}
					</section>

					<section className='rounded-xl border border-line bg-bg-surface p-5'>
						<div className='flex items-center gap-2 mb-4'>
							<span className='h-1.5 w-1.5 rounded-full bg-coral-500' />
							<span className='text-xs font-semibold uppercase tracking-wide text-coral-600'>{t('content.section')}</span>
							<span className='h-px flex-1 bg-line ml-2' />
						</div>
						<p className='text-sm text-text-secondary mb-3'>{t('content.helper')}</p>

						<div className='grid grid-cols-2 gap-1 rounded-lg border border-line bg-bg-app p-1 mb-4'>
							<button
								type='button'
								onClick={() => setReportMode('pdf')}
								className={cn(
									'flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
									reportMode === 'pdf' ? 'bg-bg-surface text-text-primary shadow-elevation-xs' : 'text-text-secondary hover:text-text-primary'
								)}
							>
								<FileText className='size-4' />
								{t('content.pdfTab')}
							</button>
							<button
								type='button'
								onClick={() => setReportMode('text')}
								className={cn(
									'flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
									reportMode === 'text' ? 'bg-bg-surface text-text-primary shadow-elevation-xs' : 'text-text-secondary hover:text-text-primary'
								)}
							>
								<Type className='size-4' />
								{t('content.text')}
							</button>
						</div>

						{reportMode === 'pdf' ? (
							pdfUrl ? (
								<div className='flex items-center justify-between rounded-lg border border-line bg-bg-app px-4 py-3'>
									<div className='text-sm truncate mr-3 text-text-primary'>{t('content.pdfSelected')}</div>
									<div className='flex gap-2 items-center'>
										<a href={pdfUrl} target='_blank' rel='noreferrer' className='text-xs text-coral-600 underline'>
											{t('view')}
										</a>
										<Button type='button' size='sm' variant='ghost' onClick={clearPdf}>
											{t('remove')}
										</Button>
									</div>
								</div>
							) : (
								<label className='flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-bg-app px-6 py-10 text-center cursor-pointer transition-colors hover:border-coral-300 hover:bg-coral-50/40'>
									<span className='rounded-xl bg-coral-50 p-3 text-coral-600'>
										{pdfUploading ? <Loader2 className='size-6 animate-spin' /> : <UploadCloud className='size-6' />}
									</span>
									<span className='text-sm font-medium text-text-primary'>{t('content.pdfDropTitle')}</span>
									<span className='text-xs text-text-muted'>{t('content.pdfDropHint')}</span>
									<input
										type='file'
										accept='application/pdf'
										className='hidden'
										onChange={(e) => {
											const f = e.target.files?.[0];
											if (f) void uploadPdf(f);
										}}
										disabled={pdfUploading}
									/>
								</label>
							)
						) : (
							<RichTextEditor
								value={textContent}
								onChange={(html) => setValue('textContent', html)}
								placeholder={t('placeholders.textContent')}
								disabled={!!pdfUrl}
							/>
						)}
					</section>

					</div>
					<div className='flex items-center justify-between gap-3 border-t border-line bg-bg-surface px-6 py-4'>
						<div>
							{!pdfUrl && !hasText ? (
								<span className='flex items-center gap-2 text-sm text-text-muted'>
									<span className='h-1.5 w-1.5 rounded-full bg-warn-500' />
									{t('footerHint')}
								</span>
							) : null}
						</div>
						<div className='flex items-center gap-3'>
							<Button type='button' variant='outline' onClick={() => setOpen(false)}>
								{t('cancel')}
							</Button>
							{clinicalCase ? null : (
								<Button type='submit' variant='secondary' disabled={isExecuting} onClick={() => setStatusToCreate('DRAFT')}>
									{isExecuting && statusToCreate === 'DRAFT' ? t('saving') : t('saveProgress')}
								</Button>
							)}
							<Button type='submit' disabled={isExecuting} onClick={() => setStatusToCreate('PUBLISHED')}>
								<Check className='size-4' />
								{clinicalCase ? (isExecuting ? t('saving') : t('update')) : (isExecuting ? t('creating') : t('create'))}
							</Button>
						</div>
					</div>
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
