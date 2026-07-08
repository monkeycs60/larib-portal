'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multiselect'
import { DialogFooter } from '@/components/ui/dialog'
import { createStudyAction, updateStudyAction, createAuthorAction } from '../actions'
import { STUDY_STATUSES, type StudyListItem } from '@/lib/services/publications/studies'
import type { AuthorOption } from '@/lib/services/publications/authors'

const FormSchema = z.object({
  title: z.string().min(1),
  acronym: z.string().optional(),
  description: z.string().optional(),
  domain: z.string().optional(),
  funding: z.string().optional(),
  status: z.enum(STUDY_STATUSES),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})
type FormValues = z.infer<typeof FormSchema>

function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toISOString().slice(0, 10)
}

export function StudyForm({
  authors,
  centres,
  study,
  onDone,
}: {
  authors: AuthorOption[]
  centres: { id: string; name: string }[]
  study?: StudyListItem
  onDone: () => void
}) {
  const t = useTranslations('publications')
  const router = useRouter()
  const [authorOptions, setAuthorOptions] = useState(authors)
  const [piIds, setPiIds] = useState<string[]>(study?.investigators.filter((row) => row.role === 'PI').map((row) => row.authorId) ?? [])
  const [coIds, setCoIds] = useState<string[]>(study?.investigators.filter((row) => row.role === 'CO_INVESTIGATOR').map((row) => row.authorId) ?? [])
  const [centreIds, setCentreIds] = useState<string[]>(study?.centres.map((centre) => centre.id) ?? [])
  const [newFirst, setNewFirst] = useState('')
  const [newLast, setNewLast] = useState('')

  const authorItems = useMemo(
    () => authorOptions.map((author) => ({ label: `${author.firstName} ${author.lastName.toUpperCase()}`.trim(), value: author.id })),
    [authorOptions],
  )
  const centreItems = useMemo(() => centres.map((centre) => ({ label: centre.name, value: centre.id })), [centres])

  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: study?.title ?? '',
      acronym: study?.acronym ?? '',
      description: study?.description ?? '',
      domain: study?.domain ?? '',
      funding: study?.funding ?? '',
      status: (study?.status as FormValues['status']) ?? 'PLANNED',
      startDate: toDateInput(study?.startDate),
      endDate: toDateInput(study?.endDate),
    },
  })

  const { executeAsync: execCreate, isExecuting: creating } = useAction(createStudyAction, { onError() { toast.error(t('actionError')) } })
  const { executeAsync: execUpdate, isExecuting: updating } = useAction(updateStudyAction, { onError() { toast.error(t('actionError')) } })
  const { executeAsync: execAddAuthor } = useAction(createAuthorAction, { onError() { toast.error(t('actionError')) } })

  function addInvestigatorsCentres() {
    const ids = new Set(centreIds)
    for (const authorId of [...piIds, ...coIds]) {
      const author = authorOptions.find((entry) => entry.id === authorId)
      if (author?.centreId) ids.add(author.centreId)
    }
    setCentreIds(Array.from(ids))
  }

  async function addNewAuthor() {
    if (!newFirst.trim() || !newLast.trim()) return
    const res = await execAddAuthor({ firstName: newFirst.trim(), lastName: newLast.trim() })
    if (!res?.data) return
    const created = res.data
    setAuthorOptions((prev) => [...prev, { id: created.id, firstName: created.firstName, lastName: created.lastName, centreId: null }])
    setCoIds((prev) => [...prev, created.id])
    setNewFirst('')
    setNewLast('')
    toast.success(t('authors.saved'))
  }

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      title: values.title.trim(),
      acronym: values.acronym?.trim() || null,
      description: values.description?.trim() || null,
      domain: values.domain?.trim() || null,
      funding: values.funding?.trim() || null,
      status: values.status,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      piIds,
      coInvestigatorIds: coIds,
      centreIds,
    }
    const res = study ? await execUpdate({ id: study.id, ...payload }) : await execCreate(payload)
    if (!res?.data) return
    toast.success(study ? t('studies.updated') : t('studies.created'))
    onDone()
    router.refresh()
  })

  return (
    <form onSubmit={onSubmit} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
      <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.titleField')}</label><Input required {...register('title')} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.acronym')}</label><Input {...register('acronym')} /></div>
        <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.statusField')}</label>
          <Select {...register('status')}>{STUDY_STATUSES.map((value) => <option key={value} value={value}>{t(`studies.status.${value}`)}</option>)}</Select>
        </div>
        <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.startDate')}</label><Input type="date" {...register('startDate')} /></div>
        <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.endDate')}</label><Input type="date" {...register('endDate')} /></div>
        <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.domain')}</label><Input {...register('domain')} /></div>
        <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.funding')}</label><Input {...register('funding')} /></div>
      </div>
      <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.description')}</label><Textarea {...register('description')} /></div>

      <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.pis')}</label>
        <MultiSelect options={authorItems} defaultValue={piIds} onValueChange={setPiIds} placeholder={t('studies.pis')} maxCount={4} />
      </div>
      <div className="space-y-1"><label className="text-sm text-text-secondary">{t('studies.coInvestigators')}</label>
        <MultiSelect options={authorItems} defaultValue={coIds} onValueChange={setCoIds} placeholder={t('studies.coInvestigators')} maxCount={4} />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-text-secondary">{t('studies.newAuthor')}</label>
        <div className="flex gap-2">
          <Input value={newFirst} onChange={(event) => setNewFirst(event.target.value)} placeholder={t('studies.authorFirstName')} />
          <Input value={newLast} onChange={(event) => setNewLast(event.target.value)} placeholder={t('studies.authorLastName')} />
          <Button type="button" variant="outline" onClick={addNewAuthor} disabled={!newFirst.trim() || !newLast.trim()}>{t('studies.addAuthor')}</Button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-text-secondary">{t('studies.centres')}</label>
        <MultiSelect options={centreItems} defaultValue={centreIds} onValueChange={setCentreIds} placeholder={t('studies.centres')} maxCount={4} />
        <Button type="button" variant="outline" size="sm" onClick={addInvestigatorsCentres}>{t('studies.addInvestigatorsCentres')}</Button>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>{t('studies.cancel')}</Button>
        <Button type="submit" disabled={creating || updating}>{t('studies.save')}</Button>
      </DialogFooter>
    </form>
  )
}
