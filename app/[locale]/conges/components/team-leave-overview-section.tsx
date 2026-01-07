'use client'

import { Fragment, useMemo, useState, type ChangeEvent } from 'react'
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
import { ChevronDown, ChevronRight, Minus, Pencil, Plus } from 'lucide-react'
import { updateLeaveAllocationAction } from '../actions'
import type { AdminUserRow, LeaveHistoryEntry } from '@/lib/services/conges'
import { formatUserName } from '@/lib/format-user-name'
import type { LeaveRequestStatus } from '@/app/generated/prisma'

export type TeamLeaveOverviewSectionData = {
  rows: AdminUserRow[]
  tableTitle: string
  summarySubtitle: string
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
  }
  detailsLabels: {
    period: string
    days: string
    status: string
    decision: string
    empty: string
  }
  leaveStatusLabels: Record<LeaveRequestStatus, string>
  computeDayCount: (entry: LeaveHistoryEntry) => number
}

type TeamLeaveOverviewSectionProps = {
  data: TeamLeaveOverviewSectionData
}

type AllocationState = Record<string, number>

const statusVariant: Record<AdminUserRow['status'], 'destructive' | 'secondary' | 'default' | 'outline'> = {
  CRITICAL: 'destructive',
  WARNING_USAGE: 'secondary',
  WARNING_INACTIVE: 'outline',
  GOOD: 'default',
  UNALLOCATED: 'outline',
}

const leaveStatusBadgeVariant: Record<LeaveRequestStatus, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
}

export function TeamLeaveOverviewSection({ data }: TeamLeaveOverviewSectionProps) {
  const { rows, tableTitle, summarySubtitle, tableLabels, statusLabels, legendLabels, allocationModal, toasts, detailsLabels, leaveStatusLabels, computeDayCount } = data

  const initialAllocations = useMemo<AllocationState>(() => {
    return rows.reduce<AllocationState>((acc, row) => {
      acc[row.userId] = row.totalAllocationDays
      return acc
    }, {})
  }, [rows])

  const [allocations, setAllocations] = useState<AllocationState>(initialAllocations)
  const [activeAllocationUser, setActiveAllocationUser] = useState<string | null>(null)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [allocationDialog, setAllocationDialog] = useState<{
    userId: string
    value: number
    inputValue: string
  } | null>(null)

  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const { execute: saveAllocation, isExecuting: savingAllocation } = useAction(updateLeaveAllocationAction, {
    onSuccess: () => {
      toast.success(toasts.allocationSaved)
    },
    onError: () => {
      toast.error(toasts.allocationInvalid)
    },
  })

  const openAllocationDialog = (userId: string) => {
    const current = allocations[userId] ?? rows.find((row) => row.userId === userId)?.totalAllocationDays ?? 0
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
      toast.error(toasts.allocationInvalid)
      return
    }

    setActiveAllocationUser(userId)
    try {
      await saveAllocation({ userId, totalAllocationDays: nextValue })
      setAllocations((prev) => ({ ...prev, [userId]: nextValue }))
      setAllocationDialog(null)
    } finally {
      setActiveAllocationUser(null)
    }
  }

  const isAllocationDialogOpen = allocationDialog !== null
  const isDialogSaving = allocationDialog !== null && activeAllocationUser === allocationDialog.userId && savingAllocation
  const isConfirmDisabled = isDialogSaving || allocationDialog === null || allocationDialog.inputValue === ''

  return (
    <>
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
            <DialogTitle>{allocationModal.title}</DialogTitle>
            <DialogDescription>{allocationModal.description}</DialogDescription>
          </DialogHeader>
          <div className='space-y-6'>
            <div>
              <p className='text-sm text-muted-foreground'>{allocationModal.current}</p>
              <div className='mt-3 flex items-center justify-center gap-3'>
                <Button
                  type='button'
                  size='icon'
                  variant='outline'
                  disabled={isDialogSaving || (allocationDialog?.value ?? 0) === 0}
                  onClick={() => adjustAllocationValue(-1)}
                >
                  <Minus className='h-4 w-4' />
                  <span className='sr-only'>{allocationModal.decrease}</span>
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
                  <span className='sr-only'>{allocationModal.increase}</span>
                </Button>
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='allocation-input'>{allocationModal.inputLabel}</Label>
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
              {allocationModal.cancel}
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
              {allocationModal.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className='space-y-3'>
          <div>
            <CardTitle>{tableTitle}</CardTitle>
            <CardDescription className='text-xs'>{summarySubtitle}</CardDescription>
          </div>
          <div className='flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
            {(Object.entries(legendLabels) as Array<[keyof typeof legendLabels, string]>).map(([key, label]) => (
              <Badge key={key} variant={statusVariant[key] ?? 'secondary'} className='px-2 py-0 text-[10px]'>
                {label}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-8' />
                <TableHead>{tableLabels.user}</TableHead>
                <TableHead>{tableLabels.role}</TableHead>
                <TableHead>{tableLabels.allocation}</TableHead>
                <TableHead>{tableLabels.approved}</TableHead>
                <TableHead>{tableLabels.pending}</TableHead>
                <TableHead>{tableLabels.remaining}</TableHead>
                <TableHead>{tableLabels.balance}</TableHead>
                <TableHead>{tableLabels.percentage}</TableHead>
                <TableHead>{tableLabels.departure}</TableHead>
                <TableHead>{tableLabels.lastLeave}</TableHead>
                <TableHead>{tableLabels.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const displayName = formatUserName({ firstName: row.firstName, lastName: row.lastName, email: row.email })
                const allocationValue = allocations[row.userId] ?? row.totalAllocationDays
                const isSaving = savingAllocation && activeAllocationUser === row.userId
                const hasDeparted = row.daysUntilDeparture != null && row.daysUntilDeparture < 0
                const rawDepartureValue = row.monthsUntilDeparture != null || row.daysUntilDeparture != null
                  ? `${row.monthsUntilDeparture ?? '-'} mo / ${row.daysUntilDeparture ?? '-'} d`
                  : '—'
                const departureDisplay = hasDeparted ? (
                  <Badge variant='outline' className='text-xs font-medium'>
                    {tableLabels.departed}
                  </Badge>
                ) : (
                  rawDepartureValue
                )
                const lastLeaveValue = row.lastLeaveDate ? new Date(row.lastLeaveDate).toLocaleDateString() : '—'
                const percentageValue = `${Math.round(row.percentageUsed)}%`
                const isExpanded = expandedUsers.has(row.userId)

                return (
                  <Fragment key={row.userId}>
                    <TableRow
                      className={`cursor-pointer ${hasDeparted ? 'bg-muted/40 text-muted-foreground' : ''}`}
                      onClick={() => toggleUserExpansion(row.userId)}
                    >
                      <TableCell className='w-8'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-6 w-6'
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleUserExpansion(row.userId)
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className='h-4 w-4' />
                          ) : (
                            <ChevronRight className='h-4 w-4' />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className='font-medium'>{displayName}</div>
                        <div className='text-xs text-muted-foreground'>{row.email}</div>
                      </TableCell>
                      <TableCell>{statusLabels[row.role]}</TableCell>
                      <TableCell>
                        <div className='flex items-center justify-between gap-2'>
                          <span className='font-medium'>{allocationValue}</span>
                          <Button
                            size='icon'
                            variant='ghost'
                            disabled={isSaving}
                            onClick={(event) => {
                              event.stopPropagation()
                              openAllocationDialog(row.userId)
                            }}
                          >
                            <Pencil className='h-4 w-4' />
                            <span className='sr-only'>{tableLabels.edit}</span>
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
                        <Badge variant={statusVariant[row.status]}>{legendLabels[row.status]}</Badge>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className='bg-muted/30 hover:bg-muted/30'>
                        <TableCell colSpan={12} className='p-4'>
                          {row.leaveHistory.length === 0 ? (
                            <p className='text-sm text-muted-foreground'>{detailsLabels.empty}</p>
                          ) : (
                            <div className='rounded-md border'>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{detailsLabels.period}</TableHead>
                                    <TableHead>{detailsLabels.days}</TableHead>
                                    <TableHead>{detailsLabels.status}</TableHead>
                                    <TableHead>{detailsLabels.decision}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {row.leaveHistory.map((entry) => {
                                    const dayCount = computeDayCount(entry)
                                    return (
                                      <TableRow key={entry.id}>
                                        <TableCell>
                                          <span className='font-medium'>
                                            {new Date(entry.startDate).toLocaleDateString()} – {new Date(entry.endDate).toLocaleDateString()}
                                          </span>
                                        </TableCell>
                                        <TableCell>{dayCount}</TableCell>
                                        <TableCell>
                                          <Badge variant={leaveStatusBadgeVariant[entry.status]}>
                                            {leaveStatusLabels[entry.status]}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          {entry.decisionAt ? (
                                            <div className='flex flex-col text-sm'>
                                              <span>{new Date(entry.decisionAt).toLocaleDateString()}</span>
                                              {entry.approverName && (
                                                <span className='text-xs text-muted-foreground'>{entry.approverName}</span>
                                              )}
                                            </div>
                                          ) : (
                                            <span className='text-sm text-muted-foreground'>—</span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
