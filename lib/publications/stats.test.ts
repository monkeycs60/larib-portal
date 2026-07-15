import { describe, it, expect } from 'vitest'
import { computePublicationStats, type StatItem } from './stats'

const item = (over: Partial<StatItem>): StatItem => ({
  year: 2024,
  status: 'PUBLISHED',
  positionBucket: 'first',
  journal: 'Eur Heart J',
  type: 'ORIGINAL',
  ...over,
})

describe('computePublicationStats', () => {
  it('counts total, per-year, per-status and per-position', () => {
    const stats = computePublicationStats([
      item({ year: 2023, status: 'PUBLISHED', positionBucket: 'first' }),
      item({ year: 2024, status: 'PUBLISHED', positionBucket: 'first' }),
      item({ year: 2024, status: 'UNDER_REVIEW', positionBucket: 'last' }),
    ])
    expect(stats.total).toBe(3)
    expect(stats.perYear).toEqual([
      { year: 2023, count: 1 },
      { year: 2024, count: 2 },
    ])
    expect(stats.byStatus).toEqual([
      { status: 'PUBLISHED', count: 2 },
      { status: 'UNDER_REVIEW', count: 1 },
    ])
    const first = stats.byPosition.find((p) => p.bucket === 'first')
    const last = stats.byPosition.find((p) => p.bucket === 'last')
    expect(first?.count).toBe(2)
    expect(last?.count).toBe(1)
    expect(stats.byPosition).toHaveLength(6)
  })

  it('fills gap years with zero within the range', () => {
    const stats = computePublicationStats([item({ year: 2021 }), item({ year: 2024 })])
    expect(stats.perYear.map((y) => y.year)).toEqual([2021, 2022, 2023, 2024])
    expect(stats.perYear.find((y) => y.year === 2022)?.count).toBe(0)
  })

  it('caps the year axis to the most recent 12 years', () => {
    const stats = computePublicationStats([item({ year: 2005 }), item({ year: 2024 })])
    expect(stats.perYear).toHaveLength(12)
    expect(stats.perYear[0].year).toBe(2013)
    expect(stats.perYear[stats.perYear.length - 1].year).toBe(2024)
  })

  it('ignores items with no year for the axis but keeps them in the total', () => {
    const stats = computePublicationStats([item({ year: null }), item({ year: 2024 })])
    expect(stats.total).toBe(2)
    expect(stats.perYear).toEqual([{ year: 2024, count: 1 }])
  })

  it('ranks the top journals by frequency and ignores empty ones', () => {
    const stats = computePublicationStats([
      item({ journal: 'Circulation' }),
      item({ journal: 'Circulation' }),
      item({ journal: 'Eur Heart J' }),
      item({ journal: null }),
    ])
    expect(stats.byJournal).toEqual([
      { journal: 'Circulation', count: 2 },
      { journal: 'Eur Heart J', count: 1 },
    ])
  })

  it('reports every article type in canonical order', () => {
    const stats = computePublicationStats([
      item({ type: 'ORIGINAL' }),
      item({ type: 'REVIEW' }),
      item({ type: 'REVIEW' }),
    ])
    expect(stats.byType).toEqual([
      { type: 'ORIGINAL', count: 1 },
      { type: 'LETTER', count: 0 },
      { type: 'REVIEW', count: 2 },
      { type: 'EDITORIAL', count: 0 },
    ])
  })
})
