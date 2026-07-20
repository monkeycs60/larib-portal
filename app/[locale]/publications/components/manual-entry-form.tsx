'use client'

import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { UserPlus, Plus, X } from 'lucide-react'
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

const CARD_CLASS = 'space-y-5 rounded-2xl border border-line bg-bg-surface p-6 shadow-sm'
const DEGREE_CHIP_CLASS =
  'flex-none rounded-lg border border-line px-4 py-2 text-sm font-semibold text-text-secondary transition ' +
  'data-[state=on]:border-coral-500 data-[state=on]:bg-coral-50 data-[state=on]:text-coral-600'
const SUBMIT_CLASS =
  'gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105'

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-2 w-2 shrink-0 rounded-full bg-coral-500" />
      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-coral-600">{children}</h2>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

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
    <form onSubmit={handleSubmit((values) => submit(values))} className="space-y-6">
      <section className={CARD_CLASS}>
        <SectionHeader>{t('identity')}</SectionHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-text-primary">{t('firstName')}</Label>
            <Input placeholder="Pierre" {...register('firstName')} />
            {errors.firstName && <p className="text-xs text-coral-600">{t('requiredField')}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-text-primary">{t('lastName')}</Label>
            <Input placeholder="Lefèvre" {...register('lastName')} />
            {errors.lastName && <p className="text-xs text-coral-600">{t('requiredField')}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-text-primary">{t('degrees')}</Label>
          <ToggleGroup type="multiple" value={degrees} onValueChange={setDegrees} className="flex-wrap justify-start gap-2">
            {DEGREE_OPTIONS.map((degree) => (
              <ToggleGroupItem key={degree} value={degree} className={DEGREE_CHIP_CLASS}>
                {degree}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="space-y-1.5">
          <Label className="text-text-primary">
            {t('orcid')} <span className="font-normal text-text-muted">({t('orcidOptional')})</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#A6CE39] text-[9px] font-bold text-white">
              iD
            </span>
            <Input className="pl-11" placeholder="0000-0000-0000-0000" {...register('orcid')} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-text-primary">{t('emails')}</Label>
          <TagInput value={emails} onChange={setEmails} placeholder="name@hospital.org" />
        </div>
      </section>

      <section className={CARD_CLASS}>
        <SectionHeader>{t('typeCentreAffiliations')}</SectionHeader>
        <div className="space-y-2">
          <Label className="text-text-primary">
            {t('centre')} <span className="font-normal text-text-muted">— {t('centreHint')}</span>
          </Label>
          <ul className="space-y-1.5">
            {centreIds.map((centreId, index) => {
              const centre = centres.find((option) => option.value === centreId)
              return (
                <li key={centreId} className="flex items-center justify-between rounded-lg border border-line bg-gray-25 px-3 py-2 text-sm dark:bg-white/5">
                  <span className="flex items-center gap-2 text-text-primary">
                    {centre?.label}
                    {index === 0 && (
                      <span className="rounded-full bg-coral-50 px-2 py-0.5 text-[11px] font-semibold text-coral-600">{t('primary')}</span>
                    )}
                  </span>
                  <button type="button" aria-label="remove" className="text-text-muted hover:text-coral-600" onClick={() => setCentreIds(centreIds.filter((id) => id !== centreId))}>
                    <X className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
          {availableCentres.length > 0 && (
            <div className="flex items-center gap-2 text-text-muted">
              <Plus className="h-4 w-4 shrink-0 text-coral-500" />
              <SingleSelect
                options={availableCentres}
                value=""
                onChange={(value) => value && setCentreIds([...centreIds, value])}
                placeholder={t('addCentre')}
                searchable
                searchPlaceholder={t('searchCentre')}
                emptyLabel={t('noCentreFound')}
                className="min-w-[16rem] border-dashed"
              />
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-text-primary">
            {t('affiliations')} <span className="font-normal text-text-muted">— {t('affiliationsHint')}</span>
          </Label>
          <TagInput value={affiliations} onChange={setAffiliations} placeholder="Department of Cardiology, Hôpital Lariboisière, 75010 Paris, France" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-text-primary">
            {t('linkedUser')} <span className="font-normal text-text-muted">({t('linkedUserHint')})</span>
          </Label>
          <SingleSelect options={users} value={userId} onChange={setUserId} placeholder="—" />
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/publications/authors')}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={action.isPending} className={SUBMIT_CLASS}>
          <UserPlus className="h-4 w-4" />
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
              className={SUBMIT_CLASS}
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
