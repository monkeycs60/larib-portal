'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { ArrowLeft, RefreshCw, Pencil, ExternalLink, Trash2, Building2, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link, useRouter } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SingleSelect } from '@/components/ui/single-select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StudyForm } from './study-form'
import { StudyCentresSection } from './study-centres-section'
import { StudyPublicationsSection } from './study-publications-section'
import { setStudyStatusAction, deleteStudyAction } from '../actions'
import { STUDY_STATUSES, type StudyDetailData, type StudyListItem, type StudyStatusValue } from '@/lib/services/publications/studies'
import type { AuthorOption } from '@/lib/services/publications/authors'

export type CentreOption = { id: string; name: string; shortCode: string | null; city: string | null; country: string | null; isOwn: boolean }
export type ArticleOption = { id: string; title: string; journal: string | null; year: number | null; status: string }
export type DetailOptions = { centres: CentreOption[]; authors: AuthorOption[]; articles: ArticleOption[] }

const STATUS_BADGE: Record<StudyStatusValue, string> = {
  ONGOING: 'border-coral-200 bg-coral-50 text-coral-600',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  PLANNED: 'border-line bg-gray-100 text-gray-600',
  STOPPED: 'border-red-200 bg-red-50 text-red-600',
}
const STATUS_DOT: Record<StudyStatusValue, string> = {
  ONGOING: 'bg-coral-500', COMPLETED: 'bg-emerald-500', PLANNED: 'bg-gray-400', STOPPED: 'bg-red-500',
}

function fullDate(value: Date | null): string | null {
  if (!value) return null
  return value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function elapsedPercent(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null
  const total = end.getTime() - start.getTime()
  if (total <= 0) return null
  const done = new Date().getTime() - start.getTime()
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)))
}

function SectionCard({ title, count, action, children }: { title: string; count?: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-bg-surface p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-2 w-2 shrink-0 rounded-full bg-coral-500" />
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-coral-600">{title}</h2>
        {count != null && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">{count}</span>}
        <span className="h-px flex-1 bg-line" />
        {action}
      </div>
      {children}
    </section>
  )
}

export function StudyDetailView({ study, editable, options }: { study: StudyDetailData; editable: StudyListItem; options: DetailOptions }) {
  const t = useTranslations('publications.studies')
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const status = useAction(setStudyStatusAction, {
    onSuccess: () => { toast.success(t('statusUpdated')); router.refresh() },
    onError: () => toast.error(t('actionError')),
  })
  const remove = useAction(deleteStudyAction, {
    onSuccess: () => { toast.success(t('deleted')); router.push('/publications/admin/studies') },
    onError: () => toast.error(t('actionError')),
  })

  const conditions = (study.domain ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  const sponsors = (study.funding ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  const start = fullDate(study.startDate)
  const end = fullDate(study.endDate)
  const percent = elapsedPercent(study.startDate, study.endDate)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Link href="/publications/admin/studies" className="inline-flex items-center gap-1 hover:text-coral-600"><ArrowLeft className="size-4" />{t('title')}</Link>
        <span>›</span>
        <span className="text-text-secondary">{t('detailBreadcrumb')}</span>
      </div>

      <div className="rounded-2xl border border-line bg-bg-surface p-6 shadow-sm">
        <div className="flex gap-4">
          <span aria-hidden className="w-[5px] shrink-0 rounded bg-gradient-to-b from-coral-500 to-coral-600" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {study.acronym && <span className="rounded-full border border-coral-200 bg-coral-50 px-3 py-1 text-xs font-bold text-coral-600">{study.acronym}</span>}
              <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', STATUS_BADGE[study.status])}>
                <span className={cn('size-1.5 rounded-full', STATUS_DOT[study.status])} />
                {t(`status.${study.status}`)}
              </span>
              {study.nctId && (
                <a href={`https://clinicaltrials.gov/study/${study.nctId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[#CBDBFF] bg-[#EEF3FF] px-3 py-1 text-xs font-bold text-[#3B6FE0] hover:brightness-95">
                  <ExternalLink className="size-3" />{study.nctId}
                </a>
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{study.title}</h1>
            {study.nctId && study.lastSyncedAt && (
              <p className="inline-flex items-center gap-1.5 text-sm text-text-muted">
                <RefreshCw className="size-3.5" />{t('importedFrom')} <span className="font-semibold text-text-secondary">ClinicalTrials.gov</span> · {t('lastSynced')} {fullDate(study.lastSyncedAt)}
              </p>
            )}
            <div className="flex flex-wrap items-end gap-3 pt-1">
              <div className="space-y-1">
                <span className="block text-xs font-bold uppercase tracking-wide text-text-muted">{t('statusField')}</span>
                <SingleSelect
                  options={STUDY_STATUSES.map((value) => ({ value, label: t(`status.${value}`) }))}
                  value={study.status}
                  onChange={(value) => status.execute({ id: study.id, status: value as StudyStatusValue })}
                  className="min-w-[10rem]"
                />
              </div>
              <Button onClick={() => setEditOpen(true)} className="gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105">
                <Pencil className="size-4" />{t('editStudy')}
              </Button>
              {study.nctId && (
                <a href={`https://clinicaltrials.gov/study/${study.nctId}`} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="gap-2"><ExternalLink className="size-4" />ClinicalTrials.gov</Button>
                </a>
              )}
              <Button variant="outline" onClick={() => setDeleteOpen(true)} className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" />{t('delete')}</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {study.description && (
            <SectionCard title={t('sectionDescription')}>
              <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">{study.description}</p>
            </SectionCard>
          )}
          {conditions.length > 0 && (
            <SectionCard title={t('sectionConditions')} count={conditions.length}>
              <div className="flex flex-wrap gap-2">
                {conditions.map((condition) => (
                  <span key={condition} className="rounded-xl border border-line bg-bg-muted px-3 py-1.5 text-sm text-text-primary">{condition}</span>
                ))}
              </div>
            </SectionCard>
          )}
          <StudyCentresSection study={study} options={options} />
          <StudyPublicationsSection study={study} options={options} />
        </div>

        <div className="space-y-6">
          <SectionCard title={t('sectionTimeline')}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wide text-text-muted">{t('start')}</span>
                <span className="text-lg font-extrabold text-text-primary">{start ?? t('startTbd')}</span>
              </div>
              <CalendarDays className="size-4 text-text-muted" />
              <div className="text-right">
                <span className="block text-xs font-bold uppercase tracking-wide text-text-muted">{t('end')}</span>
                <span className="text-lg font-extrabold text-text-primary">{end ?? '—'}</span>
              </div>
            </div>
            {percent != null && (
              <div className="mt-3 space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-bg-muted">
                  <div className="h-full rounded-full bg-gradient-to-r from-coral-500 to-coral-600" style={{ width: `${percent}%` }} />
                </div>
                <p className="text-xs text-text-muted">{t('elapsed', { percent })}{end ? ` · ${t('endsOn', { date: end })}` : ''}</p>
              </div>
            )}
          </SectionCard>

          {sponsors.length > 0 && (
            <SectionCard title={t('sectionFunding')}>
              <ul className="space-y-2">
                {sponsors.map((sponsor) => (
                  <li key={sponsor} className="flex items-start gap-2 text-sm text-text-primary"><Building2 className="mt-0.5 size-4 shrink-0 text-text-muted" />{sponsor}</li>
                ))}
              </ul>
            </SectionCard>
          )}

          {(study.nctId || study.enrollment != null) && (
            <SectionCard title={t('sectionIdentifiers')}>
              <dl className="space-y-2 text-sm">
                {study.nctId && (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-text-muted">{t('source')}</dt>
                      <dd><span className="rounded-full border border-[#CBDBFF] bg-[#EEF3FF] px-2.5 py-0.5 text-xs font-bold text-[#3B6FE0]">ClinicalTrials.gov</span></dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-text-muted">{t('nctNumber')}</dt>
                      <dd>
                        <a href={`https://clinicaltrials.gov/study/${study.nctId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-coral-600 hover:underline">{study.nctId}<ExternalLink className="size-3" /></a>
                      </dd>
                    </div>
                  </>
                )}
                {study.enrollment != null && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-text-muted">{t('colPatients')}</dt>
                    <dd className="font-bold text-text-primary">{study.enrollment.toLocaleString('en-US')}</dd>
                  </div>
                )}
              </dl>
            </SectionCard>
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setEditOpen(false) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{t('editTitle')}</DialogTitle></DialogHeader>
          <StudyForm authors={options.authors} centres={options.centres.map((centre) => ({ id: centre.id, name: centre.name }))} study={editable} onDone={() => { setEditOpen(false); router.refresh() }} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.execute({ id: study.id })} className="bg-red-600 hover:bg-red-700">{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
