import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma'

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
      applications: data.applications ?? [],
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
      profilePhoto: true,
      applications: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return created
}
