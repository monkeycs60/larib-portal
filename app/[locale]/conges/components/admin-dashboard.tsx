'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Minus, Pencil, Plus } from 'lucide-react'
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
      edit: string
      departed: string
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
    allocationModal: {
      title: string
      description: string
      current: string
      decrease: string
      increase: string
      inputLabel: string
      cancel: string
      confirm: string
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

type AllocationState = Record<string, number>

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
      acc[row.userId] = row.totalAllocationDays
      return acc
    }, {})
  }, [data.rows])

  const [allocations, setAllocations] = useState<AllocationState>(initialAllocations)
  const [activeAllocationUser, setActiveAllocationUser] = useState<string | null>(null)
  const [allocationDialog, setAllocationDialog] = useState<{
    userId: string
    value: number
    inputValue: string
  } | null>(null)
  const [activeStatusRequest, setActiveStatusRequest] = useState<string | null>(null)

  useEffect(() => {
    setAllocations(initialAllocations)
  }, [initialAllocations])

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

  const openAllocationDialog = (userId: string) => {
    const current = allocations[userId] ?? data.rows.find((row) => row.userId === userId)?.totalAllocationDays ?? 0
    setAllocationDialog({ userId, value: current, inputValue: current.toString() })
  }

  const closeAllocationDialog = () => {
    if (allocationDialog && allocationDialog.userId === activeAllocationUser && savingAllocation) {
      return
    }
    setAllocationDialog(null)
  }

  const adjustAllocationValue = (delta: number) => {
    setAllocationDialog((prev) => {
      if (!prev) {
        return prev
      }
      const nextValue = Math.max(prev.value + delta, 0)
      return { ...prev, value: nextValue, inputValue: nextValue.toString() }
    })
  }

  const handleAllocationInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value.replace(/[^0-9]/g, '')
    setAllocationDialog((prev) => {
      if (!prev) {
        return prev
      }
      if (rawValue === '') {
        return { ...prev, inputValue: '' }
      }
      const parsed = Number.parseInt(rawValue, 10)
      return {
        ...prev,
        inputValue: rawValue,
        value: Number.isNaN(parsed) ? prev.value : parsed,
      }
    })
  }

  const handleAllocationSave = async (userId: string, overrideValue?: number) => {
    const nextValue = overrideValue ?? allocations[userId]
    if (!Number.isInteger(nextValue) || nextValue < 0) {
      toast.error(data.toasts.allocationInvalid)
      return
    }

    setActiveAllocationUser(userId)
    try {
      await saveAllocation({ userId, totalAllocationDays: nextValue })
      setAllocations((prev) => ({ ...prev, [userId]: nextValue }))
      setAllocationDialog(null)
    } catch (error) {
      // toast handled in onError
    } finally {
      setActiveAllocationUser(null)
    }
  }

  const handleStatusChange = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setActiveStatusRequest(requestId)
    await changeStatus({ requestId, status })
    setActiveStatusRequest(null)
  }

  return (
    <div className='space-y-6'>
      <Dialog
        open={isAllocationDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeAllocationDialog()
          }
        }}
      >
        <DialogContent
          onInteractOutside={(event) => {
            if (isDialogSaving) {
              event.preventDefault()
            }
          }}
          onEscapeKeyDown={(event) => {
            if (isDialogSaving) {
              event.preventDefault()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{data.allocationModal.title}</DialogTitle>
            <DialogDescription>{data.allocationModal.description}</DialogDescription>
          </DialogHeader>
          <div className='space-y-6'>
            <div>
              <p className='text-sm text-muted-foreground'>{data.allocationModal.current}</p>
              <div className='mt-3 flex items-center justify-center gap-3'>
                <Button
                  type='button'
                  size='icon'
                  variant='outline'
                  disabled={isDialogSaving || (allocationDialog?.value ?? 0) === 0}
                  onClick={() => adjustAllocationValue(-1)}
                >
                  <Minus className='h-4 w-4' />
                  <span className='sr-only'>{data.allocationModal.decrease}</span>
                </Button>
                <div className='min-w-[4rem] text-center text-3xl font-semibold'>{allocationDialog?.value ?? 0}</div>
                <Button
                  type='button'
                  size='icon'
                  variant='outline'
                  disabled={isDialogSaving}
                  onClick={() => adjustAllocationValue(1)}
                >
                  <Plus className='h-4 w-4' />
                  <span className='sr-only'>{data.allocationModal.increase}</span>
                </Button>
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='allocation-input'>{data.allocationModal.inputLabel}</Label>
              <Input
                id='allocation-input'
                inputMode='numeric'
                value={allocationDialog?.inputValue ?? ''}
                onChange={handleAllocationInputChange}
                disabled={isDialogSaving}
              />
            </div>
          </div>
          <DialogFooter className='gap-2'>
            <Button type='button' variant='outline' disabled={isDialogSaving} onClick={closeAllocationDialog}>
              {data.allocationModal.cancel}
            </Button>
            <Button
              type='button'
              disabled={isConfirmDisabled}
              onClick={() => {
                if (allocationDialog) {
                  void handleAllocationSave(allocationDialog.userId, allocationDialog.value)
                }
              }}
            >
              {data.allocationModal.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                const allocationValue = allocations[row.userId] ?? row.totalAllocationDays
                const isSaving = savingAllocation && activeAllocationUser === row.userId
                const hasDeparted = row.daysUntilDeparture != null && row.daysUntilDeparture < 0
                const rawDepartureValue = row.monthsUntilDeparture != null || row.daysUntilDeparture != null
                  ? `${row.monthsUntilDeparture ?? '-'} mo / ${row.daysUntilDeparture ?? '-'} d`
                  : '—'
                const departureDisplay = hasDeparted ? (
                  <Badge variant='outline' className='text-xs font-medium'>
                    {data.tableLabels.departed}
                  </Badge>
                ) : (
                  rawDepartureValue
                )
                const lastLeaveValue = row.lastLeaveDate ? new Date(row.lastLeaveDate).toLocaleDateString() : '—'
                const percentageValue = `${Math.round(row.percentageUsed)}%`

                return (
                  <TableRow
                    key={row.userId}
                    className={hasDeparted ? 'bg-muted/40 text-muted-foreground' : undefined}
                  >
                    <TableCell>
                      <div className='font-medium'>{displayName}</div>
                      <div className='text-xs text-muted-foreground'>{row.email}</div>
                    </TableCell>
                    <TableCell>{data.statusLabels[row.role]}</TableCell>
                    <TableCell>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='font-medium'>{allocationValue}</span>
                        <Button
                          size='icon'
                          variant='ghost'
                          disabled={isSaving}
                          onClick={() => openAllocationDialog(row.userId)}
                        >
                          <Pencil className='h-4 w-4' />
                          <span className='sr-only'>{data.tableLabels.edit}</span>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{row.approvedDays}</TableCell>
                    <TableCell>{row.pendingDays}</TableCell>
                    <TableCell>{row.remainingDays}</TableCell>
                    <TableCell>{row.balanceAfterPending}</TableCell>
                    <TableCell>{percentageValue}</TableCell>
                    <TableCell>{departureDisplay}</TableCell>
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
