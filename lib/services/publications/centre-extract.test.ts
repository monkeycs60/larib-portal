import { describe, it, expect } from 'vitest'
import { guessCentre } from './centre-extract'

describe('guessCentre', () => {
  it('maps curated AP-HP hospitals', () => {
    expect(guessCentre('CMR Lab, Hopital Lariboisiere, AP-HP, Paris, France')).toBe('Lariboisière – AP-HP')
    expect(guessCentre('Department of Cardiology, Cochin Hospital, Paris, France')).toBe('Cochin – AP-HP')
    expect(guessCentre('Cardiology, Hôpital Saint-Antoine, Paris, France')).toBe('Saint-Antoine – AP-HP')
    expect(guessCentre('Henri Mondor Hospital, Creteil, France')).toBe('Henri Mondor – AP-HP')
  })

  it('maps curated hospital sites to their CHU/CH', () => {
    expect(guessCentre('Rangueil University Hospital, Toulouse, France')).toBe('CHU de Toulouse')
    expect(guessCentre('Nouvel Hôpital Civil, Strasbourg, France')).toBe('CHU de Strasbourg')
    expect(guessCentre('Hôpital Cardiologique du Haut-Lévêque, Pessac, France')).toBe('CHU de Bordeaux')
    expect(guessCentre('CNRS SIGMA UCA UMR 6602, University Hospital Gabriel Montpied, Clermont-Ferrand')).toBe('CHU de Clermont-Ferrand')
    expect(guessCentre('Hôpital Henri Duffaut, Avignon, France')).toBe("CH d'Avignon")
  })

  it('canonicalizes EN/FR equivalences', () => {
    expect(guessCentre('Department of Cardiology, University Hospital of Bordeaux, France')).toBe('CHU de Bordeaux')
    expect(guessCentre('Rouen University Hospital, Rouen, France')).toBe('CHU de Rouen')
    expect(guessCentre('Centre Hospitalier de Chartres, Chartres, France')).toBe('CH de Chartres')
    expect(guessCentre('Service de Cardiologie, CHU de Toulouse, France')).toBe('CHU de Toulouse')
    expect(guessCentre('Cardiology, CHU Lille, Lille, France')).toBe('CHU de Lille')
  })

  it('groups independent contributors and merges Clinique Ambroise Paré variants', () => {
    expect(guessCentre('Independent Biostatistician, Paris')).toBe('Independent')
    expect(guessCentre('Clinique A.-Paré, Toulouse, France')).toBe('Clinique Ambroise Paré')
    expect(guessCentre('Clinique Médico-Chirurgicale Ambroise Paré, Neuilly, France')).toBe('Clinique Ambroise Paré')
  })

  it('returns null for generic labels and bare departments (no centre)', () => {
    expect(guessCentre('Department of Cardiology, University Hospital, City')).toBeNull()
    expect(guessCentre('Cardiology, AP-HP, Paris')).toBeNull()
    expect(guessCentre('Rehabilitation Center, City')).toBeNull()
    expect(guessCentre("Children's Hospital, City")).toBeNull()
    expect(guessCentre('Department of Cardiology')).toBeNull()
    expect(guessCentre('')).toBeNull()
  })

  it('falls back to a university when no hospital is present', () => {
    expect(guessCentre('Department of Cardiology, INSERM U970, Université de Paris, Paris, France')).toBe('Université de Paris')
  })
})
