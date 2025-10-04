import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import {
  differenceInCalendarDays,
  differenceInMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
} from 'date-fns'

type LeaveRequestStatus = Prisma.LeaveRequestStatus

export type LeaveHistoryEntry = {
  id: string
  startDate: string
  endDate: string
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
  calendar: CalendarDay[]
  todaysAbsences: TodaysAbsence[]
}> {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      status: 'APPROVED',
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          position: true,
        },
      },
    },
  })

  const daysInterval = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const calendar = daysInterval.map((day) => {
    const absentees = approvedLeaves
      .filter((leave) => leave.startDate <= endOfDay(day) && leave.endDate >= startOfDay(day))
      .map((leave) => ({
        userId: leave.userId,
        firstName: leave.user.firstName,
        lastName: leave.user.lastName,
        role: leave.user.role as 'ADMIN' | 'USER',
      }))

    return {
      date: day.toISOString(),
      absentees,
    }
  })

  const now = new Date()
  const todaysAbsences = approvedLeaves
    .filter((leave) => leave.startDate <= endOfDay(now) && leave.endDate >= startOfDay(now))
    .map((leave) => ({
      userId: leave.userId,
      firstName: leave.user.firstName,
      lastName: leave.user.lastName,
      role: leave.user.role as 'ADMIN' | 'USER',
      position: leave.user.position,
    }))

  return { calendar, todaysAbsences }
}

export async function getUserLeaveDashboard(userId: string): Promise<UserLeaveDashboard> {
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
    orderBy: { startDate: 'desc' },
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
    .reduce((total, request) => total + countLeaveDays(request.startDate, request.endDate), 0)

  const pendingDays = requests
    .filter((request) => request.status === 'PENDING')
    .reduce((total, request) => total + countLeaveDays(request.startDate, request.endDate), 0)

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

export async function getAdminLeaveDashboard(): Promise<AdminDashboardSummary> {
  const [users, requests] = await Promise.all([
    prisma.user.findMany({
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
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
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
      .reduce((total, request) => total + countLeaveDays(request.startDate, request.endDate), 0)

    const pendingDays = userRequests
      .filter((request) => request.status === 'PENDING')
      .reduce((total, request) => total + countLeaveDays(request.startDate, request.endDate), 0)

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
    }
  })

  const pendingRequestsCount = requests.filter((request) => request.status === 'PENDING').length
  const pendingDaysTotal = requests
    .filter((request) => request.status === 'PENDING')
    .reduce((total, request) => total + countLeaveDays(request.startDate, request.endDate), 0)

  const pendingRequests = requests
    .filter((request) => request.status === 'PENDING')
    .map<PendingLeaveRequestAdmin>((request) => ({
      id: request.id,
      userId: request.userId,
      firstName: request.user.firstName,
      lastName: request.user.lastName,
      role: request.user.role as 'ADMIN' | 'USER',
      startDate: request.startDate.toISOString(),
      endDate: request.endDate.toISOString(),
      createdAt: request.createdAt.toISOString(),
      reason: request.reason ?? null,
      totalDays: countLeaveDays(request.startDate, request.endDate),
    }))

  return {
    pendingRequestsCount,
    pendingDaysTotal,
    pendingRequests,
    rows,
  }
}

export async function createLeaveRequest(input: {
  userId: string
  startDate: Date
  endDate: Date
  reason?: string | null
  autoApprove?: {
    approverId: string
  }
}): Promise<void> {
  const { start, end } = normaliseRange(input.startDate, input.endDate)

  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      userId: input.userId,
      status: { in: ['PENDING', 'APPROVED'] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  })

  if (overlapping) {
    throw new Error('leaveOverlap')
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
