import { startOfDay, eachDayOfInterval, isWeekend } from 'date-fns'

type HolidaysCache = {
  data: Record<string, string>
  fetchedAt: number
}

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000
let holidaysCache: HolidaysCache | null = null

export async function fetchFrenchHolidays(): Promise<Record<string, string>> {
  if (holidaysCache && Date.now() - holidaysCache.fetchedAt < CACHE_DURATION_MS) {
    return holidaysCache.data
  }

  try {
    const response = await fetch('https://calendrier.api.gouv.fr/jours-feries/metropole.json', {
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = (await response.json()) as Record<string, string>
    holidaysCache = { data, fetchedAt: Date.now() }
    return data
  } catch (error) {
    console.error('Failed to fetch French holidays:', error)
    return holidaysCache?.data ?? {}
  }
}

export function getHolidaysForYear(
  allHolidays: Record<string, string>,
  year: number
): Array<{ date: Date; name: string }> {
  return Object.entries(allHolidays)
    .filter(([dateStr]) => dateStr.startsWith(`${year}-`))
    .map(([dateStr, name]) => ({
      date: new Date(dateStr),
      name,
    }))
}

export function getHolidaysForRange(
  allHolidays: Record<string, string>,
  start: Date,
  end: Date
): Array<{ date: Date; name: string }> {
  const startDay = startOfDay(start)
  const endDay = startOfDay(end)

  return Object.entries(allHolidays)
    .map(([dateStr, name]) => ({
      date: new Date(dateStr),
      name,
    }))
    .filter(({ date }) => {
      const d = startOfDay(date)
      return d >= startDay && d <= endDay
    })
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isHoliday(date: Date, allHolidays: Record<string, string>): boolean {
  const dateStr = formatDateKey(date)
  return dateStr in allHolidays
}

export function getHolidayName(date: Date, allHolidays: Record<string, string>): string | null {
  const dateStr = formatDateKey(date)
  return allHolidays[dateStr] ?? null
}

export function countWorkingDays(
  start: Date,
  end: Date,
  allHolidays: Record<string, string>
): number {
  const startDay = startOfDay(start)
  const endDay = startOfDay(end)

  if (endDay < startDay) return 0

  const allDays = eachDayOfInterval({ start: startDay, end: endDay })

  return allDays.filter((day) => {
    if (isWeekend(day)) return false
    if (isHoliday(day, allHolidays)) return false
    return true
  }).length
}

export function getExcludedDaysInfo(
  start: Date,
  end: Date,
  allHolidays: Record<string, string>
): { weekends: number; holidays: Array<{ date: Date; name: string }> } {
  const startDay = startOfDay(start)
  const endDay = startOfDay(end)

  if (endDay < startDay) return { weekends: 0, holidays: [] }

  const allDays = eachDayOfInterval({ start: startDay, end: endDay })

  let weekends = 0
  const holidaysInRange: Array<{ date: Date; name: string }> = []

  allDays.forEach((day) => {
    if (isWeekend(day)) {
      weekends++
    } else {
      const holidayName = getHolidayName(day, allHolidays)
      if (holidayName) {
        holidaysInRange.push({ date: day, name: holidayName })
      }
    }
  })

  return { weekends, holidays: holidaysInRange }
}

export function getHolidayDatesForCalendar(
  allHolidays: Record<string, string>,
  startYear: number,
  endYear: number
): Date[] {
  const dates: Date[] = []

  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getHolidaysForYear(allHolidays, year)
    dates.push(...yearHolidays.map((h) => startOfDay(h.date)))
  }

  return dates
}
