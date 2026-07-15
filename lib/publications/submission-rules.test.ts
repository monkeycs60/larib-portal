import { describe, it, expect } from 'vitest'
import { siblingsToReject } from './submission-rules'

describe('siblingsToReject', () => {
  const subs = [
    { id: 'a', status: 'REJECTED' as const },
    { id: 'b', status: 'UNDER_REVIEW' as const },
    { id: 'c', status: 'SUBMITTED' as const },
  ]

  it('rejects other still-active submissions when one becomes active', () => {
    expect(siblingsToReject(subs, 'c')).toEqual(['b'])
  })

  it('never re-rejects an already rejected sibling', () => {
    expect(siblingsToReject(subs, 'b')).toEqual(['c'])
  })

  it('returns nothing when there are no other active submissions', () => {
    expect(siblingsToReject([{ id: 'x', status: 'SUBMITTED' as const }], 'x')).toEqual([])
  })
})
