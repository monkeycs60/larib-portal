import crypto from 'crypto'

export type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  region: string
  publicBaseUrl?: string
  virtualHosted?: boolean
}

export function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID || ''
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || ''
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || ''
  const bucket = process.env.R2_BUCKET_NAME || ''
  const region = process.env.R2_REGION || 'auto'
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL
  const virtualHosted = process.env.R2_VIRTUAL_HOSTED === 'true'

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('R2 configuration is missing required env variables')
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, region, publicBaseUrl, virtualHosted }
}

function hmac(key: crypto.BinaryLike, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest()
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex')
}

function formatAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const yyyy = date.getUTCFullYear().toString()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const HH = String(date.getUTCHours()).padStart(2, '0')
  const MM = String(date.getUTCMinutes()).padStart(2, '0')
  const SS = String(date.getUTCSeconds()).padStart(2, '0')
  const dateStamp = `${yyyy}${mm}${dd}`
  const amzDate = `${dateStamp}T${HH}${MM}${SS}Z`
  return { amzDate, dateStamp }
}

export type PresignedUpload = {
  uploadUrl: string
  key: string
  publicUrl: string
}

export function r2PublicUrlForKey(key: string): string {
  const { publicBaseUrl, accountId, bucket } = getR2Config()
  const base = publicBaseUrl && publicBaseUrl.trim().length > 0
    ? publicBaseUrl.replace(/\/$/, '')
    : `https://${accountId}.r2.cloudflarestorage.com/${encodeURIComponent(bucket)}`
  // key may contain slashes; do not encode slashes, only each segment
  const parts = key.split('/').map(encodeURIComponent)
  return `${base}/${parts.join('/')}`
}

export function buildUserProfileKey(userId: string, filename: string): string {
  const clean = filename.trim().replace(/[^a-zA-Z0-9_.-]+/g, '-')
  const ext = clean.includes('.') ? clean.split('.').pop() : undefined
  const safeExt = ext && ext.length <= 8 ? ext.toLowerCase() : 'jpg'
  const ts = Date.now()
  return `users/${userId}/profile-${ts}.${safeExt}`
}

export function createPresignedPutUrl(
  key: string,
  expiresInSeconds: number = 300,
  contentType?: string,
): PresignedUpload {
  const cfg = getR2Config()
  const now = new Date()
  const { amzDate, dateStamp } = formatAmzDate(now)

  const baseHost = cfg.region && cfg.region !== 'auto'
    ? `${cfg.accountId}.${cfg.region}.r2.cloudflarestorage.com`
    : `${cfg.accountId}.r2.cloudflarestorage.com`
  const encodedKey = key.split('/').map(encodeURIComponent).join('/')

  // Support both path-style and virtual-hosted style. Some users report
  // fewer CORS quirks with virtual-hosted when presigning PUTs.
  const host = cfg.virtualHosted
    ? `${cfg.bucket}.${baseHost}`
    : baseHost
  const canonicalUri = cfg.virtualHosted
    ? `/${encodedKey}`
    : `/${cfg.bucket}/${encodedKey}`

  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${cfg.region}/s3/aws4_request`
  const credential = `${cfg.accessKeyId}/${credentialScope}`

  // When a Content-Type will be sent by the client, include it in the
  // signature to avoid any signature/CORS inconsistencies.
  const lowerContentType = contentType ? contentType.toLowerCase() : undefined
  const signedHeaders = lowerContentType ? 'content-type;host' : 'host'

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Credential': encodeURIComponent(credential),
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
    // Explicitly declare unsigned payload for R2 compatibility
    'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
  })

  const canonicalQueryString = Array.from(queryParams.entries())
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('&')

  const canonicalHeaders = lowerContentType
    ? `content-type:${lowerContentType}\nhost:${host}\n`
    : `host:${host}\n`
  const payloadHash = 'UNSIGNED-PAYLOAD'
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n')

  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, dateStamp)
  const kRegion = hmac(kDate, cfg.region)
  const kService = hmac(kRegion, 's3')
  const kSigning = hmac(kService, 'aws4_request')
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex')

  const finalQuery = `${canonicalQueryString}&X-Amz-Signature=${signature}`
  const url = `https://${host}${canonicalUri}?${finalQuery}`
  return { uploadUrl: url, key, publicUrl: r2PublicUrlForKey(key) }
}

 
