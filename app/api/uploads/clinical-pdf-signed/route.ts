import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { r2GetSignedUploadUrl } from '@/lib/services/r2-s3'

export const runtime = 'nodejs'

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

  const body = await req.json()
  const { filename, contentType } = body

  if (!filename || typeof filename !== 'string') {
    return NextResponse.json({ error: 'filename_missing' }, { status: 400 })
  }

  if (contentType !== 'application/pdf') {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
  }

  try {
    const key = buildTempCasePdfKey(session.user.id, filename)
    const { uploadUrl, key: finalKey, publicUrl } = await r2GetSignedUploadUrl(
      key,
      contentType,
      3600
    )

    return NextResponse.json({
      uploadUrl,
      key: finalKey,
      publicUrl,
    })
  } catch (e: unknown) {
    console.error('Failed to generate signed URL', e)
    const err = e as { name?: string; message?: string; Code?: string }
    return NextResponse.json(
      {
        error: 'signed_url_failed',
        code: err?.['Code'] ?? err?.name,
        message: err?.message,
      },
      { status: 500 }
    )
  }
}
