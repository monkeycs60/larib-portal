import { addDays, endOfDay, endOfMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { countWorkingDays } from './french-holidays'
import { prisma } from '@/lib/prisma'
import { LeaveRequestStatus } from '@/app/generated/prisma'
import { fetchFrenchHolidays } from './french-holidays'

export type DateRange = { start: Date; end: Date }
export type RecapPeriod = 'weekly' | 'monthly'
export type RecapStatus = 'APPROVED' | 'PENDING'

export type RecapLeaveInput = {
  userId: string
  firstName: string | null
  lastName: string | null
  email: string
  position: string | null
  startDate: Date
  endDate: Date
  status: RecapStatus
  remainingDays: number
}

export type RecapRow = {
  userId: string
  name: string
  position: string | null
  startDate: Date
  endDate: Date
  status: RecapStatus
  daysInRange: number
  remainingDays: number
}

export type RecapRecipient = { email: string; language: 'EN' | 'FR' }

export function getWeekRange(today: Date): DateRange {
  const monday = startOfWeek(today, { weekStartsOn: 1 })
  const friday = addDays(monday, 4)
  return { start: startOfDay(monday), end: endOfDay(friday) }
}

export function getMonthRange(today: Date): DateRange {
  return { start: startOfMonth(today), end: endOfMonth(today) }
}

export function buildRecapRows(
  leaves: RecapLeaveInput[],
  range: DateRange,
  frenchHolidays: Record<string, string>,
): RecapRow[] {
  return leaves
    .map((leave) => {
      const clippedStart = leave.startDate > range.start ? leave.startDate : range.start
      const clippedEnd = leave.endDate < range.end ? leave.endDate : range.end
      const fullName = [leave.firstName, leave.lastName].filter(Boolean).join(' ').trim()
      return {
        userId: leave.userId,
        name: fullName || leave.email,
        position: leave.position,
        startDate: clippedStart,
        endDate: clippedEnd,
        status: leave.status,
        daysInRange: countWorkingDays(clippedStart, clippedEnd, frenchHolidays),
        remainingDays: leave.remainingDays,
      }
    })
    .sort((first, second) => {
      const byStart = first.startDate.getTime() - second.startDate.getTime()
      return byStart !== 0 ? byStart : first.name.localeCompare(second.name)
    })
}

export function resolvePeriod(rawPeriod: string | null): RecapPeriod {
  return rawPeriod === 'monthly' ? 'monthly' : 'weekly'
}

export function isAuthorizedCron(authorizationHeader: string | null, cronSecret: string | undefined): boolean {
  if (!cronSecret) return false
  return authorizationHeader === `Bearer ${cronSecret}`
}

export function groupEmailsByLanguage(recipients: RecapRecipient[]): Map<'EN' | 'FR', string[]> {
  const grouped = new Map<'EN' | 'FR', string[]>()
  for (const recipient of recipients) {
    const existing = grouped.get(recipient.language) ?? []
    existing.push(recipient.email)
    grouped.set(recipient.language, existing)
  }
  return grouped
}

async function computeRemainingDaysByUser(
  users: { userId: string; congesTotalDays: number }[],
  frenchHolidays: Record<string, string>,
): Promise<Map<string, number>> {
  const totalByUser = new Map<string, number>()
  for (const user of users) {
    totalByUser.set(user.userId, user.congesTotalDays)
  }
  const userIds = [...totalByUser.keys()]
  if (userIds.length === 0) return new Map()

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: { userId: { in: userIds }, status: LeaveRequestStatus.APPROVED },
    select: { userId: true, startDate: true, endDate: true },
  })

  const approvedDaysByUser = new Map<string, number>()
  for (const leave of approvedLeaves) {
    const previous = approvedDaysByUser.get(leave.userId) ?? 0
    approvedDaysByUser.set(leave.userId, previous + countWorkingDays(leave.startDate, leave.endDate, frenchHolidays))
  }

  const remainingByUser = new Map<string, number>()
  for (const [userId, total] of totalByUser) {
    remainingByUser.set(userId, Math.max(total - (approvedDaysByUser.get(userId) ?? 0), 0))
  }
  return remainingByUser
}

export async function getLeaveRecap(range: DateRange): Promise<RecapRow[]> {
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      status: { in: [LeaveRequestStatus.APPROVED, LeaveRequestStatus.PENDING] },
      startDate: { lte: range.end },
      endDate: { gte: range.start },
      user: {
        role: 'USER',
        applications: { has: 'CONGES' },
      },
    },
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true, position: true, congesTotalDays: true },
      },
    },
  })

  const frenchHolidays = await fetchFrenchHolidays()
  const remainingByUser = await computeRemainingDaysByUser(
    leaves.map((leave) => ({ userId: leave.userId, congesTotalDays: leave.user.congesTotalDays })),
    frenchHolidays,
  )

  const inputs: RecapLeaveInput[] = leaves.map((leave) => ({
    userId: leave.userId,
    firstName: leave.user.firstName,
    lastName: leave.user.lastName,
    email: leave.user.email,
    position: leave.user.position,
    startDate: leave.startDate,
    endDate: leave.endDate,
    status: leave.status === LeaveRequestStatus.APPROVED ? 'APPROVED' : 'PENDING',
    remainingDays: remainingByUser.get(leave.userId) ?? 0,
  }))

  return buildRecapRows(inputs, range, frenchHolidays)
}

export const ALWAYS_NOTIFIED_RECIPIENTS: RecapRecipient[] = [
  { email: 'theo.pezelccf@gmail.com', language: 'FR' },
  { email: 'solenn.toupin@gmail.com', language: 'FR' },
]

export function mergeRecapRecipients(
  fromDatabase: RecapRecipient[],
  alwaysNotified: RecapRecipient[],
): RecapRecipient[] {
  const byEmail = new Map<string, RecapRecipient>()
  for (const recipient of [...fromDatabase, ...alwaysNotified]) {
    const key = recipient.email.trim().toLowerCase()
    if (!byEmail.has(key)) byEmail.set(key, recipient)
  }
  return [...byEmail.values()]
}

export async function getCongesAdminRecipients(): Promise<RecapRecipient[]> {
  const admins = await prisma.user.findMany({
    where: { adminApplications: { has: 'CONGES' } },
    select: { email: true, language: true },
  })
  const fromDatabase = admins.map((admin) => ({ email: admin.email, language: admin.language }))
  return mergeRecapRecipients(fromDatabase, ALWAYS_NOTIFIED_RECIPIENTS)
}
