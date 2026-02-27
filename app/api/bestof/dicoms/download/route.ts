import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { createSftpClient, getDicomPath } from '@/lib/services/sftp'
import archiver from 'archiver'
import { PassThrough } from 'stream'

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

  const isAdmin = session.user.role === 'ADMIN'
  const clinicalCase = await prisma.clinicalCase.findUnique({
    where: { id: caseId, ...(!isAdmin && { status: 'PUBLISHED' }) },
    select: { caseNumber: true, name: true, examType: { select: { name: true } } },
  })

  if (!clinicalCase || !clinicalCase.examType) {
    return NextResponse.json({ error: 'case_not_found' }, { status: 404 })
  }

  const dirPath = getDicomPath(clinicalCase.examType.name, clinicalCase.caseNumber)
  const paddedNumber = String(clinicalCase.caseNumber).padStart(4, '0')
  const zipName = `Cas_${paddedNumber}_${clinicalCase.examType.name}.zip`

  const sftp = await createSftpClient()

  try {
    const exists = await sftp.exists(dirPath)
    if (!exists) {
      await sftp.end()
      return NextResponse.json({ error: 'no_dicoms' }, { status: 404 })
    }

    const files = await sftp.list(dirPath)
    const dicomFiles = files.filter((file) => file.type === '-')

    if (dicomFiles.length === 0) {
      await sftp.end()
      return NextResponse.json({ error: 'no_dicoms' }, { status: 404 })
    }

    const passthrough = new PassThrough()
    const archive = archiver('zip', { zlib: { level: 1 } })

    archive.pipe(passthrough)

    for (const file of dicomFiles) {
      const remotePath = `${dirPath}/${file.name}`
      const buffer = await sftp.get(remotePath) as Buffer
      archive.append(buffer, { name: file.name })
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
        'Content-Disposition': `attachment; filename="${zipName}"`,
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    await sftp.end()
    console.error('DICOM download error:', error)
    return NextResponse.json({ error: 'download_failed' }, { status: 500 })
  }
}
