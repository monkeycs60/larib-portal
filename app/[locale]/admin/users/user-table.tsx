"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { UserEditDialog, type UserFormValues } from "./user-edit-dialog"
import { deleteUserAction } from "./actions"
import { useState } from "react"
import { useAction } from 'next-safe-action/hooks'

export type UserRow = UserFormValues & {
  name?: string | null
  createdAt?: string
}

export function UserTable({ users }: { users: UserRow[] }) {
  const t = useTranslations('admin')
  const [deleting, setDeleting] = useState<string | null>(null)
  const { execute: executeDelete } = useAction(deleteUserAction, {
    onSuccess() {
      window.location.reload()
    },
  })

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDelete'))) return
    setDeleting(id)
    await executeDelete({ id })
    setDeleting(null)
  }

  return (
    <div className="bg-white rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('name')}</TableHead>
            <TableHead>{t('email')}</TableHead>
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
              <TableCell>{u.phoneNumber || '—'}</TableCell>
              <TableCell>{u.country || '—'}</TableCell>
              <TableCell>{u.language || '—'}</TableCell>
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
                    profilePhoto: u.profilePhoto ?? undefined,
                    applications: (u.applications ?? []) as UserFormValues['applications'],
                  }}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(u.id)}
                  disabled={deleting === u.id}
                >
                  {deleting === u.id ? t('deleting') : t('delete')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
