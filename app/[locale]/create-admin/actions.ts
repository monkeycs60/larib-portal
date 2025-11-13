"use server"

import { z } from "zod"
import { actionClient } from "@/actions/safe-action"
import { prisma } from "@/lib/prisma"
import { scrypt, randomBytes, randomUUID } from "crypto"

const CreateAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  accessCode: z.string().min(1),
})

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16)
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      resolve(salt.toString("hex") + ":" + derivedKey.toString("hex"))
    })
  })
}

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

    const hashedPassword = await hashPassword(parsedInput.password)
    const userId = randomUUID()

    const user = await prisma.user.create({
      data: {
        id: userId,
        email: parsedInput.email,
        emailVerified: true,
        role: "ADMIN",
        language: "FR",
        applications: ["BESTOF_LARIB", "CONGES", "CARDIOLARIB"],
      }
    })

    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: parsedInput.email,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      }
    })

    return { success: true, userId: user.id }
  })
