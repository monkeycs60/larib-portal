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
import { Save, Shield } from "lucide-react"
import { accessibleApplications, canAdminApp } from "@/lib/permissions"
import type { Application } from "@/app/generated/prisma"

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

const APP_DOT: Record<Application, string> = {
  BESTOF_LARIB: '#ec3b68',
  CONGES: '#6366f1',
  CARDIOLARIB: '#0ea5e9',
}

type Props = {
  initial: ProfileEditorValues & {
    email: string
    isAdmin: boolean
    adminApplications?: Application[]
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
      // role is editable for admins; applications stay read-only on this page
      // and are always resent unchanged from the initial snapshot.
      ...(initial.isAdmin ? { role: v.role } : {}),
      ...(initial.isAdmin ? { applications: initial.applications } : {}),
    }

    setSaving(true)
    try {
      await execute(payload)
    } finally {
      setSaving(false)
    }
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

  const allowedApplications = accessibleApplications({
    applications: initial.applications ?? [],
    adminApplications: initial.adminApplications ?? [],
  })

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-bg-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
          <span className="text-xs font-semibold uppercase tracking-wide text-coral-600">{tProfile('sectionAccountDetails')}</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">{tAdmin('email')}</label>
            <Input value={initial.email} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">{tAdmin('firstName')}</label>
            {initial.isAdmin ? (
              <Input {...form.register('firstName')} placeholder={tAdmin('firstName')} />
            ) : (
              <Input value={initial.firstName ?? ''} disabled />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">{tAdmin('lastName')}</label>
            {initial.isAdmin ? (
              <Input {...form.register('lastName')} placeholder={tAdmin('lastName')} />
            ) : (
              <Input value={initial.lastName ?? ''} disabled />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">{tAdmin('phone')}</label>
            <Input {...form.register('phoneNumber')} placeholder="+33..." />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-bg-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
          <span className="text-xs font-semibold uppercase tracking-wide text-coral-600">{tProfile('sectionPersonalInfo')}</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">{tAdmin('country')}</label>
            <Select defaultValue={initial.country ?? ''} {...form.register('country')}>
              <option value="">{tAdmin('selectPlaceholder')}</option>
              {COUNTRIES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">{tAdmin('birthDate')}</label>
            <Input
              key={`birthdate-${initial.birthDate}`}
              type="date"
              value={form.watch('birthDate') ?? ''}
              onChange={(e) => form.setValue('birthDate', e.target.value || null)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">{tAdmin('language')}</label>
            <Select defaultValue={initial.language} {...form.register('language')}>
              <option value="EN">English</option>
              <option value="FR">Français</option>
            </Select>
          </div>
          {initial.isAdmin && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-text-primary">{tAdmin('position')}</label>
                <button type="button" className="text-xs font-medium text-coral-600" onClick={() => { setAddPosOpen(true); setNewPosName('') }} disabled={creatingPos}>
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
        </div>
      </section>

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

      <section className="rounded-xl border border-line bg-bg-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
          <span className="text-xs font-semibold uppercase tracking-wide text-coral-600">{tProfile('sectionProfilePhoto')}</span>
          <span className="h-px flex-1 bg-line" />
        </div>
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
          labels={{ select: tProfile('selectImage'), helper: tProfile('profilePhotoHelp') }}
        />
        {/* Keep the value in form state for server action */}
        <input type="hidden" {...form.register('profilePhoto')} />
      </section>

      <section className="rounded-xl border border-line bg-bg-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
          <span className="text-xs font-semibold uppercase tracking-wide text-coral-600">{tProfile('sectionRoleAccess')}</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">{tAdmin('role')}</label>
            {initial.isAdmin ? (
              <Select defaultValue={initial.role} {...form.register('role')}>
                <option value="USER">{tAdmin('roleUser')}</option>
                <option value="ADMIN">{tAdmin('roleAdmin')}</option>
              </Select>
            ) : (
              <Input value={initial.role === 'ADMIN' ? tAdmin('roleAdmin') : tAdmin('roleUser')} disabled />
            )}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-text-primary mb-2">{tProfile('allowedApplications')}</label>
          <div className="flex flex-wrap items-center gap-2">
            {allowedApplications.length === 0 ? (
              <span className="text-sm text-text-muted">—</span>
            ) : (
              allowedApplications.map((app) => (
                <span key={app} className="inline-flex items-center gap-2 rounded-full border border-line bg-gray-50 py-1 pl-2.5 pr-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: APP_DOT[app] }} />
                  <span className="text-sm font-medium text-text-primary">{tAdmin(`app_${app}`)}</span>
                  {initial.applications?.includes(app) && (
                    <span className="rounded-full bg-white border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase text-text-secondary">
                      {tAdmin('appColUser')}
                    </span>
                  )}
                  {canAdminApp({ role: initial.role, adminApplications: initial.adminApplications }, app) && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                      <Shield className="h-2.5 w-2.5" />
                      {tAdmin('appColAdmin')}
                    </span>
                  )}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="flex justify-end border-t border-line pt-4">
        <Button type="button" onClick={saveAll} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? tAdmin('saving') : tAdmin('save')}
        </Button>
      </div>
    </div>
  )
}
