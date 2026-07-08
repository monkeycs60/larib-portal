import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseEfetchXml, parseEsummary, decodeEntities, reviewDelayDays } from './pubmed-parse'

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

  it('parses received and accepted dates from the History block', () => {
    const record = parseEfetchXml(xml)[0]
    expect(record.receivedAt).toBe('2022-12-15')
    expect(record.acceptedAt).toBe('2023-02-10')
  })
})

describe('reviewDelayDays', () => {
  it('computes the day delta between submission and acceptance', () => {
    expect(reviewDelayDays('2022-12-15', '2023-02-10')).toBe(57)
  })
  it('is null when either date is missing', () => {
    expect(reviewDelayDays(null, '2023-02-10')).toBeNull()
    expect(reviewDelayDays('2022-12-15', null)).toBeNull()
  })
})

describe('decodeEntities', () => {
  it('decodes hex and decimal numeric character references', () => {
    expect(decodeEntities('J&#xe9;r&#xf4;me')).toBe('Jérôme')
    expect(decodeEntities('Val&#233;rie')).toBe('Valérie')
    expect(decodeEntities('Sant&#xe9; &amp; Co')).toBe('Santé & Co')
  })
})

describe('parseEfetchXml entity decoding', () => {
  it('decodes accents in author names', () => {
    const xml = `<?xml version="1.0"?><PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>1</PMID><Article><Journal><Title>J</Title></Journal><ArticleTitle>T</ArticleTitle><AuthorList><Author><LastName>Garot</LastName><ForeName>J&#xe9;r&#xf4;me</ForeName><Initials>J</Initials></Author></AuthorList></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>`
    const record = parseEfetchXml(xml)[0]
    expect(record.authors[0].foreName).toBe('Jérôme')
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
