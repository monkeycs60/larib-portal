"use server"
import { z } from 'zod'
import { authenticatedAction } from '@/actions/safe-action'
import { updateUser } from '@/lib/services/users'

export const saveProfilePhotoAction = authenticatedAction
  .inputSchema(z.object({
    url: z.string().url(),
    key: z.string().min(1),
  }))
  .action(async ({ parsedInput, ctx }) => {
    const updated = await updateUser({
      id: ctx.userId,
      profilePhoto: parsedInput.url,
      profilePhotoKey: parsedInput.key,
    })
    return { ok: true as const, profilePhoto: updated.profilePhoto }
  })

