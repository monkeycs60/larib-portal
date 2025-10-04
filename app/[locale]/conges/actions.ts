'use server'

import { authenticatedAction, adminOnlyAction } from '@/actions/safe-action'
import {
  createLeaveRequest,
  updateLeaveAllocation,
  updateLeaveStatus,
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
  .schema(requestLeaveSchema)
  .action(async ({ input, ctx }) => {
    await createLeaveRequest({
      userId: ctx.userId,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      reason: input.reason ?? null,
    })

    await revalidateConges()

    return { success: true }
  })

const updateStatusSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(['APPROVED', 'REJECTED']),
})

export const updateLeaveStatusAction = adminOnlyAction
  .schema(updateStatusSchema)
  .action(async ({ input, ctx }) => {
    await updateLeaveStatus({
      requestId: input.requestId,
      status: input.status,
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
  .schema(updateAllocationSchema)
  .action(async ({ input }) => {
    await updateLeaveAllocation({
      userId: input.userId,
      totalAllocationDays: input.totalAllocationDays,
    })

    await revalidateConges()

    return { success: true }
  })
