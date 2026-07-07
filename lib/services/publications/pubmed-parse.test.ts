import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseEfetchXml, parseEsummary } from './pubmed-parse'

const xml = readFileSync(resolve(process.cwd(), 'tests/e2e/fixtures/pubmed/efetch-sample.xml'), 'utf8')

describe('parseEfetchXml', () => {
  it('parses one article with journal, authors, doi and date', () => {
    const records = parseEfetchXml(xml)
    expect(records).toHaveLength(1)
    const record = records[0]
    expect(record.pmid).toBe('39000001')
    expect(record.title).toBe('Multimodal imaging of the mitral valve.')
    expect(record.doi).toBe('10.1093/eurheartj/ehad100')
    expect(record.publishedAt).toBe('2023-03-07')
    expect(record.journal).toEqual({
      name: 'European Heart Journal',
      isoAbbrev: 'Eur Heart J',
      issn: '0195-668X',
      publisher: null,
    })
    expect(record.abstract).toContain('Background text.')
    expect(record.abstract).toContain('Methods text.')
    expect(record.authors).toHaveLength(2)
    expect(record.authors[0]).toEqual({
      lastName: 'Pezel', foreName: 'Theo', initials: 'T',
      affiliation: 'Lariboisiere Hospital, APHP, Paris, France.',
      orcid: '0000-0002-1234-5678',
    })
    expect(record.authors[1].orcid).toBeNull()
  })
})

describe('parseEsummary', () => {
  it('maps esummary JSON to candidates', () => {
    const json = {
      result: {
        uids: ['39000001'],
        '39000001': {
          uid: '39000001',
          title: 'Multimodal imaging of the mitral valve.',
          fulljournalname: 'European Heart Journal',
          pubdate: '2023 Mar 7',
          authors: [{ name: 'Pezel T' }, { name: 'Garot J' }],
          articleids: [{ idtype: 'doi', value: '10.1093/eurheartj/ehad100' }],
        },
      },
    }
    const candidates = parseEsummary(json)
    expect(candidates).toEqual([
      {
        pmid: '39000001',
        title: 'Multimodal imaging of the mitral valve.',
        journal: 'European Heart Journal',
        year: 2023,
        firstAuthor: 'Pezel T',
        lastAuthor: 'Garot J',
        doi: '10.1093/eurheartj/ehad100',
      },
    ])
  })
})
