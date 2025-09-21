"use client"

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import CaseTagQuickPicker, { type CaseDisplayTag } from './case-tag-quick-picker'
import TagManagerDialog from './tag-manager-dialog'
import { Settings2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

type Mode = 'admin' | 'user'

export default function CaseTagCell({ mode, caseId, initialTags }: { mode: Mode; caseId: string; initialTags: CaseDisplayTag[] }) {
	const t = useTranslations('bestof')
	const [assignedTags, setAssignedTags] = useState<CaseDisplayTag[]>(initialTags)

	useEffect(() => {
		setAssignedTags(initialTags)
	}, [initialTags])

	return (
		<div className="flex items-center justify-between gap-2">
			<div className="flex flex-wrap gap-1">
				{assignedTags.length === 0 ? (
					<span className="text-xs text-muted-foreground">{t('caseView.noTagsSelected')}</span>
				) : (
					assignedTags.map((tag) => (
						<Badge key={tag.id} className="border-transparent text-white" style={{ backgroundColor: tag.color }}>
							{tag.name}
						</Badge>
					))
				)}
			</div>
			<div className="flex items-center gap-1">
				<CaseTagQuickPicker mode={mode} caseId={caseId} assignedTags={assignedTags} onChange={setAssignedTags} />
				<TagManagerDialog
					mode={mode}
					caseId={caseId}
					trigger={
						<Button type="button" size="icon" variant="ghost" aria-label={t('manageTags') || 'Manage tags'}>
							<Settings2 className="size-4" />
						</Button>
					}
				/>
			</div>
		</div>
	)
}
