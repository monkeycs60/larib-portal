'use client';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { TagInput } from '@/components/ui/tag-input';
import { InputDialog } from '@/components/ui/input-dialog';
import { useAction } from 'next-safe-action/hooks';
import { createCaseAction, createDiseaseTagAction, createExamTypeAction, updateCaseAction } from '../actions';
import { toast } from 'sonner';

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
}

export default function CreateCaseDialog({
  examTypes,
  diseaseTags,
  trigger,
  clinicalCase,
}: {
  examTypes: Option[];
  diseaseTags: Option[];
  trigger?: ReactNode;
  clinicalCase?: ClinicalCase;
}) {
	const t = useTranslations('bestof');
	const [open, setOpen] = useState(false);
	const [examList, setExamList] = useState(examTypes);
	const [diseaseList, setDiseaseList] = useState(diseaseTags);
	const [pdfUploading, setPdfUploading] = useState(false);
	const [statusToCreate, setStatusToCreate] = useState<'DRAFT' | 'PUBLISHED'>(
		clinicalCase?.status ?? 'PUBLISHED'
	);

  const { register, handleSubmit, setValue, reset, watch } =
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
  const isExecuting = creatingCase || updatingCase;

	const { execute: execCreateExam, isExecuting: creatingExam } = useAction(
		createExamTypeAction,
		{
			onSuccess(res) {
				if (res.data) {
      setExamList((previous) => [
        ...previous.filter((examType) => examType.id !== res.data!.id),
        res.data!,
      ]);
					setValue('examType', res.data!.name);
				}
			},
		}
	);
	const { execute: execCreateDisease, isExecuting: creatingDisease } =
		useAction(createDiseaseTagAction, {
			onSuccess(res) {
				if (res.data)
      setDiseaseList((previous) => [
        ...previous.filter((disease) => disease.id !== res.data!.id),
        res.data!,
      ]);
				setValue('diseaseTag', res.data!.name);
			},
		});

	const [examDialogOpen, setExamDialogOpen] = useState(false);
	const [newExamName, setNewExamName] = useState('');
	async function confirmAddExam() {
		const name = newExamName.trim();
		if (!name) return;
		await execCreateExam({ name });
		setExamDialogOpen(false);
		setNewExamName('');
	}

	const [diseaseDialogOpen, setDiseaseDialogOpen] = useState(false);
	const [newDiseaseName, setNewDiseaseName] = useState('');
	async function confirmAddDisease() {
		const name = newDiseaseName.trim();
		if (!name) return;
		await execCreateDisease({ name });
		setDiseaseDialogOpen(false);
		setNewDiseaseName('');
	}

	async function uploadPdf(file: File) {
		if (file.type !== 'application/pdf') {
			toast.error(t('errors.invalidPdf'));
			return;
		}
		if (file.size > 10 * 1024 * 1024) {
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
			toast.error(t('errors.uploadFailed'));
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
    } else {
      await execCreate({
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
									<button
										type='button'
										className='text-xs text-blue-600'
										onClick={() => {
											setExamDialogOpen(true);
											setNewExamName('');
										}}
										disabled={creatingExam}>
										{t('addNewExam')}
									</button>
								</div>
								<Select {...register('examType')}>
									<option value=''>{t('selectPlaceholder')}</option>
                    {examList.map((examTypeOption) => (
                        <option key={examTypeOption.id} value={examTypeOption.name}>
                            {examTypeOption.name}
                        </option>
                    ))}
								</Select>
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
									<button
										type='button'
										className='text-xs text-blue-600'
										onClick={() => {
											setDiseaseDialogOpen(true);
											setNewDiseaseName('');
										}}
										disabled={creatingDisease}>
										{t('addNewDisease')}
									</button>
								</div>
								<Select {...register('diseaseTag')}>
									<option value=''>{t('selectPlaceholder')}</option>
                    {diseaseList.map((diseaseTagOption) => (
                        <option key={diseaseTagOption.id} value={diseaseTagOption.name}>
                            {diseaseTagOption.name}
                        </option>
                    ))}
								</Select>
							</div>
						</div>
					</section>

					<section className='space-y-3'>
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
									<div className='flex gap-2'>
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
				<InputDialog
					open={examDialogOpen}
					onOpenChange={setExamDialogOpen}
					title={t('addNewExam')}
					label={t('addNewExamPrompt')}
					placeholder={t('addNewExamPrompt')}
					confirmText={t('create')}
					cancelText={t('cancel')}
					value={newExamName}
					onValueChange={setNewExamName}
					onConfirm={confirmAddExam}
					loading={creatingExam}
					minLength={2}
				/>
				<InputDialog
					open={diseaseDialogOpen}
					onOpenChange={setDiseaseDialogOpen}
					title={t('addNewDisease')}
					label={t('addNewDiseasePrompt')}
					placeholder={t('addNewDiseasePrompt')}
					confirmText={t('create')}
					cancelText={t('cancel')}
					value={newDiseaseName}
					onValueChange={setNewDiseaseName}
					onConfirm={confirmAddDisease}
					loading={creatingDisease}
					minLength={2}
				/>
			</DialogContent>
		</Dialog>
	);
}
