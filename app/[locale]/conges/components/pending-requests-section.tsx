'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
    pending: string
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
            <p className='text-sm text-text-secondary'>{labels.empty}</p>
          ) : (
            <div className='space-y-4'>
              {pendingRequests.map((request) => {
                const displayName = formatUserName({ firstName: request.firstName, lastName: request.lastName, email: request.email })
                const isActing = activeStatusRequest === request.id && savingStatus
                const template = request.totalDays === 1 ? labels.daySingular : labels.dayPlural
                const daysLabel = template.replace('{count}', request.totalDays.toString())
                const initials = (`${request.firstName?.[0] ?? ''}${request.lastName?.[0] ?? ''}`.trim() || request.email?.[0] || '?').toUpperCase()
                return (
                  <div key={request.id} className='flex flex-col gap-3 rounded-lg border border-line p-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='flex items-start gap-3'>
                      <Avatar className='h-10 w-10'>
                        <AvatarFallback className='bg-navy-50 text-navy-700 text-xs font-semibold'>{initials}</AvatarFallback>
                      </Avatar>
                      <div className='space-y-1'>
                        <div className='text-sm font-semibold text-text-primary'>{displayName}</div>
                        <div className='text-xs text-text-secondary'>
                          {labels.period}:{' '}
                          <strong>
                            {new Date(request.startDate).toLocaleDateString()} – {new Date(request.endDate).toLocaleDateString()}
                          </strong>{' '}
                          ({daysLabel})
                        </div>
                        <div className='text-xs text-text-secondary'>
                          {labels.created}: {new Date(request.createdAt).toLocaleString()}
                        </div>
                        {request.reason ? (
                          <div className='text-xs text-text-secondary'>
                            {labels.reason}: {request.reason}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Badge variant='warning'>{labels.pending}</Badge>
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
                            <Trash2 className='h-4 w-4 text-danger-600' />
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
                              className='bg-danger-600 text-white hover:bg-danger-700'
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
                        onClick={() => void handleStatusChange(request.id, 'APPROVED')}
                      >
                        {labels.approve}
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        disabled={isActing}
                        onClick={() => void handleStatusChange(request.id, 'REJECTED')}
                      >
                        {labels.reject}
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
