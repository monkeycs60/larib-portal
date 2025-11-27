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
import { useState } from 'react';
import { updateUserAction, createPositionAction, updatePositionAction, deletePositionsAction } from './actions';
import { useAction } from 'next-safe-action/hooks';
import { COUNTRIES } from '@/lib/countries';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import DeletableSelectManager from '@/app/[locale]/bestof-larib/components/deletable-select-manager';

const AVAILABLE_APPLICATIONS = ['BESTOF_LARIB', 'CONGES'] as const;
type AvailableApplication = (typeof AVAILABLE_APPLICATIONS)[number];

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
	function toggleApp(app: AvailableApplication) {
		if (apps.has(app)) {
			apps.delete(app);
		} else {
			apps.add(app);
		}
		setValue('applications', Array.from(apps));
	}

	const onSubmit = handleSubmit((values) => {
		const country = values.country?.trim() ? values.country : undefined;
		executeUpdate({ ...values, country, locale: locale as 'en' | 'fr' });
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant='outline' size='sm'>
					{t('edit')}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('editUser')}</DialogTitle>
				</DialogHeader>

				<form className='space-y-3' onSubmit={onSubmit}>
					<div className='grid md:grid-cols-2 gap-3'>
						<div>
							<label className='block text-sm mb-1'>{t('email')}</label>
							<Input type='email' {...register('email')} />
						</div>
						<div>
							<label className='block text-sm mb-1'>{t('role')}</label>
							<Select {...register('role')}>
								<option value='USER'>{t('roleUser')}</option>
								<option value='ADMIN'>{t('roleAdmin')}</option>
							</Select>
						</div>
						<div>
							<label className='block text-sm mb-1'>
								{t('firstName')}
							</label>
							<Input {...register('firstName')} />
						</div>
						<div>
							<label className='block text-sm mb-1'>
								{t('lastName')}
							</label>
							<Input {...register('lastName')} />
						</div>
						<div>
							<label className='block text-sm mb-1'>{t('phone')}</label>
							<Input {...register('phoneNumber')} />
						</div>
						<div>
							<label className='block text-sm mb-1'>
								{t('country')}
							</label>
							<Select
								{...register('country')}
								defaultValue={initial.country ?? ''}>
								<option value=''>{t('selectPlaceholder')}</option>
								{COUNTRIES.map((name) => (
									<option key={name} value={name}>
										{name}
									</option>
								))}
							</Select>
						</div>
						<div>
							<label className='block text-sm mb-1'>
								{t('birthDate')}
							</label>
							<Input type='date' {...register('birthDate')} />
						</div>
						<div>
							<label className='block text-sm mb-1'>
								{t('language')}
							</label>
							<Select {...register('language')}>
								<option value='EN'>English</option>
								<option value='FR'>Français</option>
							</Select>
						</div>
						<div>
							<div className='flex items-center justify-between'>
								<label className='block text-sm mb-1'>
									{t('position')}
								</label>
								<button
									type='button'
									className='text-xs text-blue-600'
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
							<label className='block text-sm mb-1'>
								{t('arrivalDate')}
							</label>
							<Input type='date' {...register('arrivalDate')} />
						</div>
						<div>
							<label className='block text-sm mb-1'>
								{t('departureDate')}
							</label>
							<Input type='date' {...register('departureDate')} />
						</div>
					</div>

					<div>
						<div className="flex items-center justify-between mb-3">
							<div className="text-sm font-medium">{t('applications')}</div>
							<div className="text-xs font-medium px-2 py-1 rounded-full bg-muted">
								{apps.size} / {AVAILABLE_APPLICATIONS.length} {t('applicationsSelected')}
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							{AVAILABLE_APPLICATIONS.map((app) => {
								const isSelected = apps.has(app);
								return (
									<button
										type="button"
										key={app}
										onClick={() => toggleApp(app)}
										className={`
											relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left
											${isSelected
												? 'border-primary bg-primary/5 shadow-sm'
												: 'border-muted hover:border-muted-foreground/50 hover:bg-muted/50'
											}
										`}
									>
										<div className={`
											flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors
											${isSelected
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-muted-foreground/30'
											}
										`}>
											{isSelected && <Check className="h-3 w-3" />}
										</div>
										<span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
											{t(`app_${app}`)}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setOpen(false)}>
							{t('cancel')}
						</Button>
						<Button type='submit' disabled={isExecuting}>
							{isExecuting ? t('saving') : t('save')}
						</Button>
					</DialogFooter>
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
