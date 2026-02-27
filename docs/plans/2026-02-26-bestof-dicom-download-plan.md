# DICOM Download Feature — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow authenticated students to download DICOM files (individually or in batches of up to 50 cases) from Training Best-of, with DICOMs stored on the OVH FTP server.

**Architecture:** New `caseNumber` field on `ClinicalCase` links cases to DICOM folders on the OVH server via SFTP. API routes stream zips on-the-fly. The cases table gets checkboxes for batch selection with a floating action bar.

**Tech Stack:** `ssh2-sftp-client` (SFTP), `archiver` (streaming zip), Prisma migration, Next.js API routes, shadcn/ui Checkbox.

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install ssh2-sftp-client and archiver**

Run:
```bash
cd /Users/solenntoupin/Documents/wildcoding/larib-portal && npm install ssh2-sftp-client archiver && npm install -D @types/ssh2-sftp-client @types/archiver
```

**Step 2: Verify installation**

Run: `cd /Users/solenntoupin/Documents/wildcoding/larib-portal && node -e "require('ssh2-sftp-client'); require('archiver'); console.log('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(bestof): add ssh2-sftp-client and archiver dependencies for DICOM downloads"
```

---

### Task 2: Add caseNumber to ClinicalCase schema

**Files:**
- Modify: `prisma/schema.prisma` (ClinicalCase model, around line 108-137)

**Step 1: Add the caseNumber field to ClinicalCase**

In `prisma/schema.prisma`, add to the `ClinicalCase` model (after line 113, after `tags`):

```prisma
  caseNumber  Int     @unique @default(autoincrement())
```

**Step 2: Generate and run migration**

Run:
```bash
cd /Users/solenntoupin/Documents/wildcoding/larib-portal && npx prisma migrate dev --name add-case-number
```

Expected: Migration created and applied successfully. Each existing case gets an auto-incremented `caseNumber`.

**Step 3: Verify in Prisma Studio**

Run:
```bash
cd /Users/solenntoupin/Documents/wildcoding/larib-portal && npx prisma studio
```

Check that existing `ClinicalCase` rows have sequential `caseNumber` values (1, 2, 3...).

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(bestof): add caseNumber auto-increment field to ClinicalCase"
```

---

### Task 3: Add environment variables for SFTP

**Files:**
- Modify: `.env`

**Step 1: Add SFTP config to .env**

Append to `.env`:

```env
# SFTP - OVH server for DICOM files
SFTP_HOST=152.228.221.137
SFTP_PORT=22
SFTP_USERNAME=solenn
SFTP_PASSWORD=rien3plus
BESTOF_DICOMS_BASE_PATH=/data/miracl/bestof
```

**Step 2: Commit**

Do NOT commit `.env`. Just verify the variables are set.

---

### Task 4: Create SFTP client utility

**Files:**
- Create: `lib/services/sftp.ts`

**Step 1: Create the SFTP service**

Create `lib/services/sftp.ts`:

```typescript
import SftpClient from 'ssh2-sftp-client'

const SFTP_CONFIG = {
  host: process.env.SFTP_HOST,
  port: Number(process.env.SFTP_PORT) || 22,
  username: process.env.SFTP_USERNAME,
  password: process.env.SFTP_PASSWORD,
}

const BESTOF_BASE_PATH = process.env.BESTOF_DICOMS_BASE_PATH || '/data/miracl/bestof'

export function getDicomPath(examTypeName: string, caseNumber: number): string {
  const paddedNumber = String(caseNumber).padStart(4, '0')
  return `${BESTOF_BASE_PATH}/${examTypeName}/${paddedNumber}`
}

export async function createSftpClient(): Promise<SftpClient> {
  const sftp = new SftpClient()
  await sftp.connect(SFTP_CONFIG)
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
```

**Step 2: Verify it compiles**

Run: `cd /Users/solenntoupin/Documents/wildcoding/larib-portal && npx tsc --noEmit lib/services/sftp.ts 2>&1 | head -20`

If there are type issues, fix them.

**Step 3: Commit**

```bash
git add lib/services/sftp.ts
git commit -m "feat(bestof): add SFTP client utility for DICOM file access"
```

---

### Task 5: Create API route — check DICOM availability

**Files:**
- Create: `app/api/bestof/dicoms/check/route.ts`

**Step 1: Create the check endpoint**

Create `app/api/bestof/dicoms/check/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { checkDicomsExist } from '@/lib/services/sftp'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getTypedSession()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const caseId = request.nextUrl.searchParams.get('caseId')
  if (!caseId) {
    return NextResponse.json({ error: 'caseId_missing' }, { status: 400 })
  }

  const clinicalCase = await prisma.clinicalCase.findUnique({
    where: { id: caseId },
    select: { caseNumber: true, examType: { select: { name: true } } },
  })

  if (!clinicalCase || !clinicalCase.examType) {
    return NextResponse.json({ exists: false, fileCount: 0, totalSizeMB: 0 })
  }

  const result = await checkDicomsExist(clinicalCase.examType.name, clinicalCase.caseNumber)

  return NextResponse.json({
    exists: result.exists,
    fileCount: result.fileCount,
    totalSizeMB: Math.round((result.totalSizeBytes / (1024 * 1024)) * 10) / 10,
  })
}
```

**Step 2: Commit**

```bash
git add app/api/bestof/dicoms/check/route.ts
git commit -m "feat(bestof): add API route to check DICOM availability for a case"
```

---

### Task 6: Create API route — download single case DICOMs

**Files:**
- Create: `app/api/bestof/dicoms/download/route.ts`

**Step 1: Create the download endpoint**

Create `app/api/bestof/dicoms/download/route.ts`:

```typescript
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

  const clinicalCase = await prisma.clinicalCase.findUnique({
    where: { id: caseId },
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
      const stream = sftp.createReadStream(remotePath)
      archive.append(stream, { name: file.name })
    }

    archive.on('end', () => {
      void sftp.end()
    })

    archive.on('error', () => {
      void sftp.end()
    })

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
```

**Step 2: Commit**

```bash
git add app/api/bestof/dicoms/download/route.ts
git commit -m "feat(bestof): add streaming zip download API route for single case DICOMs"
```

---

### Task 7: Create API route — batch download

**Files:**
- Create: `app/api/bestof/dicoms/download-batch/route.ts`

**Step 1: Create the batch download endpoint**

Create `app/api/bestof/dicoms/download-batch/route.ts`:

```typescript
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

  const cases = await prisma.clinicalCase.findMany({
    where: { id: { in: caseIds } },
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
        const stream = sftp.createReadStream(remotePath)
        archive.append(stream, { name: `${folderName}/${file.name}` })
      }
    }

    archive.on('end', () => {
      void sftp.end()
    })

    archive.on('error', () => {
      void sftp.end()
    })

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
```

**Step 2: Commit**

```bash
git add app/api/bestof/dicoms/download-batch/route.ts
git commit -m "feat(bestof): add batch DICOM download API route (max 50 cases)"
```

---

### Task 8: Add caseNumber to service layer and queries

**Files:**
- Modify: `lib/services/bestof-larib.ts`

**Step 1: Add caseNumber to ClinicalCaseListItem select**

In `lib/services/bestof-larib.ts`, add `caseNumber: true` to:

1. The `ClinicalCaseListItem` type (around line 18-32) — add `caseNumber: true` to the select type
2. The `listClinicalCasesQuery` function (around line 34-50) — add `caseNumber: true` to select
3. The `fetchClinicalCases` function (around line 220-242) — add `caseNumber: true` to select
4. The `fetchCaseById` function (around line 606-621) — add `caseNumber: true` to select

**Step 2: Add caseNumber to ClinicalCaseWithDisplayTags mapping**

In `fetchClinicalCases` (around line 265-298), ensure `caseNumber` is passed through in the mapping.

**Step 3: Add caseNumber to createClinicalCase return**

In `createClinicalCase` (around line 541-565), add `caseNumber: true` to the `select` block so the response includes the new case number.

**Step 4: Verify**

Run: `cd /Users/solenntoupin/Documents/wildcoding/larib-portal && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors (or only pre-existing ones)

**Step 5: Commit**

```bash
git add lib/services/bestof-larib.ts
git commit -m "feat(bestof): include caseNumber in all case queries and types"
```

---

### Task 9: Add translations for DICOM download UI

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/fr.json`

**Step 1: Add DICOM-related translations to en.json**

Inside the `"bestof"` object, add:

```json
"dicom": {
  "download": "Download DICOMs",
  "downloadBatch": "Download DICOMs ({count} cases)",
  "downloading": "Downloading...",
  "noDicoms": "No DICOMs available",
  "selectAll": "Select all",
  "deselectAll": "Deselect all",
  "selected": "{count} selected",
  "batchLimit": "Maximum 50 cases per download",
  "estimatedSize": "Estimated size: {size}",
  "available": "DICOMs available",
  "notAvailable": "No DICOMs",
  "fileCount": "{count} files",
  "ftpPath": "Expected FTP path: {path}",
  "caseNumber": "Case #"
}
```

**Step 2: Add DICOM-related translations to fr.json**

Inside the `"bestof"` object, add:

```json
"dicom": {
  "download": "Télécharger les DICOMs",
  "downloadBatch": "Télécharger les DICOMs ({count} cas)",
  "downloading": "Téléchargement...",
  "noDicoms": "Aucun DICOM disponible",
  "selectAll": "Tout sélectionner",
  "deselectAll": "Tout désélectionner",
  "selected": "{count} sélectionné(s)",
  "batchLimit": "Maximum 50 cas par téléchargement",
  "estimatedSize": "Taille estimée : {size}",
  "available": "DICOMs disponibles",
  "notAvailable": "Pas de DICOMs",
  "fileCount": "{count} fichiers",
  "ftpPath": "Chemin FTP attendu : {path}",
  "caseNumber": "Cas n°"
}
```

**Step 3: Commit**

```bash
git add messages/en.json messages/fr.json
git commit -m "feat(bestof): add FR/EN translations for DICOM download UI"
```

---

### Task 10: Add shadcn Checkbox component

**Step 1: Check if Checkbox exists**

Run: `ls /Users/solenntoupin/Documents/wildcoding/larib-portal/components/ui/checkbox.tsx 2>/dev/null || echo "NOT FOUND"`

If NOT FOUND:

**Step 2: Install Checkbox from shadcn**

Run:
```bash
cd /Users/solenntoupin/Documents/wildcoding/larib-portal && npx shadcn@latest add checkbox
```

**Step 3: Commit**

```bash
git add components/ui/checkbox.tsx
git commit -m "feat(ui): add shadcn Checkbox component"
```

---

### Task 11: Create DICOM selection store (Zustand)

**Files:**
- Create: `lib/stores/dicom-selection-store.ts`

**Step 1: Create the store**

Create `lib/stores/dicom-selection-store.ts`:

```typescript
import { create } from 'zustand'

type DicomSelectionState = {
  selectedCaseIds: Set<string>
  casesWithDicoms: Set<string>
}

type DicomSelectionActions = {
  toggleCase: (caseId: string) => void
  selectAll: (caseIds: string[]) => void
  deselectAll: () => void
  setCasesWithDicoms: (caseIds: string[]) => void
  hasDicoms: (caseId: string) => boolean
}

export const useDicomSelectionStore = create<DicomSelectionState & DicomSelectionActions>((set, get) => ({
  selectedCaseIds: new Set(),
  casesWithDicoms: new Set(),

  toggleCase: (caseId) =>
    set((state) => {
      const next = new Set(state.selectedCaseIds)
      if (next.has(caseId)) {
        next.delete(caseId)
      } else {
        next.add(caseId)
      }
      return { selectedCaseIds: next }
    }),

  selectAll: (caseIds) =>
    set(() => ({
      selectedCaseIds: new Set(caseIds),
    })),

  deselectAll: () =>
    set(() => ({
      selectedCaseIds: new Set(),
    })),

  setCasesWithDicoms: (caseIds) =>
    set(() => ({
      casesWithDicoms: new Set(caseIds),
    })),

  hasDicoms: (caseId) => get().casesWithDicoms.has(caseId),
}))
```

**Step 2: Commit**

```bash
git add lib/stores/dicom-selection-store.ts
git commit -m "feat(bestof): add Zustand store for DICOM case selection"
```

---

### Task 12: Create API route — bulk check DICOMs for all cases

This endpoint is needed for the list view to show which cases have DICOMs.

**Files:**
- Create: `app/api/bestof/dicoms/check-bulk/route.ts`

**Step 1: Create the bulk check endpoint**

Create `app/api/bestof/dicoms/check-bulk/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getTypedSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { createSftpClient, getDicomPath } from '@/lib/services/sftp'

export const runtime = 'nodejs'

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

  const cases = await prisma.clinicalCase.findMany({
    where: { id: { in: caseIds } },
    select: { id: true, caseNumber: true, examType: { select: { name: true } } },
  })

  const sftp = await createSftpClient()

  try {
    const results: Record<string, boolean> = {}

    for (const clinicalCase of cases) {
      if (!clinicalCase.examType) {
        results[clinicalCase.id] = false
        continue
      }
      const dirPath = getDicomPath(clinicalCase.examType.name, clinicalCase.caseNumber)
      const exists = await sftp.exists(dirPath)
      if (!exists) {
        results[clinicalCase.id] = false
        continue
      }
      const files = await sftp.list(dirPath)
      results[clinicalCase.id] = files.some((file) => file.type === '-')
    }

    return NextResponse.json({ results })
  } finally {
    await sftp.end()
  }
}
```

**Step 2: Commit**

```bash
git add app/api/bestof/dicoms/check-bulk/route.ts
git commit -m "feat(bestof): add bulk DICOM check API route for cases list"
```

---

### Task 13: Convert CasesTable to client component wrapper with checkboxes

The current `CasesTable` is a server component. We need a client wrapper to handle selection state.

**Files:**
- Create: `app/[locale]/bestof-larib/components/dicom-cases-table-wrapper.tsx`

**Step 1: Create the client wrapper component**

Create `app/[locale]/bestof-larib/components/dicom-cases-table-wrapper.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, HardDrive } from 'lucide-react'
import { toast } from 'sonner'
import { useDicomSelectionStore } from '@/lib/stores/dicom-selection-store'

const MAX_BATCH = 50

export function DicomSelectionBar() {
  const t = useTranslations('bestof.dicom')
  const { selectedCaseIds, casesWithDicoms, selectAll, deselectAll } = useDicomSelectionStore()
  const selectedCount = selectedCaseIds.size
  const [downloading, setDownloading] = useState(false)

  if (selectedCount === 0) return null

  const handleBatchDownload = async () => {
    setDownloading(true)
    try {
      const response = await fetch('/api/bestof/dicoms/download-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseIds: Array.from(selectedCaseIds) }),
      })
      if (!response.ok) throw new Error('download_failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'bestof_dicoms_batch.zip'
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success(t('download'))
    } catch {
      toast.error(t('downloading'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className='sticky bottom-4 z-50 mx-auto w-fit'>
      <div className='flex items-center gap-4 rounded-lg border bg-background px-4 py-3 shadow-lg'>
        <span className='text-sm font-medium'>
          {t('selected', { count: selectedCount })}
        </span>
        <Button
          size='sm'
          variant='outline'
          onClick={() => selectAll(Array.from(casesWithDicoms))}
        >
          {t('selectAll')}
        </Button>
        <Button size='sm' variant='outline' onClick={deselectAll}>
          {t('deselectAll')}
        </Button>
        <Button
          size='sm'
          disabled={selectedCount > MAX_BATCH || downloading}
          onClick={handleBatchDownload}
        >
          <Download className='size-4 mr-2' />
          {downloading ? t('downloading') : t('downloadBatch', { count: selectedCount })}
        </Button>
        {selectedCount > MAX_BATCH && (
          <span className='text-xs text-destructive'>{t('batchLimit')}</span>
        )}
      </div>
    </div>
  )
}

export function DicomCheckbox({ caseId }: { caseId: string }) {
  const { selectedCaseIds, casesWithDicoms, toggleCase } = useDicomSelectionStore()
  const hasDicoms = casesWithDicoms.has(caseId)
  const isSelected = selectedCaseIds.has(caseId)

  return (
    <Checkbox
      checked={isSelected}
      onCheckedChange={() => toggleCase(caseId)}
      disabled={!hasDicoms}
      aria-label={hasDicoms ? 'Select case for download' : 'No DICOMs available'}
    />
  )
}

export function DicomIndicator({ caseId }: { caseId: string }) {
  const casesWithDicoms = useDicomSelectionStore((state) => state.casesWithDicoms)
  const hasDicoms = casesWithDicoms.has(caseId)

  return (
    <span title={hasDicoms ? 'DICOMs available' : 'No DICOMs'}>
      <HardDrive className={`size-4 ${hasDicoms ? 'text-emerald-600' : 'text-slate-300'}`} />
    </span>
  )
}

export function DicomBulkChecker({ caseIds }: { caseIds: string[] }) {
  const setCasesWithDicoms = useDicomSelectionStore((state) => state.setCasesWithDicoms)

  useEffect(() => {
    if (caseIds.length === 0) return

    const fetchDicomStatus = async () => {
      try {
        const response = await fetch('/api/bestof/dicoms/check-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseIds }),
        })
        if (!response.ok) return
        const data = await response.json() as { results: Record<string, boolean> }
        const withDicoms = Object.entries(data.results)
          .filter(([, hasDicoms]) => hasDicoms)
          .map(([caseId]) => caseId)
        setCasesWithDicoms(withDicoms)
      } catch {
        // Silent fail — indicators will show "no DICOMs" by default
      }
    }

    void fetchDicomStatus()
  }, [caseIds, setCasesWithDicoms])

  return null
}
```

**Step 2: Commit**

```bash
git add app/[locale]/bestof-larib/components/dicom-cases-table-wrapper.tsx
git commit -m "feat(bestof): add DICOM selection bar, checkbox, indicator, and bulk checker components"
```

---

### Task 14: Integrate DICOM components into CasesTable

**Files:**
- Modify: `app/[locale]/bestof-larib/components/cases-table.tsx`

**Step 1: Add checkbox column and DICOM indicator to the table**

In `cases-table.tsx`:

1. Add imports at the top:
```typescript
import { DicomCheckbox, DicomIndicator, DicomBulkChecker } from './dicom-cases-table-wrapper'
```

2. After `<CasesTableCacheHydrator ... />` (line 99), add:
```typescript
<DicomBulkChecker caseIds={cases.map((c) => c.id)} />
```

3. Add a new `<TableHead>` at the beginning of the header (before the status column, around line 103):
```typescript
<TableHead className='w-10'></TableHead>
<TableHead className='w-10'></TableHead>
```

4. Add corresponding cells at the beginning of each row (inside `cases.map`, before the status cell, around line 180):
```typescript
<TableCell className='w-10'>
  <DicomCheckbox caseId={caseItem.id} />
</TableCell>
<TableCell className='w-10'>
  <DicomIndicator caseId={caseItem.id} />
</TableCell>
```

5. Update the empty state `colSpan` to account for the 2 new columns.

**Step 2: Verify the build**

Run: `cd /Users/solenntoupin/Documents/wildcoding/larib-portal && npm run build 2>&1 | tail -20`

**Step 3: Commit**

```bash
git add app/[locale]/bestof-larib/components/cases-table.tsx
git commit -m "feat(bestof): integrate DICOM checkbox and indicator into cases table"
```

---

### Task 15: Add DicomSelectionBar to main bestof page

**Files:**
- Modify: `app/[locale]/bestof-larib/page.tsx`

**Step 1: Add the selection bar after the table**

In `page.tsx`:

1. Add import:
```typescript
import { DicomSelectionBar } from './components/dicom-cases-table-wrapper'
```

2. After the `<CasesTable ... />` component (around line 262), add:
```typescript
<DicomSelectionBar />
```

**Step 2: Commit**

```bash
git add app/[locale]/bestof-larib/page.tsx
git commit -m "feat(bestof): add DICOM selection bar to main cases page"
```

---

### Task 16: Add download button to case detail page

**Files:**
- Create: `app/[locale]/bestof-larib/[id]/components/dicom-download-button.tsx`
- Modify: `app/[locale]/bestof-larib/[id]/page.tsx`

**Step 1: Create the download button component**

Create `app/[locale]/bestof-larib/[id]/components/dicom-download-button.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

export default function DicomDownloadButton({ caseId }: { caseId: string }) {
  const t = useTranslations('bestof.dicom')
  const [downloading, setDownloading] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const response = await fetch(`/api/bestof/dicoms/check?caseId=${caseId}`)
        if (!response.ok) return
        const data = await response.json() as { exists: boolean }
        setAvailable(data.exists)
      } catch {
        setAvailable(false)
      }
    }
    void checkAvailability()
  }, [caseId])

  if (available === null || !available) return null

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`/api/bestof/dicoms/download?caseId=${caseId}`)
      if (!response.ok) throw new Error('download_failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      const disposition = response.headers.get('Content-Disposition')
      const filename = disposition?.match(/filename="(.+)"/)?.[1] || 'dicoms.zip'
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t('noDicoms'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Button size='sm' variant='outline' onClick={handleDownload} disabled={downloading}>
      <Download className='size-4 mr-2' />
      {downloading ? t('downloading') : t('download')}
    </Button>
  )
}
```

**Step 2: Add the button to the case detail page header**

In `app/[locale]/bestof-larib/[id]/page.tsx`:

1. Add import:
```typescript
import DicomDownloadButton from './components/dicom-download-button'
```

2. After the difficulty Badge (around line 94), add:
```typescript
<DicomDownloadButton caseId={c.id} />
```

**Step 3: Commit**

```bash
git add app/[locale]/bestof-larib/[id]/components/dicom-download-button.tsx app/[locale]/bestof-larib/[id]/page.tsx
git commit -m "feat(bestof): add DICOM download button on case detail page"
```

---

### Task 17: Show caseNumber and DICOM status in admin create/edit dialog

**Files:**
- Modify: `app/[locale]/bestof-larib/components/create-case-dialog.tsx`

**Step 1: Add caseNumber display in the dialog**

In `create-case-dialog.tsx`:

1. Update the `ClinicalCase` type (around line 59) to include `caseNumber`:
```typescript
type ClinicalCase = {
  id: string
  name: string
  caseNumber: number
  // ... rest unchanged
}
```

2. After the case name field (around line 540), add a read-only display of the case number and expected FTP path when editing:
```typescript
{clinicalCase ? (
  <div className='bg-muted rounded p-3 text-sm'>
    <div className='font-medium'>{t('dicom.caseNumber')}: {String(clinicalCase.caseNumber).padStart(4, '0')}</div>
    {clinicalCase.examType ? (
      <div className='text-muted-foreground mt-1'>
        {t('dicom.ftpPath', { path: `bestof/${clinicalCase.examType.name}/${String(clinicalCase.caseNumber).padStart(4, '0')}/` })}
      </div>
    ) : null}
  </div>
) : null}
```

**Step 2: Pass caseNumber from CasesTable to CreateCaseDialog**

In `cases-table.tsx`, add `caseNumber` to the `clinicalCase` prop passed to `CreateCaseDialog` (around line 268):
```typescript
caseNumber: caseItem.caseNumber,
```

Note: This requires `caseNumber` to be in `ClinicalCaseWithDisplayTags`, which was added in Task 8.

**Step 3: Commit**

```bash
git add app/[locale]/bestof-larib/components/create-case-dialog.tsx app/[locale]/bestof-larib/components/cases-table.tsx
git commit -m "feat(bestof): show caseNumber and FTP path in admin case edit dialog"
```

---

### Task 18: Add DICOM admin badge in cases table (admin view)

**Files:**
- Create: `app/[locale]/bestof-larib/components/dicom-admin-badge.tsx`
- Modify: `app/[locale]/bestof-larib/components/cases-table.tsx`

**Step 1: Create the admin badge component**

Create `app/[locale]/bestof-larib/components/dicom-admin-badge.tsx`:

```typescript
'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { useDicomSelectionStore } from '@/lib/stores/dicom-selection-store'

export default function DicomAdminBadge({ caseId }: { caseId: string }) {
  const t = useTranslations('bestof.dicom')
  const casesWithDicoms = useDicomSelectionStore((state) => state.casesWithDicoms)
  const hasDicoms = casesWithDicoms.has(caseId)

  return hasDicoms ? (
    <Badge className='bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs'>
      {t('available')}
    </Badge>
  ) : (
    <Badge className='bg-red-50 text-red-700 border border-red-200 text-xs'>
      {t('notAvailable')}
    </Badge>
  )
}
```

**Step 2: Add the badge in the admin view of CasesTable**

In `cases-table.tsx`, for admin rows, add the `DicomAdminBadge` next to the case name cell or as a separate column. The simplest approach is to add it after the name in the same cell:

After the `<TableCell className='font-medium'>` for the name (around line 181):
```typescript
<TableCell className='font-medium'>
  <div className='flex items-center gap-2'>
    {caseItem.name}
    {isAdmin ? <DicomAdminBadge caseId={caseItem.id} /> : null}
  </div>
</TableCell>
```

**Step 3: Commit**

```bash
git add app/[locale]/bestof-larib/components/dicom-admin-badge.tsx app/[locale]/bestof-larib/components/cases-table.tsx
git commit -m "feat(bestof): add DICOM availability badge in admin cases table"
```

---

### Task 19: Build verification and manual testing

**Step 1: Run type check**

Run: `cd /Users/solenntoupin/Documents/wildcoding/larib-portal && npx tsc --noEmit 2>&1 | tail -30`
Expected: No new type errors

**Step 2: Run build**

Run: `cd /Users/solenntoupin/Documents/wildcoding/larib-portal && npm run build 2>&1 | tail -30`
Expected: Build succeeds

**Step 3: Run existing tests**

Run: `cd /Users/solenntoupin/Documents/wildcoding/larib-portal && npm run test:e2e 2>&1 | tail -30`
Expected: Existing tests still pass

**Step 4: Manual testing checklist**

- [ ] Start dev server: `npm run dev`
- [ ] Navigate to bestof cases list
- [ ] Verify checkboxes and DICOM indicators appear
- [ ] Create a test folder on FTP: `/data/miracl/bestof/MRI/0001/` with a test .dcm file
- [ ] Refresh the page — case with matching caseNumber should show green indicator
- [ ] Check the checkbox and verify selection bar appears
- [ ] Click download — verify zip is generated
- [ ] Open a case detail page — verify download button appears/hides based on DICOM availability
- [ ] As admin, edit a case — verify caseNumber and FTP path are displayed
