import SftpClient from 'ssh2-sftp-client'
import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

function getSftpConfig() {
  const config: Record<string, unknown> = {
    host: process.env.SFTP_HOST,
    port: Number(process.env.SFTP_PORT) || 22,
    username: process.env.SFTP_USERNAME,
  }

  if (process.env.SFTP_PRIVATE_KEY) {
    config.privateKey = process.env.SFTP_PRIVATE_KEY
  } else if (process.env.SFTP_PRIVATE_KEY_PATH) {
    config.privateKey = readFileSync(process.env.SFTP_PRIVATE_KEY_PATH)
  } else if (process.env.SFTP_PASSWORD) {
    config.password = process.env.SFTP_PASSWORD
  } else {
    const defaultKeyPath = join(homedir(), '.ssh', 'id_ed25519')
    try {
      config.privateKey = readFileSync(defaultKeyPath)
    } catch {
      // Fallback: no auth method available
    }
  }

  return config
}

const BESTOF_BASE_PATH = process.env.BESTOF_DICOMS_BASE_PATH || '/data/miracl/bestof'

export function getDicomPath(examTypeName: string, caseNumber: number): string {
  const paddedNumber = String(caseNumber).padStart(4, '0')
  return `${BESTOF_BASE_PATH}/${examTypeName}/${paddedNumber}`
}

export async function createSftpClient(): Promise<SftpClient> {
  const sftp = new SftpClient()
  await sftp.connect(getSftpConfig())
  return sftp
}

export type DicomCheckResult = {
  exists: boolean
  fileCount: number
  totalSizeBytes: number
}

export async function checkDicomsExist(examTypeName: string, caseNumber: number): Promise<DicomCheckResult> {
  const sftp = await createSftpClient()
  try {
    const dirPath = getDicomPath(examTypeName, caseNumber)
    const exists = await sftp.exists(dirPath)
    if (!exists) {
      return { exists: false, fileCount: 0, totalSizeBytes: 0 }
    }
    const files = await sftp.list(dirPath)
    const dicomFiles = files.filter((file) => file.type === '-')
    const totalSizeBytes = dicomFiles.reduce((sum, file) => sum + file.size, 0)
    return { exists: true, fileCount: dicomFiles.length, totalSizeBytes }
  } finally {
    await sftp.end()
  }
}

export async function listDicomFiles(examTypeName: string, caseNumber: number): Promise<string[]> {
  const sftp = await createSftpClient()
  try {
    const dirPath = getDicomPath(examTypeName, caseNumber)
    const exists = await sftp.exists(dirPath)
    if (!exists) return []
    const files = await sftp.list(dirPath)
    return files.filter((file) => file.type === '-').map((file) => `${dirPath}/${file.name}`)
  } finally {
    await sftp.end()
  }
}
