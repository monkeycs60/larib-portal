import 'server-only'
import type { PubmedCandidate, PubmedRecord } from '@/types/publications'
import { parseEfetchXml, parseEsummary } from './pubmed-parse'

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const FIXTURE_DIR = process.env.PUBMED_FIXTURE_DIR
const API_KEY = process.env.NCBI_API_KEY

function withKey(url: URL): URL {
  if (API_KEY) url.searchParams.set('api_key', API_KEY)
  return url
}

async function readFixture<T>(name: string): Promise<T> {
  const { readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  return JSON.parse(await readFile(join(FIXTURE_DIR as string, name), 'utf8')) as T
}

function authorTerm(anchor: string): string {
  const trimmed = anchor.trim()
  return trimmed.includes('[') ? trimmed : `${trimmed}[Author]`
}

export async function searchByAuthor(anchor: string, retmax = 200): Promise<PubmedCandidate[]> {
  if (FIXTURE_DIR) return readFixture<PubmedCandidate[]>('candidates.json')

  const esearch = withKey(new URL(`${EUTILS}/esearch.fcgi`))
  esearch.searchParams.set('db', 'pubmed')
  esearch.searchParams.set('term', authorTerm(anchor))
  esearch.searchParams.set('retmax', String(retmax))
  esearch.searchParams.set('retmode', 'json')
  const searchRes = await fetch(esearch, { cache: 'no-store' })
  if (!searchRes.ok) throw new Error('PUBMED_SEARCH_FAILED')
  const searchJson = (await searchRes.json()) as { esearchresult?: { idlist?: string[] } }
  const ids = searchJson.esearchresult?.idlist ?? []
  if (ids.length === 0) return []

  const esummary = withKey(new URL(`${EUTILS}/esummary.fcgi`))
  esummary.searchParams.set('db', 'pubmed')
  esummary.searchParams.set('id', ids.join(','))
  esummary.searchParams.set('retmode', 'json')
  const summaryRes = await fetch(esummary, { cache: 'no-store' })
  if (!summaryRes.ok) throw new Error('PUBMED_SUMMARY_FAILED')
  return parseEsummary(await summaryRes.json())
}

export async function fetchByPmids(pmids: string[]): Promise<PubmedRecord[]> {
  if (pmids.length === 0) return []
  if (FIXTURE_DIR) {
    const all = await readFixture<PubmedRecord[]>('records.json')
    const wanted = new Set(pmids)
    return all.filter((record) => wanted.has(record.pmid))
  }

  const records: PubmedRecord[] = []
  for (let start = 0; start < pmids.length; start += 200) {
    const chunk = pmids.slice(start, start + 200)
    const efetch = withKey(new URL(`${EUTILS}/efetch.fcgi`))
    efetch.searchParams.set('db', 'pubmed')
    efetch.searchParams.set('id', chunk.join(','))
    efetch.searchParams.set('retmode', 'xml')
    const res = await fetch(efetch, { cache: 'no-store' })
    if (!res.ok) throw new Error('PUBMED_FETCH_FAILED')
    records.push(...parseEfetchXml(await res.text()))
  }
  return records
}
