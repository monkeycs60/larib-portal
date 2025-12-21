"use server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { deleteUserById, updateUser, createPlaceholderUser } from "@/lib/services/users"
import { listPositions, ensurePosition, updatePosition, deletePositions } from '@/lib/services/positions'
import { createInvitation, deleteInvitationByEmail, consumeInvitation, getInvitationByEmail } from '@/lib/services/invitations'
import { sendWelcomeEmail, sendAccessExtendedEmail } from '@/lib/services/email'
import { computeAccountStatus } from '@/lib/services/users'
import { adminOnlyAction } from "@/actions/safe-action"
import { Prisma } from "@/app/generated/prisma"
import { prisma } from "@/lib/prisma"

const UpdateUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().trim().optional().nullable(),
  lastName: z.string().trim().optional().nullable(),
  phoneNumber: z.string().trim().optional().nullable(),
  role: z.enum(["ADMIN", "USER"]),
  country: z.string().trim().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  language: z.enum(["EN", "FR"]).optional(),
  position: z.string().trim().optional().nullable(),
  arrivalDate: z.string().optional().nullable(),
  departureDate: z.string().optional().nullable(),
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

    const currentUser = await prisma.user.findUnique({
      where: { id: parsedInput.id },
      select: {
        departureDate: true,
        firstName: true,
        lastName: true,
        language: true,
      },
    })

    const oldDepartureDate = currentUser?.departureDate ?? null
    const wasInactive = computeAccountStatus(oldDepartureDate) === 'INACTIVE'
    const willBeActive = departureDate ? computeAccountStatus(departureDate) === 'ACTIVE' : true

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
      applications: parsedInput.applications,
    })

    if (wasInactive && willBeActive && oldDepartureDate && departureDate) {
      const locale = (currentUser?.language === 'FR' ? 'fr' : 'en') as 'en' | 'fr'
      await sendAccessExtendedEmail({
        to: parsedInput.email,
        locale,
        firstName: parsedInput.firstName ?? undefined,
        lastName: parsedInput.lastName ?? undefined,
        oldDepartureDate,
        newDepartureDate: departureDate,
      })
    }

    revalidatePath('/admin/users')
    return updated
  })

const DeleteUserSchema = z.object({ id: z.string().min(1) })

export const deleteUserAction = adminOnlyAction
  .inputSchema(DeleteUserSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (ctx.user.id === parsedInput.id) {
      throw new Error("CANNOT_DELETE_SELF")
    }
    try {
      const userToDelete = await prisma.user.findUnique({
        where: { id: parsedInput.id },
        select: { email: true },
      })
      if (userToDelete) {
        await deleteInvitationByEmail(userToDelete.email)
      }
      await deleteUserById(parsedInput.id)
      return { ok: true }
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new Error("CANNOT_DELETE_USER_WITH_CLINICAL_CASES")
      }
      throw error
    }
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
    revalidatePath('/admin/users')
    return pos
  })

export const updatePositionAction = adminOnlyAction
  .inputSchema(z.object({ id: z.string().min(1), name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const updated = await updatePosition(parsedInput.id, parsedInput.name)
    revalidatePath('/admin/users')
    return updated
  })

export const deletePositionsAction = adminOnlyAction
  .inputSchema(z.object({ ids: z.array(z.string().min(1)).min(1) }))
  .action(async ({ parsedInput }) => {
    await deletePositions(parsedInput.ids)
    revalidatePath('/admin/users')
    return { deleted: parsedInput.ids.length }
  })

const ResendInvitationSchema = z.object({
  userId: z.string().min(1),
  locale: z.enum(["en", "fr"]),
})

export const resendInvitationAction = adminOnlyAction
  .inputSchema(ResendInvitationSchema)
  .action(async ({ parsedInput }) => {
    const user = await prisma.user.findUnique({
      where: { id: parsedInput.userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        position: true,
        applications: true,
        arrivalDate: true,
        departureDate: true,
        accounts: {
          where: { providerId: 'credential' },
          select: { password: true },
        },
      },
    })

    if (!user) {
      throw new Error("USER_NOT_FOUND")
    }

    const hasPassword = user.accounts.some((account) => account.password !== null)
    if (hasPassword) {
      throw new Error("USER_ALREADY_HAS_PASSWORD")
    }

    const existingInvitation = await getInvitationByEmail(user.email)
    if (existingInvitation) {
      await consumeInvitation(existingInvitation.rowId)
    }

    const { token, expiresAt } = await createInvitation({
      email: user.email,
      locale: parsedInput.locale,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      role: user.role as 'ADMIN' | 'USER',
      position: user.position,
      applications: user.applications as Array<'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'>,
      arrivalDate: user.arrivalDate,
      departureDate: user.departureDate,
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const setupLink = `${appUrl}/${parsedInput.locale}/welcome/${token}`

    await sendWelcomeEmail({
      to: user.email,
      locale: parsedInput.locale,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      position: user.position,
      setupLink,
      accessEndDate: user.departureDate,
    })

    revalidatePath('/admin/users')
    return { ok: true, expiresAt }
  })
