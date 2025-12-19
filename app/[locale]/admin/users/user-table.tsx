"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { UserEditDialog, type UserFormValues } from "./user-edit-dialog"
import { AddUserDialog } from './user-add-dialog'
import { deleteUserAction } from "./actions"
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

export type UserRow = UserFormValues & {
  name?: string | null
  createdAt?: string
}

export function UserTable({ users, positions, locale }: { users: UserRow[]; positions: Array<{ id: string; name: string }>; locale: string }) {
  const t = useTranslations('admin')
  const [deleting, setDeleting] = useState<string | null>(null)
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

  return (
    <div className="bg-white rounded-md border">
      <div className="flex items-center justify-end p-3">
        <AddUserDialog positions={positions} locale={locale} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('name')}</TableHead>
            <TableHead>{t('email')}</TableHead>
            <TableHead>{t('role')}</TableHead>
            <TableHead>{t('position')}</TableHead>
            <TableHead>{t('applications')}</TableHead>
            <TableHead className="text-right">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-center">
                    {(u.firstName?.[0] || u.name?.[0] || u.email[0]).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{[u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || '—'}</span>
                    <span className="text-xs text-muted-foreground">{u.position || '—'}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell>{u.position || '—'}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {u.applications?.map((a) => (
                    <span key={a} className="px-2 py-0.5 rounded border text-xs">
                      {t(`app_${a}`)}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <UserEditDialog
                  positions={positions}
                  initial={{
                    id: u.id,
                    email: u.email,
                    role: u.role as 'ADMIN' | 'USER',
                    firstName: u.firstName ?? undefined,
                    lastName: u.lastName ?? undefined,
                    phoneNumber: u.phoneNumber ?? undefined,
                    country: u.country ?? undefined,
                    birthDate: u.birthDate ? new Date(u.birthDate as unknown as string).toISOString().slice(0,10) : undefined,
                    language: (u.language as 'EN' | 'FR' | undefined) ?? undefined,
                    position: u.position ?? undefined,
                    arrivalDate: u.arrivalDate ? new Date(u.arrivalDate as unknown as string).toISOString().slice(0,10) : undefined,
                    departureDate: u.departureDate ? new Date(u.departureDate as unknown as string).toISOString().slice(0,10) : undefined,
                    applications: (u.applications ?? []) as UserFormValues['applications'],
                  }}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleting === u.id}
                    >
                      {deleting === u.id ? t('deleting') : t('delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('confirmDeleteDesc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(u.id)}>
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
