"use client"
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { createUserInviteAction, createPositionAction, updatePositionAction, deletePositionsAction } from './actions'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import DeletableSelectManager from '@/app/[locale]/bestof-larib/components/deletable-select-manager'

const AVAILABLE_APPLICATIONS = ['BESTOF_LARIB', 'CONGES'] as const
type AvailableApplication = (typeof AVAILABLE_APPLICATIONS)[number]

const AddUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN','USER']),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  position: z.string().optional(),
  arrivalDate: z.string().min(1),
  departureDate: z.string().min(1),
  applications: z.array(z.enum(["BESTOF_LARIB","CONGES"])),
  emailLanguage: z.enum(['en','fr']),
  congesTotalDays: z.number().int().min(0).max(365).optional()
})

type AddUserValues = z.infer<typeof AddUserSchema>

export function AddUserDialog({ positions, locale }: { positions: Array<{ id: string; name: string }>; locale: string }) {
  const t = useTranslations('admin')
  const [open, setOpen] = useState(false)
  const [posList, setPosList] = useState(positions)
  const [confirmNoAppsOpen, setConfirmNoAppsOpen] = useState(false)
  const [pendingFormValues, setPendingFormValues] = useState<AddUserValues | null>(null)
  const { execute, isExecuting } = useAction(createUserInviteAction, {
    onSuccess() {
      toast.success(t('created'))
      window.location.reload()
    },
    onError({ error: { serverError, validationErrors } }) {
      let msg: string | undefined
      if (validationErrors && typeof validationErrors === 'object') {
        const first = Object.values(validationErrors)[0] as { _errors?: string[] }
        const firstErr = first?._errors?.[0]
        if (typeof firstErr === 'string') msg = firstErr
      }
      if (!msg && typeof serverError === 'string') msg = serverError
      toast.error(msg ? `${t('actionError')}: ${msg}` : t('actionError'))
    }
  })
  const [managePositionsOpen, setManagePositionsOpen] = useState(false)
  const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>([])

  const { execute: execCreatePos, isExecuting: creatingPos } = useAction(createPositionAction, {
    onSuccess(result) {
      if (result.data) {
        setPosList((prev) => [...prev.filter(position => position.id !== result.data!.id), result.data!].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success(t('positionCreated'))
      }
    },
    onError() {
      toast.error(t('actionError'))
    }
  })

  const { execute: execUpdatePos, isExecuting: updatingPos } = useAction(updatePositionAction, {
    onSuccess(result) {
      if (result.data) {
        setPosList((prev) => prev.map(position => position.id === result.data!.id ? result.data! : position).sort((a, b) => a.name.localeCompare(b.name)))
        toast.success(t('saved'))
      }
    },
    onError() {
      toast.error(t('actionError'))
    }
  })

  const { execute: execDeletePos, isExecuting: deletingPos } = useAction(deletePositionsAction, {
    onSuccess(result) {
      if (result.data) {
        setPosList((prev) => prev.filter(position => !selectedPositionIds.includes(position.id)))
        setSelectedPositionIds([])
        toast.success(t('deleted'))
      }
    },
    onError({ error }) {
      if (error.serverError?.includes('POSITIONS_IN_USE')) {
        const count = error.serverError.split(':')[1]
        toast.error(t('positionsInUse', { count }))
      } else {
        toast.error(t('actionError'))
      }
    }
  })

  async function handleCreatePosition(name: string) {
    await execCreatePos({ name })
  }

  async function handleUpdatePosition(id: string, name: string) {
    await execUpdatePos({ id, name })
  }

  async function handleDeletePositions(ids: string[]) {
    await execDeletePos({ ids })
  }

  const { register, handleSubmit, setValue, watch, reset } = useForm<AddUserValues>({
    resolver: zodResolver(AddUserSchema),
    defaultValues: { role: 'USER', applications: [], emailLanguage: (locale as 'en' | 'fr') },
  })

  const apps = new Set(watch('applications'))
  function toggleApp(app: AvailableApplication) {
    if (apps.has(app)) apps.delete(app); else apps.add(app)
    setValue('applications', Array.from(apps))
  }

  async function submitUser(values: AddUserValues) {
    await execute({
      ...values,
      locale: values.emailLanguage,
    })
    setOpen(false)
    reset()
  }

  const onSubmit = handleSubmit(async (values) => {
    if (values.applications.length === 0) {
      setPendingFormValues(values)
      setConfirmNoAppsOpen(true)
      return
    }
    await submitUser(values)
  })

  async function handleConfirmNoApps() {
    if (pendingFormValues) {
      await submitUser(pendingFormValues)
      setPendingFormValues(null)
    }
    setConfirmNoAppsOpen(false)
  }

  // Email preview values
  const previewEmail = watch('email') || 'user@example.com'
  const previewPos = watch('position')
  const previewEnd = watch('departureDate')
  const emailLang = watch('emailLanguage') || 'en'

  // Preview translations based on selected email language
  const previewSubject = emailLang === 'fr'
    ? 'Bienvenue sur le portail Cardio Larib'
    : 'Welcome to Cardio Larib portal'
  const previewBody = emailLang === 'fr'
    ? 'Ceci est un message automatique pour vous inviter à rejoindre la plateforme intranet de notre équipe, le portail Cardio Larib.'
    : 'This is an automatic message to invite you to join our team intranet platform, the Cardio Larib Portal.'
  const previewLink = emailLang === 'fr' ? 'Lien d\'accès' : 'Set up link'
  const previewEndDate = emailLang === 'fr'
    ? `Votre compte sera valide jusqu'au ${previewEnd}.`
    : `Your account will be valid until ${previewEnd}.`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t('addUser')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addNewUser')}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">{t('firstName')}</label>
              <Input {...register('firstName')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('lastName')}</label>
              <Input {...register('lastName')} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">{t('email')}</label>
              <Input type="email" required {...register('email')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('role')}</label>
              <Select {...register('role')}>
                <option value="USER">{t('roleUser')}</option>
                <option value="ADMIN">{t('roleAdmin')}</option>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm mb-1">{t('position')}</label>
                <button type="button" className="text-xs text-blue-600" onClick={() => setManagePositionsOpen(true)}>
                  {t('manage')}
                </button>
              </div>
              <Select {...register('position')}>
                <option value="">{t('selectPlaceholder')}</option>
                {posList.map((position) => (
                  <option key={position.id} value={position.name}>{position.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm mb-1">{t('arrivalDate')}</label>
              <Input type="date" required {...register('arrivalDate')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('departureDate')}</label>
              <Input type="date" required {...register('departureDate')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('emailLanguage')}</label>
              <Select {...register('emailLanguage')}>
                <option value="en">{t('emailLanguageEn')}</option>
                <option value="fr">{t('emailLanguageFr')}</option>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">{t('applications')}</div>
              <div className="text-xs font-medium px-2 py-1 rounded-full bg-muted">
                {apps.size} / {AVAILABLE_APPLICATIONS.length} {t('applicationsSelected')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_APPLICATIONS.map((app) => {
                const isSelected = apps.has(app)
                return (
                  <button
                    type="button"
                    key={app}
                    onClick={() => toggleApp(app)}
                    className={`
                      relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left
                      ${isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-muted hover:border-muted-foreground/50 hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className={`
                      flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors
                      ${isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/30'
                      }
                    `}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {t(`app_${app}`)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {apps.has('CONGES') && (
            <div>
              <label className="block text-sm mb-1">{t('leaveDaysLabel')}</label>
              <Input
                type="number"
                min="0"
                max="365"
                placeholder="0"
                onChange={(e) => {
                  const value = e.target.value
                  setValue('congesTotalDays', value === '' ? undefined : parseInt(value, 10))
                }}
              />
            </div>
          )}

          <div className="rounded-md border p-3">
            <div className="text-sm font-medium mb-2">{t('welcomeEmailPreview')}</div>
            <div className="text-sm text-muted-foreground">
              <div><strong>To:</strong> {previewEmail}</div>
              <div><strong>Subject:</strong> {previewSubject}</div>
            </div>
            <div className="mt-2 text-sm bg-gray-50 rounded p-3 border">
              <p>{previewBody}</p>
              <p className="mt-2">[{previewLink}]</p>
              {previewEnd && <p className="mt-2">{previewEndDate}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isExecuting}>
              {isExecuting ? t('creating') : t('createAndSend')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <Dialog open={managePositionsOpen} onOpenChange={setManagePositionsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('managePositions')}</DialogTitle>
          </DialogHeader>
          <DeletableSelectManager
            options={posList}
            onDelete={handleDeletePositions}
            onCreate={handleCreatePosition}
            onUpdate={handleUpdatePosition}
            disabled={deletingPos || creatingPos || updatingPos}
            deleting={deletingPos}
            creating={creatingPos}
            updating={updatingPos}
            createLabel={t('newPosition')}
            createPlaceholder={t('newPositionPlaceholder')}
            createButtonLabel={t('createPositionCta')}
            selectedIds={selectedPositionIds}
            onSelectedIdsChange={setSelectedPositionIds}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setManagePositionsOpen(false)}>
              {t('close')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleDeletePositions(selectedPositionIds)}
              disabled={selectedPositionIds.length === 0 || deletingPos}
            >
              {deletingPos ? t('deleting') : t('deleteSelected')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmNoAppsOpen} onOpenChange={setConfirmNoAppsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmNoAppsTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmNoAppsDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFormValues(null)}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNoApps} disabled={isExecuting}>
              {isExecuting ? t('creating') : t('confirmNoAppsConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
