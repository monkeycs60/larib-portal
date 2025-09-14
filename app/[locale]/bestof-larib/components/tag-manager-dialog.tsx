'use client'
import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ensureAdminTagAction,
  ensureUserTagAction,
  getCaseAdminTagIdsAction,
  getCaseUserTagIdsAction,
  listAdminTagsAction,
  listCasesByAdminTagAction,
  listCasesByUserTagAction,
  listUserTagsAction,
  setCaseAdminTagsAction,
  setCaseUserTagsAction,
} from '../actions'
import { toast } from 'sonner'

type Mode = 'admin' | 'user'

type Tag = { id: string; name: string; color: string; description: string | null; caseCount?: number }

export default function TagManagerDialog({
  mode,
  caseId,
  trigger,
}: {
  mode: Mode
  caseId: string
  trigger?: ReactNode
}) {
  const t = useTranslations('bestof')
  const [open, setOpen] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activeTagId, setActiveTagId] = useState<string>('')
  const [activeTagCases, setActiveTagCases] = useState<{ id: string; name: string; createdAt: string }[]>([])

  // New tag form
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [newDesc, setNewDesc] = useState('')

  const listTags = useAction(mode === 'admin' ? listAdminTagsAction : listUserTagsAction, {
    onSuccess(res) {
      const data = Array.isArray(res.data) ? (res.data as Tag[]) : []
      setTags(data)
    },
    onError({ error }) {
      const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
      toast.error(msg)
    },
  })

  const getCaseTagIds = useAction(mode === 'admin' ? getCaseAdminTagIdsAction : getCaseUserTagIdsAction, {
    onSuccess(res) {
      const data = Array.isArray(res.data) ? (res.data as string[]) : []
      setSelectedIds(data)
    },
  })

  const saveCaseTags = useAction(mode === 'admin' ? setCaseAdminTagsAction : setCaseUserTagsAction, {
    onSuccess() {
      toast.success(t('updated'))
      // refresh counts
      void listTags.execute()
    },
    onError({ error }) {
      const msg = typeof error?.serverError === 'string' ? error.serverError : t('actionError')
      toast.error(msg)
    },
  })

  const ensureTag = useAction(mode === 'admin' ? ensureAdminTagAction : ensureUserTagAction, {
    onSuccess(res) {
      if (!res.data) return
      const created = res.data as Tag
      setTags((prev) => {
        const next = [...prev.filter((t) => t.id !== created.id), { ...created, caseCount: prev.find((p) => p.id === created.id)?.caseCount ?? 0 }]
        return next.sort((a, b) => a.name.localeCompare(b.name))
      })
      toast.success(t('updated'))
    },
  })

  const listCasesByTag = useAction(mode === 'admin' ? listCasesByAdminTagAction : listCasesByUserTagAction, {
    onSuccess(res) {
      const rows = Array.isArray(res.data) ? (res.data as { id: string; name: string; createdAt: string }[]) : []
      setActiveTagCases(rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.createdAt })))
    },
  })

  async function onOpen(next: boolean) {
    setOpen(next)
    if (next) {
      await listTags.execute()
      await getCaseTagIds.execute({ caseId })
    }
  }

  async function onSaveAssignment() {
    await saveCaseTags.execute({ caseId, tagIds: selectedIds })
  }

  async function onCreateTag() {
    const name = newName.trim()
    if (!name) return
    await ensureTag.execute({ name, color: newColor, description: newDesc.trim() || null })
    setNewName('')
    setNewDesc('')
  }

  async function onSelectTagForCases(tagId: string) {
    setActiveTagId(tagId)
    if (tagId) await listCasesByTag.execute({ tagId })
  }

  const isSaving = saveCaseTags.isExecuting
  const isLoading = listTags.isExecuting || getCaseTagIds.isExecuting

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="icon" variant="ghost">+</Button>}
      </DialogTrigger>
      <DialogContent className="w-[900px] max-w-[900px] h-[600px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {mode === 'admin' ? t('table.adminTags') : t('caseView.myTags')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex h-[calc(600px-70px)] flex-col">
        <Tabs defaultValue="assign" className="flex-1 flex flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="assign">{t('assignTagsTab') || 'Assign'}</TabsTrigger>
            <TabsTrigger value="manage">{t('manageTagsTab') || 'Manage'}</TabsTrigger>
            <TabsTrigger value="cases">{t('casesByTagTab') || 'Cases'}</TabsTrigger>
          </TabsList>
          <TabsContent value="assign" className="mt-4 flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
                  {tags.map((tag) => (
                    <label key={tag.id} className="flex items-start gap-2 p-2 rounded border hover:bg-accent/50">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(tag.id)}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setSelectedIds((prev) => (checked ? [...prev, tag.id] : prev.filter((id) => id !== tag.id)))
                        }}
                      />
                      <span className="inline-flex flex-col gap-1">
                        <span className="inline-flex items-center gap-2">
                          <span className="size-3 rounded" style={{ backgroundColor: tag.color }} />
                          <span className="text-sm font-medium">{tag.name}</span>
                        </span>
                        {tag.description ? (
                          <span className="text-[11px] leading-4 text-muted-foreground">{tag.description}</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                  {tags.length === 0 ? (
                    <div className="col-span-2 text-sm text-muted-foreground">No tags yet</div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {selectedIds.map((id) => tags.find((t) => t.id === id)).filter(Boolean).map((tag) => (
                    <Badge key={tag!.id} style={{ backgroundColor: (tag as Tag).color }} className="text-white border-transparent">
                      {(tag as Tag).name}
                    </Badge>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
                  <Button onClick={onSaveAssignment} disabled={isSaving}>{isSaving ? t('saving') : t('update')}</Button>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="manage" className="mt-4 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-start justify-between gap-2 p-2 rounded border">
                    <div className="flex items-start gap-2">
                      <span className="mt-1 size-3 rounded" style={{ backgroundColor: tag.color }} />
                      <div>
                        <div className="text-sm font-medium">{tag.name}</div>
                        {tag.description ? (
                          <div className="text-xs text-muted-foreground">{tag.description}</div>
                        ) : null}
                      </div>
                    </div>
                    {typeof tag.caseCount === 'number' ? (
                      <div className="text-xs text-muted-foreground">{tag.caseCount} cases</div>
                    ) : null}
                  </div>
                ))}
                {tags.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No tags yet</div>
                ) : null}
              </div>
              <div className="space-y-3">
                <div className="text-sm font-medium">{t('createNewTagLabel') || 'Create new tag'}</div>
                <div className="space-y-2">
                  <label className="text-xs">{t('tagNameLabel') || 'Name'}</label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('tagNamePlaceholder') || 'e.g. Must-know'} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs">{t('tagColorLabel') || 'Color'}</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-9 w-12 rounded border" />
                    <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} className="font-mono" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs">{t('tagDescriptionLabel') || 'Description'}</label>
                  <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder={t('tagDescriptionPlaceholder') || 'Optional'} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={onCreateTag} disabled={ensureTag.isExecuting || !newName.trim()}>
                    {ensureTag.isExecuting ? t('saving') : t('createTag')}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="cases" className="mt-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-3">
              <div className="text-[12px] text-muted-foreground">
                {t('casesTabInfo') || 'Select a tag to see which cases use it.'}
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="border rounded px-2 py-1 text-sm bg-transparent"
                  value={activeTagId}
                  onChange={(e) => void onSelectTagForCases(e.target.value)}
                >
                  <option value="">{t('selectPlaceholder')}</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
                {activeTagId ? (
                  <Badge style={{ backgroundColor: tags.find((t) => t.id === activeTagId)?.color }} className="text-white border-transparent">
                    {tags.find((t) => t.id === activeTagId)?.name}
                  </Badge>
                ) : null}
              </div>
              {activeTagId ? (
                <div className="rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('table.case')}</TableHead>
                        <TableHead>{t('table.createdAt')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeTagCases.length === 0 ? (
                        <TableRow><TableCell colSpan={2} className="text-sm text-muted-foreground">{t('empty')}</TableCell></TableRow>
                      ) : (
                        activeTagCases.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{t('selectPlaceholder')}</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
