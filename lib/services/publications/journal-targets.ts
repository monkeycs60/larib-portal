import { prisma } from '@/lib/prisma'

export type JournalTargetItem = {
  id: string
  rank: number
  name: string
  abbreviation: string | null
  impactFactor: number | null
  sjr: number | null
}

export async function listJournalTargets(articleId: string): Promise<JournalTargetItem[]> {
  const targets = await prisma.journalTarget.findMany({
    where: { articleId },
    orderBy: { rank: 'asc' },
    select: {
      id: true,
      rank: true,
      journal: { select: { name: true, abbreviation: true, impactFactor: true, sjr: true } },
    },
  })
  return targets.map((target) => ({
    id: target.id,
    rank: target.rank,
    name: target.journal.name,
    abbreviation: target.journal.abbreviation,
    impactFactor: target.journal.impactFactor,
    sjr: target.journal.sjr,
  }))
}
