import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { createSftpClient, getDicomPath } from '@/lib/services/sftp'
import archiver from 'archiver'
import { PassThrough } from 'stream'

export const runtime = 'nodejs'

const MAX_BATCH_SIZE = 50

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

  if (caseIds.length > MAX_BATCH_SIZE) {
    return NextResponse.json({ error: 'batch_too_large', max: MAX_BATCH_SIZE }, { status: 400 })
  }

  const isAdmin = session.user.role === 'ADMIN'
  const cases = await prisma.clinicalCase.findMany({
    where: { id: { in: caseIds }, ...(!isAdmin && { status: 'PUBLISHED' }) },
    select: { id: true, caseNumber: true, examType: { select: { name: true } } },
  })

  const validCases = cases.filter(
    (c): c is typeof c & { examType: { name: string } } => c.examType !== null
  )

  if (validCases.length === 0) {
    return NextResponse.json({ error: 'no_valid_cases' }, { status: 404 })
  }

  const sftp = await createSftpClient()

  try {
    const passthrough = new PassThrough()
    const archive = archiver('zip', { zlib: { level: 1 } })

    archive.pipe(passthrough)

    for (const clinicalCase of validCases) {
      const dirPath = getDicomPath(clinicalCase.examType.name, clinicalCase.caseNumber)
      const exists = await sftp.exists(dirPath)
      if (!exists) continue

      const files = await sftp.list(dirPath)
      const dicomFiles = files.filter((file) => file.type === '-')
      const paddedNumber = String(clinicalCase.caseNumber).padStart(4, '0')
      const folderName = `${paddedNumber}_${clinicalCase.examType.name}`

      for (const file of dicomFiles) {
        const remotePath = `${dirPath}/${file.name}`
        const buffer = await sftp.get(remotePath) as Buffer
        archive.append(buffer, { name: `${folderName}/${file.name}` })
      }
    }

    await sftp.end()
    void archive.finalize()

    const webStream = new ReadableStream({
      start(controller) {
        passthrough.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk))
        })
        passthrough.on('end', () => {
          controller.close()
        })
        passthrough.on('error', (error) => {
          controller.error(error)
        })
      },
    })

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="bestof_dicoms_batch.zip"',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    await sftp.end()
    console.error('Batch DICOM download error:', error)
    return NextResponse.json({ error: 'download_failed' }, { status: 500 })
  }
}
