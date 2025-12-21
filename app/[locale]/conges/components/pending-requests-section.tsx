'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { updateLeaveStatusAction } from '../actions'
import type { PendingLeaveRequestAdmin } from '@/lib/services/conges'
import { formatUserName } from '@/lib/format-user-name'

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
  }
}

export function PendingRequestsSection({ pendingRequests, labels, toasts }: PendingRequestsSectionProps) {
  const [activeStatusRequest, setActiveStatusRequest] = useState<string | null>(null)

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

  const handleStatusChange = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setActiveStatusRequest(requestId)
    await changeStatus({ requestId, status })
    setActiveStatusRequest(null)
  }

  return (
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
  )
}
