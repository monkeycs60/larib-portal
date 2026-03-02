'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Pencil, Trash2 } from 'lucide-react'
import { updateLeaveStatusAction, adminDeleteLeaveAction } from '../actions'
import type { PendingLeaveRequestAdmin } from '@/lib/services/conges'
import { formatUserName } from '@/lib/format-user-name'
import { AdminEditLeaveDialog, type AdminEditLeaveEntry, type AdminEditLeaveDialogTranslations } from './admin-edit-leave-dialog'

type PendingRequestsSectionProps = {
  pendingRequests: PendingLeaveRequestAdmin[]
  labels: {
    title: string
    empty: string
    approve: string
    reject: string
    created: string
    period: string
    reason: string
    daySingular: string
    dayPlural: string
    subtitle: string
  }
  toasts: {
    statusApproved: string
    statusRejected: string
    statusError: string
    deleted: string
    deleteError: string
  }
  adminActions: {
    edit: string
    delete: string
    deleteConfirmTitle: string
    deleteConfirmDescription: string
    deleteConfirm: string
    deleteCancel: string
  }
  editDialogTranslations: AdminEditLeaveDialogTranslations
  locale: 'fr' | 'en'
  frenchHolidays: Record<string, string>
}

export function PendingRequestsSection({
  pendingRequests,
  labels,
  toasts,
  adminActions,
  editDialogTranslations,
  locale,
  frenchHolidays,
}: PendingRequestsSectionProps) {
  const [activeStatusRequest, setActiveStatusRequest] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<AdminEditLeaveEntry | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const { execute: changeStatus, isExecuting: savingStatus } = useAction(updateLeaveStatusAction, {
    onSuccess: ({ input }) => {
      if (input?.status === 'APPROVED') {
        toast.success(toasts.statusApproved)
      } else {
        toast.success(toasts.statusRejected)
      }
    },
    onError: () => {
      toast.error(toasts.statusError)
    },
  })

  const { execute: executeDelete, isExecuting: isDeleting } = useAction(adminDeleteLeaveAction, {
    onSuccess: () => {
      toast.success(toasts.deleted)
    },
    onError: () => {
      toast.error(toasts.deleteError)
    },
  })

  const handleStatusChange = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setActiveStatusRequest(requestId)
    await changeStatus({ requestId, status })
    setActiveStatusRequest(null)
  }

  const handleEdit = (request: PendingLeaveRequestAdmin) => {
    setEditEntry({
      id: request.id,
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason,
      dayCount: request.totalDays,
    })
    setEditDialogOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
          <CardDescription>{labels.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className='text-sm text-muted-foreground'>{labels.empty}</p>
          ) : (
            <div className='space-y-4'>
              {pendingRequests.map((request) => {
                const displayName = formatUserName({ firstName: request.firstName, lastName: request.lastName, email: request.email })
                const isActing = activeStatusRequest === request.id && savingStatus
                const template = request.totalDays === 1 ? labels.daySingular : labels.dayPlural
                const daysLabel = template.replace('{count}', request.totalDays.toString())
                return (
                  <div key={request.id} className='flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='space-y-1'>
                      <div className='text-sm font-semibold'>{displayName}</div>
                      <div className='text-xs text-muted-foreground'>
                        {labels.period}:{' '}
                        <strong>
                          {new Date(request.startDate).toLocaleDateString()} – {new Date(request.endDate).toLocaleDateString()}
                        </strong>{' '}
                        ({daysLabel})
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {labels.created}: {new Date(request.createdAt).toLocaleString()}
                      </div>
                      {request.reason ? (
                        <div className='text-xs text-muted-foreground'>
                          {labels.reason}: {request.reason}
                        </div>
                      ) : null}
                    </div>
                    <div className='flex gap-2'>
                      <Button
                        size='icon'
                        variant='ghost'
                        title={adminActions.edit}
                        onClick={() => handleEdit(request)}
                      >
                        <Pencil className='h-4 w-4' />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size='icon'
                            variant='ghost'
                            title={adminActions.delete}
                            disabled={isDeleting}
                          >
                            <Trash2 className='h-4 w-4 text-destructive' />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{adminActions.deleteConfirmTitle}</AlertDialogTitle>
                            <AlertDialogDescription>{adminActions.deleteConfirmDescription}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{adminActions.deleteCancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => executeDelete({ requestId: request.id })}
                              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            >
                              {adminActions.deleteConfirm}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        size='sm'
                        variant='outline'
                        disabled={isActing}
                        onClick={() => void handleStatusChange(request.id, 'REJECTED')}
                      >
                        {labels.reject}
                      </Button>
                      <Button
                        size='sm'
                        disabled={isActing}
                        onClick={() => void handleStatusChange(request.id, 'APPROVED')}
                      >
                        {labels.approve}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <AdminEditLeaveDialog
        entry={editEntry}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        translations={editDialogTranslations}
        locale={locale}
        frenchHolidays={frenchHolidays}
      />
    </>
  )
}
