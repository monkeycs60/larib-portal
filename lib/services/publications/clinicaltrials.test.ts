import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseClinicalTrial, normaliseNctId } from './clinicaltrials'

const json = JSON.parse(readFileSync(resolve(process.cwd(), 'tests/e2e/fixtures/ctgov/NCT06235385.json'), 'utf8'))

describe('normaliseNctId', () => {
  it('accepts and upper-cases valid ids, rejects junk', () => {
    expect(normaliseNctId(' nct06235385 ')).toBe('NCT06235385')
    expect(normaliseNctId('NCT123')).toBeNull()
    expect(normaliseNctId('hello')).toBeNull()
  })
})

describe('parseClinicalTrial', () => {
  const result = parseClinicalTrial(json)

  it('maps core study fields', () => {
    expect(result.nctId).toBe('NCT06235385')
    expect(result.acronym).toBe('EACVI-MMVD')
    expect(result.title).toContain('Multiple and Mixed Valvular')
    expect(result.status).toBe('ONGOING')
    expect(result.startDate).toBe('2024-02-07')
    expect(result.endDate).toBe('2029-08-01')
    expect(result.description).toContain('multiple and mixed valvular')
    expect(result.domain).toContain('Heart Valve Diseases')
    expect(result.funding).toBe('Assistance Publique - Hôpitaux de Paris, European Association of Cardiovascular Imaging')
  })

  it('extracts centres from locations', () => {
    expect(result.centres).toEqual([
      { name: 'Assistance Publique Hôpitaux de Paris', city: 'Paris', country: 'France' },
    ])
  })

  it('parses investigators from location contacts with degrees and email', () => {
    const pezel = result.investigators.find((person) => person.lastName === 'PEZEL')
    expect(pezel).toBeTruthy()
    expect(pezel?.firstName).toBe('Théo')
    expect(pezel?.degrees).toBe('MD PhD')
    expect(pezel?.email).toBe('theo.pezel@aphp.fr')
    expect(pezel?.role).toBe('CO_INVESTIGATOR')
  })
})
