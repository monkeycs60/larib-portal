'use server'

import { authenticatedAction, adminOnlyAction } from '@/actions/safe-action'
import {
  createLeaveRequest,
  updateLeaveAllocation,
  updateLeaveStatus,
  cancelLeaveRequest,
  updateLeaveRequest,
  fetchFrenchHolidays,
} from '@/lib/services/conges'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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

    await createLeaveRequest(
      {
        userId: ctx.userId,
        startDate: new Date(parsedInput.startDate),
        endDate: new Date(parsedInput.endDate),
        reason: parsedInput.reason ?? null,
        autoApprove: shouldAutoApprove ? { approverId: ctx.userId } : undefined,
      },
      frenchHolidays
    )

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
    await cancelLeaveRequest(parsedInput.requestId, ctx.userId)
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
    await updateLeaveRequest(
      {
        requestId: parsedInput.requestId,
        userId: ctx.userId,
        startDate: new Date(parsedInput.startDate),
        endDate: new Date(parsedInput.endDate),
        reason: parsedInput.reason ?? null,
      },
      frenchHolidays
    )
    await revalidateConges()
    return { success: true }
  })
