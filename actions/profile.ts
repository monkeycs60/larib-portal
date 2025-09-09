"use server"
import { z } from "zod"
import { authenticatedAction } from "@/actions/safe-action"
import { updateUser } from "@/lib/services/users"

const UpdateSelfSchema = z.object({
  // Admin can optionally change role and applications; regular users cannot.
  firstName: z.string().trim().optional().nullable(),
  lastName: z.string().trim().optional().nullable(),
  phoneNumber: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  language: z.enum(["EN", "FR"]).optional(),
  position: z.string().trim().optional().nullable(),
  profilePhoto: z.string().url().optional().nullable(),
  role: z.enum(["ADMIN","USER"]).optional(),
  applications: z.array(z.enum(["BESTOF_LARIB","CONGES","CARDIOLARIB"]))
    .optional(),
  locale: z.enum(["en","fr"]).optional(),
})

export const updateSelfProfileAction = authenticatedAction
  .inputSchema(UpdateSelfSchema)
  .action(async ({ parsedInput, ctx }) => {
    const isAdmin = ctx.user.role === 'ADMIN'
    const birthDate = parsedInput.birthDate ? new Date(parsedInput.birthDate) : null
    const language = parsedInput.language ?? (parsedInput.locale === 'fr' ? 'FR' : 'EN')

    // Enforce field-level permissions per role
    const basePayload = {
      id: ctx.userId,
      firstName: parsedInput.firstName ?? null,
      lastName: parsedInput.lastName ?? null,
      phoneNumber: parsedInput.phoneNumber ?? null,
      country: parsedInput.country ?? null,
      birthDate,
      language,
      position: parsedInput.position ?? null,
      profilePhoto: parsedInput.profilePhoto ?? null,
    } as const

    if (isAdmin) {
      return await updateUser({
        ...basePayload,
        role: parsedInput.role ?? ctx.user.role,
        applications: parsedInput.applications ?? ctx.user.applications ?? [],
      })
    }

    // Non-admin cannot change role/applications
    return await updateUser({
      ...basePayload,
    })
  })

