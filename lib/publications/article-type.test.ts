import { describe, it, expect } from 'vitest'
import { classifyArticleType, normalizeArticleType } from './article-type'

describe('classifyArticleType', () => {
  it('classifies editorials (wins over other tags)', () => {
    expect(classifyArticleType(['Journal Article', 'Editorial'])).toBe('EDITORIAL')
  })
  it('classifies research letters', () => {
    expect(classifyArticleType(['Letter'])).toBe('LETTER')
  })
  it('classifies reviews and meta-analyses', () => {
    expect(classifyArticleType(['Review'])).toBe('REVIEW')
    expect(classifyArticleType(['Systematic Review'])).toBe('REVIEW')
    expect(classifyArticleType(['Meta-Analysis'])).toBe('REVIEW')
  })
  it('defaults everything else to a research article', () => {
    expect(classifyArticleType(['Journal Article'])).toBe('ORIGINAL')
    expect(classifyArticleType(['Case Reports'])).toBe('ORIGINAL')
    expect(classifyArticleType([])).toBe('ORIGINAL')
  })
})

describe('normalizeArticleType', () => {
  it('collapses the 7-value enum onto the 4 displayed categories', () => {
    expect(normalizeArticleType('META_ANALYSIS')).toBe('REVIEW')
    expect(normalizeArticleType('CASE_REPORT')).toBe('ORIGINAL')
    expect(normalizeArticleType('OTHER')).toBe('ORIGINAL')
    expect(normalizeArticleType('EDITORIAL')).toBe('EDITORIAL')
    expect(normalizeArticleType('LETTER')).toBe('LETTER')
  })
})
