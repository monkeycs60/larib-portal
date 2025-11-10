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
			setTags((previous) => sortTags([...previous.filter((tag) => tag.id !== created.id), { ...created, caseCount: previous.find((tag) => tag.id === created.id)?.caseCount ?? 0 }]))
			toast.success(t('tagCreated') || 'Tag created')
			setForm({ ...defaultForm })
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
			setTags((previous) => sortTags(previous.map((tag) => (tag.id === updated.id ? { ...tag, ...updated } : tag))))
			toast.success(t('updated'))
			setForm({ ...defaultForm })
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
			setTags((previous) => sortTags(previous.map((tag) => (tag.id === updated.id ? { ...tag, ...updated } : tag))))
			toast.success(t('updated'))
			setForm({ ...defaultForm })
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
			setTags((previous) => previous.filter((tag) => tag.id !== removed.id))
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
			setTags((previous) => previous.filter((tag) => tag.id !== removed.id))
			setDeleteCandidate(null)
			toast.success(t('tagDeleted') || 'Tag deleted')
			router.refresh()
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

	async function handleOpen(next: boolean) {
		setOpen(next)
		if (next) {
			setForm({ ...defaultForm })
			setDeleteCandidate(null)
			await listTags.execute()
		}
	}

	async function refreshData() {
		await listTags.execute()
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
				<DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
				<DialogContent className="w-[720px] max-w-[95vw] max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{modalTitle}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="text-sm font-medium">{modalTitle}</div>
							<Button type="button" variant="ghost" size="icon" aria-label={t('refresh') || 'Refresh'} onClick={() => void refreshData()}>
								{isLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
							</Button>
						</div>
						<div className="space-y-2 max-h-48 overflow-y-auto pr-1">
							{isLoading ? (
								<div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
									<Loader2 className="mr-2 size-4 animate-spin" />
									{t('loading')}
								</div>
							) : displayTags.length === 0 ? (
								<div className="text-sm text-muted-foreground">{t('noTagsYet') || 'No tags yet.'}</div>
							) : (
								displayTags.map((tag) => (
									<div key={tag.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
										<div className="flex items-center gap-2">
											<span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
											<span className="text-sm font-medium">{tag.name}</span>
											{typeof tag.caseCount === 'number' ? (
												<span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{tag.caseCount}</span>
											) : null}
										</div>
										<div className="flex items-center gap-1">
											<Button type="button" size="icon" variant="ghost" aria-label={t('edit')} onClick={() => startEdit(tag)}>
												<Pencil className="size-4" />
											</Button>
											<Button type="button" size="icon" variant="ghost" aria-label={t('delete')} onClick={() => confirmDelete(tag)}>
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
									{form.id ? t('editTagHeading') || 'Edit tag' : t('createNewTagLabel') || 'Create new tag'}
								</div>
								{form.id ? (
									<Button type="button" variant="ghost" size="sm" onClick={resetForm}>{t('reset') || 'Reset'}</Button>
								) : null}
							</div>
							<form className="space-y-3" onSubmit={onSubmitTagForm}>
								<div className="space-y-1">
									<label className="text-xs font-medium" htmlFor="tag-name">{t('tagNameLabel') || 'Name'}</label>
									<Input id="tag-name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder={t('tagNamePlaceholder') || 'e.g. Must-know'} />
								</div>
								<div className="space-y-1">
									<label className="text-xs font-medium" htmlFor="tag-color">{t('tagColorLabel') || 'Color'}</label>
									<div className="flex items-center gap-2">
										<input id="tag-color" type="color" value={form.color} onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))} className="h-9 w-12 rounded border" />
										<Input value={form.color} onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))} className="font-mono" />
									</div>
								</div>
								<div className="space-y-1">
									<label className="text-xs font-medium" htmlFor="tag-description">{t('tagDescriptionLabel') || 'Description'}</label>
									<Textarea id="tag-description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder={t('tagDescriptionPlaceholder') || 'Optional'} rows={3} />
								</div>
								<div className="flex justify-end gap-2">
									<Button type="submit" disabled={isSavingTag}>
										{isSavingTag ? <Loader2 className="mr-2 size-4 animate-spin" /> : form.id ? <Pencil className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
										{form.id ? t('saveChanges') || 'Save changes' : t('createTag')}
									</Button>
								</div>
							</form>
						</div>
					</div>
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
