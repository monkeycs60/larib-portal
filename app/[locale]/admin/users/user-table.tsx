"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { UserEditDialog, type UserFormValues } from "./user-edit-dialog"
import { AddUserDialog } from './user-add-dialog'
import { deleteUserAction } from "./actions"
import { useState, useMemo } from "react"
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
import { computeUserStatus, type UserStatus } from '@/lib/services/users'
import { Badge } from '@/components/ui/badge'

export type UserRow = UserFormValues & {
  name?: string | null
  createdAt?: string
  hasPassword?: boolean
}

type StatusFilter = 'ALL' | UserStatus

function StatusBadge({ status }: { status: UserStatus }) {
  const t = useTranslations('admin')
  const variants: Record<UserStatus, { className: string }> = {
    ACTIVE: { className: 'bg-green-100 text-green-800 hover:bg-green-100' },
    PENDING: { className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
    INACTIVE: { className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  }
  return (
    <Badge variant="outline" className={variants[status].className}>
      {t(`status_${status}`)}
    </Badge>
  )
}

export function UserTable({ users, positions, locale }: { users: UserRow[]; positions: Array<{ id: string; name: string }>; locale: string }) {
  const t = useTranslations('admin')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
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

  async function handleDelete(id: string) {
    setDeleting(id)
    await executeDelete({ id })
    setDeleting(null)
  }

  const usersWithStatus = useMemo(() => {
    return users.map((user) => {
      const departureDate = user.departureDate
        ? new Date(user.departureDate as unknown as string)
        : null
      const status = computeUserStatus({ departureDate }, user.hasPassword ?? false)
      return { ...user, status }
    })
  }, [users])

  const filteredUsers = useMemo(() => {
    if (statusFilter === 'ALL') return usersWithStatus
    return usersWithStatus.filter((user) => user.status === statusFilter)
  }, [usersWithStatus, statusFilter])

  const statusCounts = useMemo(() => {
    const counts = { ALL: usersWithStatus.length, PENDING: 0, ACTIVE: 0, INACTIVE: 0 }
    usersWithStatus.forEach((user) => {
      counts[user.status]++
    })
    return counts
  }, [usersWithStatus])

  return (
    <div className="bg-white rounded-md border">
      <div className="flex items-center justify-between p-3">
        <div className="flex gap-2">
          {(['ALL', 'ACTIVE', 'PENDING', 'INACTIVE'] as const).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(filter)}
            >
              {t(`statusFilter_${filter}`)} ({statusCounts[filter]})
            </Button>
          ))}
        </div>
        <AddUserDialog positions={positions} locale={locale} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('name')}</TableHead>
            <TableHead>{t('email')}</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead>{t('role')}</TableHead>
            <TableHead>{t('phone')}</TableHead>
            <TableHead>{t('country')}</TableHead>
            <TableHead>{t('language')}</TableHead>
            <TableHead>{t('position')}</TableHead>
            <TableHead>{t('applications')}</TableHead>
            <TableHead className="text-right">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-center">
                    {(user.firstName?.[0] || user.name?.[0] || user.email[0]).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || '—'}</span>
                    <span className="text-xs text-muted-foreground">{user.position || '—'}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <StatusBadge status={user.status} />
              </TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>{user.phoneNumber || '—'}</TableCell>
              <TableCell>{user.country || '—'}</TableCell>
              <TableCell>{user.language || '—'}</TableCell>
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
  )
}
