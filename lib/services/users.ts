import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'

export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE'

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

export type UserWithStatusFields = UserWithAdminFields & {
  hasPassword: boolean
}

export function computeUserStatus(user: { departureDate: Date | null }, hasPassword: boolean): UserStatus {
  if (!hasPassword) return 'PENDING'
  if (!user.departureDate) return 'ACTIVE'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const departure = new Date(user.departureDate)
  departure.setHours(0, 0, 0, 0)
  if (today > departure) return 'INACTIVE'
  return 'ACTIVE'
}

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

export async function listUsersWithAccountStatus(): Promise<UserWithStatusFields[]> {
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
        select: {
          password: true,
        },
      },
    },
  })
  return users.map((user) => {
    const hasPassword = user.accounts.some((account) => account.password !== null)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      country: user.country,
      birthDate: user.birthDate,
      language: user.language,
      position: user.position,
      arrivalDate: user.arrivalDate,
      departureDate: user.departureDate,
      congesTotalDays: user.congesTotalDays,
      profilePhoto: user.profilePhoto,
      applications: user.applications,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      hasPassword,
    }
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

export async function getUserStatusById(userId: string): Promise<UserStatus | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      departureDate: true,
      accounts: {
        select: {
          password: true,
        },
      },
    },
  })
  if (!user) return null
  const hasPassword = user.accounts.some((account) => account.password !== null)
  return computeUserStatus(user, hasPassword)
}

export async function getUserDepartureDate(userId: string): Promise<Date | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { departureDate: true },
  })
  return user?.departureDate ?? null
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
