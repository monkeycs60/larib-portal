'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Save, Activity, Building2, Globe, UserRoundCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { createCentreAction, updateCentreAction } from '@/app/[locale]/publications/actions'
import type { CentreRow } from '@/lib/services/publications/centres'

const CORAL = 'gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105'

type Props = { open: boolean; centre: CentreRow | null; onClose: () => void; onSaved: () => void }

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-2 w-2 shrink-0 rounded-full bg-coral-500" />
      <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-coral-600">{title}</h3>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

function previewInitials(name: string): string {
  const cleaned = name.replace(/^(hôpital|hopital|centre|institut|university|université|department|dept|the)\s+/i, '').trim()
  return cleaned.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || '?'
}

function CentreForm({ centre, onClose, onSaved }: { centre: CentreRow | null; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations('publications.centres')
  const [name, setName] = useState(centre?.name ?? '')
  const [shortCode, setShortCode] = useState(centre?.shortCode ?? '')
  const [parentOrganisation, setParentOrganisation] = useState(centre?.parentOrganisation ?? '')
  const [city, setCity] = useState(centre?.city ?? '')
  const [country, setCountry] = useState(centre?.country ?? '')
  const [isOwn, setIsOwn] = useState(centre?.isOwn ?? false)

  const create = useAction(createCentreAction, { onSuccess: ({ data }) => { if (data) { toast.success(t('created')); onSaved() } }, onError: () => toast.error(t('error')) })
  const update = useAction(updateCentreAction, { onSuccess: ({ data }) => { if (data) { toast.success(t('saved')); onSaved() } }, onError: () => toast.error(t('error')) })
  const pending = create.isPending || update.isPending

  const trimmedShort = shortCode.trim()
  const trimmedParent = parentOrganisation.trim()

  function save() {
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      shortCode: trimmedShort || null,
      parentOrganisation: trimmedParent || null,
      city: city.trim() || null,
      country: country.trim() || null,
    }
    if (centre) update.execute({ id: centre.id, ...payload, isOwn })
    else create.execute(payload)
  }

  const previewSubtitle = [city.trim(), country.trim()].filter(Boolean).join(', ') || t('previewHint')
  const badge = isOwn
    ? { label: t('ours'), className: 'border-coral-200 bg-coral-50 text-coral-600' }
    : { label: t('tabExternal'), className: 'border-line bg-bg-muted text-text-secondary' }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-bg-surface p-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-coral-50 text-lg font-extrabold text-coral-600">
          {trimmedShort ? trimmedShort.slice(0, 4).toUpperCase() : previewInitials(name.trim() || t('previewTitle'))}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold text-text-primary">{name.trim() || t('previewTitle')}</p>
          <p className="truncate text-sm text-text-secondary">{previewSubtitle}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}>
          {isOwn ? <UserRoundCheck className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
          {badge.label}
        </span>
      </div>

      <div className="space-y-4">
        <SectionHeader title={t('sectionInstitution')} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px]">
          <div className="space-y-1.5">
            <Label>{t('cName')}</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Hôpital Lariboisière" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('cShortCode')}</Label>
            <Input value={shortCode} onChange={(event) => setShortCode(event.target.value)} placeholder="LRB" maxLength={8} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t('cParent')} <span className="font-normal text-text-muted">({t('optional')})</span></Label>
          <Input value={parentOrganisation} onChange={(event) => setParentOrganisation(event.target.value)} placeholder="AP-HP, INSERM, Harvard Medical School…" />
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader title={t('sectionLocation')} />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('cCity')}</Label>
            <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Paris" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('cCountry')}</Label>
            <Input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="France" />
          </div>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
          <Switch checked={isOwn} onCheckedChange={setIsOwn} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-text-primary">{t('cOwn')}</span>
            <span className="block text-sm text-text-secondary">{t('cOwnHint')}</span>
          </span>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isOwn ? 'bg-gradient-to-b from-coral-500 to-coral-600 text-white' : 'bg-bg-muted text-text-muted'}`}>
            <Activity className="h-4 w-4" />
          </span>
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
        <Button type="button" onClick={save} disabled={pending} className={CORAL}>
          {centre ? <Save className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
          {centre ? t('saveChanges') : t('addToBank')}
        </Button>
      </DialogFooter>
    </div>
  )
}

export function EditCentreDialog({ open, centre, onClose, onSaved }: Props) {
  const t = useTranslations('publications.centres')
  const router = useRouter()
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{centre ? t('editTitle') : t('createTitle')}</DialogTitle>
        </DialogHeader>
        {open && <CentreForm key={centre?.id ?? 'new'} centre={centre} onClose={onClose} onSaved={() => { onSaved(); router.refresh() }} />}
      </DialogContent>
    </Dialog>
  )
}
