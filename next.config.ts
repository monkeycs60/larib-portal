import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { startServer } from "@react-grab/claude-code/server";

const withNextIntl = createNextIntlPlugin('./app/i18n/request.ts');

const publicBase = process.env.R2_PUBLIC_BASE_URL
const r2Account = process.env.R2_ACCOUNT_ID
const r2Bucket = process.env.R2_BUCKET_NAME
const r2Region = process.env.R2_REGION

const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = []

try {
  if (publicBase) {
    const u = new URL(publicBase)
    remotePatterns.push({ protocol: u.protocol.replace(':','') as 'http' | 'https', hostname: u.hostname, pathname: '/**' })
  }
} catch {}

if (r2Account && r2Bucket) {
  // Path-style S3 endpoint
  remotePatterns.push({ protocol: 'https', hostname: `${r2Account}.r2.cloudflarestorage.com`, pathname: `/${r2Bucket}/**` })
  if (r2Region && r2Region !== 'auto') {
    remotePatterns.push({ protocol: 'https', hostname: `${r2Account}.${r2Region}.r2.cloudflarestorage.com`, pathname: `/${r2Bucket}/**` })
  }
  // Virtual-hosted style (optional)
  remotePatterns.push({ protocol: 'https', hostname: `${r2Bucket}.${r2Account}.r2.cloudflarestorage.com`, pathname: `/**` })
  if (r2Region && r2Region !== 'auto') {
    remotePatterns.push({ protocol: 'https', hostname: `${r2Bucket}.${r2Account}.${r2Region}.r2.cloudflarestorage.com`, pathname: `/**` })
  }
}

if (process.env.NODE_ENV === "development") {
  startServer();
}

const nextConfig: NextConfig = {
    /* config options here */
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    serverExternalPackages: ['ssh2-sftp-client', 'ssh2'],
    compress: true,
    images: {
      remotePatterns,
    },
};

export default withNextIntl(nextConfig);
