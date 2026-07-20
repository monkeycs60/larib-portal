'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Download, Search, Building2, UserRound, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { previewClinicalTrialAction, importClinicalTrialAction } from '../actions'
import type { ClinicalTrialImport } from '@/lib/services/publications/clinicaltrials'

const CORAL = 'gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105'

type Props = { open: boolean; onClose: () => void }

export function ImportTrialDialog({ open, onClose }: Props) {
  const t = useTranslations('publications.studies.importTrial')
  const tStatus = useTranslations('publications.studies.status')
  const router = useRouter()
  const [nctId, setNctId] = useState('')
  const [preview, setPreview] = useState<ClinicalTrialImport | null>(null)

  function errorMessage(reason: string): string {
    const known = new Set(['INVALID_NCT_ID', 'DUPLICATE', 'NOT_FOUND', 'FETCH_FAILED', 'IMPORT_FAILED'])
    return t(`errors.${known.has(reason) ? reason : 'FETCH_FAILED'}`)
  }

  const previewAction = useAction(previewClinicalTrialAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      if (data.ok) setPreview(data.preview)
      else { setPreview(null); toast.error(errorMessage(data.error)) }
    },
    onError: () => toast.error(errorMessage('FETCH_FAILED')),
  })

  const importAction = useAction(importClinicalTrialAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      if (data.ok) {
        toast.success(t('imported', { centres: data.result.centresCreated, people: data.result.investigatorsCreated }))
        handleClose()
        router.refresh()
      } else {
        toast.error(errorMessage(data.error))
      }
    },
    onError: () => toast.error(errorMessage('IMPORT_FAILED')),
  })

  function handleClose() {
    setNctId('')
    setPreview(null)
    onClose()
  }

  const fetching = previewAction.isPending
  const importing = importAction.isPending

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">{t('description')}</p>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label>{t('nctLabel')}</Label>
              <Input
                value={nctId}
                onChange={(event) => setNctId(event.target.value)}
                placeholder="NCT06235385"
                onKeyDown={(event) => { if (event.key === 'Enter' && nctId.trim()) previewAction.execute({ nctId: nctId.trim() }) }}
              />
            </div>
            <Button type="button" variant="outline" className="gap-2" disabled={!nctId.trim() || fetching} onClick={() => previewAction.execute({ nctId: nctId.trim() })}>
              <Search className="h-4 w-4" />
              {fetching ? t('fetching') : t('fetch')}
            </Button>
          </div>

          {preview && (
            <div className="space-y-4 rounded-2xl border border-line bg-bg-surface p-4">
              <div>
                <div className="flex items-center gap-2">
                  <a href={`https://clinicaltrials.gov/study/${preview.nctId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-coral-600 hover:underline">
                    {preview.nctId}<ExternalLink className="h-3 w-3" />
                  </a>
                  <Badge variant="secondary">{tStatus(preview.status)}</Badge>
                </div>
                <p className="mt-1 font-extrabold text-text-primary">{preview.title}</p>
                {preview.acronym && <p className="text-sm text-text-secondary">{preview.acronym}</p>}
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Field label={t('fieldDates')} value={[preview.startDate, preview.endDate].filter(Boolean).join(' → ') || '—'} />
                <Field label={t('fieldFunding')} value={preview.funding ?? '—'} />
                <Field label={t('fieldDomain')} value={preview.domain ?? '—'} span />
              </dl>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ListBlock icon={<Building2 className="h-4 w-4" />} label={t('centres', { count: preview.centres.length })}>
                  {preview.centres.map((centre) => (
                    <li key={centre.name} className="truncate">{centre.name}{centre.city ? ` · ${centre.city}` : ''}</li>
                  ))}
                </ListBlock>
                <ListBlock icon={<UserRound className="h-4 w-4" />} label={t('investigators', { count: preview.investigators.length })}>
                  {preview.investigators.map((person) => (
                    <li key={`${person.firstName}-${person.lastName}`} className="truncate">
                      {person.firstName} {person.lastName}{person.degrees ? `, ${person.degrees}` : ''}
                    </li>
                  ))}
                </ListBlock>
              </div>
              <p className="text-xs text-text-muted">{t('reviewHint')}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>{t('cancel')}</Button>
          <Button type="button" className={CORAL} disabled={!preview || importing} onClick={() => preview && importAction.execute({ nctId: preview.nctId })}>
            <Download className="h-4 w-4" />
            {importing ? t('importing') : t('import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="text-text-primary">{value}</dd>
    </div>
  )
}

function ListBlock({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-secondary">{icon}{label}</div>
      <ul className="space-y-1 text-sm text-text-primary">{children}</ul>
    </div>
  )
}
