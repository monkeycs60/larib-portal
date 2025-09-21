"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useAction } from 'next-safe-action/hooks'
import {
	getCaseAdminTagIdsAction,
	getCaseUserTagIdsAction,
	listAdminTagsAction,
	listUserTagsAction,
	setCaseAdminTagsAction,
	setCaseUserTagsAction,
} from '../actions'
import { toast } from 'sonner'
import { Check, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from '@/app/i18n/navigation'
import { useTranslations } from 'next-intl'

export type CaseDisplayTag = { id: string; name: string; color: string; description: string | null }

type Mode = 'admin' | 'user'

type Props = {
	mode: Mode
	caseId: string
	assignedTags: CaseDisplayTag[]
	onChange?: (tags: CaseDisplayTag[]) => void
}

export default function CaseTagQuickPicker({ mode, caseId, assignedTags, onChange }: Props) {
	const router = useRouter()
	const t = useTranslations('bestof')
	const [open, setOpen] = useState(false)
	const [tags, setTags] = useState<CaseDisplayTag[]>([])
	const [selectedIds, setSelectedIds] = useState<string[]>(assignedTags.map((tag) => tag.id))
	const [isRefreshing, startRefresh] = useTransition()
	const [isApplying, startApplying] = useTransition()
	const previousSelectionRef = useRef<string[]>(assignedTags.map((tag) => tag.id))

	useEffect(() => {
		const ids = assignedTags.map((tag) => tag.id)
		setSelectedIds(ids)
		previousSelectionRef.current = ids
	}, [assignedTags])

	const listTagsAdmin = useAction(listAdminTagsAction, {
		onSuccess(res) {
			const rows = Array.isArray(res.data) ? (res.data as CaseDisplayTag[]) : []
			setTags(rows)
		},
		onError({ error }) {
			const message = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(message)
		},
	})

	const listTagsUser = useAction(listUserTagsAction, {
		onSuccess(res) {
			const rows = Array.isArray(res.data) ? (res.data as CaseDisplayTag[]) : []
			setTags(rows)
		},
		onError({ error }) {
			const message = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(message)
		},
	})

	const getCaseTagIdsAdmin = useAction(getCaseAdminTagIdsAction, {
		onSuccess(res) {
			setSelectedIds(Array.isArray(res.data) ? (res.data as string[]) : [])
		},
	})

	const getCaseTagIdsUser = useAction(getCaseUserTagIdsAction, {
		onSuccess(res) {
			setSelectedIds(Array.isArray(res.data) ? (res.data as string[]) : [])
		},
	})

	const saveCaseTagsAdmin = useAction(setCaseAdminTagsAction, {
		onError({ error }) {
			const message = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(message)
			restorePreviousSelection()
		},
		onSuccess() {
			startRefresh(() => router.refresh())
		},
	})

	const saveCaseTagsUser = useAction(setCaseUserTagsAction, {
		onError({ error }) {
			const message = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
			toast.error(message)
			restorePreviousSelection()
		},
		onSuccess() {
			startRefresh(() => router.refresh())
		},
	})

	const isLoading = (mode === 'admin' ? listTagsAdmin.isExecuting : listTagsUser.isExecuting) || (mode === 'admin' ? getCaseTagIdsAdmin.isExecuting : getCaseTagIdsUser.isExecuting) || isRefreshing

	async function handleOpenChange(next: boolean) {
		setOpen(next)
		if (next) {
			const loadList = mode === 'admin' ? listTagsAdmin.execute : listTagsUser.execute
			const loadSelection = mode === 'admin' ? getCaseTagIdsAdmin.execute : getCaseTagIdsUser.execute
			await Promise.all([loadList(), loadSelection({ caseId })])
		}
	}

	function updateSelection(next: string[]) {
		previousSelectionRef.current = selectedIds
		setSelectedIds(next)
		const nextAssigned = tags
			.filter((tag) => next.includes(tag.id))
			.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color, description: tag.description ?? null }))
		onChange?.(nextAssigned)
		const save = mode === 'admin' ? saveCaseTagsAdmin : saveCaseTagsUser
		if (save.isExecuting) {
			void save.execute({ caseId, tagIds: next })
			return
		}
		startApplying(() => {
			void save.execute({ caseId, tagIds: next })
		})
	}

	function restorePreviousSelection() {
		const fallback = previousSelectionRef.current
		setSelectedIds(fallback)
		const fallbackTags = tags
			.filter((tag) => fallback.includes(tag.id))
			.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color, description: tag.description ?? null }))
		onChange?.(fallbackTags)
	}

	function toggle(tagId: string) {
		const next = selectedIds.includes(tagId)
			? selectedIds.filter((id) => id !== tagId)
			: [...selectedIds, tagId]
		updateSelection(next)
	}

	const orderedTags = useMemo(() => [...tags].sort((a, b) => a.name.localeCompare(b.name)), [tags])

	return (
		<Popover open={open} onOpenChange={(next) => void handleOpenChange(next)}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					size="icon"
					variant="ghost"
					aria-label={t('quickAssignTags') || 'Quick assign tags'}
					disabled={isApplying}
					className={cn(isApplying && 'opacity-60 cursor-wait')}
				>
					<Plus className="size-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-72 p-0">
				<Command>
					<CommandInput placeholder={t('tagSearchPlaceholder') || 'Search tags...'} autoFocus />
					<CommandList>
						{orderedTags.length === 0 && !isLoading ? (
							<CommandEmpty>{t('noTagsFound') || 'No tags found.'}</CommandEmpty>
						) : (
							<CommandGroup>
								{orderedTags.map((tag) => {
									const checked = selectedIds.includes(tag.id)
									return (
										<CommandItem
											key={tag.id}
											onSelect={() => (isApplying ? undefined : toggle(tag.id))}
											className={cn(
												'flex items-center justify-between',
												isApplying && 'pointer-events-none opacity-50'
											)}
										>
											<span className="flex items-center gap-2">
												<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
												<span>{tag.name}</span>
											</span>
											<Check className={cn('size-4 transition-opacity', checked ? 'opacity-100' : 'opacity-0')} />
										</CommandItem>
									)
								})}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
