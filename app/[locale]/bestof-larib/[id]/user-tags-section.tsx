"use client"

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import CaseTagQuickPicker, { type CaseDisplayTag } from '../components/case-tag-quick-picker'
import TagManagerDialog from '../components/tag-manager-dialog'
import { Button } from '@/components/ui/button'
import { Settings2 } from 'lucide-react'

export default function UserTagsSection({
	isAdmin,
	caseId,
	initialTags,
	initialSelectedIds,
	onSelectionChange,
}: {
	isAdmin: boolean
	caseId: string
	initialTags: CaseDisplayTag[]
	initialSelectedIds: string[]
	onSelectionChange?: (ids: string[]) => void
}) {
	const t = useTranslations('bestof')
	const [assignedTags, setAssignedTags] = useState<CaseDisplayTag[]>(() => mapSelection(initialTags, initialSelectedIds))

	useEffect(() => {
		setAssignedTags(mapSelection(initialTags, initialSelectedIds))
	}, [initialTags, initialSelectedIds])

	const orderedTags = useMemo(() => [...assignedTags].sort((a, b) => a.name.localeCompare(b.name)), [assignedTags])

	function handleSelectionChange(next: CaseDisplayTag[]) {
		setAssignedTags(next)
		onSelectionChange?.(next.map((tag) => tag.id))
	}

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap gap-2">
				{orderedTags.length === 0 ? (
					<span className="text-xs text-muted-foreground">{t('caseView.noTagsSelected')}</span>
				) : (
					orderedTags.map((tag) => (
						<Badge key={tag.id} className="border-transparent text-white" style={{ backgroundColor: tag.color }}>
							{tag.name}
						</Badge>
					))
				)}
			</div>
			{isAdmin ? null : (
				<div className="flex items-center gap-1">
					<CaseTagQuickPicker mode="user" caseId={caseId} assignedTags={assignedTags} onChange={handleSelectionChange} />
					<TagManagerDialog
						mode="user"
						caseId={caseId}
						trigger={
							<Button type="button" size="icon" variant="ghost" aria-label={t('manageTags') || 'Manage tags'}>
								<Settings2 className="size-4" />
							</Button>
						}
					/>
				</div>
			)}
		</div>
	)
}

function mapSelection(tags: CaseDisplayTag[], ids: string[]): CaseDisplayTag[] {
	const set = new Set(ids)
	return tags.filter((tag) => set.has(tag.id))
}
