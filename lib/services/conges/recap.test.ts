import { describe, it, expect } from 'vitest'
import { differenceInCalendarDays } from 'date-fns'
import {
  getWeekRange,
  getMonthRange,
  buildRecapRows,
  resolvePeriod,
  isAuthorizedCron,
  groupEmailsByLanguage,
} from './recap'

describe('getWeekRange', () => {
  it('returns Monday start-of-day to Friday end-of-day', () => {
    const { start, end } = getWeekRange(new Date('2026-07-08T15:00:00'))
    expect(start.getDay()).toBe(1) // Monday
    expect(end.getDay()).toBe(5) // Friday
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(end.getHours()).toBe(23)
    expect(differenceInCalendarDays(end, start)).toBe(4)
  })
})

describe('getMonthRange', () => {
  it('returns first day to last day of the month', () => {
    const { start, end } = getMonthRange(new Date('2026-07-15T12:00:00'))
    expect(start.getDate()).toBe(1)
    expect(start.getMonth()).toBe(6) // July, 0-indexed
    expect(end.getDate()).toBe(31)
    expect(end.getMonth()).toBe(6)
  })
})

describe('buildRecapRows', () => {
  const range = getWeekRange(new Date('2026-07-08T12:00:00')) // Mon 2026-07-06 → Fri 2026-07-10

  it('clips leaves to the range, computes working days, sorts by start then name', () => {
    const rows = buildRecapRows(
      [
        {
          userId: 'u2', firstName: 'Bob', lastName: 'B', email: 'bob@x.io', position: 'Nurse',
          startDate: new Date('2026-07-08T00:00:00'), endDate: new Date('2026-07-09T00:00:00'), status: 'PENDING',
        },
        {
          userId: 'u1', firstName: 'Alice', lastName: 'A', email: 'alice@x.io', position: 'Doctor',
          startDate: new Date('2026-07-01T00:00:00'), endDate: new Date('2026-07-31T00:00:00'), status: 'APPROVED',
        },
      ],
      range,
      {},
    )
    expect(rows.map((row) => row.userId)).toEqual(['u1', 'u2'])
    expect(rows[0].startDate.getTime()).toBe(range.start.getTime())
    expect(rows[0].endDate.getTime()).toBe(range.end.getTime())
    expect(rows[0].daysInRange).toBe(5) // full Mon–Fri
    expect(rows[0].status).toBe('APPROVED')
    expect(rows[1].daysInRange).toBe(2) // Wed–Thu
  })

  it('falls back to email when name is empty', () => {
    const rows = buildRecapRows(
      [{
        userId: 'u3', firstName: null, lastName: null, email: 'noname@x.io', position: null,
        startDate: range.start, endDate: range.start, status: 'APPROVED',
      }],
      range,
      {},
    )
    expect(rows[0].name).toBe('noname@x.io')
  })
})

describe('resolvePeriod', () => {
  it('returns monthly only for the exact "monthly" value, weekly otherwise', () => {
    expect(resolvePeriod('monthly')).toBe('monthly')
    expect(resolvePeriod('weekly')).toBe('weekly')
    expect(resolvePeriod(null)).toBe('weekly')
    expect(resolvePeriod('garbage')).toBe('weekly')
  })
})

describe('isAuthorizedCron', () => {
  it('accepts only the exact Bearer secret and requires a configured secret', () => {
    expect(isAuthorizedCron('Bearer secret123', 'secret123')).toBe(true)
    expect(isAuthorizedCron('Bearer wrong', 'secret123')).toBe(false)
    expect(isAuthorizedCron(null, 'secret123')).toBe(false)
    expect(isAuthorizedCron('Bearer secret123', undefined)).toBe(false)
  })
})

describe('groupEmailsByLanguage', () => {
  it('groups recipient emails by language preserving order', () => {
    const grouped = groupEmailsByLanguage([
      { email: 'a@x.io', language: 'FR' },
      { email: 'b@x.io', language: 'EN' },
      { email: 'c@x.io', language: 'FR' },
    ])
    expect(grouped.get('FR')).toEqual(['a@x.io', 'c@x.io'])
    expect(grouped.get('EN')).toEqual(['b@x.io'])
  })
})
