'use client'

import { useMemo, useState, type ChangeEvent } from 'react'
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
import { updateLeaveAllocationAction } from '../actions'
import type { AdminUserRow } from '@/lib/services/conges'
import { formatUserName } from '@/lib/format-user-name'

type TeamLeaveOverviewSectionProps = {
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
}

type AllocationState = Record<string, number>

const statusVariant: Record<AdminUserRow['status'], 'destructive' | 'secondary' | 'default' | 'outline'> = {
  CRITICAL: 'destructive',
  WARNING_USAGE: 'secondary',
  WARNING_INACTIVE: 'outline',
  GOOD: 'default',
  UNALLOCATED: 'outline',
}

export function TeamLeaveOverviewSection({
  rows,
  tableTitle,
  summarySubtitle,
  tableLabels,
  statusLabels,
  legendLabels,
  allocationModal,
  toasts,
}: TeamLeaveOverviewSectionProps) {
  const initialAllocations = useMemo<AllocationState>(() => {
    return rows.reduce<AllocationState>((acc, row) => {
      acc[row.userId] = row.totalAllocationDays
      return acc
    }, {})
  }, [rows])

  const [allocations, setAllocations] = useState<AllocationState>(initialAllocations)
  const [activeAllocationUser, setActiveAllocationUser] = useState<string | null>(null)
  const [allocationDialog, setAllocationDialog] = useState<{
    userId: string
    value: number
    inputValue: string
  } | null>(null)

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

                return (
                  <TableRow
                    key={row.userId}
                    className={hasDeparted ? 'bg-muted/40 text-muted-foreground' : undefined}
                  >
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
                          onClick={() => openAllocationDialog(row.userId)}
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
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
