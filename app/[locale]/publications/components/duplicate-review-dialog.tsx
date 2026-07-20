'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { AuthorListItem } from '@/lib/services/publications/authors'

export type DuplicateGroup = { key: string; members: AuthorListItem[] }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: DuplicateGroup[]
  onMerge: (keepId: string, mergeIds: string[]) => Promise<boolean>
}

function memberLabel(author: AuthorListItem): string {
  return `${author.firstName} ${author.lastName.toUpperCase()}`.trim()
}

function defaultKeeper(members: AuthorListItem[]): string {
  return [...members].sort(
    (first, second) => (second.orcid ? 1 : 0) - (first.orcid ? 1 : 0) || second._count.authorships - first._count.authorships,
  )[0].id
}

export function DuplicateReviewDialog({ open, onOpenChange, groups, onMerge }: Props) {
  const t = useTranslations('publications.authors.duplicates')
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [keepers, setKeepers] = useState<Record<string, string>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const visible = groups.filter((group) => !dismissed.has(group.key))

  function keeperFor(group: DuplicateGroup): string {
    return keepers[group.key] ?? defaultKeeper(group.members)
  }

  function skip(group: DuplicateGroup) {
    setDismissed((previous) => new Set(previous).add(group.key))
  }

  async function merge(group: DuplicateGroup) {
    const keepId = keeperFor(group)
    const mergeIds = group.members.filter((member) => member.id !== keepId).map((member) => member.id)
    setBusyKey(group.key)
    const ok = await onMerge(keepId, mergeIds)
    setBusyKey(null)
    if (ok) skip(group)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title', { count: visible.length })}</DialogTitle>
        </DialogHeader>
        {visible.length === 0 ? (
          <p className="py-8 text-center text-text-secondary">{t('none')}</p>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {visible.map((group) => {
              const orcids = new Set(group.members.map((member) => member.orcid).filter(Boolean))
              const keepId = keeperFor(group)
              return (
                <div key={group.key} className="space-y-3 rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-text-primary">{memberLabel(group.members[0])}</span>
                    {orcids.size > 1 ? (
                      <Badge variant="warning">{t('orcidConflict')}</Badge>
                    ) : orcids.size === 1 ? (
                      <Badge variant="success">{t('sameOrcid')}</Badge>
                    ) : (
                      <Badge variant="neutral">{t('nameOnly')}</Badge>
                    )}
                  </div>
                  <ul className="space-y-1 text-sm text-text-secondary">
                    {group.members.map((member) => (
                      <li key={member.id} className="flex items-center justify-between gap-3">
                        <span className="truncate">{member.centre?.name ?? '—'} · {member._count.authorships} {t('papers')}</span>
                        <span className="shrink-0">{member.orcid ?? '—'}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-text-secondary">{t('keep')}</span>
                    <Select
                      value={keepId}
                      onChange={(event) => setKeepers((previous) => ({ ...previous, [group.key]: event.target.value }))}
                      className="w-auto max-w-xs truncate"
                    >
                      {group.members.map((member) => (
                        <option key={member.id} value={member.id} title={memberLabel(member)}>
                          {`${memberLabel(member)}${member.orcid ? ` · ${member.orcid}` : ''} (${member._count.authorships})`}
                        </option>
                      ))}
                    </Select>
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => skip(group)}>{t('skip')}</Button>
                      <Button
                        size="sm"
                        disabled={busyKey === group.key}
                        onClick={() => merge(group)}
                        className="bg-gradient-to-b from-coral-500 to-coral-600 text-white hover:brightness-105"
                      >
                        {t('merge')}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
