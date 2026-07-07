import { describe, it, expect } from 'vitest'
import { guessCentre } from './centre-extract'

describe('guessCentre', () => {
  it('maps known institutions via curated keywords', () => {
    expect(guessCentre('CMR Lab, Hopital Lariboisiere, APHP, Paris, France')).toBe('Lariboisière – AP-HP')
    expect(guessCentre('Institut Cardiovasculaire Paris Sud, Hôpital Privé Jacques Cartier, Massy, France')).toBe('Institut Cardiovasculaire Paris Sud')
  })

  it('prefers the hospital over the department', () => {
    expect(guessCentre('Department of Cardiology, University Hospital of Bordeaux, Bordeaux, France')).toBe('University Hospital of Bordeaux')
    expect(guessCentre('Service de Cardiologie, CHU de Toulouse, Toulouse, France')).toBe('CHU de Toulouse')
  })

  it('prefers the hospital when hospital + INSERM + university coexist', () => {
    expect(guessCentre('Department of Cardiology, INSERM U970, Georges Pompidou Hospital, Université de Paris, Paris, France')).toBe('HEGP – AP-HP')
    expect(guessCentre('Cardiology Unit, Freeman Hospital, Institute of Genetic Medicine, Newcastle University, Newcastle, UK')).toBe('Freeman Hospital')
  })

  it('falls back to a university when no hospital is present', () => {
    expect(guessCentre('Department of Cardiology, INSERM U970, Université de Paris, Paris, France')).toBe('Université de Paris')
  })

  it('falls back to the first segment when nothing else matches, and Unknown for empty', () => {
    expect(guessCentre('Department of Cardiology')).toBe('Department of Cardiology')
    expect(guessCentre('')).toBe('Unknown')
  })
})
