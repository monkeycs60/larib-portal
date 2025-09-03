import { prisma } from '@/lib/prisma'

export type InvitationPayload = {
  email: string
  locale: 'en' | 'fr'
  firstName?: string
  lastName?: string
  role: 'ADMIN' | 'USER'
  position?: string | null
  applications: Array<'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'>
  departureDate?: Date | null
}

export async function createInvitation(payload: InvitationPayload): Promise<{ token: string; expiresAt: Date }>
{
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 days
  await prisma.verification.create({
    data: {
      id: crypto.randomUUID(),
      identifier: `INVITE:${payload.email}`,
      value: JSON.stringify({ ...payload, token }),
      expiresAt,
    },
  })
  return { token, expiresAt }
}

export async function readInvitationByToken(token: string) {
  const row = await prisma.verification.findFirst({
    where: {
      value: { contains: token },
    },
  })
  if (!row) return null
  try {
    const parsed = JSON.parse(row.value) as InvitationPayload & { token: string }
    if (parsed.token !== token) return null
    if (row.expiresAt.getTime() < Date.now()) return null
    return { rowId: row.id, payload: parsed }
  } catch {
    return null
  }
}

export async function consumeInvitation(rowId: string): Promise<void> {
  await prisma.verification.delete({ where: { id: rowId } })
}
