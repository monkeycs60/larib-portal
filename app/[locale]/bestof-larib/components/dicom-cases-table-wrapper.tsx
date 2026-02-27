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
  const availableCount = casesWithDicoms.size
  const [downloading, setDownloading] = useState(false)

  if (availableCount === 0) return null

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
      toast.error(t('noDicoms'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className='sticky bottom-4 z-50 mx-auto w-fit'>
      <div className='flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg'>
        <HardDrive className='size-4 text-emerald-600' />
        {selectedCount === 0 ? (
          <>
            <span className='text-sm text-muted-foreground'>
              {t('hint', { count: availableCount })}
            </span>
            <Button
              size='sm'
              variant='outline'
              onClick={() => selectAll(Array.from(casesWithDicoms))}
            >
              {t('selectAll')}
            </Button>
          </>
        ) : (
          <>
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
          </>
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
