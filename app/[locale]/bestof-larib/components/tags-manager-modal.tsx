"use client"

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from '@/app/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  ensureAdminTagAction,
  ensureUserTagAction,
  listAdminTagsAction,
  listUserTagsAction,
  updateAdminTagAction,
  updateUserTagAction,
  deleteAdminTagAction,
  deleteUserTagAction,
} from '../actions'
import { Loader2, Pencil, Plus, Settings, Tag as TagIcon, Trash2 } from 'lucide-react'

type Tag = {
	id: string
	name: string
	color: string
	description: string | null
	caseCount?: number
}

type TagFormState = {
	id: string | null
	name: string
	color: string
	description: string
}

const defaultForm: TagFormState = {
	id: null,
	name: '',
	color: '#3b82f6',
	description: '',
}

const TAG_COLOR_PRESETS = ['#3B82F6', '#EC4899', '#22C55E', '#F59E0B', '#8B5CF6', '#EF4444', '#14B8A6', '#1E293B']

export default function TagsManagerModal({ isAdmin, trigger, onClose, disableRouterRefresh, defaultOpen = false }: { isAdmin: boolean; trigger?: ReactNode; onClose?: () => void; disableRouterRefresh?: boolean; defaultOpen?: boolean }) {
	const t = useTranslations('bestof')
	const router = useRouter()
	const [open, setOpen] = useState(defaultOpen)
	const [tags, setTags] = useState<Tag[]>([])
	const [form, setForm] = useState<TagFormState>(defaultForm)
	const [deleteCandidate, setDeleteCandidate] = useState<Tag | null>(null)

	const listTagsAdmin = useAction(listAdminTagsAction, {
		onSuccess(res) {
			const rows = Array.isArray(res.data) ? (res.data as Tag[]) : []
			setTags(rows)
		},
		onError({ error }) {
			const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(msg)
		},
	})
	const listTagsUser = useAction(listUserTagsAction, {
		onSuccess(res) {
			const rows = Array.isArray(res.data) ? (res.data as Tag[]) : []
			setTags(rows)
		},
		onError({ error }) {
			const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(msg)
		},
	})

	const ensureTagAdmin = useAction(ensureAdminTagAction, {
		onSuccess(res) {
			const created = (res.data as Tag | undefined)
			if (!created) return
			setTags((previous) => sortTags([...previous.filter((tag) => tag.id !== created.id), { ...created, caseCount: previous.find((tag) => tag.id === created.id)?.caseCount ?? 0 }]))
			toast.success(t('tagCreated') || 'Tag created')
			setForm({ ...defaultForm })
			if (!disableRouterRefresh) {
				router.refresh()
			}
		},
		onError({ error }) {
			const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(msg)
		},
	})
	const ensureTagUser = useAction(ensureUserTagAction, {
		onSuccess(res) {
			const created = (res.data as Tag | undefined)
			if (!created) return
			setTags((previous) => sortTags([...previous.filter((tag) => tag.id !== created.id), { ...created, caseCount: previous.find((tag) => tag.id === created.id)?.caseCount ?? 0 }]))
			toast.success(t('tagCreated') || 'Tag created')
			setForm({ ...defaultForm })
			if (!disableRouterRefresh) {
				router.refresh()
			}
		},
		onError({ error }) {
			const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(msg)
		},
	})

	const updateTagAdmin = useAction(updateAdminTagAction, {
		onSuccess(res) {
			const updated = res.data as Tag | undefined
			if (!updated) return
			setTags((previous) => sortTags(previous.map((tag) => (tag.id === updated.id ? { ...tag, ...updated } : tag))))
			toast.success(t('updated'))
			setForm({ ...defaultForm })
			if (!disableRouterRefresh) {
				router.refresh()
			}
		},
		onError({ error }) {
			const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(msg)
		},
	})
	const updateTagUser = useAction(updateUserTagAction, {
		onSuccess(res) {
			const updated = res.data as Tag | undefined
			if (!updated) return
			setTags((previous) => sortTags(previous.map((tag) => (tag.id === updated.id ? { ...tag, ...updated } : tag))))
			toast.success(t('updated'))
			setForm({ ...defaultForm })
			if (!disableRouterRefresh) {
				router.refresh()
			}
		},
		onError({ error }) {
			const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(msg)
		},
	})

	const deleteTagAdmin = useAction(deleteAdminTagAction, {
		onSuccess(res) {
			const removed = res.data as { id: string } | undefined
			if (!removed) return
			setTags((previous) => previous.filter((tag) => tag.id !== removed.id))
			setDeleteCandidate(null)
			toast.success(t('tagDeleted') || 'Tag deleted')
			if (!disableRouterRefresh) {
				router.refresh()
			}
		},
		onError({ error }) {
			const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(msg)
		},
	})
	const deleteTagUser = useAction(deleteUserTagAction, {
		onSuccess(res) {
			const removed = res.data as { id: string } | undefined
			if (!removed) return
			setTags((previous) => previous.filter((tag) => tag.id !== removed.id))
			setDeleteCandidate(null)
			toast.success(t('tagDeleted') || 'Tag deleted')
			if (!disableRouterRefresh) {
				router.refresh()
			}
		},
		onError({ error }) {
			const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(msg)
		},
	})

	const listTags = isAdmin ? listTagsAdmin : listTagsUser
	const ensureTag = isAdmin ? ensureTagAdmin : ensureTagUser
	const updateTag = isAdmin ? updateTagAdmin : updateTagUser
	const deleteTag = isAdmin ? deleteTagAdmin : deleteTagUser

	const isLoading = listTags.isExecuting
	const isSavingTag = form.id ? updateTag.isExecuting : ensureTag.isExecuting

	useEffect(() => {
		if (defaultOpen) {
			void listTags.execute()
		}
	}, [])

	async function handleOpen(next: boolean) {
		setOpen(next)
		if (next) {
			setForm({ ...defaultForm })
			setDeleteCandidate(null)
			await listTags.execute()
		} else {
			if (onClose) {
				onClose()
			}
		}
	}

	function onSubmitTagForm(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const payload = { id: form.id ?? undefined, name: form.name.trim(), color: form.color, description: form.description.trim() || null }
		if (!payload.name) {
			toast.error(t('errors.fieldsRequired'))
			return
		}
		if (form.id) {
			void updateTag.execute({ id: form.id, name: payload.name, color: payload.color, description: payload.description })
		} else {
			void ensureTag.execute({ name: payload.name, color: payload.color, description: payload.description })
		}
	}

	function startEdit(tag: Tag) {
		setForm({ id: tag.id, name: tag.name, color: tag.color, description: tag.description ?? '' })
	}

	function resetForm() {
		setForm({ ...defaultForm })
	}

	function confirmDelete(tag: Tag) {
		setDeleteCandidate(tag)
	}

	async function handleDeleteTag() {
		if (!deleteCandidate) return
		await deleteTag.execute({ id: deleteCandidate.id })
	}

	const displayTags = useMemo(() => sortTags(tags), [tags])

	const defaultTrigger = (
		<Button variant="outline" size="sm">
			<Settings className="mr-2 size-4" />
			{t('tagsManager') || 'Tags Manager'}
		</Button>
	)

	const modalTitle = isAdmin ? t('table.adminTags') : t('caseView.myTags')

	return (
		<>
			<Dialog open={open} onOpenChange={(next) => void handleOpen(next)}>
				{trigger !== null && <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>}
				<DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
					<div className="relative bg-bg-surface px-6 py-4">
						<span className="absolute left-0 top-0 h-full w-1 rounded-l-lg bg-coral-500" />
						<div className="flex items-start gap-3">
							<div className="rounded-xl bg-coral-50 p-2.5 text-coral-600">
								<TagIcon className="h-5 w-5" />
							</div>
							<DialogHeader className="gap-0.5">
								<DialogTitle className="text-lg font-bold">{modalTitle}</DialogTitle>
								<p className="text-sm text-text-secondary">{t('adminTagsSubtitle')}</p>
							</DialogHeader>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto bg-bg-app px-6 py-5 space-y-4">
						<section className="rounded-xl border border-line bg-bg-surface p-5">
							<div className="flex items-center gap-2 mb-4">
								<span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
								<span className="text-xs font-semibold uppercase tracking-wide text-coral-600">{t('sectionExistingTags')}</span>
								<span className="h-px flex-1 bg-line ml-2" />
								<span className="ml-auto rounded-full bg-coral-50 text-coral-600 text-xs font-bold px-2 py-0.5">{displayTags.length}</span>
							</div>
							<div className="max-h-64 overflow-y-auto space-y-2 pr-1">
								{isLoading ? (
									<div className="flex h-24 items-center justify-center text-sm text-text-secondary">
										<Loader2 className="mr-2 size-4 animate-spin" />
										{t('loading')}
									</div>
								) : displayTags.length === 0 ? (
									<div className="text-sm text-text-secondary">{t('noTagsYet') || 'No tags yet.'}</div>
								) : (
									displayTags.map((tag) => (
										<div key={tag.id} className="flex items-center gap-3 rounded-lg border border-line bg-bg-surface px-3 py-2.5">
											<span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
											<span className="text-sm font-medium text-text-primary flex-1 truncate">{tag.name}</span>
											{typeof tag.caseCount === 'number' ? (
												<span className="rounded-full bg-gray-100 text-text-secondary text-xs font-semibold px-2 py-0.5">{tag.caseCount}</span>
											) : null}
											<div className="flex items-center gap-1">
												<Button type="button" variant="outline" size="icon" className="size-8" aria-label={t('edit')} onClick={() => startEdit(tag)}>
													<Pencil className="size-4" />
												</Button>
												<Button
													type="button"
													variant="outline"
													size="icon"
													className="size-8 border-danger-100 text-danger-600 hover:bg-danger-50 hover:text-danger-600"
													aria-label={t('delete')}
													onClick={() => confirmDelete(tag)}
												>
													<Trash2 className="size-4" />
												</Button>
											</div>
										</div>
									))
								)}
							</div>
						</section>

						<section className="rounded-xl border border-line bg-bg-surface p-5">
							<div className="flex items-center gap-2 mb-4">
								<span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
								<span className="text-xs font-semibold uppercase tracking-wide text-coral-600">
									{form.id ? t('editTagHeading') || 'Edit tag' : t('sectionCreateTag')}
								</span>
								<span className="h-px flex-1 bg-line ml-2" />
								{form.id ? (
									<Button type="button" variant="ghost" size="sm" onClick={resetForm}>{t('reset') || 'Reset'}</Button>
								) : null}
							</div>
							<form className="space-y-4" onSubmit={onSubmitTagForm}>
								<div>
									<label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="tag-name">{t('tagNameLabel') || 'Name'}</label>
									<Input id="tag-name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder={t('tagNamePlaceholder') || 'e.g. Must-know'} />
								</div>
								<div>
									<label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="tag-color">{t('tagColorLabel') || 'Color'}</label>
									<div className="flex items-center gap-3">
										<input
											id="tag-color"
											type="color"
											value={form.color}
											onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
											className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line p-0"
										/>
										<Input value={form.color} onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))} className="font-mono" />
									</div>
									<div className="mt-2 flex flex-wrap items-center gap-2">
										{TAG_COLOR_PRESETS.map((preset) => (
											<button
												key={preset}
												type="button"
												aria-label={preset}
												onClick={() => setForm((prev) => ({ ...prev, color: preset }))}
												className={`h-8 w-8 rounded-lg ${form.color.toLowerCase() === preset.toLowerCase() ? 'ring-2 ring-offset-2 ring-navy-600' : ''}`}
												style={{ backgroundColor: preset }}
											/>
										))}
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="tag-description">{t('tagDescriptionLabel') || 'Description'}</label>
									<Textarea id="tag-description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder={t('tagDescriptionPlaceholder') || 'Optional'} rows={3} />
								</div>
								<div className="flex justify-end">
									<Button type="submit" disabled={isSavingTag}>
										{isSavingTag ? <Loader2 className="mr-2 size-4 animate-spin" /> : form.id ? <Pencil className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
										{form.id ? t('saveChanges') || 'Save changes' : t('createTag')}
									</Button>
								</div>
							</form>
						</section>
					</div>
				</DialogContent>
			</Dialog>
			<AlertDialog open={Boolean(deleteCandidate)} onOpenChange={(next) => { if (!next) setDeleteCandidate(null) }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('confirmDeleteTag') || 'Delete tag?'}</AlertDialogTitle>
					</AlertDialogHeader>
					<p className="text-sm text-muted-foreground">
						{t('confirmDeleteTagDescription') || 'This will remove the tag from all cases. This action cannot be undone.'}
					</p>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setDeleteCandidate(null)}>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction onClick={() => void handleDeleteTag()} className="bg-destructive text-white hover:bg-destructive/90">
							{deleteTag.isExecuting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
							{t('delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

function sortTags(tags: Tag[]) {
	return [...tags].sort((a, b) => a.name.localeCompare(b.name))
}
