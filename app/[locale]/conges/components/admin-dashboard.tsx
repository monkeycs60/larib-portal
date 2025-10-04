'use client'

import { useMemo, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateLeaveAllocationAction, updateLeaveStatusAction } from '../actions'
import type { AdminUserRow, PendingLeaveRequestAdmin } from '@/lib/services/conges'

type AdminDashboardProps = {
  data: {
    rows: AdminUserRow[]
    pendingRequests: PendingLeaveRequestAdmin[]
    summaryTitle: string
    summarySubtitle: string
    tableTitle: string
    tableLabels: {
      user: string
      role: string
      allocation: string
      approved: string
      pending: string
      remaining: string
      balance: string
      percentage: string
      departure: string
      lastLeave: string
      status: string
      save: string
    }
    statusLabels: {
      ADMIN: string
      USER: string
    }
    legendLabels: Record<'CRITICAL' | 'WARNING_USAGE' | 'WARNING_INACTIVE' | 'GOOD' | 'UNALLOCATED', string>
    pendingLabels: {
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
      allocationSaved: string
      allocationInvalid: string
      statusApproved: string
      statusRejected: string
      statusError: string
    }
  }
}

type AllocationState = Record<string, string>

const statusVariant: Record<AdminUserRow['status'], 'destructive' | 'secondary' | 'default' | 'outline'> = {
  CRITICAL: 'destructive',
  WARNING_USAGE: 'secondary',
  WARNING_INACTIVE: 'outline',
  GOOD: 'default',
  UNALLOCATED: 'outline',
}

export function AdminDashboard({ data }: AdminDashboardProps) {
  const initialAllocations = useMemo<AllocationState>(() => {
    return data.rows.reduce<AllocationState>((acc, row) => {
      acc[row.userId] = row.totalAllocationDays.toString()
      return acc
    }, {})
  }, [data.rows])

  const [allocations, setAllocations] = useState<AllocationState>(initialAllocations)
  const [activeAllocationUser, setActiveAllocationUser] = useState<string | null>(null)
  const [activeStatusRequest, setActiveStatusRequest] = useState<string | null>(null)

  const { execute: saveAllocation, isExecuting: savingAllocation } = useAction(updateLeaveAllocationAction, {
    onSuccess: () => {
      toast.success(data.toasts.allocationSaved)
    },
    onError: () => {
      toast.error(data.toasts.allocationInvalid)
    },
  })

  const { execute: changeStatus, isExecuting: savingStatus } = useAction(updateLeaveStatusAction, {
    onSuccess: ({ input }) => {
      if (input?.status === 'APPROVED') {
        toast.success(data.toasts.statusApproved)
      } else {
        toast.success(data.toasts.statusRejected)
      }
    },
    onError: () => {
      toast.error(data.toasts.statusError)
    },
  })

  const handleAllocationSave = async (userId: string) => {
    const raw = allocations[userId]
    const parsed = Number.parseInt(raw, 10)
    if (Number.isNaN(parsed)) {
      toast.error(data.toasts.allocationInvalid)
      return
    }

    setActiveAllocationUser(userId)
    await saveAllocation({ userId, totalAllocationDays: parsed })
    setActiveAllocationUser(null)
  }

  const handleStatusChange = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setActiveStatusRequest(requestId)
    await changeStatus({ requestId, status })
    setActiveStatusRequest(null)
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>{data.summaryTitle}</CardTitle>
          <CardDescription>{data.summarySubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-wrap gap-3'>
            {(Object.entries(data.legendLabels) as Array<[keyof typeof data.legendLabels, string]>).map(([key, label]) => (
              <Badge key={key} variant={statusVariant[key] ?? 'secondary'}>
                {label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{data.pendingLabels.title}</CardTitle>
          <CardDescription>{data.pendingLabels.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.pendingRequests.length === 0 ? (
            <p className='text-sm text-muted-foreground'>{data.pendingLabels.empty}</p>
          ) : (
            <div className='space-y-4'>
              {data.pendingRequests.map((request) => {
                const displayName = [request.firstName, request.lastName].filter(Boolean).join(' ').trim() || '—'
                const isActing = activeStatusRequest === request.id && savingStatus
                const template = request.totalDays === 1 ? data.pendingLabels.daySingular : data.pendingLabels.dayPlural
                const daysLabel = template.replace('{count}', request.totalDays.toString())
                return (
                  <div key={request.id} className='flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='space-y-1'>
                      <div className='text-sm font-semibold'>{displayName}</div>
                      <div className='text-xs text-muted-foreground'>
                        {data.pendingLabels.period}:{' '}
                        <strong>
                          {new Date(request.startDate).toLocaleDateString()} – {new Date(request.endDate).toLocaleDateString()}
                        </strong>{' '}
                        ({daysLabel})
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {data.pendingLabels.created}: {new Date(request.createdAt).toLocaleString()}
                      </div>
                      {request.reason ? (
                        <div className='text-xs text-muted-foreground'>
                          {data.pendingLabels.reason}: {request.reason}
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
                        {data.pendingLabels.reject}
                      </Button>
                      <Button
                        size='sm'
                        disabled={isActing}
                        onClick={() => void handleStatusChange(request.id, 'APPROVED')}
                      >
                        {data.pendingLabels.approve}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{data.tableTitle}</CardTitle>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{data.tableLabels.user}</TableHead>
                <TableHead>{data.tableLabels.role}</TableHead>
                <TableHead>{data.tableLabels.allocation}</TableHead>
                <TableHead>{data.tableLabels.approved}</TableHead>
                <TableHead>{data.tableLabels.pending}</TableHead>
                <TableHead>{data.tableLabels.remaining}</TableHead>
                <TableHead>{data.tableLabels.balance}</TableHead>
                <TableHead>{data.tableLabels.percentage}</TableHead>
                <TableHead>{data.tableLabels.departure}</TableHead>
                <TableHead>{data.tableLabels.lastLeave}</TableHead>
                <TableHead>{data.tableLabels.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => {
                const displayName = [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || row.email
                const allocationValue = allocations[row.userId] ?? row.totalAllocationDays.toString()
                const isSaving = savingAllocation && activeAllocationUser === row.userId
                const departureValue = row.monthsUntilDeparture != null || row.daysUntilDeparture != null
                  ? `${row.monthsUntilDeparture ?? '-'} mo / ${row.daysUntilDeparture ?? '-'} d`
                  : '—'
                const lastLeaveValue = row.lastLeaveDate ? new Date(row.lastLeaveDate).toLocaleDateString() : '—'
                const percentageValue = `${Math.round(row.percentageUsed)}%`

                return (
                  <TableRow key={row.userId}>
                    <TableCell>
                      <div className='font-medium'>{displayName}</div>
                      <div className='text-xs text-muted-foreground'>{row.email}</div>
                    </TableCell>
                    <TableCell>{data.statusLabels[row.role]}</TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Input
                          value={allocationValue}
                          onChange={(event) => {
                            const next = event.target.value.replace(/[^0-9]/g, '')
                            setAllocations((prev) => ({ ...prev, [row.userId]: next }))
                          }}
                          inputMode='numeric'
                          className='w-20'
                        />
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={isSaving}
                          onClick={() => void handleAllocationSave(row.userId)}
                        >
                          {data.tableLabels.save}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{row.approvedDays}</TableCell>
                    <TableCell>{row.pendingDays}</TableCell>
                    <TableCell>{row.remainingDays}</TableCell>
                    <TableCell>{row.balanceAfterPending}</TableCell>
                    <TableCell>{percentageValue}</TableCell>
                    <TableCell>{departureValue}</TableCell>
                    <TableCell>{lastLeaveValue}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[row.status]}>{data.legendLabels[row.status]}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
