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
import { createPositionAction } from "@/actions/positions"
import { FileUpload } from "@/components/ui/file-upload"
import { InputDialog } from "@/components/ui/input-dialog"

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
  positions?: Array<{ id: string; name: string }>
}

export function ProfileEditor({ initial, positions = [] }: Props) {
  const tAdmin = useTranslations('admin')
  const tProfile = useTranslations('profile')
  const [saving, setSaving] = useState(false)
  const [posList, setPosList] = useState(positions)

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
      firstName: initial.isAdmin ? toNullIfEmpty(v.firstName) as string | null | undefined : initial.firstName ?? null,
      lastName: initial.isAdmin ? toNullIfEmpty(v.lastName) as string | null | undefined : initial.lastName ?? null,
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

  const { execute: execCreatePos, isExecuting: creatingPos } = useAction(createPositionAction, {
    onSuccess(res) {
      const created = res.data
      if (created) {
        setPosList((prev) => [...prev.filter(p => p.id !== created.id), created])
        form.setValue('position', created.name)
        toast.success(tAdmin('positionCreated'))
      }
    },
    onError() {
      toast.error(tAdmin('actionError'))
    }
  })

  const [addPosOpen, setAddPosOpen] = useState(false)
  const [newPosName, setNewPosName] = useState('')
  async function confirmAddPosition() {
    const name = newPosName.trim()
    if (!name) return
    await execCreatePos({ name })
    setAddPosOpen(false)
    setNewPosName('')
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
          {initial.isAdmin ? (
            <Input {...form.register('firstName')} placeholder={tAdmin('firstName')} />
          ) : (
            <Input value={initial.firstName ?? ''} disabled />
          )}
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-500">{tAdmin('lastName')}</div>
          {initial.isAdmin ? (
            <Input {...form.register('lastName')} placeholder={tAdmin('lastName')} />
          ) : (
            <Input value={initial.lastName ?? ''} disabled />
          )}
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
          <Input
            key={`birthdate-${initial.birthDate}`}
            type="date"
            value={form.watch('birthDate') ?? ''}
            onChange={(e) => form.setValue('birthDate', e.target.value || null)}
          />
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
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">{tAdmin('position')}</div>
              <button type="button" className="text-xs text-blue-600" onClick={() => { setAddPosOpen(true); setNewPosName('') }} disabled={creatingPos}>
                {tAdmin('addNewPosition')}
              </button>
            </div>
            <Select defaultValue={initial.position ?? ''} {...form.register('position')}>
              <option value="">{tAdmin('selectPlaceholder')}</option>
              {posList.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </Select>
          </div>
        )}
        <div className="md:col-span-2 space-y-2">
          <div className="text-sm text-gray-500">{tAdmin('profilePhoto')}</div>
          <FileUpload
            accept="image/*"
            maxSize={5 * 1024 * 1024}
            valueUrl={form.watch('profilePhoto') ?? null}
            onUploaded={({ url }) => {
              form.setValue('profilePhoto', url)
            }}
            onDeleted={() => {
              form.setValue('profilePhoto', null)
            }}
          />
          {/* Keep the value in form state for server action */}
          <input type="hidden" {...form.register('profilePhoto')} />
        </div>
      </div>
      <InputDialog
        open={addPosOpen}
        onOpenChange={setAddPosOpen}
        title={tAdmin('addNewPosition')}
        label={tAdmin('addNewPositionPrompt')}
        placeholder={tAdmin('addNewPositionPrompt')}
        confirmText={tAdmin('create')}
        cancelText={tAdmin('cancel')}
        value={newPosName}
        onValueChange={setNewPosName}
        onConfirm={confirmAddPosition}
        loading={creatingPos}
      />

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
