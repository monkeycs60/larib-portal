import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { startOfMonth } from 'date-fns'
import { requireAuth } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import {
  getLeaveCalendarData,
  getUserLeaveDashboard,
  getAdminLeaveDashboard,
  fetchFrenchHolidays,
} from '@/lib/services/conges'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RequestLeaveDialog } from './components/request-leave-dialog'
import { RequestHistoryTable } from './components/request-history-table'
import { LeaveCalendar } from './components/leave-calendar'
import { PendingRequestsSection } from './components/pending-requests-section'
import { TeamLeaveOverviewSection } from './components/team-leave-overview-section'
import { DecisionHistorySection, type DecisionEntry } from './components/decision-history-section'
import { CalendarSkeleton } from './components/calendar-skeleton'
import { applicationLink } from '@/lib/application-link'

type PageParams = {
  params: Promise<{ locale: 'en' | 'fr' }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function parseMonth(value: string | null): Date {
  if (!value) {
    return startOfMonth(new Date())
  }

  const parsed = new Date(`${value}-01T00:00:00`)
  if (Number.isNaN(parsed.valueOf())) {
    return startOfMonth(new Date())
  }

  return startOfMonth(parsed)
}

function fullName(firstName: string | null, lastName: string | null, fallback?: string): string {
  const base = [firstName, lastName].filter(Boolean).join(' ').trim()
  if (base) return base
  return fallback ?? '—'
}

const statusBadgeVariant: Record<'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED', 'secondary' | 'default' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
}

export default async function CongesPage({ params, searchParams }: PageParams) {
  const { locale } = await params
  const sp = await searchParams
  const session = await requireAuth()

  const applications = (session.user.applications ?? []) as Array<'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'>
  const canAccess = session.user.role === 'ADMIN' || applications.includes('CONGES')

  if (!canAccess) {
    redirect(applicationLink(locale, '/dashboard'))
  }

  const monthParam = typeof sp?.month === 'string' ? sp.month : null
  const activeMonth = parseMonth(monthParam)

  const frenchHolidays = await fetchFrenchHolidays()

  const [t, userDashboard, calendarData, adminDashboard] = await Promise.all([
    getTranslations({ locale, namespace: 'conges' }),
    getUserLeaveDashboard(session.user.id, frenchHolidays),
    getLeaveCalendarData(activeMonth),
    session.user.role === 'ADMIN' ? getAdminLeaveDashboard(frenchHolidays) : Promise.resolve(null),
  ])

  const requestTrigger = session.user.role === 'ADMIN' ? t('request.triggerAdmin') : t('request.trigger')

  const requestTranslations = {
    trigger: requestTrigger,
    title: t('request.title'),
    description: t('request.description'),
    startLabel: t('request.start'),
    endLabel: t('request.end'),
    reasonLabel: t('request.reason'),
    optionalHint: t('request.optional'),
    submit: t('request.submit'),
    cancel: t('request.cancel'),
    success: t('request.success'),
    overlapError: t('errors.overlap'),
    invalidRange: t('errors.invalidRange'),
    missingRange: t('errors.missingRange'),
    insufficientDays: t('errors.insufficientDays'),
    pastDate: t('errors.pastDate'),
    outsideContract: t('errors.outsideContract'),
    requestedDays: t('request.requestedDays'),
    currentRemaining: t('request.currentRemaining'),
    afterRequest: t('request.afterRequest'),
    excludedDays: t('request.excludedDays'),
    weekendDays: t('request.weekendDays'),
    holidays: t('request.holidays'),
    holiday: t('request.holiday'),
    day: t('request.day'),
    days: t('request.days'),
    holidayLegend: t('request.holidayLegend'),
  }

  const userLeaveContext = {
    remainingDays: userDashboard.summary.balanceAfterPending,
    arrivalDate: userDashboard.summary.arrivalDate,
    departureDate: userDashboard.summary.departureDate,
    locale,
    frenchHolidays,
  }

  const statusLabels = {
    PENDING: t('history.status.pending'),
    APPROVED: t('history.status.approved'),
    REJECTED: t('history.status.rejected'),
    CANCELLED: t('history.status.cancelled'),
  } as const

  const historyTranslations = {
    columns: {
      period: t('history.columns.period'),
      days: t('history.columns.days'),
      status: t('history.columns.status'),
      reason: t('history.columns.reason'),
      decision: t('history.columns.decision'),
      createdAt: t('history.columns.createdAt'),
      actions: t('history.actions'),
    },
    status: statusLabels,
    empty: t('history.empty'),
    edit: t('history.edit'),
    cancel: t('history.cancel'),
    cancelConfirmTitle: t('history.cancelConfirmTitle'),
    cancelConfirmDescription: t('history.cancelConfirmDescription'),
    cancelConfirm: t('history.cancelConfirm'),
    cancelCancel: t('history.cancelCancel'),
    cancelSuccess: t('history.cancelSuccess'),
    cancelError: t('history.cancelError'),
    editTitle: t('history.editTitle'),
    editDescription: t('history.editDescription'),
    editSubmit: t('history.editSubmit'),
    editSuccess: t('history.editSuccess'),
    editError: t('history.editError'),
    startLabel: t('request.start'),
    endLabel: t('request.end'),
    reasonLabel: t('request.reason'),
    optionalHint: t('request.optional'),
    cancelButton: t('request.cancel'),
    overlapError: t('errors.overlap'),
    invalidRange: t('errors.invalidRange'),
    missingRange: t('errors.missingRange'),
    insufficientDays: t('errors.insufficientDays'),
    pastDate: t('errors.pastDate'),
    outsideContract: t('errors.outsideContract'),
    requestedDays: t('request.requestedDays'),
    currentRemaining: t('request.currentRemaining'),
    afterRequest: t('request.afterRequest'),
    excludedDays: t('request.excludedDays'),
    weekendDays: t('request.weekendDays'),
    holidays: t('request.holidays'),
    holiday: t('request.holiday'),
    day: t('request.day'),
    days: t('request.days'),
    holidayLegend: t('request.holidayLegend'),
  }

  const pendingRequestsData = adminDashboard
    ? {
        pendingRequests: adminDashboard.pendingRequests,
        labels: {
          title: t('admin.pending.title', { count: adminDashboard.pendingRequestsCount }),
          empty: t('admin.pending.empty'),
          approve: t('admin.pending.approve'),
          reject: t('admin.pending.reject'),
          created: t('admin.pending.created'),
          period: t('admin.pending.period'),
          reason: t('admin.pending.reason'),
          daySingular: t.raw('admin.pending.daySingular') as string,
          dayPlural: t.raw('admin.pending.dayPlural') as string,
          subtitle: t('admin.pending.subtitle', { days: adminDashboard.pendingDaysTotal }),
        },
        toasts: {
          statusApproved: t('admin.toasts.statusApproved'),
          statusRejected: t('admin.toasts.statusRejected'),
          statusError: t('admin.toasts.statusError'),
        },
      }
    : null

  const teamLeaveOverviewData = adminDashboard
    ? {
        rows: adminDashboard.rows,
        tableTitle: t('admin.tableTitle'),
        summarySubtitle: t('admin.legendSubtitle'),
        tableLabels: {
          user: t('admin.table.user'),
          role: t('admin.table.role'),
          allocation: t('admin.table.allocation'),
          approved: t('admin.table.approved'),
          pending: t('admin.table.pending'),
          remaining: t('admin.table.remaining'),
          balance: t('admin.table.balance'),
          percentage: t('admin.table.percentage'),
          departure: t('admin.table.departure'),
          lastLeave: t('admin.table.lastLeave'),
          status: t('admin.table.status'),
          save: t('admin.table.save'),
          edit: t('admin.table.edit'),
          departed: t('admin.table.departed'),
        },
        statusLabels: {
          ADMIN: t('admin.roles.admin'),
          USER: t('admin.roles.user'),
        } as const,
        legendLabels: {
          CRITICAL: t('admin.legend.critical'),
          WARNING_USAGE: t('admin.legend.warningUsage'),
          WARNING_INACTIVE: t('admin.legend.warningInactive'),
          GOOD: t('admin.legend.good'),
          UNALLOCATED: t('admin.legend.unallocated'),
        },
        allocationModal: {
          title: t('admin.allocationModal.title'),
          description: t('admin.allocationModal.description'),
          current: t('admin.allocationModal.current'),
          decrease: t('admin.allocationModal.decrease'),
          increase: t('admin.allocationModal.increase'),
          inputLabel: t('admin.allocationModal.inputLabel'),
          cancel: t('admin.allocationModal.cancel'),
          confirm: t('admin.allocationModal.confirm'),
        },
        toasts: {
          allocationSaved: t('admin.toasts.allocationSaved'),
          allocationInvalid: t('admin.toasts.allocationInvalid'),
        },
        detailsLabels: {
          period: t('admin.details.period'),
          days: t('admin.details.days'),
          status: t('admin.details.status'),
          decision: t('admin.details.decision'),
          empty: t('admin.details.empty'),
        },
        leaveStatusLabels: statusLabels,
      }
    : null

  const decisionHistoryData = adminDashboard
    ? (() => {
        const decisionEntries: DecisionEntry[] = adminDashboard.rows.flatMap((row) =>
          row.leaveHistory
            .filter((entry) => entry.status !== 'PENDING')
            .map((entry) => ({
              ...entry,
              userName: fullName(row.firstName, row.lastName, row.email),
            }))
        )

        decisionEntries.sort((entryA, entryB) => {
          const dateA = entryA.decisionAt ?? entryA.createdAt
          const dateB = entryB.decisionAt ?? entryB.createdAt
          return new Date(dateB).getTime() - new Date(dateA).getTime()
        })

        return {
          entries: decisionEntries,
          translations: {
            title: t('admin.decisionHistory.title'),
            empty: t('admin.decisionHistory.empty'),
            columns: {
              user: t('admin.decisionHistory.columns.user'),
              period: t('admin.decisionHistory.columns.period'),
              days: t('admin.decisionHistory.columns.days'),
              status: t('admin.decisionHistory.columns.status'),
              reason: t('admin.decisionHistory.columns.reason'),
              decision: t('admin.decisionHistory.columns.decision'),
            },
            filterAll: t('admin.decisionHistory.filterAll'),
            filterApproved: t('admin.decisionHistory.filterApproved'),
            filterRejected: t('admin.decisionHistory.filterRejected'),
            filterCancelled: t('admin.decisionHistory.filterCancelled'),
            statusLabels,
          },
        }
      })()
    : null

  const pendingImpactLabel =
    userDashboard.summary.pendingDays > 0
      ? t('summary.pendingImpact', { count: userDashboard.summary.pendingDays })
      : null

  const summaryCards = [
    {
      label: t('summary.totalAllocation'),
      value: userDashboard.summary.totalAllocationDays,
    },
    {
      label: t('summary.approved'),
      value: userDashboard.summary.approvedDays,
    },
    {
      label: t('summary.pending'),
      value: userDashboard.summary.pendingDays,
    },
    {
      label: t('summary.remaining'),
      value: userDashboard.summary.balanceAfterPending,
      helper: pendingImpactLabel,
    },
  ]

  const contractInfo = userDashboard.summary.contractDurationDays
    ? t('summary.contractDuration', { value: userDashboard.summary.contractDurationDays })
    : t('summary.contractUnavailable')

  const contractDatesInfo =
    userDashboard.summary.arrivalDate && userDashboard.summary.departureDate
      ? t('summary.contractDates', {
          arrival: new Date(userDashboard.summary.arrivalDate).toLocaleDateString(),
          departure: new Date(userDashboard.summary.departureDate).toLocaleDateString(),
        })
      : null

  const roleLabels = {
    ADMIN: t('roles.admin'),
    USER: t('roles.user'),
  } as const

  const summarySection = (
    <section className='px-6'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-5'>
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{card.value}</div>
              {card.helper ? (
                <div className='text-sm font-medium text-rose-500'>{card.helper}</div>
              ) : null}
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>{t('summary.contractLabel')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-sm'>{contractInfo}</div>
            {contractDatesInfo ? (
              <div className='mt-1 text-xs text-muted-foreground'>{contractDatesInfo}</div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  )

  const calendarSection = (
    <section className='px-6 grid gap-6 lg:grid-cols-[2fr_1fr]'>
      <Suspense fallback={<CalendarSkeleton />}>
        <LeaveCalendar
          content={{
            activeMonthIso: activeMonth.toISOString(),
            calendarDays: calendarData.calendarDays,
            availableMonths: calendarData.availableMonths,
            navigation: {
              baseHref: applicationLink(locale, '/conges'),
            },
          }}
        />
      </Suspense>
      <Card>
        <CardHeader>
          <CardTitle>{t('today.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {calendarData.todaysAbsences.length === 0 ? (
            <p className='text-sm text-muted-foreground'>{t('today.none')}</p>
          ) : (
            <ul className='space-y-2'>
              {calendarData.todaysAbsences.map((absence) => (
                <li key={absence.userId} className='flex items-center justify-between rounded-md border p-3'>
                  <div>
                    <div className='font-medium'>{fullName(absence.firstName, absence.lastName)}</div>
                    {absence.position ? (
                      <p className='text-xs text-muted-foreground'>{absence.position}</p>
                    ) : null}
                  </div>
                  <Badge variant='outline'>{roleLabels[absence.role]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  )

  const historySection = (
    <section className='px-6'>
      <Card>
        <CardHeader>
          <CardTitle>{t('history.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestHistoryTable
            history={userDashboard.history}
            translations={historyTranslations}
            statusBadgeVariant={statusBadgeVariant}
            userContext={userLeaveContext}
          />
        </CardContent>
      </Card>
    </section>
  )

  const pendingRequestsSection = pendingRequestsData ? (
    <section className='px-6'>
      <Suspense fallback={<div className='text-sm text-muted-foreground'>{t('admin.loading')}</div>}>
        <PendingRequestsSection
          pendingRequests={pendingRequestsData.pendingRequests}
          labels={pendingRequestsData.labels}
          toasts={pendingRequestsData.toasts}
        />
      </Suspense>
    </section>
  ) : null

  const decisionHistorySection = decisionHistoryData ? (
    <section className='px-6'>
      <DecisionHistorySection
        entries={decisionHistoryData.entries}
        translations={decisionHistoryData.translations}
      />
    </section>
  ) : null

  const teamLeaveOverviewSection = teamLeaveOverviewData ? (
    <section className='px-6'>
      <Suspense fallback={<div className='text-sm text-muted-foreground'>{t('admin.loading')}</div>}>
        <TeamLeaveOverviewSection data={teamLeaveOverviewData} />
      </Suspense>
    </section>
  ) : null

  const isAdmin = session.user.role === 'ADMIN'

  return (
    <div className='space-y-8 py-6'>
      <header className='px-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <h1 className='text-2xl font-semibold'>{t('title')}</h1>
            <p className='text-sm text-muted-foreground'>{t('subtitle')}</p>
          </div>
          {!isAdmin && (
            <RequestLeaveDialog translations={requestTranslations} defaultMonthIso={activeMonth.toISOString()} userContext={userLeaveContext} />
          )}
        </div>
      </header>

      {isAdmin ? (
        <>
          {pendingRequestsSection}
          {decisionHistorySection}
          {calendarSection}
          {teamLeaveOverviewSection}
        </>
      ) : (
        <>
          {summarySection}
          {calendarSection}
          {historySection}
        </>
      )}
    </div>
  )
}
