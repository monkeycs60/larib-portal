import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getR2Config, r2PublicUrlForKey } from './storage'

let s3Client: S3Client | null = null

function client(): S3Client {
  if (s3Client) return s3Client
  const cfg = getR2Config()
  const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com`
  s3Client = new S3Client({
    region: cfg.region || 'auto',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  })
  return s3Client
}

export async function r2PutObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const cfg = getR2Config()
  await client().send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: undefined, // R2 doesn't use canned ACLs; bucket policy controls access
    }),
  )
  return { key, url: r2PublicUrlForKey(key) }
}

