"use client"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations, useLocale } from "next-intl"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useState } from "react"
import { updateUserAction, createPositionAction } from "./actions"
import { useAction } from 'next-safe-action/hooks'

const FormSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: z.enum(["ADMIN", "USER"]),
  country: z.string().optional(),
  birthDate: z.string().optional(),
  language: z.enum(["EN", "FR"]).optional(),
  position: z.string().optional(),
  arrivalDate: z.string().optional(),
  departureDate: z.string().optional(),
  profilePhoto: z.string().optional(),
  applications: z.array(z.enum(["BESTOF_LARIB", "CONGES", "CARDIOLARIB"]))
})

export type UserFormValues = z.infer<typeof FormSchema>

export function UserEditDialog({ initial, positions }: { initial: UserFormValues, positions: Array<{ id: string; name: string }> }) {
  const t = useTranslations('admin')
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const { execute: executeUpdate, isExecuting } = useAction(updateUserAction, {
    onSuccess() {
      setOpen(false)
      // simple refresh to reflect changes
      window.location.reload()
    },
  })
  const { register, handleSubmit, setValue, watch } = useForm<UserFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: initial,
  })
  const [posList, setPosList] = useState(positions)
  const { execute: execCreatePos, isExecuting: creatingPos } = useAction(createPositionAction, {
    onSuccess(res) { setPosList((prev) => [...prev.filter(p => p.id !== res.data?.id), res.data!]) },
  })

  const apps = new Set(watch('applications'))
  function toggleApp(app: UserFormValues['applications'][number]) {
    if (apps.has(app)) {
      apps.delete(app)
    } else {
      apps.add(app)
    }
    setValue('applications', Array.from(apps))
  }

  const onSubmit = handleSubmit(async (values) => {
    await executeUpdate({ ...values, locale })
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">{t('edit')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editUser')}</DialogTitle>
        </DialogHeader>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">{t('email')}</label>
              <Input type="email" {...register('email')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('role')}</label>
              <Select {...register('role')}>
                <option value="USER">{t('roleUser')}</option>
                <option value="ADMIN">{t('roleAdmin')}</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm mb-1">{t('firstName')}</label>
              <Input {...register('firstName')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('lastName')}</label>
              <Input {...register('lastName')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('phone')}</label>
              <Input {...register('phoneNumber')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('country')}</label>
              <Input {...register('country')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('birthDate')}</label>
              <Input type="date" {...register('birthDate')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('language')}</label>
              <Select {...register('language')}>
                <option value="EN">English</option>
                <option value="FR">Français</option>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm mb-1">{t('position')}</label>
                <button type="button" className="text-xs text-blue-600" onClick={async () => {
                  const name = prompt(t('addNewPositionPrompt'))
                  if (!name) return
                  const res = await execCreatePos({ name })
                  const created = res?.data
                  if (created) {
                    setValue('position', created.name)
                  }
                }} disabled={creatingPos}>
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
              <label className="block text-sm mb-1">{t('arrivalDate')}</label>
              <Input type="date" {...register('arrivalDate')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('departureDate')}</label>
              <Input type="date" {...register('departureDate')} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">{t('profilePhoto')}</label>
              <Input placeholder="https://..." {...register('profilePhoto')} />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isExecuting}>
              {isExecuting ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
