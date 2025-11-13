"use server"

import { z } from "zod"
import { actionClient } from "@/actions/safe-action"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const CreateAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  accessCode: z.string().min(1),
})

export const createAdminAction = actionClient
  .inputSchema(CreateAdminSchema)
  .action(async ({ parsedInput }) => {
    if (parsedInput.accessCode !== "ristifou") {
      throw new Error("INVALID_ACCESS_CODE")
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: parsedInput.email }
    })

    if (existingUser) {
      throw new Error("USER_ALREADY_EXISTS")
    }

    const adminCount = await prisma.user.count({
      where: { role: "ADMIN" }
    })

    const adminNumber = adminCount + 1

    const result = await auth.api.signUpEmail({
      body: {
        email: parsedInput.email,
        password: parsedInput.password,
        name: `Admin User ${adminNumber}`,
      },
    })

    if ('error' in result && result.error) {
      throw new Error(result.error.message || 'SIGNUP_FAILED')
    }

    await prisma.user.update({
      where: { email: parsedInput.email },
      data: {
        role: "ADMIN",
        emailVerified: true,
        language: "FR",
        applications: ["BESTOF_LARIB", "CONGES", "CARDIOLARIB"],
      }
    })

    return { success: true }
  })
