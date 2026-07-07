import { XMLParser } from 'fast-xml-parser'
import type { PubmedCandidate, PubmedRecord, PubmedAuthor } from '@/types/publications'

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: true })

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

export function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function rawTextOf(node: unknown): string | null {
  if (node === undefined || node === null) return null
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (typeof node === 'object' && '#text' in (node as Record<string, unknown>)) {
    const text = (node as Record<string, unknown>)['#text']
    return text === undefined || text === null ? null : String(text)
  }
  return null
}

function textOf(node: unknown): string | null {
  const raw = rawTextOf(node)
  return raw === null ? null : decodeEntities(raw)
}

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

function isoDateFromPubDate(pubDate: Record<string, unknown> | undefined): string | null {
  if (!pubDate) return null
  const year = textOf(pubDate.Year)
  if (!year) return null
  const monthRaw = textOf(pubDate.Month)
  const month = monthRaw ? (MONTHS[monthRaw] ?? (/^\d{1,2}$/.test(monthRaw) ? monthRaw.padStart(2, '0') : '01')) : '01'
  const dayRaw = textOf(pubDate.Day)
  const day = dayRaw && /^\d{1,2}$/.test(dayRaw) ? dayRaw.padStart(2, '0') : '01'
  return `${year}-${month}-${day}`
}

function abstractText(abstract: Record<string, unknown> | undefined): string | null {
  if (!abstract) return null
  const parts = toArray(abstract.AbstractText).map((part) => textOf(part)).filter((text): text is string => !!text)
  return parts.length ? parts.join('\n') : null
}

function doiOf(article: Record<string, unknown>): string | null {
  const eloc = toArray(article.ELocationID as unknown).find(
    (entry) => (entry as Record<string, unknown>)['@_EIdType'] === 'doi',
  )
  return eloc ? textOf(eloc) : null
}

function parseAuthor(node: Record<string, unknown>): PubmedAuthor | null {
  const lastName = textOf(node.LastName)
  if (!lastName) return null
  const affiliationInfo = toArray(node.AffiliationInfo)[0] as Record<string, unknown> | undefined
  const orcidEntry = toArray(node.Identifier).find(
    (id) => (id as Record<string, unknown>)['@_Source'] === 'ORCID',
  )
  return {
    lastName,
    foreName: textOf(node.ForeName),
    initials: textOf(node.Initials),
    affiliation: affiliationInfo ? textOf(affiliationInfo.Affiliation) : null,
    orcid: orcidEntry ? textOf(orcidEntry) : null,
  }
}

export function parseEfetchXml(xml: string): PubmedRecord[] {
  const root = parser.parse(xml) as Record<string, unknown>
  const set = root.PubmedArticleSet as Record<string, unknown> | undefined
  if (!set) return []
  return toArray(set.PubmedArticle).map((articleNode) => {
    const citation = (articleNode as Record<string, unknown>).MedlineCitation as Record<string, unknown>
    const article = citation.Article as Record<string, unknown>
    const journal = article.Journal as Record<string, unknown>
    const journalIssue = journal.JournalIssue as Record<string, unknown> | undefined
    const authors = toArray((article.AuthorList as Record<string, unknown> | undefined)?.Author)
      .map((authorNode) => parseAuthor(authorNode as Record<string, unknown>))
      .filter((author): author is PubmedAuthor => author !== null)
    return {
      pmid: String(textOf(citation.PMID)),
      title: textOf(article.ArticleTitle) ?? '',
      abstract: abstractText(article.Abstract as Record<string, unknown> | undefined),
      doi: doiOf(article),
      publishedAt: isoDateFromPubDate(journalIssue?.PubDate as Record<string, unknown> | undefined),
      journal: {
        name: textOf(journal.Title) ?? '',
        isoAbbrev: textOf(journal.ISOAbbreviation),
        issn: textOf(journal.ISSN),
        publisher: null,
      },
      authors,
    }
  })
}

type EsummaryDoc = {
  uid: string
  title?: string
  fulljournalname?: string
  pubdate?: string
  authors?: Array<{ name: string }>
  articleids?: Array<{ idtype: string; value: string }>
}

export function parseEsummary(json: unknown): PubmedCandidate[] {
  const result = (json as { result?: Record<string, unknown> }).result
  if (!result) return []
  const uids = (result.uids as string[] | undefined) ?? []
  return uids.map((uid) => {
    const doc = result[uid] as EsummaryDoc
    const authors = doc.authors ?? []
    const yearMatch = doc.pubdate?.match(/\d{4}/)
    const doi = doc.articleids?.find((id) => id.idtype === 'doi')?.value ?? null
    return {
      pmid: uid,
      title: doc.title ?? '',
      journal: doc.fulljournalname ?? '',
      year: yearMatch ? Number(yearMatch[0]) : null,
      firstAuthor: authors[0]?.name ?? null,
      lastAuthor: authors.length ? authors[authors.length - 1].name : null,
      doi,
    }
  })
}
