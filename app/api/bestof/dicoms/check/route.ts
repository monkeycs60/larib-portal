import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { checkDicomsExist } from '@/lib/services/sftp'
import { canAdminApp } from '@/lib/permissions'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getTypedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const caseId = request.nextUrl.searchParams.get('caseId')
  if (!caseId) {
    return NextResponse.json({ error: 'caseId_missing' }, { status: 400 })
  }

  const isAdmin = canAdminApp(session.user, 'BESTOF_LARIB')
  const clinicalCase = await prisma.clinicalCase.findFirst({
    where: { id: caseId, ...(!isAdmin && { status: 'PUBLISHED' }) },
    select: { caseNumber: true, examType: { select: { name: true } } },
  })

  if (!clinicalCase || !clinicalCase.examType) {
    return NextResponse.json({ exists: false, fileCount: 0, totalSizeMB: 0 })
  }

  try {
    const result = await checkDicomsExist(clinicalCase.examType.name, clinicalCase.caseNumber)
    return NextResponse.json({
      exists: result.exists,
      fileCount: result.fileCount,
      totalSizeMB: Math.round((result.totalSizeBytes / (1024 * 1024)) * 10) / 10,
    })
  } catch (error) {
    console.error('DICOM check error:', error)
    return NextResponse.json({ exists: false, fileCount: 0, totalSizeMB: 0 })
  }
}
