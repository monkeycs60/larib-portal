"use server"
import { z } from "zod"
import { adminOnlyAction } from "@/actions/safe-action"
import { ensurePosition, listPositions } from "@/lib/services/positions"

export const createPositionAction = adminOnlyAction
  .inputSchema(z.object({ name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const pos = await ensurePosition(parsedInput.name)
    return pos
  })

export const listPositionsAction = adminOnlyAction
  .inputSchema(z.object({}).optional())
  .action(async () => {
    const positions = await listPositions()
    return positions
  })

