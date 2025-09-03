import { prisma } from '@/lib/prisma'

export type Position = { id: string; name: string }

export async function listPositions(): Promise<Position[]> {
  const rows = await prisma.position.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
  return rows
}

export async function ensurePosition(name: string): Promise<Position> {
  const trimmed = name.trim()
  const existing = await prisma.position.findUnique({ where: { name: trimmed } })
  if (existing) return { id: existing.id, name: existing.name }
  const created = await prisma.position.create({
    data: {
      id: crypto.randomUUID(),
      name: trimmed,
    },
    select: { id: true, name: true },
  })
  return created
}
