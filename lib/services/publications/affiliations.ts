import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/app/generated/prisma'
import { guessCentre } from './centre-extract'

export const PUBLICATIONS_CENTRES_TAG = 'publications:centres'
export const PUBLICATIONS_AFFILIATIONS_TAG = 'publications:affiliations'

type Tx = Prisma.TransactionClient

async function upsertCentre(tx: Tx, name: string, report: { centresCreated: number }): Promise<string> {
  const existing = await tx.centre.findFirst({ where: { name }, select: { id: true } })
  if (existing) return existing.id
  const created = await tx.centre.create({ data: { name }, select: { id: true } })
  report.centresCreated += 1
  return created.id
}

export async function upsertAffiliationWithCentre(
  tx: Tx,
  raw: string,
  report: { affiliationsCreated: number; centresCreated: number },
): Promise<string | null> {
  const name = raw.trim()
  if (!name) return null
  const existing = await tx.affiliation.findFirst({ where: { name }, select: { id: true } })
  if (existing) return existing.id
  const centreId = await upsertCentre(tx, guessCentre(name), report)
  const created = await tx.affiliation.create({ data: { name, raw: name, centreId }, select: { id: true } })
  report.affiliationsCreated += 1
  return created.id
}

export type BackfillReport = { articlesTouched: number; affiliationsCreated: number; centresCreated: number; links: number }

// Backfill affiliations for already-imported articles, matching PubMed authors to authorships by order.
export async function backfillAffiliations(
  records: Array<{ pmid: string; authors: Array<{ affiliation: string | null }> }>,
): Promise<BackfillReport> {
  const report: BackfillReport = { articlesTouched: 0, affiliationsCreated: 0, centresCreated: 0, links: 0 }
  for (const record of records) {
    const article = await prisma.article.findFirst({
      where: { pubmedId: record.pmid },
      select: { id: true, authorships: { select: { id: true, order: true }, orderBy: { order: 'asc' } } },
    })
    if (!article) continue
    let touched = false
    await prisma.$transaction(async (tx) => {
      for (const authorship of article.authorships) {
        const pubmedAuthor = record.authors[authorship.order - 1]
        const raw = pubmedAuthor?.affiliation?.trim()
        if (!raw) continue
        const existingLink = await tx.authorshipAffiliation.findFirst({ where: { authorshipId: authorship.id }, select: { authorshipId: true } })
        if (existingLink) continue
        const affiliationId = await upsertAffiliationWithCentre(tx, raw, report)
        if (!affiliationId) continue
        await tx.authorshipAffiliation.create({ data: { authorshipId: authorship.id, affiliationId, order: 1 } })
        report.links += 1
        touched = true
      }
    })
    if (touched) report.articlesTouched += 1
  }
  return report
}
