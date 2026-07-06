"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"
import { UserEditDialog, type UserFormValues } from "./user-edit-dialog"
import { AddUserDialog } from './user-add-dialog'
import { deleteUserAction, resendInvitationAction } from "./actions"
import { useState } from "react"
import { useAction } from 'next-safe-action/hooks'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import type { InvitationStatus } from '@/lib/services/invitations'
import { Mail, Shield, Trash2, UserIcon } from 'lucide-react'
import { accessibleApplications, canAdminApp } from '@/lib/permissions'
import type { Application } from '@/app/generated/prisma'

export type UserRow = UserFormValues & {
  name?: string | null
  createdAt?: string
  onboardingStatus?: InvitationStatus
  invitationExpiresAt?: Date | string
}

const APP_DOT: Record<string, string> = {
  BESTOF_LARIB: '#ec3b68',
  CONGES: '#6366f1',
  CARDIOLARIB: '#0ea5e9',
}

const AVATAR_TINTS = [
  { bg: '#fde7ee', fg: '#d61f55' },
  { bg: '#e8eafd', fg: '#4f46e5' },
  { bg: '#e0f2fe', fg: '#0369a1' },
  { bg: '#ccfbf1', fg: '#0f766e' },
  { bg: '#dcfce7', fg: '#15803d' },
  { bg: '#fef3c7', fg: '#b45309' },
]

function avatarTint(seed: string) {
  let hash = 0
  for (let index = 0; index < seed.length; index++) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  return AVATAR_TINTS[hash % AVATAR_TINTS.length]
}

function OnboardingStatusBadge({ status }: { status: InvitationStatus }) {
  const t = useTranslations('admin')

  switch (status) {
    case 'ACTIVE':
      return (
        <Badge variant="success" className="bg-success-100 text-success-700 border-success-500 font-semibold">
          {t('statusActive')}
        </Badge>
      )
    case 'INVITATION_SENT':
      return (
        <Badge variant="warning" className="bg-warn-100 text-warn-700 border-warn-500 font-semibold">
          {t('statusInvitationSent')}
        </Badge>
      )
    case 'INVITATION_EXPIRED':
      return (
        <Badge variant="danger" className="bg-danger-100 text-danger-700 border-danger-500 font-semibold">
          {t('statusInvitationExpired')}
        </Badge>
      )
    default:
      return null
  }
}

function StatusLegend() {
  const t = useTranslations('admin')

  return (
    <div className="rounded-xl border border-line bg-bg-surface px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('statusLegend')}</span>
      <div className="flex items-center gap-1.5">
        <Badge variant="success" className="bg-success-100 text-success-700 border-success-500 font-semibold">
          {t('statusActive')}
        </Badge>
        <span className="text-sm text-text-secondary">{t('statusActiveDesc')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Badge variant="warning" className="bg-warn-100 text-warn-700 border-warn-500 font-semibold">
          {t('statusInvitationSent')}
        </Badge>
        <span className="text-sm text-text-secondary">{t('statusInvitationSentDesc')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Badge variant="danger" className="bg-danger-100 text-danger-700 border-danger-500 font-semibold">
          {t('statusInvitationExpired')}
        </Badge>
        <span className="text-sm text-text-secondary">{t('statusInvitationExpiredDesc')}</span>
      </div>
    </div>
  )
}

export function UserTable({ users, positions, locale }: { users: UserRow[]; positions: Array<{ id: string; name: string }>; locale: string }) {
  const t = useTranslations('admin')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [resending, setResending] = useState<string | null>(null)

  const { execute: executeDelete } = useAction(deleteUserAction, {
    onSuccess() {
      toast.success(t('deleted'))
      window.location.reload()
    },
    onError({ error: { serverError } }) {
      const msg = typeof serverError === 'string' ? serverError : undefined
      toast.error(msg ? `${t('actionError')}: ${msg}` : t('actionError'))
    }
  })

  const { execute: executeResend } = useAction(resendInvitationAction, {
    onSuccess() {
      toast.success(t('invitationResent'))
      window.location.reload()
    },
    onError({ error: { serverError } }) {
      const msg = typeof serverError === 'string' ? serverError : undefined
      toast.error(msg ? `${t('actionError')}: ${msg}` : t('actionError'))
    }
  })

  async function handleDelete(id: string) {
    setDeleting(id)
    await executeDelete({ id })
    setDeleting(null)
  }

  async function handleResendInvitation(userId: string) {
    setResending(userId)
    await executeResend({ userId, locale: locale as 'en' | 'fr' })
    setResending(null)
  }

  const isPlaceholderUser = (user: UserRow) => {
    return user.onboardingStatus !== 'ACTIVE'
  }

  return (
    <div className="space-y-4">
      <StatusLegend />
      <div className="rounded-xl border border-line bg-bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-coral-600">{t('usersSectionLabel')}</span>
            <span className="rounded-full bg-coral-50 text-coral-600 text-xs font-bold px-2 py-0.5">{users.length}</span>
          </div>
          <AddUserDialog positions={positions} locale={locale} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase tracking-wide text-text-muted">{t('name')}</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-text-muted">{t('email')}</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-text-muted">{t('onboardingStatus')}</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-text-muted">{t('position')}</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-text-muted">{t('colApplicationsAccess')}</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wide text-text-muted">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const placeholder = isPlaceholderUser(user)
                const tint = avatarTint(user.id)
                const initials = (user.firstName?.[0] || user.name?.[0] || user.email[0]).toUpperCase()
                const apps = accessibleApplications(user)

                return (
                  <TableRow key={user.id} className={placeholder ? 'bg-gray-50/50' : ''}>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        {placeholder ? (
                          <div className="size-9 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-100">
                            <UserIcon className="size-4 text-text-secondary" />
                          </div>
                        ) : (
                          <div
                            className="size-9 rounded-full flex items-center justify-center text-sm font-semibold"
                            style={{ backgroundColor: tint.bg, color: tint.fg }}
                          >
                            {initials}
                          </div>
                        )}
                        <span className="font-semibold text-text-primary">
                          {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">{user.email}</TableCell>
                    <TableCell className="py-3">
                      <OnboardingStatusBadge status={user.onboardingStatus || 'ACTIVE'} />
                    </TableCell>
                    <TableCell className="py-3 text-text-secondary">{user.position || '—'}</TableCell>
                    <TableCell className="py-3">
                      {apps.length === 0 ? (
                        <span className="text-text-muted">—</span>
                      ) : (
                        <div className="flex flex-col items-start gap-1.5">
                          {apps.map((app: Application) => (
                            <span key={app} className="inline-flex items-center gap-2 rounded-full border border-line bg-gray-50 py-1 pl-2.5 pr-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: APP_DOT[app] }} />
                              <span className="text-sm font-medium text-text-primary">{t(`app_${app}`)}</span>
                              {user.applications?.includes(app) && (
                                <span className="rounded-full bg-white border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase text-text-secondary">
                                  {t('appColUser')}
                                </span>
                              )}
                              {canAdminApp(user, app) && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                                  <Shield className="h-2.5 w-2.5" />
                                  {t('appColAdmin')}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {user.onboardingStatus !== 'ACTIVE' && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-9 border-coral-200 text-coral-600 hover:bg-coral-50"
                            disabled={resending === user.id}
                            onClick={() => handleResendInvitation(user.id)}
                            title={t('resendInvitation')}
                          >
                            <Mail className="size-4" />
                          </Button>
                        )}
                        <UserEditDialog
                          positions={positions}
                          initial={{
                            id: user.id,
                            email: user.email,
                            role: user.role as 'ADMIN' | 'USER',
                            firstName: user.firstName ?? undefined,
                            lastName: user.lastName ?? undefined,
                            phoneNumber: user.phoneNumber ?? undefined,
                            country: user.country ?? undefined,
                            birthDate: user.birthDate ? new Date(user.birthDate as unknown as string).toISOString().slice(0,10) : undefined,
                            language: (user.language as 'EN' | 'FR' | undefined) ?? undefined,
                            position: user.position ?? undefined,
                            arrivalDate: user.arrivalDate ? new Date(user.arrivalDate as unknown as string).toISOString().slice(0,10) : undefined,
                            departureDate: user.departureDate ? new Date(user.departureDate as unknown as string).toISOString().slice(0,10) : undefined,
                            applications: (user.applications ?? []) as UserFormValues['applications'],
                            adminApplications: (user.adminApplications ?? []) as UserFormValues['adminApplications'],
                          }}
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-9 border-coral-200 text-coral-600 hover:bg-coral-50"
                              disabled={deleting === user.id}
                              title={t('delete')}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('confirmDeleteDesc')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(user.id)}>
                                {deleting === user.id ? t('deleting') : t('delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
