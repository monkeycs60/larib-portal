"use client"
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAction } from 'next-safe-action/hooks'
import { ensureUserTagAction, setCaseUserTagsAction } from '../actions'
import { toast } from 'sonner'

type Tag = { id: string; name: string; color: string; description: string | null }

export default function UserTagsSection({ isAdmin, caseId, initialTags, initialSelectedIds }: { isAdmin: boolean; caseId: string; initialTags: Tag[]; initialSelectedIds: string[] }) {
  const t = useTranslations('bestof')
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [newDesc, setNewDesc] = useState('')

  const createTag = useAction(ensureUserTagAction, {
    onSuccess(res) {
      if (!res.data) return
      const created = res.data as Tag
      setTags((prev) => [...prev.filter((t) => t.id !== created.id), created].sort((a, b) => a.name.localeCompare(b.name)))
      const nextSelected = Array.from(new Set([...
        selectedIds,
        created.id,
      ]))
      setSelectedIds(nextSelected)
      // auto-save new selection
      void save.execute({ caseId, tagIds: nextSelected })
      toast.success(t('updated'))
      setOpen(false)
      setNewName('')
      setNewDesc('')
    },
    onError() { toast.error(t('actionError')) },
  })

  const save = useAction(setCaseUserTagsAction, {
    onSuccess() { toast.success(t('updated')) },
    onError() { toast.error(t('actionError')) },
  })

  function onToggle(id: string) {
    if (isAdmin) return
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      // auto-save
      void save.execute({ caseId, tagIds: next })
      return next
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
        {tags.map((tag) => {
          const active = selectedIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              aria-pressed={active}
              disabled={isAdmin}
              className={`px-2 py-1 rounded-full text-xs border transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? 'text-white border-transparent'
                  : 'bg-transparent'
              }`}
              style={active ? { backgroundColor: tag.color } : { borderColor: tag.color, color: tag.color }}
            >
              {tag.name}
            </button>
          )
        })}
        {tags.length === 0 ? (<div className="text-sm text-muted-foreground">{t('empty')}</div>) : null}
      </div>
      <div className="flex justify-between gap-2 pt-1">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" disabled={isAdmin}>{t('createTag')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createNewTagLabel') || 'Create new tag'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs">{t('tagNameLabel') || 'Name'}</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs">{t('tagColorLabel') || 'Color'}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-9 w-12 rounded border" />
                  <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} className="font-mono" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs">{t('tagDescriptionLabel') || 'Description'}</label>
                <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder={t('tagDescriptionPlaceholder') || 'Optional'} />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => createTag.execute({ name: newName.trim(), color: newColor, description: newDesc.trim() || null })} disabled={!newName.trim() || createTag.isExecuting}>{createTag.isExecuting ? t('saving') : t('createTag')}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Auto-save on toggle and create; no explicit Update button */}
      </div>
    </div>
  )
}
