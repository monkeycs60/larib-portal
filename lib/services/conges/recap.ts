import { addDays, endOfDay, endOfMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { countWorkingDays } from './french-holidays'

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
}

export type RecapRow = {
  userId: string
  name: string
  position: string | null
  startDate: Date
  endDate: Date
  status: RecapStatus
  daysInRange: number
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
