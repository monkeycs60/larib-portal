import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from '@/app/i18n/navigation'
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarDay } from '@/lib/services/conges'

type LeaveCalendarProps = {
  content: {
    activeMonthIso: string
    calendar: CalendarDay[]
    navigation: {
      basePath: string
      previousMonth: string
      nextMonth: string
      label: string
    }
    weekdayLabels: string[]
    emptyLabel: string
    moreLabel: (count: number) => string
  }
}

function formatKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function LeaveCalendar({ content }: LeaveCalendarProps) {
  const activeMonth = new Date(content.activeMonthIso)
  const monthStart = startOfMonth(activeMonth)
  const rangeStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const rangeEnd = endOfWeek(endOfMonth(activeMonth), { weekStartsOn: 1 })

  const entries = new Map(content.calendar.map((day) => [formatKey(new Date(day.date)), day.absentees]))

  const days: Array<{ date: Date; absentees: typeof content.calendar[number]['absentees'] }> = []
  for (let cursor = rangeStart; cursor <= rangeEnd; cursor = addDays(cursor, 1)) {
    const date = new Date(cursor)
    const absentees = entries.get(formatKey(date)) ?? []
    days.push({ date, absentees })
  }

  const todayKey = formatKey(new Date())

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0'>
        <div>
          <CardTitle className='text-lg'>{content.navigation.label}</CardTitle>
        </div>
        <div className='flex items-center gap-2'>
          <Button asChild variant='outline' size='sm'>
            <Link
              href={{
                pathname: content.navigation.basePath,
                query: { month: content.navigation.previousMonth },
              }}
            >
              &larr;
            </Link>
          </Button>
          <Button asChild variant='outline' size='sm'>
            <Link
              href={{
                pathname: content.navigation.basePath,
                query: { month: content.navigation.nextMonth },
              }}
            >
              &rarr;
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground'>
          {content.weekdayLabels.map((label) => (
            <div key={label} className='py-1'>
              {label}
            </div>
          ))}
        </div>
        <div className='grid grid-cols-7 gap-2'>
          {days.map(({ date, absentees }) => {
            const sameMonth = isSameMonth(date, activeMonth)
            const dateKey = formatKey(date)
            const isToday = dateKey === todayKey
            const dayNumber = date.getDate()
            const displayAbsentees = absentees.slice(0, 3)
            const overflow = absentees.length - displayAbsentees.length

            return (
              <div
                key={date.toISOString()}
                className={`rounded-lg border p-2 ${sameMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground'} ${isToday ? 'border-primary shadow-sm' : ''}`}
              >
                <div className='mb-2 flex items-center justify-between text-sm font-semibold'>
                  <span>{dayNumber}</span>
                  {isToday && <Badge variant='outline'>•</Badge>}
                </div>
                <div className='space-y-1'>
                  {displayAbsentees.length === 0 ? (
                    <p className='text-xs text-muted-foreground'>{content.emptyLabel}</p>
                  ) : (
                    displayAbsentees.map((person) => {
                      const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || '—'
                      return (
                        <Badge key={`${dateKey}-${person.userId}`} variant='secondary' className='block text-[10px] font-medium'>
                          {name}
                        </Badge>
                      )
                    })
                  )}
                  {overflow > 0 && (
                    <Badge variant='outline' className='text-[10px]'>
                      {content.moreLabel(overflow)}
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
