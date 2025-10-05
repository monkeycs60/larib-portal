import { LeaveCalendarClient } from './leave-calendar-client'
import type { LeaveCalendarProps } from './leave-calendar-client'

export function LeaveCalendar(props: LeaveCalendarProps) {
  return <LeaveCalendarClient {...props} />
}
