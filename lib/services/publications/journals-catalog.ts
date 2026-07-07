import 'server-only'

export type JournalCandidate = { title: string; issn: string | null; publisher: string | null }

const FIXTURE_DIR = process.env.PUBMED_FIXTURE_DIR

export async function searchCrossref(query: string): Promise<JournalCandidate[]> {
  if (FIXTURE_DIR) {
    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    return JSON.parse(await readFile(join(FIXTURE_DIR, 'crossref-journals.json'), 'utf8')) as JournalCandidate[]
  }
  const url = new URL('https://api.crossref.org/journals')
  url.searchParams.set('query', query)
  url.searchParams.set('rows', '20')
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LaribPortal/1.0 (mailto:publications@larib.fr)' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('CROSSREF_FAILED')
  const json = (await res.json()) as {
    message?: { items?: Array<{ title?: string | string[]; ISSN?: string[]; publisher?: string }> }
  }
  return (json.message?.items ?? []).map((item) => ({
    title: Array.isArray(item.title) ? item.title[0] ?? '' : item.title ?? '',
    issn: item.ISSN?.[0] ?? null,
    publisher: item.publisher ?? null,
  }))
}
