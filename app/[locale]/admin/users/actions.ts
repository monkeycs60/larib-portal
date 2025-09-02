"use server"
import { z } from "zod"
import { deleteUserById, updateUser } from "@/lib/services/users"
import { adminOnlyAction } from "@/actions/safe-action"

const UpdateUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().trim().optional().nullable(),
  lastName: z.string().trim().optional().nullable(),
  phoneNumber: z.string().trim().optional().nullable(),
  role: z.enum(["ADMIN", "USER"]),
  country: z.string().trim().optional().nullable(),
  birthDate: z.string().optional().nullable(), // ISO date string
  language: z.enum(["EN", "FR"]).optional(),
  position: z.string().trim().optional().nullable(),
  arrivalDate: z.string().optional().nullable(), // ISO date string
  departureDate: z.string().optional().nullable(), // ISO date string
  profilePhoto: z.string().url().optional().nullable(),
  applications: z.array(z.enum(["BESTOF_LARIB", "CONGES", "CARDIOLARIB"]))
    .default([]),
  locale: z.enum(["en", "fr"]).optional(),
})

export const updateUserAction = adminOnlyAction
  .inputSchema(UpdateUserSchema)
  .action(async ({ parsedInput }) => {
    const birthDate = parsedInput.birthDate ? new Date(parsedInput.birthDate) : null
    const arrivalDate = parsedInput.arrivalDate ? new Date(parsedInput.arrivalDate) : null
    const departureDate = parsedInput.departureDate ? new Date(parsedInput.departureDate) : null
    const language = parsedInput.language ?? (parsedInput.locale === 'fr' ? 'FR' : 'EN')

    const updated = await updateUser({
      id: parsedInput.id,
      email: parsedInput.email,
      firstName: parsedInput.firstName ?? null,
      lastName: parsedInput.lastName ?? null,
      phoneNumber: parsedInput.phoneNumber ?? null,
      role: parsedInput.role,
      country: parsedInput.country ?? null,
      birthDate,
      language,
      position: parsedInput.position ?? null,
      arrivalDate,
      departureDate,
      profilePhoto: parsedInput.profilePhoto ?? null,
      applications: parsedInput.applications,
    })
    return updated
  })

const DeleteUserSchema = z.object({ id: z.string().min(1) })

export const deleteUserAction = adminOnlyAction
  .inputSchema(DeleteUserSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (ctx.user.id === parsedInput.id) {
      throw new Error("CANNOT_DELETE_SELF")
    }
    await deleteUserById(parsedInput.id)
    return { ok: true }
  })
