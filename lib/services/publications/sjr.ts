export function normalizeIssn(issn: string): string {
  return issn.replace(/[^0-9xX]/g, '').toUpperCase()
}

export function parseSjrCsv(text: string): Map<string, number> {
  const map = new Map<string, number>()
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return map
  const header = lines[0].split(';').map((cell) => cell.replace(/"/g, '').trim().toLowerCase())
  const issnIndex = header.indexOf('issn')
  const sjrIndex = header.indexOf('sjr')
  if (issnIndex === -1 || sjrIndex === -1) return map
  for (const line of lines.slice(1)) {
    const cells = line.split(';').map((cell) => cell.replace(/"/g, '').trim())
    const sjr = Number(cells[sjrIndex]?.replace(',', '.'))
    if (!cells[issnIndex] || Number.isNaN(sjr)) continue
    for (const issn of cells[issnIndex].split(',')) {
      const normalized = normalizeIssn(issn)
      if (normalized) map.set(normalized, sjr)
    }
  }
  return map
}

// Reads data/scimago.csv (user-provided; CC BY-NC) and fills Journal.sjr by ISSN.
export async function refreshJournalSjr(): Promise<{ updated: number; hasDataset: boolean }> {
  const { readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  let text: string
  try {
    text = await readFile(join(process.cwd(), 'data', 'scimago.csv'), 'utf8')
  } catch {
    return { updated: 0, hasDataset: false }
  }
  const { prisma } = await import('@/lib/prisma')
  const map = parseSjrCsv(text)
  const journals = await prisma.journal.findMany({ where: { issn: { not: null } }, select: { id: true, issn: true } })
  let updated = 0
  for (const journal of journals) {
    const sjr = map.get(normalizeIssn(journal.issn as string))
    if (sjr !== undefined) {
      await prisma.journal.update({ where: { id: journal.id }, data: { sjr } })
      updated += 1
    }
  }
  return { updated, hasDataset: true }
}
