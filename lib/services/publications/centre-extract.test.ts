import { describe, it, expect } from 'vitest'
import { guessCentre } from './centre-extract'

describe('guessCentre', () => {
  it('maps known institutions via keywords', () => {
    expect(guessCentre('CMR Lab, Hopital Lariboisiere, APHP, Paris, France')).toBe('Lariboisière – APHP')
    expect(guessCentre('Institut Cardiovasculaire Paris Sud, Hôpital Privé Jacques Cartier, Massy, France')).toBe('Institut Cardiovasculaire Paris Sud')
  })
  it('falls back to the first segment when no keyword matches', () => {
    expect(guessCentre('Department of Cardiology, Some Unknown Hospital, Berlin, Germany')).toBe('Department of Cardiology')
  })
  it('returns Unknown for empty input', () => {
    expect(guessCentre('')).toBe('Unknown')
  })
})
