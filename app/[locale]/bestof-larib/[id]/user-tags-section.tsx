"use client"

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAction } from 'next-safe-action/hooks'
import { ensureUserTagAction, setCaseUserTagsAction } from '../actions'
import { toast } from 'sonner'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'
import { Check, Loader2, Plus } from 'lucide-react'

type Tag = { id: string; name: string; color: string; description: string | null }

export default function UserTagsSection({ isAdmin, caseId, initialTags, initialSelectedIds }: { isAdmin: boolean; caseId: string; initialTags: Tag[]; initialSelectedIds: string[] }) {
  const t = useTranslations('bestof')
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [newDesc, setNewDesc] = useState('')
  const [isSavingSelection, startSavingSelection] = useTransition()

  const save = useAction(setCaseUserTagsAction, {
    onSuccess() { toast.success(t('updated')) },
    onError() { toast.error(t('actionError')) },
  })

  function updateSelection(ids: string[]) {
    setSelectedIds(ids)
    if (isAdmin) return
    startSavingSelection(() => { void save.execute({ caseId, tagIds: ids }) })
  }

  const createTag = useAction(ensureUserTagAction, {
    onSuccess(res) {
      if (!res.data) return
      const created = res.data as Tag
      setTags((previous) => [...previous.filter((tag) => tag.id !== created.id), created])
      const nextSelected = Array.from(new Set([...selectedIds, created.id]))
      updateSelection(nextSelected)
      toast.success(t('updated'))
      setOpen(false)
      setNewName('')
      setNewDesc('')
    },
    onError() { toast.error(t('actionError')) },
  })

  useEffect(() => { setTags(initialTags) }, [initialTags])
  useEffect(() => { setSelectedIds(initialSelectedIds) }, [initialSelectedIds])

  const sortedTags = useMemo(() => tags.slice().sort((left, right) => left.name.localeCompare(right.name)), [tags])
  const isSaving = save.isExecuting || isSavingSelection

  function handleToggle(tagId: string, pressed: boolean) {
    if (isAdmin) return
    const nextIds = pressed ? Array.from(new Set([...selectedIds, tagId])) : selectedIds.filter((id) => id !== tagId)
    updateSelection(nextIds)
  }

  function handleCreateTag() {
    const payload = { name: newName.trim(), color: newColor, description: newDesc.trim() || null }
    if (!payload.name) return
    startSavingSelection(() => { void createTag.execute(payload) })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
          {sortedTags.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('caseView.noUserTags')}</div>
          ) : sortedTags.map((tag) => {
            const active = selectedIds.includes(tag.id)
            const backgroundTint = `${tag.color}33`
            return (
              <Toggle
                key={tag.id}
                pressed={active}
                onPressedChange={(pressed) => handleToggle(tag.id, pressed)}
                disabled={isAdmin || isSaving}
                aria-label={tag.name}
                className={cn(
                  'justify-start rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60',
                  active ? 'shadow-sm ring-1 ring-offset-1 ring-offset-background' : 'bg-background'
                )}
                style={{ borderColor: tag.color, backgroundColor: active ? backgroundTint : undefined }}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="max-w-[140px] truncate text-sm font-medium">{tag.name}</span>
                  {active ? <Check className="size-3" /> : null}
                </span>
              </Toggle>
            )
          })}
        </div>
        {isSaving ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {t('saving')}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            {selectedIds.length === 0 ? t('caseView.noTagsSelected') : t('caseView.tagsAutoSaved')}
          </div>
        )}
      </div>
      <div className="flex justify-between gap-2 pt-1">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" disabled={isAdmin || isSaving}>
              <Plus className="mr-2 size-4" />
              {t('createTag')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createNewTagLabel') || 'Create new tag'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs">{t('tagNameLabel') || 'Name'}</label>
                <Input value={newName} onChange={(event) => setNewName(event.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs">{t('tagColorLabel') || 'Color'}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={newColor} onChange={(event) => setNewColor(event.target.value)} className="h-9 w-12 rounded border" />
                  <Input value={newColor} onChange={(event) => setNewColor(event.target.value)} className="font-mono" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs">{t('tagDescriptionLabel') || 'Description'}</label>
                <Textarea value={newDesc} onChange={(event) => setNewDesc(event.target.value)} placeholder={t('tagDescriptionPlaceholder') || 'Optional'} />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCreateTag} disabled={!newName.trim() || createTag.isExecuting}>
                  {createTag.isExecuting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {t('createTag')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Auto-save on toggle and create; no explicit Update button */}
      </div>
    </div>
  )
}
