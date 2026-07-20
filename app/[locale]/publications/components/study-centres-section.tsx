'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Plus, Activity, Star, Mail, X, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SingleSelect } from '@/components/ui/single-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { linkStudyCentreAction, unlinkStudyCentreAction, setStudyInvestigatorAction, removeStudyInvestigatorAction } from '../actions'
import type { StudyDetailData, StudyInvestigatorRow, StudyRoleValue } from '@/lib/services/publications/studies'
import type { DetailOptions } from './study-detail-view'

const AVATAR_TINTS = ['bg-coral-50 text-coral-600', 'bg-[#EDE4FF] text-[#7048E8]', 'bg-[#E1F0FF] text-[#2F80ED]', 'bg-[#E3F9EE] text-[#12B76A]']

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?'
}

function InvestigatorCard({ studyId, person, tint, onChanged }: { studyId: string; person: StudyInvestigatorRow; tint: string; onChanged: () => void }) {
  const t = useTranslations('publications.studies')
  const isPi = person.role === 'PI'
  const remove = useAction(removeStudyInvestigatorAction, { onSuccess: onChanged, onError: () => toast.error(t('actionError')) })
  const degrees = (person.degrees ?? '').split(/\s+/).map((degree) => degree.trim()).filter(Boolean)
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border p-3', isPi ? 'border-coral-200 bg-coral-50/40' : 'border-line bg-bg-surface')}>
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold', tint)}>{initials(person.firstName, person.lastName)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-text-primary">{person.firstName} <span className="font-bold">{person.lastName}</span></span>
          {degrees.map((degree) => <span key={degree} className="rounded-md bg-bg-muted px-1.5 py-0.5 text-[10px] font-bold text-text-secondary">{degree}</span>)}
        </div>
        {person.email && <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-text-muted"><Mail className="size-3" />{person.email}</span>}
      </div>
      <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold', isPi ? 'border-coral-200 bg-coral-50 text-coral-600' : 'border-line bg-bg-muted text-text-secondary')}>
        {isPi && <Star className="size-3" />}{t(`role.${person.role}`)}
      </span>
      <button type="button" aria-label={t('removeInvestigator')} onClick={() => remove.execute({ studyId, authorId: person.authorId })} className="text-text-muted hover:text-red-600"><X className="size-4" /></button>
    </div>
  )
}

export function StudyCentresSection({ study, options }: { study: StudyDetailData; options: DetailOptions }) {
  const t = useTranslations('publications.studies')
  const router = useRouter()
  const [linkCentreOpen, setLinkCentreOpen] = useState(false)
  const [centreToLink, setCentreToLink] = useState('')
  const [addInvestOpen, setAddInvestOpen] = useState(false)
  const [investAuthor, setInvestAuthor] = useState('')
  const [investRole, setInvestRole] = useState<StudyRoleValue>('CO_INVESTIGATOR')
  const [investCentre, setInvestCentre] = useState<string>('')

  const refresh = () => router.refresh()
  const linkCentre = useAction(linkStudyCentreAction, { onSuccess: () => { toast.success(t('centreLinked')); setLinkCentreOpen(false); setCentreToLink(''); refresh() }, onError: () => toast.error(t('actionError')) })
  const unlinkCentre = useAction(unlinkStudyCentreAction, { onSuccess: () => { toast.success(t('centreUnlinked')); refresh() }, onError: () => toast.error(t('actionError')) })
  const setInvest = useAction(setStudyInvestigatorAction, { onSuccess: () => { toast.success(t('investigatorLinked')); setAddInvestOpen(false); setInvestAuthor(''); setInvestCentre(''); setInvestRole('CO_INVESTIGATOR'); refresh() }, onError: () => toast.error(t('actionError')) })

  const linkedCentreIds = new Set(study.centres.map((centre) => centre.id))
  const availableCentres = options.centres.filter((centre) => !linkedCentreIds.has(centre.id))
  const linkedAuthorIds = new Set([...study.centres.flatMap((centre) => centre.investigators), ...study.unassignedInvestigators].map((person) => person.authorId))
  const availableAuthors = options.authors.filter((author) => !linkedAuthorIds.has(author.id))

  return (
    <section className="rounded-2xl border border-line bg-bg-surface p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-2 w-2 shrink-0 rounded-full bg-coral-500" />
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-coral-600">{t('sectionCentres')}</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">{study.counts.centres}</span>
        <span className="h-px flex-1 bg-line" />
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddInvestOpen(true)}><UserPlus className="size-4" />{t('linkInvestigator')}</Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLinkCentreOpen(true)}><Plus className="size-4" />{t('linkCentre')}</Button>
      </div>

      <div className="space-y-4">
        {study.centres.map((centre, centreIndex) => (
          <div key={centre.id} className="rounded-2xl border border-line p-4">
            <div className="flex items-center gap-3">
              <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold', AVATAR_TINTS[centreIndex % AVATAR_TINTS.length])}>{centre.shortCode?.trim() ? centre.shortCode.trim().slice(0, 3).toUpperCase() : initials(centre.name, centre.name.slice(1))}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold text-text-primary">{centre.name}</span>
                  {centre.isOwn && <span className="flex size-5 items-center justify-center rounded-md bg-gradient-to-b from-coral-500 to-coral-600 text-white"><Activity className="size-3" /></span>}
                </div>
                <span className="text-sm text-text-muted">{[centre.city, centre.country].filter(Boolean).join(', ') || '—'}</span>
              </div>
              <span className="rounded-full bg-bg-muted px-3 py-1 text-xs font-semibold text-text-secondary">{t('investigatorCount', { count: centre.investigators.length })}</span>
              <button type="button" aria-label={t('unlinkCentre')} onClick={() => unlinkCentre.execute({ studyId: study.id, centreId: centre.id })} className="text-text-muted hover:text-red-600"><X className="size-4" /></button>
            </div>
            {centre.investigators.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-line pt-3">
                {centre.investigators.map((person) => (
                  <InvestigatorCard key={person.authorId} studyId={study.id} person={person} tint={AVATAR_TINTS[centreIndex % AVATAR_TINTS.length]} onChanged={refresh} />
                ))}
              </div>
            )}
          </div>
        ))}

        {study.unassignedInvestigators.length > 0 && (
          <div className="rounded-2xl border border-dashed border-line p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">{t('unassignedInvestigators')}</p>
            <div className="space-y-2">
              {study.unassignedInvestigators.map((person) => (
                <InvestigatorCard key={person.authorId} studyId={study.id} person={person} tint="bg-bg-muted text-text-secondary" onChanged={refresh} />
              ))}
            </div>
          </div>
        )}

        {study.centres.length === 0 && study.unassignedInvestigators.length === 0 && (
          <p className="py-6 text-center text-sm text-text-muted">{t('noCentres')}</p>
        )}
      </div>

      <Dialog open={linkCentreOpen} onOpenChange={(open) => { if (!open) setLinkCentreOpen(false) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('linkCentre')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <SingleSelect
              options={availableCentres.map((centre) => ({ value: centre.id, label: centre.name }))}
              value={centreToLink}
              onChange={setCentreToLink}
              searchable
              searchPlaceholder={t('searchPlaceholder')}
              emptyLabel={t('noCentres')}
              placeholder={t('linkCentre')}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkCentreOpen(false)}>{t('cancel')}</Button>
              <Button disabled={!centreToLink || linkCentre.isPending} onClick={() => linkCentre.execute({ studyId: study.id, centreId: centreToLink })}>{t('linkCentre')}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addInvestOpen} onOpenChange={(open) => { if (!open) setAddInvestOpen(false) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('linkInvestigator')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('investigator')}</Label>
              <SingleSelect
                options={availableAuthors.map((author) => ({ value: author.id, label: `${author.firstName} ${author.lastName}`.trim() }))}
                value={investAuthor}
                onChange={setInvestAuthor}
                searchable
                searchPlaceholder={t('searchPlaceholder')}
                emptyLabel={t('noInvestigators')}
                placeholder={t('investigator')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('roleLabel')}</Label>
              <ToggleGroup type="single" value={investRole} onValueChange={(value) => value && setInvestRole(value as StudyRoleValue)} className="justify-start">
                <ToggleGroupItem value="PI">{t('role.PI')}</ToggleGroupItem>
                <ToggleGroupItem value="CO_INVESTIGATOR">{t('role.CO_INVESTIGATOR')}</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="space-y-1.5">
              <Label>{t('centreLabel')} <span className="font-normal text-text-muted">({t('optionalCentre')})</span></Label>
              <SingleSelect
                options={study.centres.map((centre) => ({ value: centre.id, label: centre.name }))}
                value={investCentre}
                onChange={setInvestCentre}
                placeholder="—"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddInvestOpen(false)}>{t('cancel')}</Button>
              <Button disabled={!investAuthor || setInvest.isPending} onClick={() => setInvest.execute({ studyId: study.id, authorId: investAuthor, role: investRole, centreId: investCentre || null })}>{t('linkInvestigator')}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
