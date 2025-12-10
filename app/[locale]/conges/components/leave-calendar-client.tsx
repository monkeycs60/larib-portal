'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MultiSelect } from '@/components/ui/multiselect'
import type { CalendarDay } from '@/lib/services/conges'
import { formatUserName } from '@/lib/format-user-name'

type LeaveCalendarNavigation = {
  baseHref: string
}

type LeaveCalendarContent = {
  activeMonthIso: string
  calendarDays: CalendarDay[]
  availableMonths: string[]
  navigation: LeaveCalendarNavigation
}

export type LeaveCalendarProps = {
  content: LeaveCalendarContent
}

function formatKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function capitalise(value: string, locale: string): string {
  if (value.length === 0) return value
  return value[0]?.toLocaleUpperCase(locale) + value.slice(1)
}

function monthLabel(date: Date, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long' })
  return capitalise(formatter.format(date), locale)
}

const USER_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
]

function hashUserId(userId: string): number {
  let hash = 0
  for (let charIndex = 0; charIndex < userId.length; charIndex++) {
    const char = userId.charCodeAt(charIndex)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function getUserColor(userId: string): string {
  const index = hashUserId(userId) % USER_COLORS.length
  return USER_COLORS[index]
}

export function LeaveCalendarClient({ content }: LeaveCalendarProps) {
  const translations = useTranslations('conges')
  const locale = useLocale()

  const initialMonth = useMemo(() => startOfMonth(new Date(content.activeMonthIso)), [content.activeMonthIso])
  const [activeMonth, setActiveMonth] = useState(initialMonth)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const availableMonthSet = useMemo(() => new Set(content.availableMonths), [content.availableMonths])
  const absenteesByDate = useMemo(() => {
    const entries = new Map<string, CalendarDay['absentees']>()
    for (const day of content.calendarDays) {
      entries.set(formatKey(new Date(day.date)), day.absentees)
    }
    return entries
  }, [content.calendarDays])

  const allUsers = useMemo(() => {
    const userMap = new Map<string, { userId: string; firstName: string | null; lastName: string | null; email: string }>()
    for (const day of content.calendarDays) {
      for (const absentee of day.absentees) {
        if (!userMap.has(absentee.userId)) {
          userMap.set(absentee.userId, {
            userId: absentee.userId,
            firstName: absentee.firstName,
            lastName: absentee.lastName,
            email: absentee.email,
          })
        }
      }
    }
    return Array.from(userMap.values()).sort((userA, userB) => {
      const nameA = formatUserName(userA)
      const nameB = formatUserName(userB)
      return nameA.localeCompare(nameB, locale)
    })
  }, [content.calendarDays, locale])

  const userSelectOptions = useMemo(() => {
    return allUsers.map((user) => ({
      value: user.userId,
      label: formatUserName(user),
    }))
  }, [allUsers])

  const todayKey = formatKey(new Date())
  const weekdayLabels = translations.raw('calendar.weekdays') as string[]
  const calendarTitle = translations('calendar.title', {
    month: monthLabel(activeMonth, locale),
    year: format(activeMonth, 'yyyy'),
  })

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(activeMonth)
    const rangeStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const rangeEnd = endOfWeek(endOfMonth(activeMonth), { weekStartsOn: 1 })

    const days: Array<{ date: Date; absentees: CalendarDay['absentees'] }> = []
    for (let cursor = rangeStart; cursor <= rangeEnd; cursor = addDays(cursor, 1)) {
      const date = new Date(cursor)
      let absentees = absenteesByDate.get(formatKey(date)) ?? []

      if (selectedUserIds.length > 0) {
        absentees = absentees.filter((person) => selectedUserIds.includes(person.userId))
      }

      days.push({ date, absentees })
    }

    return days
  }, [absenteesByDate, activeMonth, selectedUserIds])

  function updateUrl(monthKey: string) {
    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.set('month', monthKey)
    window.history.replaceState({}, '', currentUrl.toString())
  }

  function reloadFor(monthKey: string) {
    const targetUrl = new URL(content.navigation.baseHref, window.location.origin)
    targetUrl.searchParams.set('month', monthKey)
    window.location.href = targetUrl.toString()
  }

  function handleNavigate(direction: 'previous' | 'next') {
    const targetMonth = direction === 'previous' ? subMonths(activeMonth, 1) : addMonths(activeMonth, 1)
    const monthKey = format(targetMonth, 'yyyy-MM')

    if (!availableMonthSet.has(monthKey)) {
      reloadFor(monthKey)
      return
    }

    setActiveMonth(targetMonth)
    updateUrl(monthKey)
  }

  return (
    <Card>
      <CardHeader className='flex flex-col gap-4 space-y-0'>
        <div className='flex flex-row items-center justify-between'>
          <CardTitle className='text-lg'>{calendarTitle}</CardTitle>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' onClick={() => handleNavigate('previous')}>
              &larr;
            </Button>
            <Button variant='outline' size='sm' onClick={() => handleNavigate('next')}>
              &rarr;
            </Button>
          </div>
        </div>
        <div className='w-full max-w-sm'>
          <MultiSelect
            options={userSelectOptions}
            defaultValue={selectedUserIds}
            onValueChange={setSelectedUserIds}
            placeholder={translations('calendar.filterPlaceholder')}
            searchable
            hideSelectAll={false}
            maxCount={2}
          />
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground'>
          {weekdayLabels.map((label) => (
            <div key={label} className='py-1'>
              {label}
            </div>
          ))}
        </div>
        <div className='grid grid-cols-7 gap-2'>
          {monthDays.map(({ date, absentees }) => {
            const sameMonth = isSameMonth(date, activeMonth)
            const dateKey = formatKey(date)
            const isToday = dateKey === todayKey
            const dayNumber = date.getDate()
            const displayAbsentees = absentees.slice(0, 3)
            const overflowAbsentees = absentees.slice(3)
            const overflow = overflowAbsentees.length

            return (
              <div
                key={date.toISOString()}
                className={`rounded-lg border p-2 ${sameMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground'} ${
                  isToday ? 'border-primary shadow-sm' : ''
                }`}
              >
                <div className='mb-2 flex items-center justify-between text-sm font-semibold'>
                  <span>{dayNumber}</span>
                  {isToday ? <Badge variant='outline'>•</Badge> : null}
                </div>
                <div className='space-y-1'>
                  {displayAbsentees.length === 0 ? (
                    <p className='text-xs text-muted-foreground'>{translations('calendar.empty')}</p>
                  ) : (
                    displayAbsentees.map((person) => {
                      const name = formatUserName({ firstName: person.firstName, lastName: person.lastName, email: person.email })
                      const colorClass = getUserColor(person.userId)
                      return (
                        <Badge
                          key={`${dateKey}-${person.userId}`}
                          variant='secondary'
                          className={`block text-[10px] font-medium ${colorClass}`}
                        >
                          {name}
                        </Badge>
                      )
                    })
                  )}
                  {overflow > 0 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Badge variant='outline' className='cursor-pointer text-[10px] hover:bg-accent'>
                          {translations('calendar.more', { count: overflow })}
                        </Badge>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-2' align='start'>
                        <div className='space-y-1'>
                          {overflowAbsentees.map((person) => {
                            const name = formatUserName({ firstName: person.firstName, lastName: person.lastName, email: person.email })
                            const colorClass = getUserColor(person.userId)
                            return (
                              <Badge
                                key={`${dateKey}-overflow-${person.userId}`}
                                variant='secondary'
                                className={`block text-xs font-medium ${colorClass}`}
                              >
                                {name}
                              </Badge>
                            )
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default LeaveCalendarClient
