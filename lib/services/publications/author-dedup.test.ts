import { describe, it, expect } from 'vitest'
import { normalizeName, pickDuplicates, matchAuthorsAgainstBank } from './author-dedup'

describe('normalizeName', () => {
  it('lowercases, strips accents and collapses spaces', () => {
    expect(normalizeName('  Pierre   Lefèvre ')).toBe('pierre lefevre')
    expect(normalizeName("James  O'Connor")).toBe("james o'connor")
  })
})

describe('pickDuplicates', () => {
  const bank = [
    { id: 'a1', firstName: 'Pierre', lastName: 'Lefèvre', orcid: '0000-0002-1825-0097' },
    { id: 'a2', firstName: 'Sofia', lastName: 'Marino', orcid: null },
  ]
  it('returns an ORCID match when orcid collides', () => {
    const result = pickDuplicates(bank, { orcid: '0000-0002-1825-0097', firstName: 'X', lastName: 'Y' })
    expect(result.orcidMatch?.id).toBe('a1')
    expect(result.nameMatches).toHaveLength(0)
  })
  it('returns name matches (accent-insensitive) when no orcid collision', () => {
    const result = pickDuplicates(bank, { orcid: null, firstName: 'pierre', lastName: 'lefevre' })
    expect(result.orcidMatch).toBeNull()
    expect(result.nameMatches.map((match) => match.id)).toEqual(['a1'])
  })
})

describe('matchAuthorsAgainstBank', () => {
  const bank = [{ id: 'a1', firstName: 'Pierre', lastName: 'Lefèvre', orcid: '0000-0002-1825-0097' }]
  it('flags existing by orcid and new otherwise', () => {
    const rows = matchAuthorsAgainstBank(bank, [
      { firstName: 'Pierre', lastName: 'Lefevre', orcid: '0000-0002-1825-0097' },
      { firstName: 'Sofia', lastName: 'Marino', orcid: '0000-0002-9931-5522' },
    ])
    expect(rows[0]).toMatchObject({ status: 'existing', existingId: 'a1' })
    expect(rows[1]).toMatchObject({ status: 'new' })
  })
})
