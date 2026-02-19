'use server'

import { authenticatedAction, adminOnlyAction } from '@/actions/safe-action'
import {
  createLeaveRequest,
  updateLeaveAllocation,
  updateLeaveStatus,
  cancelLeaveRequest,
  updateLeaveRequest,
  fetchFrenchHolidays,
  countWorkingDays,
  getAdminEmails,
} from '@/lib/services/conges'
import { sendLeaveNotificationEmail } from '@/lib/services/email'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { z } from 'zod'

async function sendLeaveNotification({
  userId,
  eventType,
  startDate,
  endDate,
  reason,
  frenchHolidays,
}: {
  userId: string
  eventType: 'created' | 'edited' | 'cancelled'
  startDate: Date
  endDate: Date
  reason: string | null
  frenchHolidays: Record<string, string>
}): Promise<void> {
  try {
    const [adminEmails, user] = await Promise.all([
      getAdminEmails(),
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          language: true,
          congesTotalDays: true,
        },
      }),
    ])

    if (adminEmails.length === 0) return

    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    const locale = user.language === 'FR' ? 'fr' : 'en'
    const dayCount = countWorkingDays(startDate, endDate, frenchHolidays)

    const approvedRequests = await prisma.leaveRequest.findMany({
      where: { userId, status: 'APPROVED' },
      select: { startDate: true, endDate: true },
    })
    const approvedDays = approvedRequests.reduce(
      (total, request) => total + countWorkingDays(request.startDate, request.endDate, frenchHolidays),
      0
    )
    const remainingDays = Math.max((user.congesTotalDays ?? 0) - approvedDays, 0)

    await sendLeaveNotificationEmail({
      adminEmails,
      userEmail: user.email,
      locale,
      eventType,
      userName,
      startDate: format(startDate, 'dd/MM/yyyy'),
      endDate: format(endDate, 'dd/MM/yyyy'),
      dayCount,
      remainingDays,
      reason,
    })
  } catch (error) {
    console.error('Failed to send leave notification email:', error)
  }
}

async function revalidateConges(): Promise<void> {
  await Promise.all([
    revalidatePath('/en/conges'),
    revalidatePath('/fr/conges'),
  ])
}

const requestLeaveSchema = z
  .object({
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    reason: z.string().max(500).optional().nullable(),
  })
  .refine((value) => new Date(value.startDate) <= new Date(value.endDate), {
    message: 'invalidRange',
    path: ['endDate'],
  })

export const requestLeaveAction = authenticatedAction
  .inputSchema(requestLeaveSchema)
  .action(async ({ parsedInput, ctx }) => {
    const shouldAutoApprove = ctx.user.role === 'ADMIN'
    const frenchHolidays = await fetchFrenchHolidays()

    const startDate = new Date(parsedInput.startDate)
    const endDate = new Date(parsedInput.endDate)

    await createLeaveRequest(
      {
        userId: ctx.userId,
        startDate,
        endDate,
        reason: parsedInput.reason ?? null,
        autoApprove: shouldAutoApprove ? { approverId: ctx.userId } : undefined,
      },
      frenchHolidays
    )

    if (!shouldAutoApprove) {
      sendLeaveNotification({
        userId: ctx.userId,
        eventType: 'created',
        startDate,
        endDate,
        reason: parsedInput.reason ?? null,
        frenchHolidays,
      })
    }

    await revalidateConges()

    return { success: true }
  })

const updateStatusSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(['APPROVED', 'REJECTED']),
})

export const updateLeaveStatusAction = adminOnlyAction
  .inputSchema(updateStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    await updateLeaveStatus({
      requestId: parsedInput.requestId,
      status: parsedInput.status,
      approverId: ctx.userId,
    })

    await revalidateConges()

    return { success: true }
  })

const updateAllocationSchema = z.object({
  userId: z.string().min(1),
  totalAllocationDays: z.number().int().min(0).max(3650),
})

export const updateLeaveAllocationAction = adminOnlyAction
  .inputSchema(updateAllocationSchema)
  .action(async ({ parsedInput }) => {
    await updateLeaveAllocation({
      userId: parsedInput.userId,
      totalAllocationDays: parsedInput.totalAllocationDays,
    })

    await revalidateConges()

    return { success: true }
  })

const cancelLeaveSchema = z.object({
  requestId: z.string().min(1),
})

export const cancelLeaveAction = authenticatedAction
  .inputSchema(cancelLeaveSchema)
  .action(async ({ parsedInput, ctx }) => {
    const leaveRequest = await prisma.leaveRequest.findUniqueOrThrow({
      where: { id: parsedInput.requestId },
      select: { startDate: true, endDate: true, reason: true },
    })

    await cancelLeaveRequest(parsedInput.requestId, ctx.userId)

    const frenchHolidays = await fetchFrenchHolidays()
    sendLeaveNotification({
      userId: ctx.userId,
      eventType: 'cancelled',
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      reason: leaveRequest.reason,
      frenchHolidays,
    })

    await revalidateConges()
    return { success: true }
  })

const updateLeaveSchema = z
  .object({
    requestId: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    reason: z.string().max(500).optional().nullable(),
  })
  .refine((value) => new Date(value.startDate) <= new Date(value.endDate), {
    message: 'invalidRange',
    path: ['endDate'],
  })

export const updateLeaveAction = authenticatedAction
  .inputSchema(updateLeaveSchema)
  .action(async ({ parsedInput, ctx }) => {
    const frenchHolidays = await fetchFrenchHolidays()
    const startDate = new Date(parsedInput.startDate)
    const endDate = new Date(parsedInput.endDate)

    await updateLeaveRequest(
      {
        requestId: parsedInput.requestId,
        userId: ctx.userId,
        startDate,
        endDate,
        reason: parsedInput.reason ?? null,
      },
      frenchHolidays
    )

    sendLeaveNotification({
      userId: ctx.userId,
      eventType: 'edited',
      startDate,
      endDate,
      reason: parsedInput.reason ?? null,
      frenchHolidays,
    })

    await revalidateConges()
    return { success: true }
  })
