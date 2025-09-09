"use client"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations, useLocale } from "next-intl"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useAction } from 'next-safe-action/hooks'
import { updateSelfProfileAction } from "@/actions/profile"
import { useState } from "react"

const Schema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  language: z.enum(["EN","FR"]).optional(),
  position: z.string().optional().nullable(),
  profilePhoto: z.string().url().optional().nullable(),
  // Admin-only
  role: z.enum(["ADMIN","USER"]).optional(),
  applications: z.array(z.enum(["BESTOF_LARIB","CONGES","CARDIOLARIB"]))
    .optional(),
})

export type ProfileEditable = z.infer<typeof Schema>

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: ProfileEditable & { email: string; isAdmin: boolean }
}

export function ProfileEditDialog({ open, onOpenChange, initial }: Props) {
  const tNav = useTranslations('navigation')
  const tAdmin = useTranslations('admin')
  const locale = useLocale()
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, setValue, watch } = useForm<ProfileEditable>({
    resolver: zodResolver(Schema),
    defaultValues: initial,
  })

  const { execute } = useAction(updateSelfProfileAction, {
    onSuccess() {
      onOpenChange(false)
      // ensure UI refreshes with latest data
      window.location.reload()
    },
  })

  const apps = new Set(watch('applications') ?? [])
  function toggleApp(app: NonNullable<ProfileEditable['applications']>[number]) {
    if (apps.has(app)) apps.delete(app); else apps.add(app)
    setValue('applications', Array.from(apps))
  }

  const submit = handleSubmit(async (values) => {
    setSaving(true)
    try {
      await execute({ ...values, locale: locale as "en" | "fr" })
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tNav('editProfile')}</DialogTitle>
        </DialogHeader>

        <form className="space-y-3" onSubmit={submit}>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <Input value={initial.email} disabled />
            </div>
            {initial.isAdmin && (
              <div>
                <label className="block text-sm mb-1">{tAdmin('role')}</label>
                <Select {...register('role')} defaultValue={initial?.['role'] as "ADMIN" | "USER"}>
                  <option value="USER">{tAdmin('roleUser')}</option>
                  <option value="ADMIN">{tAdmin('roleAdmin')}</option>
                </Select>
              </div>
            )}
            <div>
              <label className="block text-sm mb-1">{tAdmin('firstName')}</label>
              <Input {...register('firstName')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{tAdmin('lastName')}</label>
              <Input {...register('lastName')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{tAdmin('phone')}</label>
              <Input {...register('phoneNumber')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{tAdmin('birthDate')}</label>
              <Input type="date" {...register('birthDate')} />
            </div>
            <div>
              <label className="block text-sm mb-1">{tAdmin('language')}</label>
              <Select {...register('language')} defaultValue={initial.language}>
                <option value="EN">English</option>
                <option value="FR">Français</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm mb-1">{tAdmin('position')}</label>
              <Input {...register('position')} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">{tAdmin('profilePhoto')}</label>
              <Input placeholder="https://..." {...register('profilePhoto')} />
            </div>
          </div>

          {initial.isAdmin && (
            <div>
              <div className="text-sm font-medium mb-2">{tAdmin('applications')}</div>
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
                    {tAdmin(`app_${app}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tAdmin('cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? tAdmin('saving') : tAdmin('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

