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

export async function updatePosition(id: string, name: string): Promise<Position> {
  const trimmed = name.trim()
  const updated = await prisma.position.update({
    where: { id },
    data: { name: trimmed },
    select: { id: true, name: true },
  })
  return updated
}

export async function deletePositions(ids: string[]): Promise<void> {
  if (ids.length === 0) return

  const positionsToDelete = await prisma.position.findMany({
    where: { id: { in: ids } },
    select: { name: true },
  })
  const positionNames = positionsToDelete.map((position) => position.name)

  const usersUsingPositions = await prisma.user.findFirst({
    where: { position: { in: positionNames } },
    select: { id: true },
  })

  if (usersUsingPositions) {
    const count = await prisma.user.count({
      where: { position: { in: positionNames } },
    })
    throw new Error(`POSITIONS_IN_USE:${count}`)
  }

  await prisma.position.deleteMany({
    where: { id: { in: ids } },
  })
}
