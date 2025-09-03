"use server"
import { z } from 'zod'
import { unauthenticatedAction } from '@/actions/safe-action'
import { readInvitationByToken, consumeInvitation } from '@/lib/services/invitations'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const SetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
  confirm: z.string().min(6),
})
  .refine((data) => data.password === data.confirm, { message: 'PASSWORDS_NOT_MATCH', path: ['confirm'] })

export const setPasswordFromInviteAction = unauthenticatedAction
  .inputSchema(SetPasswordSchema)
  .action(async ({ parsedInput: { token, password } }) => {
    const invite = await readInvitationByToken(token)
    if (!invite) {
      throw new Error('INVALID_OR_EXPIRED_TOKEN')
    }
    const { payload } = invite

    // Remove placeholder user if exists to avoid unique email conflict
    try {
      await prisma.user.delete({ where: { email: payload.email } })
    } catch {}

    // Create user via Better Auth (creates User + Account with hashed password and session)
    const result = await auth.api.signUpEmail({
      body: {
        email: payload.email,
        password,
        name: [payload.firstName, payload.lastName].filter(Boolean).join(' ') || undefined,
      },
    })

    if ('error' in result && result.error) {
      throw new Error(result.error.message || 'SIGNUP_FAILED')
    }

    // Update role/applications/metadata
    await prisma.user.update({
      where: { email: payload.email },
      data: {
        role: payload.role,
        firstName: payload.firstName ?? null,
        lastName: payload.lastName ?? null,
        language: payload.locale === 'fr' ? 'FR' : 'EN',
        position: payload.position ?? null,
        applications: payload.applications,
        departureDate: payload.departureDate ?? null,
      },
    })

    await consumeInvitation(invite.rowId)

    return { ok: true }
  })

