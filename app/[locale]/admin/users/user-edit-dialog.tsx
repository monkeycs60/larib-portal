'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations, useLocale } from 'next-intl';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useState } from 'react';
import { updateUserAction, createPositionAction, updatePositionAction, deletePositionsAction } from './actions';
import { useAction } from 'next-safe-action/hooks';
import { COUNTRIES } from '@/lib/countries';
import { toast } from 'sonner';
import { Check, Pencil, Save, UserCog } from 'lucide-react';
import DeletableSelectManager from '@/app/[locale]/bestof-larib/components/deletable-select-manager';
import { FileUpload } from '@/components/ui/file-upload';

const AVAILABLE_APPLICATIONS = ['BESTOF_LARIB', 'CONGES'] as const;
type AvailableApplication = (typeof AVAILABLE_APPLICATIONS)[number];

const APP_DOT: Record<AvailableApplication, string> = {
	BESTOF_LARIB: '#ec3b68',
	CONGES: '#6366f1',
};

const FormSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	phoneNumber: z.string().optional(),
	role: z.enum(['ADMIN', 'USER']),
	country: z.string().optional(),
	birthDate: z.string().optional(),
	language: z.enum(['EN', 'FR']).optional(),
	position: z.string().optional(),
	arrivalDate: z.string().optional(),
	departureDate: z.string().optional(),
	applications: z.array(z.enum(['BESTOF_LARIB', 'CONGES', 'CARDIOLARIB'])),
	adminApplications: z.array(z.enum(['BESTOF_LARIB', 'CONGES', 'CARDIOLARIB'])),
	congesTotalDays: z.number().int().min(0).max(365).optional(),
	profilePhoto: z.string().url().optional().nullable(),
});

export type UserFormValues = z.infer<typeof FormSchema>;

export function UserEditDialog({
	initial,
	positions,
}: {
	initial: UserFormValues;
	positions: Array<{ id: string; name: string }>;
}) {
	const t = useTranslations('admin');
	const locale = useLocale();
	const [open, setOpen] = useState(false);
	const { execute: executeUpdate, isExecuting } = useAction(updateUserAction, {
		onSuccess() {
			toast.success(t('saved'));
			setOpen(false);
		},
		onError({ error: { serverError, validationErrors } }) {
			let msg: string | undefined;
			if (validationErrors && typeof validationErrors === 'object') {
				const first = Object.values(validationErrors)[0] as {
					_errors?: string[];
				};
				const firstErr = first?._errors?.[0];
				if (typeof firstErr === 'string') msg = firstErr;
			}
			if (!msg && typeof serverError === 'string') msg = serverError;
			toast.error(msg ? `${t('actionError')}: ${msg}` : t('actionError'));
		},
	});
	const { register, handleSubmit, setValue, watch } = useForm<UserFormValues>({
		resolver: zodResolver(FormSchema),
		defaultValues: initial,
	});
	const [posList, setPosList] = useState(positions);
	const [managePositionsOpen, setManagePositionsOpen] = useState(false);
	const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>([]);

	const { execute: execCreatePos, isExecuting: creatingPos } = useAction(
		createPositionAction,
		{
			onSuccess(result) {
				if (result.data) {
					setPosList((prev) => [...prev.filter(position => position.id !== result.data!.id), result.data!].sort((a, b) => a.name.localeCompare(b.name)));
					toast.success(t('positionCreated'));
				}
			},
			onError() {
				toast.error(t('actionError'));
			}
		}
	);

	const { execute: execUpdatePos, isExecuting: updatingPos } = useAction(updatePositionAction, {
		onSuccess(result) {
			if (result.data) {
				setPosList((prev) => prev.map(position => position.id === result.data!.id ? result.data! : position).sort((a, b) => a.name.localeCompare(b.name)));
				toast.success(t('saved'));
			}
		},
		onError() {
			toast.error(t('actionError'));
		}
	});

	const { execute: execDeletePos, isExecuting: deletingPos } = useAction(deletePositionsAction, {
		onSuccess(result) {
			if (result.data) {
				setPosList((prev) => prev.filter(position => !selectedPositionIds.includes(position.id)));
				setSelectedPositionIds([]);
				toast.success(t('deleted'));
			}
		},
		onError({ error }) {
			if (error.serverError?.includes('POSITIONS_IN_USE')) {
				const count = error.serverError.split(':')[1];
				toast.error(t('positionsInUse', { count }));
			} else {
				toast.error(t('actionError'));
			}
		}
	});

	async function handleCreatePosition(name: string) {
		await execCreatePos({ name });
	}

	async function handleUpdatePosition(id: string, name: string) {
		await execUpdatePos({ id, name });
	}

	async function handleDeletePositions(ids: string[]) {
		await execDeletePos({ ids });
	}

	const apps = new Set(watch('applications').filter((app): app is AvailableApplication =>
		AVAILABLE_APPLICATIONS.includes(app as AvailableApplication)
	));
	const adminApps = new Set(watch('adminApplications').filter((app): app is AvailableApplication =>
		AVAILABLE_APPLICATIONS.includes(app as AvailableApplication)
	));
	function toggleApp(app: AvailableApplication) {
		if (apps.has(app)) {
			apps.delete(app);
		} else {
			apps.add(app);
		}
		setValue('applications', Array.from(apps));
	}
	function toggleAdminApp(app: AvailableApplication) {
		if (adminApps.has(app)) {
			adminApps.delete(app);
		} else {
			adminApps.add(app);
		}
		setValue('adminApplications', Array.from(adminApps));
	}

	const onSubmit = handleSubmit((values) => {
		const country = values.country?.trim() ? values.country : undefined;
		executeUpdate({ ...values, country, locale: locale as 'en' | 'fr' });
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant='outline' size='icon' aria-label={t('edit')} title={t('edit')}>
					<Pencil className='size-4' />
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-2xl p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col'>
				<form className='flex flex-1 min-h-0 flex-col' onSubmit={onSubmit}>
					<div className='relative bg-bg-surface px-6 py-4'>
						<span className='absolute left-0 top-0 h-full w-1 rounded-l-lg bg-coral-500' />
						<div className='flex items-start gap-3'>
							<div className='rounded-xl bg-coral-50 p-2.5 text-coral-600'>
								<UserCog className='h-5 w-5' />
							</div>
							<DialogHeader className='gap-0.5'>
								<DialogTitle className='text-lg font-bold'>{t('editUser')}</DialogTitle>
								<p className='text-sm text-text-secondary'>{t('editUserSubtitle')}</p>
							</DialogHeader>
						</div>
					</div>

					<div className='flex-1 overflow-y-auto bg-bg-app px-6 py-5 space-y-4'>
						<section className='rounded-xl border border-line bg-bg-surface p-5'>
							<div className='flex items-center gap-2 mb-4'>
								<span className='h-1.5 w-1.5 rounded-full bg-coral-500' />
								<span className='text-xs font-semibold uppercase tracking-wide text-coral-600'>{t('sectionIdentity')}</span>
								<span className='h-px flex-1 bg-line ml-2' />
							</div>
							<div className='grid md:grid-cols-2 gap-4'>
								<div>
									<label className='block text-sm font-medium text-text-primary mb-1.5'>{t('firstName')}</label>
									<Input {...register('firstName')} />
								</div>
								<div>
									<label className='block text-sm font-medium text-text-primary mb-1.5'>{t('lastName')}</label>
									<Input {...register('lastName')} />
								</div>
								<div>
									<label className='block text-sm font-medium text-text-primary mb-1.5'>{t('email')}</label>
									<Input type='email' {...register('email')} />
								</div>
								<div>
									<label className='block text-sm font-medium text-text-primary mb-1.5'>{t('phone')}</label>
									<Input {...register('phoneNumber')} />
								</div>
								<div>
									<label className='block text-sm font-medium text-text-primary mb-1.5'>{t('country')}</label>
									<Select {...register('country')} defaultValue={initial.country ?? ''}>
										<option value=''>{t('selectPlaceholder')}</option>
										{COUNTRIES.map((name) => (
											<option key={name} value={name}>
												{name}
											</option>
										))}
									</Select>
								</div>
								<div>
									<label className='block text-sm font-medium text-text-primary mb-1.5'>{t('birthDate')}</label>
									<Input type='date' {...register('birthDate')} />
								</div>
							</div>
						</section>

						<section className='rounded-xl border border-line bg-bg-surface p-5'>
							<div className='flex items-center gap-2 mb-4'>
								<span className='h-1.5 w-1.5 rounded-full bg-coral-500' />
								<span className='text-xs font-semibold uppercase tracking-wide text-coral-600'>{t('sectionRoleSchedule')}</span>
								<span className='h-px flex-1 bg-line ml-2' />
							</div>
							<div className='grid md:grid-cols-2 gap-4'>
								<div>
									<label className='block text-sm font-medium text-text-primary mb-1.5'>{t('role')}</label>
									<Select {...register('role')}>
										<option value='USER'>{t('roleUser')}</option>
										<option value='ADMIN'>{t('roleAdmin')}</option>
									</Select>
								</div>
								<div>
									<div className='flex items-center justify-between mb-1.5'>
										<label className='block text-sm font-medium text-text-primary'>{t('position')}</label>
										<button
											type='button'
											className='text-xs font-medium text-coral-600'
											onClick={() => setManagePositionsOpen(true)}>
											{t('manage')}
										</button>
									</div>
									<Select {...register('position')}>
										<option value=''>{t('selectPlaceholder')}</option>
										{posList.map((position) => (
											<option key={position.id} value={position.name}>
												{position.name}
											</option>
										))}
									</Select>
								</div>
								<div>
									<label className='block text-sm font-medium text-text-primary mb-1.5'>{t('arrivalDate')}</label>
									<Input type='date' {...register('arrivalDate')} />
								</div>
								<div>
									<label className='block text-sm font-medium text-text-primary mb-1.5'>{t('departureDate')}</label>
									<Input type='date' {...register('departureDate')} />
								</div>
								<div className='md:col-span-2'>
									<label className='block text-sm font-medium text-text-primary mb-1.5'>{t('language')}</label>
									<Select {...register('language')}>
										<option value='EN'>English</option>
										<option value='FR'>Français</option>
									</Select>
								</div>
							</div>
						</section>

						<section className='rounded-xl border border-line bg-bg-surface p-5'>
							<div className='flex items-center gap-2 mb-4'>
								<span className='h-1.5 w-1.5 rounded-full bg-coral-500' />
								<span className='text-xs font-semibold uppercase tracking-wide text-coral-600'>{t('sectionProfilePhoto')}</span>
								<span className='h-px flex-1 bg-line ml-2' />
							</div>
							<FileUpload
								accept='image/*'
								maxSize={5 * 1024 * 1024}
								valueUrl={watch('profilePhoto') ?? null}
								onUploaded={({ url }) => setValue('profilePhoto', url)}
								onDeleted={() => setValue('profilePhoto', null)}
								labels={{ select: t('selectImage'), helper: t('profilePhotoHelp') }}
							/>
							<input type='hidden' {...register('profilePhoto')} />
						</section>

						<section className='rounded-xl border border-line bg-bg-surface p-5'>
							<div className='flex items-center gap-2 mb-4'>
								<span className='h-1.5 w-1.5 rounded-full bg-coral-500' />
								<span className='text-xs font-semibold uppercase tracking-wide text-coral-600'>{t('sectionAllowedApps')}</span>
								<span className='ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-coral-50 text-coral-600'>
									{apps.size} / {AVAILABLE_APPLICATIONS.length} {t('applicationsSelected')}
								</span>
							</div>
							<div className='rounded-lg border border-line overflow-hidden'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className='text-xs uppercase tracking-wide text-text-secondary'>{t('appColApp')}</TableHead>
											<TableHead className='text-center text-xs uppercase tracking-wide text-text-secondary'>{t('appColUser')}</TableHead>
											<TableHead className='text-center text-xs uppercase tracking-wide text-text-secondary'>{t('appColAdmin')}</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{AVAILABLE_APPLICATIONS.map((app) => {
											const isSelected = apps.has(app);
											const isAdminSelected = adminApps.has(app);
											const appLabel = t(`app_${app}`);
											return (
												<TableRow key={app} className={isSelected || isAdminSelected ? 'bg-coral-50/60' : undefined}>
													<TableCell className='text-sm font-medium text-text-primary'>
														<span className='inline-block h-2 w-2 rounded-full mr-2' style={{ backgroundColor: APP_DOT[app] }} />
														{appLabel}
													</TableCell>
													<TableCell className='p-0 text-center'>
														<button
															type='button'
															onClick={() => toggleApp(app)}
															aria-pressed={isSelected}
															aria-label={`${t('appColUser')} - ${appLabel}`}
															className='flex w-full items-center justify-center py-3'
														>
															<div className={`
																flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors
																${isSelected
																	? 'border-coral-500 bg-coral-500 text-white'
																	: 'border-gray-300 bg-white'
																}
															`}>
																{isSelected && <Check className='h-3 w-3' />}
															</div>
														</button>
													</TableCell>
													<TableCell className='p-0 text-center'>
														<button
															type='button'
															onClick={() => toggleAdminApp(app)}
															aria-pressed={isAdminSelected}
															aria-label={`${t('appColAdmin')} - ${appLabel}`}
															className='flex w-full items-center justify-center py-3'
														>
															<div className={`
																flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors
																${isAdminSelected
																	? 'border-coral-500 bg-coral-500 text-white'
																	: 'border-gray-300 bg-white'
																}
															`}>
																{isAdminSelected && <Check className='h-3 w-3' />}
															</div>
														</button>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>

							{apps.has('CONGES') && (
								<div className='mt-4'>
									<label className='block text-sm font-medium text-text-primary mb-1.5'>{t('leaveDaysLabel')}</label>
									<Input
										type='number'
										min='0'
										max='365'
										placeholder='0'
										defaultValue={initial.congesTotalDays ?? ''}
										onChange={(event) => {
											const value = event.target.value;
											setValue('congesTotalDays', value === '' ? undefined : parseInt(value, 10));
										}}
									/>
								</div>
							)}
						</section>
					</div>

					<div className='flex items-center justify-end gap-3 border-t border-line bg-bg-surface px-6 py-4'>
						<Button type='button' variant='outline' onClick={() => setOpen(false)}>
							{t('cancel')}
						</Button>
						<Button type='submit' disabled={isExecuting}>
							<Save className='h-4 w-4' />
							{isExecuting ? t('saving') : t('save')}
						</Button>
					</div>
				</form>
			</DialogContent>

			<Dialog open={managePositionsOpen} onOpenChange={setManagePositionsOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>{t('managePositions')}</DialogTitle>
					</DialogHeader>
					<DeletableSelectManager
						options={posList}
						onDelete={handleDeletePositions}
						onCreate={handleCreatePosition}
						onUpdate={handleUpdatePosition}
						disabled={deletingPos || creatingPos || updatingPos}
						deleting={deletingPos}
						creating={creatingPos}
						updating={updatingPos}
						createLabel={t('newPosition')}
						createPlaceholder={t('newPositionPlaceholder')}
						createButtonLabel={t('createPositionCta')}
						selectedIds={selectedPositionIds}
						onSelectedIdsChange={setSelectedPositionIds}
					/>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setManagePositionsOpen(false)}>
							{t('close')}
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={() => handleDeletePositions(selectedPositionIds)}
							disabled={selectedPositionIds.length === 0 || deletingPos}
						>
							{deletingPos ? t('deleting') : t('deleteSelected')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Dialog>
	);
}
