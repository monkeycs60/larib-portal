import { describe, it, expect } from 'vitest'
import { authorPositionBucket, ARTICLE_STATUS_TONE, SUBMISSION_STATUS_TONE, TONE_PILL_CLASS } from './status-display'

describe('authorPositionBucket', () => {
  it('flags a solo author as first', () => {
    expect(authorPositionBucket(1, 1)).toBe('first')
  })
  it('labels first and last for a two-author paper (never second)', () => {
    expect(authorPositionBucket(1, 2)).toBe('first')
    expect(authorPositionBucket(2, 2)).toBe('last')
  })
  it('treats the middle author of three as second-to-last', () => {
    expect(authorPositionBucket(2, 3)).toBe('second_last')
  })
  it('resolves all slots for a six-author paper', () => {
    expect(authorPositionBucket(1, 6)).toBe('first')
    expect(authorPositionBucket(2, 6)).toBe('second')
    expect(authorPositionBucket(3, 6)).toBe('third')
    expect(authorPositionBucket(4, 6)).toBe('middle')
    expect(authorPositionBucket(5, 6)).toBe('second_last')
    expect(authorPositionBucket(6, 6)).toBe('last')
  })
})

describe('tone maps', () => {
  it('maps every article status to a pill class', () => {
    for (const tone of Object.values(ARTICLE_STATUS_TONE)) {
      expect(TONE_PILL_CLASS[tone]).toBeTruthy()
    }
  })
  it('maps every submission status to a pill class', () => {
    for (const tone of Object.values(SUBMISSION_STATUS_TONE)) {
      expect(TONE_PILL_CLASS[tone]).toBeTruthy()
    }
  })
})
