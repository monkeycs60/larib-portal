"use client"

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from '@/app/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Loader2, Pencil, Plus, RefreshCcw, Settings, Trash2 } from 'lucide-react'

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

export default function TagsManagerModal({ isAdmin, trigger }: { isAdmin: boolean; trigger?: ReactNode }) {
	const t = useTranslations('bestof')
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [activeTab, setActiveTab] = useState<'admin' | 'user'>(isAdmin ? 'admin' : 'user')
	const [adminTags, setAdminTags] = useState<Tag[]>([])
	const [userTags, setUserTags] = useState<Tag[]>([])
	const [adminForm, setAdminForm] = useState<TagFormState>(defaultForm)
	const [userForm, setUserForm] = useState<TagFormState>(defaultForm)
	const [deleteCandidate, setDeleteCandidate] = useState<{ tag: Tag; mode: 'admin' | 'user' } | null>(null)

	const listTagsAdmin = useAction(listAdminTagsAction, {
		onSuccess(res) {
			const rows = Array.isArray(res.data) ? (res.data as Tag[]) : []
			setAdminTags(rows)
		},
		onError({ error }) {
			const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(msg)
		},
	})
	const listTagsUser = useAction(listUserTagsAction, {
		onSuccess(res) {
			const rows = Array.isArray(res.data) ? (res.data as Tag[]) : []
			setUserTags(rows)
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
			setAdminTags((previous) => sortTags([...previous.filter((tag) => tag.id !== created.id), { ...created, caseCount: previous.find((tag) => tag.id === created.id)?.caseCount ?? 0 }]))
			toast.success(t('tagCreated') || 'Tag created')
			setAdminForm({ ...defaultForm })
			router.refresh()
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
			setUserTags((previous) => sortTags([...previous.filter((tag) => tag.id !== created.id), { ...created, caseCount: previous.find((tag) => tag.id === created.id)?.caseCount ?? 0 }]))
			toast.success(t('tagCreated') || 'Tag created')
			setUserForm({ ...defaultForm })
			router.refresh()
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
			setAdminTags((previous) => sortTags(previous.map((tag) => (tag.id === updated.id ? { ...tag, ...updated } : tag))))
			toast.success(t('updated'))
			setAdminForm({ ...defaultForm })
			router.refresh()
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
			setUserTags((previous) => sortTags(previous.map((tag) => (tag.id === updated.id ? { ...tag, ...updated } : tag))))
			toast.success(t('updated'))
			setUserForm({ ...defaultForm })
			router.refresh()
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
			setAdminTags((previous) => previous.filter((tag) => tag.id !== removed.id))
			setDeleteCandidate(null)
			toast.success(t('tagDeleted') || 'Tag deleted')
			router.refresh()
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
			setUserTags((previous) => previous.filter((tag) => tag.id !== removed.id))
			setDeleteCandidate(null)
			toast.success(t('tagDeleted') || 'Tag deleted')
			router.refresh()
		},
		onError({ error }) {
			const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(msg)
		},
	})

	const isLoading = listTagsAdmin.isExecuting || listTagsUser.isExecuting
	const isSavingAdminTag = adminForm.id ? updateTagAdmin.isExecuting : ensureTagAdmin.isExecuting
	const isSavingUserTag = userForm.id ? updateTagUser.isExecuting : ensureTagUser.isExecuting

	async function handleOpen(next: boolean) {
		setOpen(next)
		if (next) {
			setAdminForm({ ...defaultForm })
			setUserForm({ ...defaultForm })
			setDeleteCandidate(null)
			if (isAdmin) {
				await listTagsAdmin.execute()
			}
			await listTagsUser.execute()
		}
	}

	async function refreshData() {
		if (activeTab === 'admin' && isAdmin) {
			await listTagsAdmin.execute()
		} else {
			await listTagsUser.execute()
		}
	}

	function onSubmitAdminTagForm(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const payload = { id: adminForm.id ?? undefined, name: adminForm.name.trim(), color: adminForm.color, description: adminForm.description.trim() || null }
		if (!payload.name) {
			toast.error(t('errors.fieldsRequired'))
			return
		}
		if (adminForm.id) {
			void updateTagAdmin.execute({ id: adminForm.id, name: payload.name, color: payload.color, description: payload.description })
		} else {
			void ensureTagAdmin.execute({ name: payload.name, color: payload.color, description: payload.description })
		}
	}

	function onSubmitUserTagForm(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const payload = { id: userForm.id ?? undefined, name: userForm.name.trim(), color: userForm.color, description: userForm.description.trim() || null }
		if (!payload.name) {
			toast.error(t('errors.fieldsRequired'))
			return
		}
		if (userForm.id) {
			void updateTagUser.execute({ id: userForm.id, name: payload.name, color: payload.color, description: payload.description })
		} else {
			void ensureTagUser.execute({ name: payload.name, color: payload.color, description: payload.description })
		}
	}

	function startEditAdmin(tag: Tag) {
		setAdminForm({ id: tag.id, name: tag.name, color: tag.color, description: tag.description ?? '' })
	}

	function startEditUser(tag: Tag) {
		setUserForm({ id: tag.id, name: tag.name, color: tag.color, description: tag.description ?? '' })
	}

	function resetAdminForm() {
		setAdminForm({ ...defaultForm })
	}

	function resetUserForm() {
		setUserForm({ ...defaultForm })
	}

	function confirmDelete(tag: Tag, mode: 'admin' | 'user') {
		setDeleteCandidate({ tag, mode })
	}

	async function handleDeleteTag() {
		if (!deleteCandidate) return
		const action = deleteCandidate.mode === 'admin' ? deleteTagAdmin : deleteTagUser
		await action.execute({ id: deleteCandidate.tag.id })
	}

	const displayAdminTags = useMemo(() => sortTags(adminTags), [adminTags])
	const displayUserTags = useMemo(() => sortTags(userTags), [userTags])

	const defaultTrigger = (
		<Button variant="outline" size="sm">
			<Settings className="mr-2 size-4" />
			{t('tagsManager') || 'Tags Manager'}
		</Button>
	)

	return (
		<>
			<Dialog open={open} onOpenChange={(next) => void handleOpen(next)}>
				<DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
				<DialogContent className="w-[720px] max-w-[95vw] max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{t('tagsManager') || 'Tags Manager'}</DialogTitle>
					</DialogHeader>
					<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'admin' | 'user')} className="w-full">
						{isAdmin ? (
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="admin">{t('table.adminTags')}</TabsTrigger>
								<TabsTrigger value="user">{t('caseView.myTags')}</TabsTrigger>
							</TabsList>
						) : null}
						{isAdmin ? (
							<TabsContent value="admin" className="space-y-4">
								<div className="flex items-center justify-between">
									<div className="text-sm font-medium">{t('table.adminTags')}</div>
									<Button type="button" variant="ghost" size="icon" aria-label={t('refresh') || 'Refresh'} onClick={() => void refreshData()}>
										{isLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
									</Button>
								</div>
								<div className="space-y-2 max-h-48 overflow-y-auto pr-1">
									{listTagsAdmin.isExecuting ? (
										<div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
											<Loader2 className="mr-2 size-4 animate-spin" />
											{t('loading')}
										</div>
									) : displayAdminTags.length === 0 ? (
										<div className="text-sm text-muted-foreground">{t('noTagsYet') || 'No tags yet.'}</div>
									) : (
										displayAdminTags.map((tag) => (
											<div key={tag.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
												<div className="flex items-center gap-2">
													<span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
													<span className="text-sm font-medium">{tag.name}</span>
													{typeof tag.caseCount === 'number' ? (
														<span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{tag.caseCount}</span>
													) : null}
												</div>
												<div className="flex items-center gap-1">
													<Button type="button" size="icon" variant="ghost" aria-label={t('edit')} onClick={() => startEditAdmin(tag)}>
														<Pencil className="size-4" />
													</Button>
													<Button type="button" size="icon" variant="ghost" aria-label={t('delete')} onClick={() => confirmDelete(tag, 'admin')}>
														<Trash2 className="size-4" />
													</Button>
												</div>
											</div>
										))
									)}
								</div>
								<div className="space-y-4 border-t pt-4">
									<div className="flex items-center justify-between">
										<div className="text-sm font-medium">
											{adminForm.id ? t('editTagHeading') || 'Edit tag' : t('createNewTagLabel') || 'Create new tag'}
										</div>
										{adminForm.id ? (
											<Button type="button" variant="ghost" size="sm" onClick={resetAdminForm}>{t('reset') || 'Reset'}</Button>
										) : null}
									</div>
									<form className="space-y-3" onSubmit={onSubmitAdminTagForm}>
										<div className="space-y-1">
											<label className="text-xs font-medium" htmlFor="admin-tag-name">{t('tagNameLabel') || 'Name'}</label>
											<Input id="admin-tag-name" value={adminForm.name} onChange={(event) => setAdminForm((prev) => ({ ...prev, name: event.target.value }))} placeholder={t('tagNamePlaceholder') || 'e.g. Must-know'} />
										</div>
										<div className="space-y-1">
											<label className="text-xs font-medium" htmlFor="admin-tag-color">{t('tagColorLabel') || 'Color'}</label>
											<div className="flex items-center gap-2">
												<input id="admin-tag-color" type="color" value={adminForm.color} onChange={(event) => setAdminForm((prev) => ({ ...prev, color: event.target.value }))} className="h-9 w-12 rounded border" />
												<Input value={adminForm.color} onChange={(event) => setAdminForm((prev) => ({ ...prev, color: event.target.value }))} className="font-mono" />
											</div>
										</div>
										<div className="space-y-1">
											<label className="text-xs font-medium" htmlFor="admin-tag-description">{t('tagDescriptionLabel') || 'Description'}</label>
											<Textarea id="admin-tag-description" value={adminForm.description} onChange={(event) => setAdminForm((prev) => ({ ...prev, description: event.target.value }))} placeholder={t('tagDescriptionPlaceholder') || 'Optional'} rows={3} />
										</div>
										<div className="flex justify-end gap-2">
											<Button type="submit" disabled={isSavingAdminTag}>
												{isSavingAdminTag ? <Loader2 className="mr-2 size-4 animate-spin" /> : adminForm.id ? <Pencil className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
												{adminForm.id ? t('saveChanges') || 'Save changes' : t('createTag')}
											</Button>
										</div>
									</form>
								</div>
							</TabsContent>
						) : null}
						<TabsContent value="user" className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="text-sm font-medium">{t('caseView.myTags')}</div>
								<Button type="button" variant="ghost" size="icon" aria-label={t('refresh') || 'Refresh'} onClick={() => void refreshData()}>
									{isLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
								</Button>
							</div>
							<div className="space-y-2 max-h-48 overflow-y-auto pr-1">
								{listTagsUser.isExecuting ? (
									<div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
										<Loader2 className="mr-2 size-4 animate-spin" />
										{t('loading')}
									</div>
								) : displayUserTags.length === 0 ? (
									<div className="text-sm text-muted-foreground">{t('noTagsYet') || 'No tags yet.'}</div>
								) : (
									displayUserTags.map((tag) => (
										<div key={tag.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
											<div className="flex items-center gap-2">
												<span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
												<span className="text-sm font-medium">{tag.name}</span>
												{typeof tag.caseCount === 'number' ? (
													<span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{tag.caseCount}</span>
												) : null}
											</div>
											<div className="flex items-center gap-1">
												<Button type="button" size="icon" variant="ghost" aria-label={t('edit')} onClick={() => startEditUser(tag)}>
													<Pencil className="size-4" />
												</Button>
												<Button type="button" size="icon" variant="ghost" aria-label={t('delete')} onClick={() => confirmDelete(tag, 'user')}>
													<Trash2 className="size-4" />
												</Button>
											</div>
										</div>
									))
								)}
							</div>
							<div className="space-y-4 border-t pt-4">
								<div className="flex items-center justify-between">
									<div className="text-sm font-medium">
										{userForm.id ? t('editTagHeading') || 'Edit tag' : t('createNewTagLabel') || 'Create new tag'}
									</div>
									{userForm.id ? (
										<Button type="button" variant="ghost" size="sm" onClick={resetUserForm}>{t('reset') || 'Reset'}</Button>
									) : null}
								</div>
								<form className="space-y-3" onSubmit={onSubmitUserTagForm}>
									<div className="space-y-1">
										<label className="text-xs font-medium" htmlFor="user-tag-name">{t('tagNameLabel') || 'Name'}</label>
										<Input id="user-tag-name" value={userForm.name} onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))} placeholder={t('tagNamePlaceholder') || 'e.g. Must-know'} />
									</div>
									<div className="space-y-1">
										<label className="text-xs font-medium" htmlFor="user-tag-color">{t('tagColorLabel') || 'Color'}</label>
										<div className="flex items-center gap-2">
											<input id="user-tag-color" type="color" value={userForm.color} onChange={(event) => setUserForm((prev) => ({ ...prev, color: event.target.value }))} className="h-9 w-12 rounded border" />
											<Input value={userForm.color} onChange={(event) => setUserForm((prev) => ({ ...prev, color: event.target.value }))} className="font-mono" />
										</div>
									</div>
									<div className="space-y-1">
										<label className="text-xs font-medium" htmlFor="user-tag-description">{t('tagDescriptionLabel') || 'Description'}</label>
										<Textarea id="user-tag-description" value={userForm.description} onChange={(event) => setUserForm((prev) => ({ ...prev, description: event.target.value }))} placeholder={t('tagDescriptionPlaceholder') || 'Optional'} rows={3} />
									</div>
									<div className="flex justify-end gap-2">
										<Button type="submit" disabled={isSavingUserTag}>
											{isSavingUserTag ? <Loader2 className="mr-2 size-4 animate-spin" /> : userForm.id ? <Pencil className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
											{userForm.id ? t('saveChanges') || 'Save changes' : t('createTag')}
										</Button>
									</div>
								</form>
							</div>
						</TabsContent>
					</Tabs>
					<div className="flex justify-end pt-2">
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('close') || 'Close'}</Button>
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
						<AlertDialogAction onClick={() => void handleDeleteTag()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							{deleteCandidate?.mode === 'admin' ? (deleteTagAdmin.isExecuting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null) : (deleteTagUser.isExecuting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null)}
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
