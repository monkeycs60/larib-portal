import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseCrossrefWork } from './publication-lookup'

const work = JSON.parse(
  readFileSync(resolve(process.cwd(), 'tests/e2e/fixtures/crossref/work-nejm.json'), 'utf8'),
)

describe('parseCrossrefWork', () => {
  it('maps title, journal, year and authors (given/family/orcid/affiliation)', () => {
    const pub = parseCrossrefWork(work)
    expect(pub.source).toBe('doi')
    expect(pub.doi).toBe('10.1056/nejmoa2501144')
    expect(pub.title).toContain('Transcatheter aortic-valve replacement')
    expect(pub.journal).toBe('N Engl J Med')
    expect(pub.year).toBe(2025)
    expect(pub.authors).toHaveLength(3)
    expect(pub.authors[0]).toEqual({
      firstName: 'Pierre',
      lastName: 'Lefèvre',
      orcid: '0000-0002-1825-0097',
      affiliationRaw: 'Hôpital Lariboisière, AP-HP, Paris',
    })
    expect(pub.authors[2].orcid).toBeNull()
  })
})
