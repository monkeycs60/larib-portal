import { describe, it, expect } from 'vitest'
import { pickPrimaryCentre } from './author-centre'

describe('pickPrimaryCentre', () => {
  it('returns the most frequent centre', () => {
    expect(pickPrimaryCentre(['a', 'a', 'b'], new Set())).toBe('a')
  })
  it('breaks ties by "our centre"', () => {
    expect(pickPrimaryCentre(['a', 'b'], new Set(['b']))).toBe('b')
  })
  it('returns null for no centres', () => {
    expect(pickPrimaryCentre([], new Set())).toBeNull()
  })
})
