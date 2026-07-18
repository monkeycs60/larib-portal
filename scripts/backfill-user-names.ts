import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { prisma } from '@/lib/prisma'

const APPLY = process.argv.includes('--apply')
const STRIP_CARDIOLARIB = 'CARDIOLARIB' as const

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim().replace(/\s+/g, ' ')
  const firstSpace = trimmed.indexOf(' ')
  if (firstSpace === -1) return { firstName: trimmed, lastName: '' }
  return {
    firstName: trimmed.slice(0, firstSpace),
    lastName: trimmed.slice(firstSpace + 1),
  }
}

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      applications: true,
      adminApplications: true,
    },
    orderBy: { email: 'asc' },
  })

  const nameTargets = users.filter(
    (user) =>
      !user.firstName?.trim() &&
      !user.lastName?.trim() &&
      !!user.name?.trim() &&
      !user.name.includes('@') &&
      user.name.trim().toLowerCase() !== user.email.trim().toLowerCase(),
  )

  const cardioTargets = users.filter(
    (user) =>
      user.applications.includes(STRIP_CARDIOLARIB) ||
      user.adminApplications.includes(STRIP_CARDIOLARIB),
  )

  console.log(`\n=== Users total: ${users.length} ===\n`)

  console.log(`--- Name backfill (name -> firstName/lastName): ${nameTargets.length} users ---`)
  for (const user of nameTargets) {
    const { firstName, lastName } = splitName(user.name ?? '')
    console.log(`  ${user.email.padEnd(38)} "${user.name}"  ->  firstName="${firstName}" lastName="${lastName}"`)
  }

  console.log(`\n--- CARDIOLARIB strip: ${cardioTargets.length} users ---`)
  for (const user of cardioTargets) {
    console.log(`  ${user.email.padEnd(38)} apps=${JSON.stringify(user.applications)} admin=${JSON.stringify(user.adminApplications)}`)
  }

  if (!APPLY) {
    console.log(`\n[DRY-RUN] Nothing written. Re-run with --apply to persist changes.\n`)
    return
  }

  const backupDir = join(process.cwd(), 'scripts', 'backups')
  mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = join(backupDir, `users-backup-${stamp}.json`)
  writeFileSync(backupPath, JSON.stringify(users, null, 2), 'utf8')
  console.log(`\n[BACKUP] Full snapshot of ${users.length} users written to ${backupPath}`)

  let nameUpdated = 0
  let cardioUpdated = 0
  await prisma.$transaction(async (tx) => {
    for (const user of nameTargets) {
      const { firstName, lastName } = splitName(user.name ?? '')
      await tx.user.update({
        where: { id: user.id },
        data: { firstName, lastName: lastName || null },
      })
      nameUpdated++
    }
    for (const user of cardioTargets) {
      await tx.user.update({
        where: { id: user.id },
        data: {
          applications: user.applications.filter((app) => app !== STRIP_CARDIOLARIB),
          adminApplications: user.adminApplications.filter((app) => app !== STRIP_CARDIOLARIB),
        },
      })
      cardioUpdated++
    }
  })

  console.log(`\n[APPLIED] Name backfill: ${nameUpdated} users. CARDIOLARIB stripped: ${cardioUpdated} users.`)
  console.log(`[NOTE] The "name" column was left untouched.\n`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
