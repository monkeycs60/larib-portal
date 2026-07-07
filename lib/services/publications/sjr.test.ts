import { describe, it, expect } from 'vitest'
import { parseSjrCsv, normalizeIssn } from './sjr'

describe('normalizeIssn', () => {
  it('strips hyphens and uppercases', () => {
    expect(normalizeIssn('0195-668X')).toBe('0195668X')
    expect(normalizeIssn('0195668x')).toBe('0195668X')
  })
})

describe('parseSjrCsv', () => {
  it('maps every ISSN of a row to its SJR (comma decimal)', () => {
    const csv = ['Rank;Title;Issn;SJR', '1;European Heart Journal;"0195668X, 15229645";"39,304"'].join('\n')
    const map = parseSjrCsv(csv)
    expect(map.get('0195668X')).toBe(39.304)
    expect(map.get('15229645')).toBe(39.304)
  })
})
