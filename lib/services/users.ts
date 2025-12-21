import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'
import type { InvitationStatus } from './invitations'

export type AccountStatus = 'ACTIVE' | 'INACTIVE'

export function computeAccountStatus(departureDate: Date | null): AccountStatus {
  if (!departureDate) return 'ACTIVE'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const departure = new Date(departureDate)
  departure.setHours(0, 0, 0, 0)
  if (today > departure) return 'INACTIVE'
  return 'ACTIVE'
}

export type UserWithAdminFields = Prisma.UserGetPayload<{
  select: {
    id: true
    email: true
    name: true
    firstName: true
    lastName: true
    phoneNumber: true
    role: true
    country: true
    birthDate: true
    language: true
    position: true
    arrivalDate: true
    departureDate: true
    congesTotalDays: true
    profilePhoto: true
    applications: true
    createdAt: true
    updatedAt: true
  }
}>

export async function listUsers(): Promise<UserWithAdminFields[]> {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      role: true,
      country: true,
      birthDate: true,
      language: true,
      position: true,
      arrivalDate: true,
      departureDate: true,
      congesTotalDays: true,
      profilePhoto: true,
      applications: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function deleteUserById(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } })
}

export async function getUserRole(userId: string): Promise<'ADMIN' | 'USER'> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return (user?.role as 'ADMIN' | 'USER') ?? 'USER'
}

export type UpdateUserInput = {
  id: string
  email?: string
  firstName?: string | null
  lastName?: string | null
  phoneNumber?: string | null
  role?: 'ADMIN' | 'USER'
  country?: string | null
  birthDate?: Date | null
  language?: 'EN' | 'FR'
  position?: string | null
  arrivalDate?: Date | null
  departureDate?: Date | null
  profilePhoto?: string | null
  profilePhotoKey?: string | null
  congesTotalDays?: number
  applications?: Array<'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'>
}

export async function updateUser(data: UpdateUserInput): Promise<UserWithAdminFields> {
  const { id, ...rest } = data
  return prisma.user.update({
    where: { id },
    data: {
      ...rest,
    },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      role: true,
      country: true,
      birthDate: true,
      language: true,
      position: true,
      arrivalDate: true,
      departureDate: true,
      congesTotalDays: true,
      profilePhoto: true,
      applications: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export type CreatePlaceholderUserInput = {
  email: string
  role: 'ADMIN' | 'USER'
  firstName?: string | null
  lastName?: string | null
  language?: 'EN' | 'FR'
  position?: string | null
  applications?: Array<'BESTOF_LARIB' | 'CONGES' | 'CARDIOLARIB'>
  arrivalDate?: Date | null
  departureDate?: Date | null
}

export async function createPlaceholderUser(data: CreatePlaceholderUserInput): Promise<UserWithAdminFields> {
  const id = crypto.randomUUID()
  const created = await prisma.user.create({
    data: {
      id,
      email: data.email,
      role: data.role,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      language: data.language ?? 'EN',
      position: data.position ?? null,
      congesTotalDays: 0,
      applications: data.applications ?? [],
      arrivalDate: data.arrivalDate ?? null,
      departureDate: data.departureDate ?? null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      role: true,
      country: true,
      birthDate: true,
      language: true,
      position: true,
      arrivalDate: true,
      departureDate: true,
      congesTotalDays: true,
      profilePhoto: true,
      applications: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return created
}

export type UserWithOnboardingStatus = UserWithAdminFields & {
  onboardingStatus: InvitationStatus
  invitationExpiresAt?: Date
  accountStatus: AccountStatus
}

export async function listUsersWithOnboardingStatus(): Promise<UserWithOnboardingStatus[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      role: true,
      country: true,
      birthDate: true,
      language: true,
      position: true,
      arrivalDate: true,
      departureDate: true,
      congesTotalDays: true,
      profilePhoto: true,
      applications: true,
      createdAt: true,
      updatedAt: true,
      accounts: {
        where: {
          providerId: 'credential',
        },
        select: {
          id: true,
          password: true,
        },
      },
    },
  })

  const userEmails = users.map((user) => user.email)
  const invitations = await prisma.verification.findMany({
    where: {
      identifier: { in: userEmails.map((email) => `INVITE:${email}`) },
    },
    select: {
      identifier: true,
      expiresAt: true,
    },
  })

  const invitationByEmail = new Map(
    invitations.map((invitation) => [
      invitation.identifier.replace('INVITE:', ''),
      invitation,
    ])
  )

  return users.map((user) => {
    const { accounts, ...userWithoutAccounts } = user
    const hasPassword = accounts.some((account) => account.password !== null)
    const invitation = invitationByEmail.get(user.email)

    let onboardingStatus: InvitationStatus = 'ACTIVE'
    let invitationExpiresAt: Date | undefined

    if (hasPassword) {
      onboardingStatus = 'ACTIVE'
    } else if (invitation) {
      invitationExpiresAt = invitation.expiresAt
      if (new Date() > invitation.expiresAt) {
        onboardingStatus = 'INVITATION_EXPIRED'
      } else {
        onboardingStatus = 'INVITATION_SENT'
      }
    } else {
      onboardingStatus = 'INVITATION_EXPIRED'
    }

    return {
      ...userWithoutAccounts,
      onboardingStatus,
      invitationExpiresAt,
      accountStatus: computeAccountStatus(user.departureDate),
    }
  })
}

export async function getUserAccountStatus(userId: string): Promise<AccountStatus | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { departureDate: true },
  })
  if (!user) return null
  return computeAccountStatus(user.departureDate)
}

export async function getUserDepartureDate(userId: string): Promise<Date | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { departureDate: true },
  })
  return user?.departureDate ?? null
}
