import SftpClient from 'ssh2-sftp-client'
import { readFileSync, readdirSync, statSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const LOCAL_BASE = '/Volumes/T7 Shield/TRAINING_BESTOF'
const REMOTE_BASE = '/data/miracl/bestof/CMR'

async function upload() {
  const sftp = new SftpClient()
  await sftp.connect({
    host: '152.228.221.137',
    port: 22,
    username: 'solenn',
    privateKey: readFileSync(join(homedir(), '.ssh', 'id_ed25519')),
  })

  // Ensure base dir exists
  const baseExists = await sftp.exists(REMOTE_BASE)
  if (!baseExists) {
    await sftp.mkdir(REMOTE_BASE, true)
  }

  // List all numeric case folders
  const cases = readdirSync(LOCAL_BASE)
    .filter((name) => /^\d+$/.test(name))
    .sort((a, b) => Number(a) - Number(b))

  console.log(`Found ${cases.length} cases to upload\n`)

  let uploaded = 0
  let skipped = 0

  for (const caseName of cases) {
    const caseNumber = String(Number(caseName)).padStart(4, '0')
    const localDicomDir = join(LOCAL_BASE, caseName, 'DICOM')
    const remoteCaseDir = `${REMOTE_BASE}/${caseNumber}`

    // Check if local DICOM folder exists
    try {
      statSync(localDicomDir)
    } catch {
      console.log(`[SKIP] Case ${caseName} — no DICOM folder`)
      skipped++
      continue
    }

    // Check if already uploaded
    const remoteExists = await sftp.exists(remoteCaseDir)
    if (remoteExists) {
      const remoteFiles = await sftp.list(remoteCaseDir)
      if (remoteFiles.length > 0) {
        console.log(`[SKIP] Case ${caseNumber} — already uploaded (${remoteFiles.length} entries)`)
        skipped++
        continue
      }
    }

    console.log(`[UPLOAD] Case ${caseNumber} — uploading from ${caseName}/DICOM ...`)

    try {
      await sftp.uploadDir(localDicomDir, remoteCaseDir)
      uploaded++
      console.log(`  ✓ Done (${uploaded} uploaded, ${skipped} skipped)`)
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}`)
    }
  }

  await sftp.end()
  console.log(`\nFinished: ${uploaded} uploaded, ${skipped} skipped, ${cases.length} total`)
}

upload().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
