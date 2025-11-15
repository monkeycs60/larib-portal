import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { r2PutObject } from '@/lib/services/r2-s3'

export const runtime = 'nodejs'

const AllowedPdf = ['application/pdf'] as const

function buildTempCasePdfKey(userId: string, filename: string) {
  const safe = filename.trim().replace(/[^a-zA-Z0-9_.-]+/g, '-')
  const ts = Date.now()
  return `bestof-larib/tmp/${userId}/${ts}-${safe}`
}

export async function POST(req: NextRequest) {
  const session = await getTypedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file_missing' }, { status: 400 })
  }

  const contentType = file.type
  const size = file.size
  if (!AllowedPdf.includes(contentType as typeof AllowedPdf[number])) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
  }
  if (size > 30 * 1024 * 1024) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
  }

  const key = buildTempCasePdfKey(session.user.id, file.name)
  const ab = await file.arrayBuffer()
  const buf = Buffer.from(ab)
  try {
    const uploaded = await r2PutObject(key, buf, contentType)
    return NextResponse.json({ url: uploaded.url, key: uploaded.key })
  } catch (e: unknown) {
    console.error('Clinical PDF upload failed', e)
    const err = e as { name?: string; message?: string; Code?: string }
    return NextResponse.json({ error: 'upload_failed', code: err?.['Code'] ?? err?.name, message: err?.message }, { status: 500 })
  }
}

