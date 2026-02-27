import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { createSftpClient, getDicomPath } from '@/lib/services/sftp'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const session = await getTypedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { caseIds?: string[] }
  const caseIds = body.caseIds

  if (!Array.isArray(caseIds) || caseIds.length === 0) {
    return NextResponse.json({ error: 'caseIds_required' }, { status: 400 })
  }

  const cases = await prisma.clinicalCase.findMany({
    where: { id: { in: caseIds } },
    select: { id: true, caseNumber: true, examType: { select: { name: true } } },
  })

  const sftp = await createSftpClient()

  try {
    const results: Record<string, boolean> = {}

    for (const clinicalCase of cases) {
      if (!clinicalCase.examType) {
        results[clinicalCase.id] = false
        continue
      }
      const dirPath = getDicomPath(clinicalCase.examType.name, clinicalCase.caseNumber)
      const exists = await sftp.exists(dirPath)
      if (!exists) {
        results[clinicalCase.id] = false
        continue
      }
      const files = await sftp.list(dirPath)
      results[clinicalCase.id] = files.some((file) => file.type === '-')
    }

    return NextResponse.json({ results })
  } finally {
    await sftp.end()
  }
}
