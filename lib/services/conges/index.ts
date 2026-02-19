import { prisma } from '@/lib/prisma'
import { LeaveRequestStatus } from '@/app/generated/prisma'
import {
  addMonths,
  differenceInCalendarDays,
  differenceInMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { countWorkingDays } from './french-holidays'
export {
  fetchFrenchHolidays,
  countWorkingDays,
  getExcludedDaysInfo,
  getHolidayDatesForCalendar,
  getHolidayName,
} from './french-holidays'

export type LeaveHistoryEntry = {
  id: string
  startDate: string
  endDate: string
  dayCount: number
  status: LeaveRequestStatus
  reason: string | null
  decisionAt: string | null
  approverName: string | null
  createdAt: string
}

export type LeaveSummary = {
  totalAllocationDays: number
  approvedDays: number
  pendingDays: number
  remainingDays: number
  balanceAfterPending: number
  contractDurationDays: number | null
  arrivalDate: string | null
  departureDate: string | null
}

export type CalendarAbsentee = {
  userId: string
  firstName: string | null
  lastName: string | null
  email: string
  role: 'ADMIN' | 'USER'
}

export type CalendarDay = {
  date: string
  absentees: CalendarAbsentee[]
}

export type TodaysAbsence = {
  userId: string
  firstName: string | null
  lastName: string | null
  role: 'ADMIN' | 'USER'
  position: string | null
}

export type UserLeaveDashboard = {
  summary: LeaveSummary
  history: LeaveHistoryEntry[]
}

export type AdminLegendStatus =
  | 'CRITICAL'
  | 'WARNING_USAGE'
  | 'WARNING_INACTIVE'
  | 'GOOD'
  | 'UNALLOCATED'

export type AdminUserRow = {
  userId: string
  firstName: string | null
  lastName: string | null
  email: string
  role: 'ADMIN' | 'USER'
  position: string | null
  totalAllocationDays: number
  approvedDays: number
  pendingDays: number
  remainingDays: number
  balanceAfterPending: number
  percentageUsed: number
  monthsUntilDeparture: number | null
  daysUntilDeparture: number | null
  lastLeaveDate: string | null
  status: AdminLegendStatus
  leaveHistory: LeaveHistoryEntry[]
}

export type AdminDashboardSummary = {
  pendingRequestsCount: number
  pendingDaysTotal: number
  pendingRequests: PendingLeaveRequestAdmin[]
  rows: AdminUserRow[]
}

export type PendingLeaveRequestAdmin = {
  id: string
  userId: string
  firstName: string | null
  lastName: string | null
  email: string
  role: 'ADMIN' | 'USER'
  startDate: string
  endDate: string
  createdAt: string
  reason: string | null
  totalDays: number
}

export function normaliseRange(start: Date, end: Date): { start: Date; end: Date } {
  const startDay = startOfDay(start)
  const endDay = endOfDay(end)
  if (endDay < startDay) {
    return { start: startDay, end: startDay }
  }
  return { start: startDay, end: endDay }
}

export function countLeaveDays(start: Date, end: Date): number {
  const startDay = startOfDay(start)
  const endDay = startOfDay(end)
  return differenceInCalendarDays(endDay, startDay) + 1
}

function resolveLocaleDateValue(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

export async function getLeaveCalendarData(month: Date): Promise<{
  calendarDays: CalendarDay[]
  availableMonths: string[]
  todaysAbsences: TodaysAbsence[]
}> {
  const today = new Date()
  const preloadStart = startOfMonth(subMonths(today, 12))
  const preloadEnd = endOfMonth(addMonths(today, 12))
  const targetStart = startOfMonth(month)
  const targetEnd = endOfMonth(month)

  const coverageStart = targetStart < preloadStart ? targetStart : preloadStart
  const coverageEnd = targetEnd > preloadEnd ? targetEnd : preloadEnd

  const rangeStart = startOfMonth(subMonths(coverageStart, 1))
  const rangeEnd = endOfMonth(addMonths(coverageEnd, 1))

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      status: 'APPROVED',
      startDate: { lte: rangeEnd },
      endDate: { gte: rangeStart },
      user: {
        role: 'USER',
        applications: {
          has: 'CONGES',
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          position: true,
        },
      },
    },
  })

  const daysInterval = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
  const availableMonthSet = new Set<string>()

  const calendarDays = daysInterval.map((day) => {
    const absentees = approvedLeaves
      .filter((leave) => leave.startDate <= endOfDay(day) && leave.endDate >= startOfDay(day))
      .map((leave) => ({
        userId: leave.userId,
        firstName: leave.user.firstName,
        lastName: leave.user.lastName,
        email: leave.user.email,
        role: leave.user.role as 'ADMIN' | 'USER',
      }))

    if (day >= preloadStart && day <= preloadEnd) {
      availableMonthSet.add(format(day, 'yyyy-MM'))
    }

    return {
      date: day.toISOString(),
      absentees,
    }
  })

  const todaysAbsences = approvedLeaves
    .filter((leave) => leave.startDate <= endOfDay(today) && leave.endDate >= startOfDay(today))
    .map((leave) => ({
      userId: leave.userId,
      firstName: leave.user.firstName,
      lastName: leave.user.lastName,
      role: leave.user.role as 'ADMIN' | 'USER',
      position: leave.user.position,
    }))

  const availableMonths = Array.from(availableMonthSet).sort()

  return { calendarDays, availableMonths, todaysAbsences }
}

export async function getUserLeaveDashboard(
  userId: string,
  frenchHolidays: Record<string, string>
): Promise<UserLeaveDashboard> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      arrivalDate: true,
      departureDate: true,
      congesTotalDays: true,
    },
  })

  const requests = await prisma.leaveRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      approver: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  const approvedDays = requests
    .filter((request) => request.status === 'APPROVED')
    .reduce((total, request) => total + countWorkingDays(request.startDate, request.endDate, frenchHolidays), 0)

  const pendingDays = requests
    .filter((request) => request.status === 'PENDING')
    .reduce((total, request) => total + countWorkingDays(request.startDate, request.endDate, frenchHolidays), 0)

  const totalAllocationDays = user.congesTotalDays ?? 0
  const remainingDays = Math.max(totalAllocationDays - approvedDays, 0)
  const balanceAfterPending = Math.max(remainingDays - pendingDays, 0)

  let contractDurationDays: number | null = null
  if (user.arrivalDate && user.departureDate) {
    const safeArrival = startOfDay(user.arrivalDate)
    const safeDeparture = startOfDay(user.departureDate)
    if (safeDeparture >= safeArrival) {
      contractDurationDays = countLeaveDays(safeArrival, safeDeparture)
    }
  }

  const summary: LeaveSummary = {
    totalAllocationDays,
    approvedDays,
    pendingDays,
    remainingDays,
    balanceAfterPending,
    contractDurationDays,
    arrivalDate: resolveLocaleDateValue(user.arrivalDate ?? null),
    departureDate: resolveLocaleDateValue(user.departureDate ?? null),
  }

  const history = requests.map<LeaveHistoryEntry>((request) => ({
    id: request.id,
    startDate: request.startDate.toISOString(),
    endDate: request.endDate.toISOString(),
    dayCount: countWorkingDays(request.startDate, request.endDate, frenchHolidays),
    status: request.status,
    reason: request.reason ?? null,
    decisionAt: resolveLocaleDateValue(request.decisionAt ?? null),
    approverName: request.approver
      ? [request.approver.firstName, request.approver.lastName].filter(Boolean).join(' ').trim() || null
      : null,
    createdAt: request.createdAt.toISOString(),
  }))

  return {
    summary,
    history,
  }
}

function resolveLegendStatus({
  totalAllocationDays,
  remainingDays,
  percentageUsed,
  lastLeaveDate,
}: {
  totalAllocationDays: number
  remainingDays: number
  percentageUsed: number
  lastLeaveDate: Date | null
}): AdminLegendStatus {
  if (!totalAllocationDays) {
    return 'UNALLOCATED'
  }

  if (remainingDays < 5 || percentageUsed > 80) {
    return 'CRITICAL'
  }

  if (percentageUsed >= 60) {
    return 'WARNING_USAGE'
  }

  const inactivityThreshold = new Date()
  inactivityThreshold.setMonth(inactivityThreshold.getMonth() - 2)

  if (!lastLeaveDate || lastLeaveDate < inactivityThreshold) {
    return 'WARNING_INACTIVE'
  }

  return 'GOOD'
}

export async function getAdminLeaveDashboard(
  frenchHolidays: Record<string, string>
): Promise<AdminDashboardSummary> {
  const [users, requests] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: 'USER',
        applications: {
          has: 'CONGES',
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        position: true,
        congesTotalDays: true,
        arrivalDate: true,
        departureDate: true,
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        user: {
          role: 'USER',
          applications: {
            has: 'CONGES',
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        approver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  ])

  const requestsByUser = new Map<string, Array<(typeof requests)[number]>>()
  requests.forEach((request) => {
    const userRequests = requestsByUser.get(request.userId) ?? []
    userRequests.push(request)
    requestsByUser.set(request.userId, userRequests)
  })

  const now = new Date()
  const rows = users.map<AdminUserRow>((user) => {
    const userRequests = requestsByUser.get(user.id) ?? []

    const approvedDays = userRequests
      .filter((request) => request.status === 'APPROVED')
      .reduce((total, request) => total + countWorkingDays(request.startDate, request.endDate, frenchHolidays), 0)

    const pendingDays = userRequests
      .filter((request) => request.status === 'PENDING')
      .reduce((total, request) => total + countWorkingDays(request.startDate, request.endDate, frenchHolidays), 0)

    const remainingDays = Math.max((user.congesTotalDays ?? 0) - approvedDays, 0)
    const balanceAfterPending = Math.max(remainingDays - pendingDays, 0)
    const percentageUsed = user.congesTotalDays ? Math.min((approvedDays / user.congesTotalDays) * 100, 100) : 0

    const lastApprovedLeave = userRequests
      .filter((request) => request.status === 'APPROVED')
      .map((request) => request.endDate)
      .sort((a, b) => b.getTime() - a.getTime())[0]
      ?? null

    const monthsUntilDeparture = user.departureDate
      ? differenceInMonths(startOfDay(user.departureDate), now)
      : null
    const daysUntilDeparture = user.departureDate
      ? differenceInCalendarDays(startOfDay(user.departureDate), now)
      : null

    const status = resolveLegendStatus({
      totalAllocationDays: user.congesTotalDays ?? 0,
      remainingDays,
      percentageUsed,
      lastLeaveDate: lastApprovedLeave,
    })

    const leaveHistory = userRequests
      .sort((requestA, requestB) => requestB.startDate.getTime() - requestA.startDate.getTime())
      .map<LeaveHistoryEntry>((request) => ({
        id: request.id,
        startDate: request.startDate.toISOString(),
        endDate: request.endDate.toISOString(),
        dayCount: countWorkingDays(request.startDate, request.endDate, frenchHolidays),
        status: request.status,
        reason: request.reason ?? null,
        decisionAt: resolveLocaleDateValue(request.decisionAt ?? null),
        approverName: request.approver
          ? [request.approver.firstName, request.approver.lastName].filter(Boolean).join(' ').trim() || null
          : null,
        createdAt: request.createdAt.toISOString(),
      }))

    return {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role as 'ADMIN' | 'USER',
      position: user.position,
      totalAllocationDays: user.congesTotalDays ?? 0,
      approvedDays,
      pendingDays,
      remainingDays,
      balanceAfterPending,
      percentageUsed,
      monthsUntilDeparture,
      daysUntilDeparture,
      lastLeaveDate: resolveLocaleDateValue(lastApprovedLeave),
      status,
      leaveHistory,
    }
  })

  const pendingRequestsCount = requests.filter((request) => request.status === 'PENDING').length
  const pendingDaysTotal = requests
    .filter((request) => request.status === 'PENDING')
    .reduce((total, request) => total + countWorkingDays(request.startDate, request.endDate, frenchHolidays), 0)

  const pendingRequests = requests
    .filter((request) => request.status === 'PENDING')
    .map<PendingLeaveRequestAdmin>((request) => ({
      id: request.id,
      userId: request.userId,
      firstName: request.user.firstName,
      lastName: request.user.lastName,
      email: request.user.email,
      role: request.user.role as 'ADMIN' | 'USER',
      startDate: request.startDate.toISOString(),
      endDate: request.endDate.toISOString(),
      createdAt: request.createdAt.toISOString(),
      reason: request.reason ?? null,
      totalDays: countWorkingDays(request.startDate, request.endDate, frenchHolidays),
    }))

  return {
    pendingRequestsCount,
    pendingDaysTotal,
    pendingRequests,
    rows,
  }
}

export async function getAdminEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true },
  })
  return admins.map((admin) => admin.email)
}

export async function createLeaveRequest(
  input: {
    userId: string
    startDate: Date
    endDate: Date
    reason?: string | null
    autoApprove?: {
      approverId: string
    }
  },
  frenchHolidays: Record<string, string>
): Promise<void> {
  const { start, end } = normaliseRange(input.startDate, input.endDate)

  const today = startOfDay(new Date())
  if (start < today) {
    throw new Error('pastDate')
  }

  const existingRequests = await prisma.leaveRequest.findMany({
    where: {
      userId: input.userId,
      status: { in: ['PENDING', 'APPROVED'] },
    },
    select: {
      startDate: true,
      endDate: true,
      status: true,
    },
  })

  const overlapping = existingRequests.some((request) => {
    const requestStart = startOfDay(request.startDate)
    const requestEnd = endOfDay(request.endDate)
    return requestStart <= end && requestEnd >= start
  })

  if (overlapping) {
    throw new Error('leaveOverlap')
  }

  const requestedDays = countWorkingDays(start, end, frenchHolidays)

  const approvedDays = existingRequests
    .filter((request) => request.status === 'APPROVED')
    .reduce((total, request) => total + countWorkingDays(request.startDate, request.endDate, frenchHolidays), 0)

  const pendingDays = existingRequests
    .filter((request) => request.status === 'PENDING')
    .reduce((total, request) => total + countWorkingDays(request.startDate, request.endDate, frenchHolidays), 0)

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { congesTotalDays: true },
  })

  const totalAllocationDays = user.congesTotalDays ?? 0
  const availableAfterPending = Math.max(totalAllocationDays - approvedDays - pendingDays, 0)

  if (requestedDays > availableAfterPending) {
    throw new Error('insufficientDays')
  }

  const shouldAutoApprove = Boolean(input.autoApprove)

  await prisma.leaveRequest.create({
    data: {
      userId: input.userId,
      startDate: start,
      endDate: end,
      reason: input.reason?.trim() || null,
      ...(shouldAutoApprove
        ? {
            status: 'APPROVED',
            approverId: input.autoApprove?.approverId,
            decisionAt: new Date(),
          }
        : {}),
    },
  })
}

export async function updateLeaveAllocation(data: {
  userId: string
  totalAllocationDays: number
}): Promise<void> {
  await prisma.user.update({
    where: { id: data.userId },
    data: { congesTotalDays: data.totalAllocationDays },
  })
}

export async function updateLeaveStatus(data: {
  requestId: string
  approverId: string
  status: Extract<LeaveRequestStatus, 'APPROVED' | 'REJECTED' | 'CANCELLED'>
}): Promise<void> {
  const nextStatus = data.status

  await prisma.leaveRequest.update({
    where: { id: data.requestId },
    data: {
      status: nextStatus,
      approverId: data.approverId,
      decisionAt: new Date(),
    },
  })
}

export async function cancelLeaveRequest(
  requestId: string,
  userId: string
): Promise<void> {
  const request = await prisma.leaveRequest.findUniqueOrThrow({
    where: { id: requestId },
    select: { userId: true, status: true },
  })

  if (request.userId !== userId) {
    throw new Error('forbidden')
  }

  if (request.status !== 'PENDING') {
    throw new Error('notPending')
  }

  await prisma.leaveRequest.update({
    where: { id: requestId },
    data: { status: 'CANCELLED' },
  })
}

export async function updateLeaveRequest(
  input: {
    requestId: string
    userId: string
    startDate: Date
    endDate: Date
    reason?: string | null
  },
  frenchHolidays: Record<string, string>
): Promise<void> {
  const request = await prisma.leaveRequest.findUniqueOrThrow({
    where: { id: input.requestId },
    select: { userId: true, status: true },
  })

  if (request.userId !== input.userId) {
    throw new Error('forbidden')
  }

  if (request.status !== 'PENDING') {
    throw new Error('notPending')
  }

  const { start, end } = normaliseRange(input.startDate, input.endDate)

  const today = startOfDay(new Date())
  if (start < today) {
    throw new Error('pastDate')
  }

  const existingRequests = await prisma.leaveRequest.findMany({
    where: {
      userId: input.userId,
      status: { in: ['PENDING', 'APPROVED'] },
      id: { not: input.requestId },
    },
    select: {
      startDate: true,
      endDate: true,
      status: true,
    },
  })

  const overlapping = existingRequests.some((existing) => {
    const existingStart = startOfDay(existing.startDate)
    const existingEnd = endOfDay(existing.endDate)
    return existingStart <= end && existingEnd >= start
  })

  if (overlapping) {
    throw new Error('leaveOverlap')
  }

  const requestedDays = countWorkingDays(start, end, frenchHolidays)

  const approvedDays = existingRequests
    .filter((existing) => existing.status === 'APPROVED')
    .reduce((total, existing) => total + countWorkingDays(existing.startDate, existing.endDate, frenchHolidays), 0)

  const pendingDays = existingRequests
    .filter((existing) => existing.status === 'PENDING')
    .reduce((total, existing) => total + countWorkingDays(existing.startDate, existing.endDate, frenchHolidays), 0)

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { congesTotalDays: true },
  })

  const totalAllocationDays = user.congesTotalDays ?? 0
  const availableAfterPending = Math.max(totalAllocationDays - approvedDays - pendingDays, 0)

  if (requestedDays > availableAfterPending) {
    throw new Error('insufficientDays')
  }

  await prisma.leaveRequest.update({
    where: { id: input.requestId },
    data: {
      startDate: start,
      endDate: end,
      reason: input.reason?.trim() || null,
    },
  })
}
