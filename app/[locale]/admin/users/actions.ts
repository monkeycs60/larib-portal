"use server"
import { z } from "zod"
import { deleteUserById, updateUser, createPlaceholderUser } from "@/lib/services/users"
import { listPositions, ensurePosition } from '@/lib/services/positions'
import { createInvitation } from '@/lib/services/invitations'
import { sendWelcomeEmail } from '@/lib/services/email'
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

const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "USER"]),
  firstName: z.string().trim().optional().nullable(),
  lastName: z.string().trim().optional().nullable(),
  position: z.string().trim().optional().nullable(),
  applications: z.array(z.enum(["BESTOF_LARIB", "CONGES", "CARDIOLARIB"]))
    .default([]),
  arrivalDate: z.string().min(1), // ISO date
  departureDate: z.string().min(1), // ISO date
  locale: z.enum(["en","fr"]),
})

export const createUserInviteAction = adminOnlyAction
  .inputSchema(CreateInviteSchema)
  .action(async ({ parsedInput }) => {
    const arrivalDate = new Date(parsedInput.arrivalDate)
    const departureDate = new Date(parsedInput.departureDate)

    // Create or ensure the position exists if provided
    let positionName: string | null = parsedInput.position ?? null
    if (positionName) {
      const pos = await ensurePosition(positionName)
      positionName = pos.name
    }

    // Create a placeholder user so the admin can see it immediately
    await createPlaceholderUser({
      email: parsedInput.email,
      role: parsedInput.role,
      firstName: parsedInput.firstName ?? null,
      lastName: parsedInput.lastName ?? null,
      language: parsedInput.locale === 'fr' ? 'FR' : 'EN',
      position: positionName,
      applications: parsedInput.applications,
      arrivalDate,
      departureDate,
    })

    // Create invitation token
    const { token, expiresAt } = await createInvitation({
      email: parsedInput.email,
      locale: parsedInput.locale,
      firstName: parsedInput.firstName ?? undefined,
      lastName: parsedInput.lastName ?? undefined,
      role: parsedInput.role,
      position: positionName,
      applications: parsedInput.applications,
      arrivalDate,
      departureDate,
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const setupLink = `${appUrl}/${parsedInput.locale}/welcome/${token}`

    // Send welcome email via Resend
    await sendWelcomeEmail({
      to: parsedInput.email,
      locale: parsedInput.locale,
      firstName: parsedInput.firstName ?? undefined,
      lastName: parsedInput.lastName ?? undefined,
      position: positionName,
      setupLink,
      accessEndDate: departureDate,
    })

    return { ok: true, expiresAt }
  })

export const listPositionsAction = adminOnlyAction
  .inputSchema(z.object({}).optional())
  .action(async () => {
    const positions = await listPositions()
    return positions
  })

export const createPositionAction = adminOnlyAction
  .inputSchema(z.object({ name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const pos = await ensurePosition(parsedInput.name)
    return pos
  })
