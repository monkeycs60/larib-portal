"use client"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useAction } from "next-safe-action/hooks"
import { updateSelfProfileAction } from "@/actions/profile"
import { useState } from "react"
import { toast } from "sonner"
import { COUNTRIES } from "@/lib/countries"

const Schema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  language: z.enum(["EN","FR"]).optional(),
  position: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  profilePhoto: z.string().url().optional().nullable(),
  role: z.enum(["ADMIN","USER"]).optional(),
  applications: z.array(z.enum(["BESTOF_LARIB","CONGES","CARDIOLARIB"]))
    .optional(),
})

export type ProfileEditorValues = z.infer<typeof Schema>

type Props = {
  initial: ProfileEditorValues & {
    email: string
    isAdmin: boolean
  }
}

export function ProfileEditor({ initial }: Props) {
  const tAdmin = useTranslations('admin')
  const tProfile = useTranslations('profile')
  const [saving, setSaving] = useState(false)

  const form = useForm<ProfileEditorValues>({
    resolver: zodResolver(Schema),
    defaultValues: initial,
  })

  const { execute } = useAction(updateSelfProfileAction, {
    onSuccess() {
      toast.success(tProfile('saved'))
    },
    onError({ error: { serverError, validationErrors } }) {
      let msg: string | undefined
      if (validationErrors && typeof validationErrors === 'object') {
        const first = Object.values(validationErrors)[0] as { _errors?: string[] }
        const firstErr = first?._errors?.[0]
        if (typeof firstErr === 'string') msg = firstErr
      }
      if (!msg && typeof serverError === 'string') msg = serverError
      toast.error(msg ? `${tProfile('saveError')}: ${msg}` : tProfile('saveError'))
    },
  })


  function toNullIfEmpty(v: unknown): unknown {
    if (typeof v === 'string') {
      const s = v.trim()
      return s === '' ? null : s
    }
    return v
  }

  async function saveAll() {
    const v = form.getValues()

    // Build payload ensuring optional empties are treated as null and
    // non-editable fields are preserved from initial values.
    const payload: ProfileEditorValues = {
      firstName: initial.firstName ?? null,
      lastName: initial.lastName ?? null,
      phoneNumber: toNullIfEmpty(v.phoneNumber) as string | null | undefined,
      birthDate: toNullIfEmpty(v.birthDate) as string | null | undefined,
      language: v.language,
      position: initial.isAdmin ? toNullIfEmpty(v.position) as string | null | undefined : (initial.position ?? null),
      country: toNullIfEmpty(v.country) as string | null | undefined,
      profilePhoto: toNullIfEmpty(v.profilePhoto) as string | null | undefined,
      // role and applications only for admins
      ...(initial.isAdmin ? { role: v.role } : {}),
      ...(initial.isAdmin ? { applications: v.applications } : {}),
    }

    setSaving(true)
    try {
      await execute(payload)
    } finally {
      setSaving(false)
    }
  }

  const apps = new Set(form.watch('applications') ?? [])
  function toggleApp(app: NonNullable<ProfileEditorValues['applications']>[number]) {
    if (apps.has(app)) apps.delete(app); else apps.add(app)
    form.setValue('applications', Array.from(apps))
  }

  function dateValue(): string | undefined {
    const v = form.getValues('birthDate')
    return v ?? undefined
  }

  

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-sm text-gray-500">Email</div>
          <Input value={initial.email} disabled />
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-500">{tAdmin('firstName')}</div>
          <Input value={initial.firstName ?? ''} disabled />
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-500">{tAdmin('lastName')}</div>
          <Input value={initial.lastName ?? ''} disabled />
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-500">{tAdmin('phone')}</div>
          <Input {...form.register('phoneNumber')} placeholder="+33..." />
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-500">{tAdmin('country')}</div>
          <Select defaultValue={initial.country ?? ''} {...form.register('country')}>
            <option value="">{tAdmin('selectPlaceholder')}</option>
            {COUNTRIES.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-500">{tAdmin('birthDate')}</div>
          <Input type="date" defaultValue={dateValue()} {...form.register('birthDate')} />
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-500">{tAdmin('language')}</div>
          <Select defaultValue={initial.language} {...form.register('language')}>
            <option value="EN">English</option>
            <option value="FR">Français</option>
          </Select>
        </div>
        {initial.isAdmin && (
          <div className="space-y-1">
            <div className="text-sm text-gray-500">{tAdmin('position')}</div>
            <Input {...form.register('position')} placeholder={tAdmin('positionGeneric')} />
          </div>
        )}
        <div className="md:col-span-2 space-y-1">
          <div className="text-sm text-gray-500">{tAdmin('profilePhoto')}</div>
          <Input placeholder="https://..." {...form.register('profilePhoto')} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Role: hidden for non-admin users */}
        {initial.isAdmin && (
          <div>
            <div className="text-sm text-gray-500 mb-1">{tAdmin('role')}</div>
            <Select defaultValue={initial?.['role'] as 'ADMIN' | 'USER'} {...form.register('role')}>
              <option value="USER">{tAdmin('roleUser')}</option>
              <option value="ADMIN">{tAdmin('roleAdmin')}</option>
            </Select>
          </div>
        )}

        <div>
          <div className="text-sm text-gray-500 mb-2">{tAdmin('applications')}</div>
          <div className="flex flex-wrap items-center gap-2">
            {initial.isAdmin ? (
              (['BESTOF_LARIB','CONGES','CARDIOLARIB'] as const).map((app) => (
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
              ))
            ) : (
              (form.watch('applications') ?? []).map((app) => (
                <span key={app} className='px-2 py-1 rounded border bg-muted text-xs'>
                  {tAdmin(`app_${app}`)}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={saveAll} disabled={saving}>
          {saving ? tAdmin('saving') : tAdmin('save')}
        </Button>
      </div>
    </div>
  )
}
