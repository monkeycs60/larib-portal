'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pencil, Trash2 } from 'lucide-react'
import { cancelLeaveAction } from '../actions'
import type { LeaveHistoryEntry } from '@/lib/services/conges'
import {
  EditLeaveDialog,
  type EditLeaveEntry,
  type EditLeaveDialogTranslations,
  type EditLeaveUserContext,
} from './edit-leave-dialog'

type RequestHistoryTableProps = {
  history: LeaveHistoryEntry[]
  translations: {
    columns: {
      period: string
      days: string
      status: string
      reason: string
      decision: string
      actions: string
    }
    status: {
      PENDING: string
      APPROVED: string
      REJECTED: string
      CANCELLED: string
    }
    dayCount: string
    empty: string
    edit: string
    cancel: string
    cancelConfirmTitle: string
    cancelConfirmDescription: string
    cancelConfirm: string
    cancelCancel: string
    cancelSuccess: string
    cancelError: string
  } & EditLeaveDialogTranslations
  statusBadgeVariant: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'>
  userContext: EditLeaveUserContext
}

export function RequestHistoryTable({
  history,
  translations,
  statusBadgeVariant,
  userContext,
}: RequestHistoryTableProps) {
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [editTargetEntry, setEditTargetEntry] = useState<EditLeaveEntry | null>(null)

  const dateLocale = userContext.locale === 'fr' ? fr : enUS

  const { execute: executeCancel, isExecuting: isCancelling } = useAction(cancelLeaveAction, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? translations.cancelError)
    },
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(translations.cancelSuccess)
        setCancelTargetId(null)
      }
    },
  })

  const handleOpenEditDialog = (entry: LeaveHistoryEntry) => {
    setEditTargetEntry({
      id: entry.id,
      startDate: entry.startDate,
      endDate: entry.endDate,
      reason: entry.reason,
      dayCount: entry.dayCount,
    })
  }

  if (history.length === 0) {
    return <p className='text-sm text-muted-foreground'>{translations.empty}</p>
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{translations.columns.period}</TableHead>
            <TableHead>{translations.columns.days}</TableHead>
            <TableHead>{translations.columns.status}</TableHead>
            <TableHead>{translations.columns.reason}</TableHead>
            <TableHead>{translations.columns.decision}</TableHead>
            <TableHead>{translations.columns.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry) => {
            const dayCountLabel = translations.dayCount.replace('{count}', String(entry.dayCount))
            const isPending = entry.status === 'PENDING'

            return (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className='font-medium'>
                    {format(new Date(entry.startDate), 'PP', { locale: dateLocale })} –{' '}
                    {format(new Date(entry.endDate), 'PP', { locale: dateLocale })}
                  </div>
                </TableCell>
                <TableCell>{dayCountLabel}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant[entry.status]}>
                    {translations.status[entry.status]}
                  </Badge>
                </TableCell>
                <TableCell>{entry.reason ?? '—'}</TableCell>
                <TableCell>
                  {entry.decisionAt ? (
                    <div className='flex flex-col text-sm'>
                      <span>
                        {format(new Date(entry.decisionAt), 'PP', { locale: dateLocale })}
                      </span>
                      {entry.approverName ? (
                        <span className='text-xs text-muted-foreground'>
                          {entry.approverName}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className='text-sm text-muted-foreground'>—</span>
                  )}
                </TableCell>
                <TableCell>
                  {isPending ? (
                    <TooltipProvider>
                      <div className='flex gap-1'>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8'
                              onClick={() => handleOpenEditDialog(entry)}
                            >
                              <Pencil className='h-4 w-4' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{translations.edit}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 text-destructive hover:text-destructive'
                              onClick={() => setCancelTargetId(entry.id)}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{translations.cancel}</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  ) : null}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={cancelTargetId !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setCancelTargetId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translations.cancelConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{translations.cancelConfirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              {translations.cancelCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isCancelling}
              onClick={() => {
                if (cancelTargetId) {
                  executeCancel({ requestId: cancelTargetId })
                }
              }}
            >
              {translations.cancelConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditLeaveDialog
        entry={editTargetEntry}
        open={editTargetEntry !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditTargetEntry(null)
        }}
        translations={translations}
        userContext={userContext}
      />
    </>
  )
}
