import 'server-only'
import { fetchByPmids } from './pubmed'
import type { PubmedRecord } from '@/types/publications'

export type FetchedAuthor = {
  firstName: string
  lastName: string
  orcid: string | null
  affiliationRaw: string | null
}

export type FetchedPublication = {
  source: 'doi' | 'pmid'
  doi: string | null
  pmid: string | null
  title: string
  journal: string | null
  year: number | null
  authors: FetchedAuthor[]
}

const CROSSREF_FIXTURE_DIR = process.env.CROSSREF_FIXTURE_DIR

function stripOrcid(value: string | undefined): string | null {
  if (!value) return null
  const match = value.match(/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i)
  return match ? match[1] : null
}

function extractYear(message: Record<string, unknown>): number | null {
  const dateFields = ['published', 'issued', 'published-print', 'published-online']
  for (const field of dateFields) {
    const year = (message[field] as { 'date-parts'?: number[][] } | undefined)?.['date-parts']?.[0]?.[0]
    if (typeof year === 'number') return year
  }
  return null
}

export function parseCrossrefWork(json: unknown): FetchedPublication {
  const message = (json as { message?: Record<string, unknown> }).message ?? {}
  const authorsRaw = (message['author'] as Array<Record<string, unknown>> | undefined) ?? []
  const year = extractYear(message)
  const title = ((message['title'] as string[] | undefined) ?? [])[0] ?? ''
  const journal = ((message['container-title'] as string[] | undefined) ?? [])[0] ?? null
  const authors: FetchedAuthor[] = authorsRaw.map((author) => {
    const affiliation = (author['affiliation'] as Array<{ name?: string }> | undefined)?.[0]?.name ?? null
    return {
      firstName: (author['given'] as string | undefined)?.trim() ?? '',
      lastName: (author['family'] as string | undefined)?.trim() ?? '',
      orcid: stripOrcid(author['ORCID'] as string | undefined),
      affiliationRaw: affiliation,
    }
  })
  return { source: 'doi', doi: (message['DOI'] as string | undefined) ?? null, pmid: null, title, journal, year, authors }
}

function pubmedRecordToPublication(record: PubmedRecord): FetchedPublication {
  return {
    source: 'pmid',
    doi: record.doi,
    pmid: record.pmid,
    title: record.title,
    journal: record.journal.name,
    year: record.publishedAt ? Number(record.publishedAt.slice(0, 4)) : null,
    authors: record.authors.map((author) => ({
      firstName: author.foreName?.trim() ?? '',
      lastName: author.lastName.trim(),
      orcid: author.orcid,
      affiliationRaw: author.affiliation,
    })),
  }
}

async function fetchCrossrefWork(doi: string): Promise<FetchedPublication> {
  if (CROSSREF_FIXTURE_DIR) {
    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const json = JSON.parse(await readFile(join(CROSSREF_FIXTURE_DIR, 'work-nejm.json'), 'utf8'))
    return parseCrossrefWork(json)
  }
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('CROSSREF_FETCH_FAILED')
  return parseCrossrefWork(await res.json())
}

export function classifyIdentifier(raw: string): { kind: 'doi' | 'pmid'; value: string } | null {
  const value = raw.trim()
  if (!value) return null
  if (/^10\.\d{4,9}\//.test(value)) return { kind: 'doi', value }
  if (/^\d+$/.test(value)) return { kind: 'pmid', value }
  const doiInUrl = value.match(/10\.\d{4,9}\/[^\s]+/)
  if (doiInUrl) return { kind: 'doi', value: doiInUrl[0] }
  return null
}

export async function fetchPublicationByIdentifier(raw: string): Promise<FetchedPublication> {
  const parsed = classifyIdentifier(raw)
  if (!parsed) throw new Error('INVALID_IDENTIFIER')
  if (parsed.kind === 'doi') return fetchCrossrefWork(parsed.value)
  const records = await fetchByPmids([parsed.value])
  if (records.length === 0) throw new Error('PUBLICATION_NOT_FOUND')
  return pubmedRecordToPublication(records[0])
}
