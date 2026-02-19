'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { LeaveRequestStatus } from '@/app/generated/prisma'

export type DecisionEntry = {
  id: string
  userName: string
  startDate: string
  endDate: string
  dayCount: number
  status: LeaveRequestStatus
  reason: string | null
  decisionAt: string | null
  approverName: string | null
  createdAt: string
}

type DecisionHistoryTranslations = {
  title: string
  empty: string
  columns: {
    user: string
    period: string
    days: string
    status: string
    reason: string
    decision: string
  }
  filterAll: string
  filterApproved: string
  filterRejected: string
  filterCancelled: string
  statusLabels: Record<LeaveRequestStatus, string>
}

type DecisionHistoryProps = {
  entries: DecisionEntry[]
  translations: DecisionHistoryTranslations
}

const statusBadgeVariant: Record<LeaveRequestStatus, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
}

type StatusFilter = 'ALL' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export function DecisionHistorySection({ entries, translations }: DecisionHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  const filteredEntries = useMemo(() => {
    if (statusFilter === 'ALL') return entries
    return entries.filter((entry) => entry.status === statusFilter)
  }, [entries, statusFilter])

  const filterButtons: Array<{ key: StatusFilter; label: string }> = [
    { key: 'ALL', label: translations.filterAll },
    { key: 'APPROVED', label: translations.filterApproved },
    { key: 'REJECTED', label: translations.filterRejected },
    { key: 'CANCELLED', label: translations.filterCancelled },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations.title}</CardTitle>
        <div className='flex flex-wrap gap-2 pt-2'>
          {filterButtons.map((filterButton) => (
            <Button
              key={filterButton.key}
              variant={statusFilter === filterButton.key ? 'default' : 'outline'}
              size='sm'
              onClick={() => setStatusFilter(filterButton.key)}
            >
              {filterButton.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {filteredEntries.length === 0 ? (
          <p className='text-sm text-muted-foreground'>{translations.empty}</p>
        ) : (
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translations.columns.user}</TableHead>
                  <TableHead>{translations.columns.period}</TableHead>
                  <TableHead>{translations.columns.days}</TableHead>
                  <TableHead>{translations.columns.status}</TableHead>
                  <TableHead>{translations.columns.reason}</TableHead>
                  <TableHead>{translations.columns.decision}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className='font-medium'>{entry.userName}</TableCell>
                    <TableCell>
                      {new Date(entry.startDate).toLocaleDateString()} – {new Date(entry.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{entry.dayCount}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant[entry.status]}>
                        {translations.statusLabels[entry.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.reason ?? '—'}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
