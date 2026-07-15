import { prisma } from '@/lib/prisma'
import { importAuditPapers } from '@/lib/services/publications/audit-import'
import { AUDIT_PAPERS } from './audit-in-submission.data'

async function main() {
  const email = process.env.AUDIT_CREATED_BY_EMAIL
  if (!email) throw new Error('Set AUDIT_CREATED_BY_EMAIL to the email of the admin user creating these records.')

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) throw new Error(`No user found with email ${email}.`)

  const report = await importAuditPapers(AUDIT_PAPERS, user.id)
  console.log(`Created ${report.createdArticleIds.length} articles, ${report.authorsCreated} new authors.`)
  console.log(`Skipped ${report.skippedTitles.length} already-present titles:`)
  for (const title of report.skippedTitles) console.log(`  - ${title}`)
  console.log('Created article IDs:', report.createdArticleIds.join(', '))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
