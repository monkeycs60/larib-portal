import { describe, it, expect } from 'vitest'
import { normalizeTitle, splitAuthorName, planAuditWrite, type AuditPaper } from './audit-import'

function paper(title: string): AuditPaper {
  return { title, articleStatus: 'UNDER_REVIEW', authors: [], submissions: [] }
}

describe('normalizeTitle', () => {
  it('ignores case, punctuation and spacing', () => {
    expect(normalizeTitle('The HCM-LGE Risk Score.')).toBe(normalizeTitle('the hcm lge risk score'))
  })
})

describe('splitAuthorName', () => {
  it('splits last token as lastName', () => {
    expect(splitAuthorName('Jeremy Florence')).toEqual({ firstName: 'Jeremy', lastName: 'Florence' })
  })
  it('puts particles in firstName (known best-effort limitation)', () => {
    expect(splitAuthorName('Elsa Richard de Vesvrotte')).toEqual({ firstName: 'Elsa Richard de', lastName: 'Vesvrotte' })
  })
  it('handles a single token', () => {
    expect(splitAuthorName('Pezel')).toEqual({ firstName: '', lastName: 'Pezel' })
  })
})

describe('planAuditWrite', () => {
  it('skips papers whose normalized title already exists', () => {
    const plan = planAuditWrite(['The HCM-LGE Risk Score'], [paper('the hcm lge risk score'), paper('New Paper')])
    expect(plan.toCreate.map((entry) => entry.title)).toEqual(['New Paper'])
    expect(plan.skipped.map((entry) => entry.title)).toEqual(['the hcm lge risk score'])
  })
  it('skips intra-batch duplicates', () => {
    const plan = planAuditWrite([], [paper('Same Title'), paper('same title')])
    expect(plan.toCreate).toHaveLength(1)
    expect(plan.skipped).toHaveLength(1)
  })
})
