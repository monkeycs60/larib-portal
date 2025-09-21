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
import { Toggle } from '@/components/ui/toggle'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ensureAdminTagAction,
  ensureUserTagAction,
  getCaseAdminTagIdsAction,
  getCaseUserTagIdsAction,
  listAdminTagsAction,
  listUserTagsAction,
  setCaseAdminTagsAction,
  setCaseUserTagsAction,
  updateAdminTagAction,
  updateUserTagAction,
  deleteAdminTagAction,
  deleteUserTagAction,
} from '../actions'
import { Check, Loader2, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react'

type Mode = 'admin' | 'user'

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

export default function TagManagerDialog({ mode, caseId, trigger }: { mode: Mode; caseId: string; trigger?: ReactNode }) {
	const t = useTranslations('bestof')
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [tags, setTags] = useState<Tag[]>([])
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [form, setForm] = useState<TagFormState>(defaultForm)
	const [initialSelectedIds, setInitialSelectedIds] = useState<string[]>([])
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

	const getCaseTagIdsAdmin = useAction(getCaseAdminTagIdsAction, {
		onSuccess(res) {
			const ids = Array.isArray(res.data) ? (res.data as string[]) : []
			setSelectedIds(ids)
			setInitialSelectedIds(ids)
		},
	})
	const getCaseTagIdsUser = useAction(getCaseUserTagIdsAction, {
		onSuccess(res) {
			const ids = Array.isArray(res.data) ? (res.data as string[]) : []
			setSelectedIds(ids)
			setInitialSelectedIds(ids)
		},
	})

	const saveCaseTagsAdmin = useAction(setCaseAdminTagsAction, {
		onSuccess() {
			toast.success(t('updated'))
			setInitialSelectedIds(selectedIds)
			void listTagsAdmin.execute()
			router.refresh()
		},
		onError({ error }) {
			const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(msg)
		},
	})
	const saveCaseTagsUser = useAction(setCaseUserTagsAction, {
		onSuccess() {
			toast.success(t('updated'))
			setInitialSelectedIds(selectedIds)
			void listTagsUser.execute()
			router.refresh()
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
			setSelectedIds((prev) => Array.from(new Set([...prev, created.id])))
			toast.success(t('updated'))
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
			setSelectedIds((prev) => Array.from(new Set([...prev, created.id])))
			toast.success(t('updated'))
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
			setSelectedIds((prev) => prev.filter((id) => id !== removed.id))
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
			setSelectedIds((prev) => prev.filter((id) => id !== removed.id))
			setDeleteCandidate(null)
			toast.success(t('tagDeleted') || 'Tag deleted')
			router.refresh()
		},
		onError({ error }) {
			const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(msg)
		},
	})

	const isLoading = (mode === 'admin' ? listTagsAdmin.isExecuting : listTagsUser.isExecuting) || (mode === 'admin' ? getCaseTagIdsAdmin.isExecuting : getCaseTagIdsUser.isExecuting)
	const isSavingAssignments = mode === 'admin' ? saveCaseTagsAdmin.isExecuting : saveCaseTagsUser.isExecuting
	const isSavingTag = form.id
		? (mode === 'admin' ? updateTagAdmin.isExecuting : updateTagUser.isExecuting)
		: (mode === 'admin' ? ensureTagAdmin.isExecuting : ensureTagUser.isExecuting)

const hasChanges = useMemo(() => {
		if (initialSelectedIds.length !== selectedIds.length) return true
		const current = new Set(initialSelectedIds)
		return selectedIds.some((id) => !current.has(id))
	}, [initialSelectedIds, selectedIds])

	const assignedTags = useMemo(() => selectedIds
		.map((id) => tags.find((tag) => tag.id === id))
		.filter(Boolean) as Tag[], [selectedIds, tags])

	async function handleOpen(next: boolean) {
		setOpen(next)
		if (next) {
			setForm({ ...defaultForm })
			setDeleteCandidate(null)
			const loadList = mode === 'admin' ? listTagsAdmin.execute : listTagsUser.execute
			const loadSelections = mode === 'admin' ? getCaseTagIdsAdmin.execute : getCaseTagIdsUser.execute
			await Promise.all([loadList(), loadSelections({ caseId })])
		}
	}

	async function refreshData() {
		const loadList = mode === 'admin' ? listTagsAdmin.execute : listTagsUser.execute
		const loadSelections = mode === 'admin' ? getCaseTagIdsAdmin.execute : getCaseTagIdsUser.execute
		await Promise.all([loadList(), loadSelections({ caseId })])
	}

	function toggleTag(tagId: string) {
		setSelectedIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
	}

	async function onSaveAssignments() {
		const save = mode === 'admin' ? saveCaseTagsAdmin : saveCaseTagsUser
		await save.execute({ caseId, tagIds: selectedIds })
	}

	function onSubmitTagForm(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const payload = { id: form.id ?? undefined, name: form.name.trim(), color: form.color, description: form.description.trim() || null }
		if (!payload.name) {
			toast.error(t('errors.fieldsRequired'))
			return
		}
		if (form.id) {
			const update = mode === 'admin' ? updateTagAdmin : updateTagUser
			void update.execute({ id: form.id, name: payload.name, color: payload.color, description: payload.description })
		} else {
			const create = mode === 'admin' ? ensureTagAdmin : ensureTagUser
			void create.execute({ name: payload.name, color: payload.color, description: payload.description })
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
		const action = mode === 'admin' ? deleteTagAdmin : deleteTagUser
		await action.execute({ id: deleteCandidate.id })
	}

	const displayTags = useMemo(() => sortTags(tags), [tags])

	return (
		<Dialog open={open} onOpenChange={(next) => void handleOpen(next)}>
			<DialogTrigger asChild>{trigger ?? <Button size="icon" variant="ghost"><Plus /></Button>}</DialogTrigger>
			<DialogContent className="w-[880px] max-w-[95vw]">
				<DialogHeader>
					<DialogTitle>{mode === 'admin' ? t('table.adminTags') : t('caseView.myTags')}</DialogTitle>
				</DialogHeader>
				<div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
					<section className="space-y-4">
						<header className="flex items-center justify-between">
							<div className="text-sm font-medium">{t('tagAssignmentHeading') || 'Assign tags to this case'}</div>
						<Button type="button" variant="ghost" size="icon" aria-label={t('refresh') || 'Refresh'} onClick={() => void refreshData()}>
								{isLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
							</Button>
						</header>
						<div className="max-h-72 overflow-y-auto pr-1 space-y-2">
							{isLoading ? (
								<div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
									<Loader2 className="mr-2 size-4 animate-spin" />
									{t('loading')}
								</div>
							) : displayTags.length === 0 ? (
								<div className="text-sm text-muted-foreground">{t('noTagsYet') || 'No tags yet.'}</div>
							) : (
								displayTags.map((tag) => {
							const active = selectedIds.includes(tag.id)
							const labelColor = active ? '#1f2937' : '#475569'
									return (
										<div key={tag.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
											<Toggle
												pressed={active}
												onPressedChange={() => toggleTag(tag.id)}
												disabled={isSavingAssignments}
												className={cn(
													'group justify-start rounded-full border px-3 py-1.5 text-left text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60',
													active ? 'shadow-sm' : 'bg-background hover:bg-muted/60',
												)}
												style={{
													borderColor: active ? mixWithWhite(tag.color, 0.32) : mixWithWhite(tag.color, 0.9),
													backgroundColor: active ? mixWithWhite(tag.color, 0.82) : mixWithWhite(tag.color, 0.97),
													color: labelColor,
												}}
											>
												<span className="flex items-center gap-2">
													<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
													<span className="max-w-[160px] truncate font-medium">{tag.name}</span>
													<Check className={cn('size-3 transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
												</span>
											</Toggle>
											<div className="flex items-center gap-1 pl-2">
												{typeof tag.caseCount === 'number' ? (
													<span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{tag.caseCount}</span>
												) : null}
												<Button type="button" size="icon" variant="ghost" aria-label={t('edit')} onClick={() => startEdit(tag)}>
													<Pencil className="size-4" />
												</Button>
												<Button type="button" size="icon" variant="ghost" aria-label={t('delete')} onClick={() => confirmDelete(tag)}>
													<Trash2 className="size-4" />
												</Button>
											</div>
										</div>
									)
								})
							)}
						</div>
						<div className="space-y-2">
							<div className="flex flex-wrap gap-2">
								{assignedTags.map((tag) => (
									<span key={tag.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs" style={{ borderColor: mixWithWhite(tag.color, 0.6), backgroundColor: mixWithWhite(tag.color, 0.92) }}>
										<span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
										<span>{tag.name}</span>
									</span>
								))}
								{assignedTags.length === 0 ? (
									<span className="text-xs text-muted-foreground">{t('caseView.noTagsSelected')}</span>
								) : null}
							</div>
							<div className="flex justify-end gap-2 pt-2">
								<Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('close') || 'Close'}</Button>
								<Button type="button" onClick={onSaveAssignments} disabled={isSavingAssignments || !hasChanges}>
									{isSavingAssignments ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
									{t('editTags')}
								</Button>
							</div>
						</div>
					</section>
					<section className="space-y-4">
						<header className="flex items-center justify-between">
							<div className="text-sm font-medium">
								{form.id ? t('editTagHeading') || 'Edit tag' : t('createNewTagLabel') || 'Create new tag'}
							</div>
							{form.id ? (
								<Button type="button" variant="ghost" size="sm" onClick={resetForm}>{t('reset') || 'Reset'}</Button>
							) : null}
						</header>
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
								<Textarea id="tag-description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder={t('tagDescriptionPlaceholder') || 'Optional'} rows={4} />
							</div>
							<div className="flex justify-end gap-2">
								<Button type="submit" disabled={isSavingTag}>
									{isSavingTag ? <Loader2 className="mr-2 size-4 animate-spin" /> : form.id ? <Pencil className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
									{form.id ? t('saveChanges') || 'Save changes' : t('createTag')}
								</Button>
							</div>
						</form>
					</section>
				</div>
			</DialogContent>
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
							{(mode === 'admin' ? deleteTagAdmin.isExecuting : deleteTagUser.isExecuting) ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
							{t('delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Dialog>
	)
}

function sortTags(tags: Tag[]) {
	return [...tags].sort((a, b) => a.name.localeCompare(b.name))
}

function mixWithWhite(hex: string, ratio: number) {
	const parsed = parseHexColor(hex)
	if (!parsed) return hex
	const mix = (channel: number) => Math.round(channel + (255 - channel) * ratio)
	const toHex = (channel: number) => channel.toString(16).padStart(2, '0')
	const r = mix(parsed.r)
	const g = mix(parsed.g)
	const b = mix(parsed.b)
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function parseHexColor(color: string) {
	const value = color.replace('#', '')
	if (value.length !== 6) return null
	const r = Number.parseInt(value.slice(0, 2), 16)
	const g = Number.parseInt(value.slice(2, 4), 16)
	const b = Number.parseInt(value.slice(4, 6), 16)
	if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
	return { r, g, b }
}
