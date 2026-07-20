'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { UserRoundCheck, Globe, Plus, X, Save } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SingleSelect } from '@/components/ui/single-select'
import { TagInput } from '@/components/ui/tag-input'
import { updateAuthorAction } from '@/app/[locale]/publications/actions'
import type { AuthorEditData } from '@/lib/services/publications/authors'

const DEGREE_OPTIONS = ['MD', 'PhD', 'MSc', 'PharmD'] as const
const CARD = 'space-y-4 rounded-2xl border border-line bg-bg-surface p-5'
const CHIP = 'flex-none rounded-lg border border-line px-4 py-2 text-sm font-semibold text-text-secondary transition data-[state=on]:border-coral-500 data-[state=on]:bg-coral-50 data-[state=on]:text-coral-600'
const CORAL = 'gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105'

type Centre = { id: string; name: string; isOwn?: boolean }
type Option = { value: string; label: string }

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-2 w-2 shrink-0 rounded-full bg-coral-500" />
      <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-coral-600">{title}</h3>
      {hint && <span className="text-xs font-normal normal-case text-text-muted">{hint}</span>}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

function EditAuthorForm({ data, centres, users, onClose, onSaved }: { data: AuthorEditData; centres: Centre[]; users: Option[]; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations('publications.authors')
  const centreById = new Map(centres.map((centre) => [centre.id, centre]))
  const [firstName, setFirstName] = useState(data.firstName)
  const [lastName, setLastName] = useState(data.lastName)
  const [degrees, setDegrees] = useState<string[]>(data.degrees)
  const [orcid, setOrcid] = useState(data.orcid ?? '')
  const [emails, setEmails] = useState<string[]>(data.emails)
  const [centreIds, setCentreIds] = useState<string[]>(data.centres.map((centre) => centre.id))
  const [userId, setUserId] = useState(data.userId ?? '')
  const [affiliations, setAffiliations] = useState<string[]>(data.affiliations)
  const [newAffiliation, setNewAffiliation] = useState('')

  const isOurTeam = centreIds.some((id) => centreById.get(id)?.isOwn)
  const availableCentres = centres.filter((centre) => !centreIds.includes(centre.id))

  const action = useAction(updateAuthorAction, {
    onSuccess: ({ data: result }) => {
      if (!result) return
      toast.success(t('saved'))
      onSaved()
    },
    onError: () => toast.error(t('actionError')),
  })

  function addAffiliation() {
    const value = newAffiliation.trim()
    if (!value) return
    setAffiliations((previous) => [...previous, value])
    setNewAffiliation('')
  }

  function save() {
    if (!firstName.trim() || !lastName.trim()) return
    action.execute({ id: data.id, firstName: firstName.trim(), lastName: lastName.trim(), degrees, orcid: orcid.trim() || null, userId: userId || null, emails, centreIds, affiliations })
  }

  return (
    <div className="space-y-6">
      <section className={CARD}>
        <SectionHeader title={t('add.identity')} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t('add.firstName')}</Label>
            <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('add.lastName')}</Label>
            <Input value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t('add.degrees')}</Label>
          <ToggleGroup type="multiple" value={degrees} onValueChange={setDegrees} className="flex-wrap justify-start gap-2">
            {DEGREE_OPTIONS.map((degree) => (
              <ToggleGroupItem key={degree} value={degree} className={CHIP}>{degree}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="space-y-1.5">
          <Label>{t('add.orcid')} <span className="font-normal text-text-muted">({t('add.orcidOptional')})</span></Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#A6CE39] text-[9px] font-bold text-white">iD</span>
            <Input className="pl-11" placeholder="0000-0000-0000-0000" value={orcid} onChange={(event) => setOrcid(event.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t('add.emails')}</Label>
          <TagInput value={emails} onChange={setEmails} placeholder="name@hospital.org" />
        </div>
      </section>

      <section className={CARD}>
        <SectionHeader title={t('editModal.typeCentre')} />
        <div className="space-y-1.5">
          <Label>{t('add.authorType')}</Label>
          <div className="inline-flex w-fit gap-1 rounded-xl bg-gray-100 p-1 dark:bg-white/5">
            <span className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${isOurTeam ? 'bg-bg-surface text-coral-600 shadow-sm' : 'text-text-muted'}`}>
              <UserRoundCheck className="h-4 w-4" />{t('add.ourTeam')}
            </span>
            <span className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${!isOurTeam ? 'bg-bg-surface text-coral-600 shadow-sm' : 'text-text-muted'}`}>
              <Globe className="h-4 w-4" />{t('add.external')}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t('add.centre')} <span className="font-normal text-text-muted">— {t('add.centreHint')}</span></Label>
          <div className="flex flex-wrap items-center gap-2">
            {centreIds.map((centreId, index) => {
              const centre = centreById.get(centreId)
              return (
                <span key={centreId} className="flex items-center gap-2 rounded-lg border border-coral-200 bg-coral-50 px-3 py-1.5 text-sm text-coral-700">
                  <span className="font-bold text-coral-400">{index + 1}</span>
                  {centre?.name ?? '—'}
                  {centre?.isOwn && <span className="rounded-full bg-coral-100 px-1.5 py-0.5 text-[10px] font-bold text-coral-600">{t('detail.ours')}</span>}
                  <button type="button" aria-label="remove" onClick={() => setCentreIds(centreIds.filter((id) => id !== centreId))} className="text-coral-400 hover:text-coral-600"><X className="h-3.5 w-3.5" /></button>
                </span>
              )
            })}
            {availableCentres.length > 0 && (
              <SingleSelect
                options={availableCentres.map((centre) => ({ value: centre.id, label: centre.name }))}
                value=""
                onChange={(value) => value && setCentreIds([...centreIds, value])}
                placeholder={t('add.addCentre')}
                searchable
                searchPlaceholder={t('add.searchCentre')}
                emptyLabel={t('add.noCentreFound')}
                className="w-auto min-w-[16rem] border-dashed"
              />
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t('add.linkedUser')} <span className="font-normal text-text-muted">({t('add.linkedUserHint')})</span></Label>
          <SingleSelect options={users} value={userId} onChange={setUserId} placeholder="—" className="w-auto min-w-[16rem]" />
        </div>
      </section>

      <section className={CARD}>
        <SectionHeader title={t('add.affiliations')} hint={t('add.affiliationsHint')} />
        <ul className="space-y-2">
          {affiliations.map((affiliation, index) => (
            <li key={index} className="flex items-center gap-3 rounded-xl border border-line bg-gray-25 px-4 py-3 dark:bg-white/5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-bold text-gray-600">{index + 1}</span>
              <span className="flex-1 text-sm text-text-primary">{affiliation}</span>
              <button type="button" aria-label="remove" onClick={() => setAffiliations(affiliations.filter((_, position) => position !== index))} className="text-text-muted hover:text-coral-600"><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input
            value={newAffiliation}
            onChange={(event) => setNewAffiliation(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addAffiliation() } }}
            placeholder="e.g. Department of Cardiology, Hôpital Lariboisière, 75010 Paris, France"
          />
          <Button type="button" variant="secondary" onClick={addAffiliation} className="gap-2"><Plus className="h-4 w-4" />{t('editModal.add')}</Button>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>{t('add.cancel')}</Button>
        <Button type="button" onClick={save} disabled={action.isPending} className={CORAL}><Save className="h-4 w-4" />{t('editModal.save')}</Button>
      </div>
    </div>
  )
}

type Props = { data: AuthorEditData | null; centres: Centre[]; users: Option[]; onClose: () => void; onSaved: () => void }

export function EditAuthorDialog({ data, centres, users, onClose, onSaved }: Props) {
  const t = useTranslations('publications.authors.editModal')
  const router = useRouter()
  return (
    <Dialog open={data !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {data && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-coral-50 text-sm font-bold text-coral-600">
                  {`${data.firstName.charAt(0)}${data.lastName.charAt(0)}`.toUpperCase()}
                </span>
                <span>
                  <span className="block text-lg font-bold text-text-primary">{t('title')}</span>
                  <span className="block text-sm font-normal text-text-secondary">{data.firstName} {data.lastName} · {t('linkedPublications', { count: data.publicationsCount })}</span>
                </span>
              </DialogTitle>
            </DialogHeader>
            <EditAuthorForm
              key={data.id}
              data={data}
              centres={centres}
              users={users}
              onClose={onClose}
              onSaved={() => { onSaved(); router.refresh() }}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
