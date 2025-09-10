"use client"
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { createUserInviteAction, createPositionAction } from './actions'
import { toast } from 'sonner'

const AddUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN','USER']),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  position: z.string().optional(),
  accessEndDate: z.string().optional(),
  applications: z.array(z.enum(["BESTOF_LARIB","CONGES","CARDIOLARIB"]))
})

type AddUserValues = z.infer<typeof AddUserSchema>

export function AddUserDialog({ positions, locale }: { positions: Array<{ id: string; name: string }>; locale: string }) {
  const t = useTranslations('admin')
  const [open, setOpen] = useState(false)
  const [posList, setPosList] = useState(positions)
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
  const { execute: execCreatePos, isExecuting: creatingPos } = useAction(createPositionAction, {
    onSuccess(res) { setPosList((prev) => [...prev.filter(p => p.id !== res.data?.id), res.data!]) },
  })

  const { register, handleSubmit, setValue, watch, reset } = useForm<AddUserValues>({
    resolver: zodResolver(AddUserSchema),
    defaultValues: { role: 'USER', applications: [] },
  })

  const apps = new Set(watch('applications'))
  function toggleApp(app: AddUserValues['applications'][number]) {
    if (apps.has(app)) apps.delete(app); else apps.add(app)
    setValue('applications', Array.from(apps))
  }

  const onSubmit = handleSubmit(async (values) => {
    await execute({
      ...values,
      locale: (locale as 'en'|'fr'),
    })
    setOpen(false)
    reset()
  })

  async function onAddPosition() {
    const name = prompt(t('addNewPositionPrompt'))
    if (!name) return
    const res = await execCreatePos({ name })
    const created = res?.data
    if (created) setValue('position', created.name)
  }

  // Email preview values
  const previewEmail = watch('email') || 'user@example.com'
  const previewPos = watch('position')
  const previewEnd = watch('accessEndDate')

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
                <button type="button" className="text-xs text-blue-600" onClick={onAddPosition} disabled={creatingPos}>
                  {t('addNewPosition')}
                </button>
              </div>
              <Select {...register('position')}>
                <option value="">{t('selectPlaceholder')}</option>
                {posList.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm mb-1">{t('accessEndDate')}</label>
              <Input type="date" {...register('accessEndDate')} />
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">{t('applications')}</div>
            <div className="flex flex-wrap gap-2">
              {(['BESTOF_LARIB','CONGES','CARDIOLARIB'] as const).map((app) => (
                <button
                  type="button"
                  key={app}
                  onClick={() => toggleApp(app)}
                  className={
                    apps.has(app)
                      ? 'px-2 py-1 rounded border bg-primary text-primary-foreground text-xs'
                      : 'px-2 py-1 rounded border text-xs'
                  }
                >
                  {t(`app_${app}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="text-sm font-medium mb-2">{t('welcomeEmailPreview')}</div>
            <div className="text-sm text-muted-foreground">
              <div><strong>To:</strong> {previewEmail}</div>
              <div><strong>Subject:</strong> {t('welcomeEmailSubject')}</div>
            </div>
            <div className="mt-2 text-sm bg-gray-50 rounded p-3 border">
              <p>{t('welcomeEmailBodyLine1', { position: previewPos || t('positionGeneric') })}</p>
              <p className="mt-2">[{t('passwordSetupLink')}]</p>
              {previewEnd && <p className="mt-2">{t('welcomeEmailBodyEndDate', { date: previewEnd })}</p>}
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
    </Dialog>
  )
}
