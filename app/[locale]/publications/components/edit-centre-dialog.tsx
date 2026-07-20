'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { createCentreAction, updateCentreAction } from '@/app/[locale]/publications/actions'
import type { CentreRow } from '@/lib/services/publications/centres'

const CORAL = 'gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105'

type Props = { open: boolean; centre: CentreRow | null; onClose: () => void; onSaved: () => void }

function CentreForm({ centre, onClose, onSaved }: { centre: CentreRow | null; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations('publications.centres')
  const [name, setName] = useState(centre?.name ?? '')
  const [city, setCity] = useState(centre?.city ?? '')
  const [country, setCountry] = useState(centre?.country ?? '')
  const [isOwn, setIsOwn] = useState(centre?.isOwn ?? false)

  const create = useAction(createCentreAction, { onSuccess: ({ data }) => { if (data) { toast.success(t('created')); onSaved() } }, onError: () => toast.error('Error') })
  const update = useAction(updateCentreAction, { onSuccess: ({ data }) => { if (data) { toast.success(t('saved')); onSaved() } }, onError: () => toast.error('Error') })
  const pending = create.isPending || update.isPending

  function save() {
    if (!name.trim()) return
    if (centre) update.execute({ id: centre.id, name: name.trim(), city: city.trim() || null, country: country.trim() || null, isOwn })
    else create.execute({ name: name.trim(), city: city.trim() || null, country: country.trim() || null })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('cName')}</Label>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Hôpital Lariboisière, AP-HP" />
      </div>
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
      {centre && (
        <label className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
          <Switch checked={isOwn} onCheckedChange={setIsOwn} />
          <span className="text-sm font-medium text-text-primary">{t('cOwn')}</span>
        </label>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
        <Button type="button" onClick={save} disabled={pending} className={CORAL}>
          <Save className="h-4 w-4" />
          {centre ? t('saveChanges') : t('createSave')}
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{centre ? t('editTitle') : t('createTitle')}</DialogTitle>
        </DialogHeader>
        {open && <CentreForm key={centre?.id ?? 'new'} centre={centre} onClose={onClose} onSaved={() => { onSaved(); router.refresh() }} />}
      </DialogContent>
    </Dialog>
  )
}
