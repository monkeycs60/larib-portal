'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SingleSelect } from '@/components/ui/single-select'
import { TagInput } from '@/components/ui/tag-input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createAuthorAction } from '@/app/[locale]/publications/actions'

const DEGREE_OPTIONS = ['MD', 'PhD', 'MSc', 'PharmD'] as const

const manualEntrySchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  orcid: z.string().trim().optional(),
})
type ManualEntryValues = z.infer<typeof manualEntrySchema>
type Option = { value: string; label: string }
type Props = { centres: Option[]; users: Option[] }

export function ManualEntryForm({ centres, users }: Props) {
  const t = useTranslations('publications.authors.add')
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ManualEntryValues>({ resolver: zodResolver(manualEntrySchema) })
  const [degrees, setDegrees] = useState<string[]>([])
  const [authorType, setAuthorType] = useState<'OUR_TEAM' | 'EXTERNAL'>('OUR_TEAM')
  const [emails, setEmails] = useState<string[]>([])
  const [affiliations, setAffiliations] = useState<string[]>([])
  const [centreIds, setCentreIds] = useState<string[]>([])
  const [userId, setUserId] = useState<string>('')
  const [pendingValues, setPendingValues] = useState<ManualEntryValues | null>(null)
  const [duplicateNames, setDuplicateNames] = useState<string[]>([])

  const action = useAction(createAuthorAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      if (data.status === 'blocked') {
        toast.error(t('dupBlocked', { name: `${data.match.firstName} ${data.match.lastName}` }))
        return
      }
      if (data.status === 'warning') {
        setDuplicateNames(data.matches.map((match) => `${match.firstName} ${match.lastName}`))
        return
      }
      toast.success(t('created'))
      router.push('/publications/authors')
    },
    onError: () => toast.error(t('fetchError')),
  })

  function submit(values: ManualEntryValues, confirmDuplicate = false) {
    setPendingValues(values)
    action.execute({
      firstName: values.firstName,
      lastName: values.lastName,
      type: authorType,
      degrees,
      emails,
      orcid: values.orcid || null,
      centreIds,
      affiliations,
      userId: userId || null,
      confirmDuplicate,
    })
  }

  const availableCentres = centres.filter((centre) => !centreIds.includes(centre.value))

  return (
    <form onSubmit={handleSubmit((values) => submit(values))} className="space-y-8">
      <section className="space-y-4 rounded-xl border p-6">
        <h2 className="text-sm font-semibold text-primary">{t('identity')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>{t('firstName')}</Label>
            <Input placeholder="Pierre" {...register('firstName')} />
            {errors.firstName && <p className="text-xs text-destructive">{t('requiredField')}</p>}
          </div>
          <div className="space-y-1">
            <Label>{t('lastName')}</Label>
            <Input placeholder="Lefèvre" {...register('lastName')} />
            {errors.lastName && <p className="text-xs text-destructive">{t('requiredField')}</p>}
          </div>
        </div>
        <div className="space-y-1">
          <Label>{t('degrees')}</Label>
          <ToggleGroup type="multiple" value={degrees} onValueChange={setDegrees} className="justify-start gap-2">
            {DEGREE_OPTIONS.map((degree) => (
              <ToggleGroupItem key={degree} value={degree}>
                {degree}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="space-y-1">
          <Label>
            {t('orcid')} <span className="text-text-secondary">({t('orcidOptional')})</span>
          </Label>
          <Input placeholder="0000-0000-0000-0000" {...register('orcid')} />
        </div>
        <div className="space-y-1">
          <Label>{t('emails')}</Label>
          <TagInput value={emails} onChange={setEmails} placeholder="name@hospital.org" />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border p-6">
        <h2 className="text-sm font-semibold text-primary">{t('typeCentreAffiliations')}</h2>
        <div className="space-y-1">
          <Label>{t('authorType')}</Label>
          <ToggleGroup
            type="single"
            value={authorType}
            onValueChange={(value) => value && setAuthorType(value as 'OUR_TEAM' | 'EXTERNAL')}
            className="justify-start gap-2"
          >
            <ToggleGroupItem value="OUR_TEAM">{t('ourTeam')}</ToggleGroupItem>
            <ToggleGroupItem value="EXTERNAL">{t('external')}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="space-y-2">
          <Label>
            {t('centre')} <span className="text-text-secondary">— {t('centreHint')}</span>
          </Label>
          <ul className="space-y-1">
            {centreIds.map((centreId, index) => {
              const centre = centres.find((option) => option.value === centreId)
              return (
                <li key={centreId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>
                    {centre?.label}
                    {index === 0 ? ` · ${t('primary')}` : ''}
                  </span>
                  <button
                    type="button"
                    aria-label="remove"
                    onClick={() => setCentreIds(centreIds.filter((id) => id !== centreId))}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
          {availableCentres.length > 0 && (
            <SingleSelect
              options={availableCentres}
              value=""
              onChange={(value) => value && setCentreIds([...centreIds, value])}
              placeholder={t('addCentre')}
            />
          )}
        </div>
        <div className="space-y-1">
          <Label>
            {t('affiliations')} <span className="text-text-secondary">— {t('affiliationsHint')}</span>
          </Label>
          <TagInput
            value={affiliations}
            onChange={setAffiliations}
            placeholder="Department of Cardiology, Hôpital Lariboisière, 75010 Paris, France"
          />
        </div>
        <div className="space-y-1">
          <Label>
            {t('linkedUser')} <span className="text-text-secondary">({t('linkedUserHint')})</span>
          </Label>
          <SingleSelect options={users} value={userId} onChange={setUserId} placeholder="—" />
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/publications/authors')}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={action.isPending}>
          {t('submit')}
        </Button>
      </div>

      <AlertDialog open={duplicateNames.length > 0} onOpenChange={(open) => !open && setDuplicateNames([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dupWarning', { names: duplicateNames.join(', ') })}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDuplicateNames([])
                if (pendingValues) submit(pendingValues, true)
              }}
            >
              {t('confirmAdd')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
