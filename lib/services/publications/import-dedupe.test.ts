import { describe, it, expect } from 'vitest'
import { normalizeName, authorDedupeKey } from './import-dedupe'

describe('normalizeName', () => {
  it('lowercases and strips accents/punctuation', () => {
    expect(normalizeName('Pézel-Théo')).toBe('pezeltheo')
    expect(normalizeName("O'Brien")).toBe('obrien')
  })
})

describe('authorDedupeKey', () => {
  it('uses ORCID when present', () => {
    expect(authorDedupeKey({ lastName: 'Pezel', foreName: 'Theo', initials: 'T', affiliation: null, orcid: '0000-0002-1234-5678' }))
      .toBe('orcid:0000-0002-1234-5678')
  })
  it('falls back to lastName + first initial', () => {
    expect(authorDedupeKey({ lastName: 'Pezel', foreName: 'Theo', initials: 'T', affiliation: null, orcid: null }))
      .toBe('name:pezel|t')
    expect(authorDedupeKey({ lastName: 'Pezel', foreName: null, initials: 'TA', affiliation: null, orcid: null }))
      .toBe('name:pezel|t')
  })
})
