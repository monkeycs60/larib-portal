'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

export function LeaveCalendarClient({ content }: LeaveCalendarProps) {
  const translations = useTranslations('conges')
  const locale = useLocale()

  const initialMonth = useMemo(() => startOfMonth(new Date(content.activeMonthIso)), [content.activeMonthIso])
  const [activeMonth, setActiveMonth] = useState(initialMonth)

  const availableMonthSet = useMemo(() => new Set(content.availableMonths), [content.availableMonths])
  const absenteesByDate = useMemo(() => {
    const entries = new Map<string, CalendarDay['absentees']>()
    for (const day of content.calendarDays) {
      entries.set(formatKey(new Date(day.date)), day.absentees)
    }
    return entries
  }, [content.calendarDays])

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
      const absentees = absenteesByDate.get(formatKey(date)) ?? []
      days.push({ date, absentees })
    }

    return days
  }, [absenteesByDate, activeMonth])

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
      <CardHeader className='flex flex-row items-center justify-between space-y-0'>
        <div>
          <CardTitle className='text-lg'>{calendarTitle}</CardTitle>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' onClick={() => handleNavigate('previous')}>
            &larr;
          </Button>
          <Button variant='outline' size='sm' onClick={() => handleNavigate('next')}>
            &rarr;
          </Button>
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
            const overflow = absentees.length - displayAbsentees.length

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
                      return (
                        <Badge key={`${dateKey}-${person.userId}`} variant='secondary' className='block text-[10px] font-medium'>
                          {name}
                        </Badge>
                      )
                    })
                  )}
                  {overflow > 0 ? (
                    <Badge variant='outline' className='text-[10px]'>
                      {translations('calendar.more', { count: overflow })}
                    </Badge>
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
