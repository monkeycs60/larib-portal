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
import type { AccountStatus } from '@/lib/services/users'
import { MailIcon, UserIcon, CalendarX } from 'lucide-react'
import { useMemo } from 'react'

export type UserRow = UserFormValues & {
  name?: string | null
  createdAt?: string
  onboardingStatus?: InvitationStatus
  invitationExpiresAt?: Date | string
  accountStatus?: AccountStatus
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'pending'

function OnboardingStatusBadge({ status }: { status: InvitationStatus }) {
  const t = useTranslations('admin')

  switch (status) {
    case 'ACTIVE':
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-600">
          {t('statusActive')}
        </Badge>
      )
    case 'INVITATION_SENT':
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          {t('statusInvitationSent')}
        </Badge>
      )
    case 'INVITATION_EXPIRED':
      return (
        <Badge variant="destructive">
          {t('statusInvitationExpired')}
        </Badge>
      )
    default:
      return null
  }
}

function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const t = useTranslations('admin')

  if (status === 'INACTIVE') {
    return (
      <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
        <CalendarX className="size-3 mr-1" />
        {t('accountInactive')}
      </Badge>
    )
  }
  return null
}

function StatusLegend() {
  const t = useTranslations('admin')

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <span className="font-medium">{t('statusLegend')}:</span>
      <div className="flex items-center gap-1.5">
        <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-xs">
          {t('statusActive')}
        </Badge>
        <span>{t('statusActiveDesc')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">
          {t('statusInvitationSent')}
        </Badge>
        <span>{t('statusInvitationSentDesc')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Badge variant="destructive" className="text-xs">
          {t('statusInvitationExpired')}
        </Badge>
        <span>{t('statusInvitationExpiredDesc')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 text-xs">
          <CalendarX className="size-3 mr-1" />
          {t('accountInactive')}
        </Badge>
        <span>{t('accountInactiveDesc')}</span>
      </div>
    </div>
  )
}

function StatusFilterButtons({
  filter,
  onFilterChange,
  counts
}: {
  filter: StatusFilter
  onFilterChange: (filter: StatusFilter) => void
  counts: { all: number; active: number; inactive: number; pending: number }
}) {
  const t = useTranslations('admin')

  const filters: Array<{ key: StatusFilter; label: string; count: number }> = [
    { key: 'all', label: t('filterAll'), count: counts.all },
    { key: 'active', label: t('filterActive'), count: counts.active },
    { key: 'pending', label: t('filterPending'), count: counts.pending },
    { key: 'inactive', label: t('filterInactive'), count: counts.inactive },
  ]

  return (
    <div className="flex gap-2">
      {filters.map(({ key, label, count }) => (
        <Button
          key={key}
          variant={filter === key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(key)}
          className="gap-1.5"
        >
          {label}
          <Badge
            variant="secondary"
            className={filter === key ? 'bg-white/20 text-white' : 'bg-muted'}
          >
            {count}
          </Badge>
        </Button>
      ))}
    </div>
  )
}

export function UserTable({ users, positions, locale }: { users: UserRow[]; positions: Array<{ id: string; name: string }>; locale: string }) {
  const t = useTranslations('admin')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [resending, setResending] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const counts = useMemo(() => {
    const activeUsers = users.filter(
      (user) => user.onboardingStatus === 'ACTIVE' && user.accountStatus === 'ACTIVE'
    )
    const inactiveUsers = users.filter((user) => user.accountStatus === 'INACTIVE')
    const pendingUsers = users.filter(
      (user) => user.onboardingStatus !== 'ACTIVE'
    )

    return {
      all: users.length,
      active: activeUsers.length,
      inactive: inactiveUsers.length,
      pending: pendingUsers.length,
    }
  }, [users])

  const filteredUsers = useMemo(() => {
    switch (statusFilter) {
      case 'active':
        return users.filter(
          (user) => user.onboardingStatus === 'ACTIVE' && user.accountStatus === 'ACTIVE'
        )
      case 'inactive':
        return users.filter((user) => user.accountStatus === 'INACTIVE')
      case 'pending':
        return users.filter((user) => user.onboardingStatus !== 'ACTIVE')
      default:
        return users
    }
  }, [users, statusFilter])

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
      <StatusFilterButtons
        filter={statusFilter}
        onFilterChange={setStatusFilter}
        counts={counts}
      />
      <div className="bg-white rounded-md border">
        <div className="flex items-center justify-end p-3">
          <AddUserDialog positions={positions} locale={locale} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('email')}</TableHead>
              <TableHead>{t('onboardingStatus')}</TableHead>
              <TableHead>{t('role')}</TableHead>
              <TableHead>{t('position')}</TableHead>
              <TableHead>{t('applications')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} className={isPlaceholderUser(user) || user.accountStatus === 'INACTIVE' ? 'bg-muted/30' : ''}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`size-8 rounded-full flex items-center justify-center ${isPlaceholderUser(user) ? 'bg-muted border-2 border-dashed border-muted-foreground/30' : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'}`}>
                      {isPlaceholderUser(user) ? (
                        <UserIcon className="size-4 text-muted-foreground" />
                      ) : (
                        (user.firstName?.[0] || user.name?.[0] || user.email[0]).toUpperCase()
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || '—'}</span>
                      <span className="text-xs text-muted-foreground">{user.position || '—'}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <OnboardingStatusBadge status={user.onboardingStatus || 'ACTIVE'} />
                    {user.accountStatus && (
                      <AccountStatusBadge status={user.accountStatus} />
                    )}
                  </div>
                </TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.position || '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.applications?.map((application) => (
                      <span key={application} className="px-2 py-0.5 rounded border text-xs">
                        {t(`app_${application}`)}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {user.onboardingStatus !== 'ACTIVE' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={resending === user.id}
                      onClick={() => handleResendInvitation(user.id)}
                      title={t('resendInvitation')}
                    >
                      <MailIcon className="size-4 mr-1" />
                      {resending === user.id ? t('resending') : t('resendInvitation')}
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
                    }}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleting === user.id}
                      >
                        {deleting === user.id ? t('deleting') : t('delete')}
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
                          {t('delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
