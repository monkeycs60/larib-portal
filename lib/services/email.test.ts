import { describe, it, expect } from 'vitest'
import { renderLeaveRecapEmail } from './email'

describe('renderLeaveRecapEmail', () => {
  it('includes rows and a localized subject (FR weekly)', () => {
    const { subject, text, html } = renderLeaveRecapEmail({
      to: ['x@x.io'],
      locale: 'fr',
      period: 'weekly',
      rangeStart: new Date('2026-07-06T00:00:00'),
      rangeEnd: new Date('2026-07-10T23:59:59'),
      rows: [{
        userId: 'u1', name: 'Alice A', position: 'Doctor',
        startDate: new Date('2026-07-06T00:00:00'), endDate: new Date('2026-07-08T00:00:00'),
        status: 'PENDING', daysInRange: 3, remainingDays: 17,
      }],
    })
    expect(subject.toLowerCase()).toContain('semaine')
    expect(text).toContain('Alice A')
    expect(html).toContain('Alice A')
    expect(html).toContain('En attente')
    expect(html).toContain('Détail des congés')
    expect(html).toContain('17 jours restants')
  })

  it('shows an empty state when nobody is on leave (FR monthly)', () => {
    const { text, html } = renderLeaveRecapEmail({
      to: ['x@x.io'],
      locale: 'fr',
      period: 'monthly',
      rangeStart: new Date('2026-07-01T00:00:00'),
      rangeEnd: new Date('2026-07-31T23:59:59'),
      rows: [],
    })
    expect(text).toContain('Personne en congé')
    expect(html).toContain('Personne en congé')
  })
})
