import { describe, it, expect } from 'vitest'
import { buildAuthorCreateData } from './authors'

describe('buildAuthorCreateData', () => {
  it('maps full input incl. primary centre, emails mirror and affiliations', () => {
    const data = buildAuthorCreateData({
      firstName: 'Sofia',
      lastName: 'Marino',
      type: 'EXTERNAL',
      degrees: 'MD, PhD',
      emails: ['sofia@uni.it', 'sm@lab.it'],
      orcid: '0000-0002-9931-5522',
      centreIds: ['c1', 'c2'],
      affiliations: ['Università degli Studi di Milano, Italy'],
      userId: null,
    })
    expect(data.type).toBe('EXTERNAL')
    expect(data.emails).toEqual(['sofia@uni.it', 'sm@lab.it'])
    expect(data.email).toBe('sofia@uni.it')
    expect(data.centreId).toBe('c1')
    expect(data.centres?.create).toEqual([
      { centreId: 'c1', isPrimary: true, order: 0 },
      { centreId: 'c2', isPrimary: false, order: 1 },
    ])
    expect(data.paperAffiliations?.create).toEqual([
      { raw: 'Università degli Studi di Milano, Italy', order: 0 },
    ])
  })

  it('defaults empty collections and null mirrors', () => {
    const data = buildAuthorCreateData({ firstName: 'A', lastName: 'B' })
    expect(data.type).toBe('OUR_TEAM')
    expect(data.emails).toEqual([])
    expect(data.email).toBeNull()
    expect(data.centreId).toBeNull()
    expect(data.centres?.create).toEqual([])
    expect(data.paperAffiliations?.create).toEqual([])
  })
})
