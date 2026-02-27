'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

export default function DicomDownloadButton({ caseId }: { caseId: string }) {
  const t = useTranslations('bestof.dicom')
  const [downloading, setDownloading] = useState(false)
  const [dicomInfo, setDicomInfo] = useState<{ exists: boolean; fileCount: number } | null>(null)

  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const response = await fetch(`/api/bestof/dicoms/check?caseId=${caseId}`)
        if (!response.ok) return
        const data = await response.json() as { exists: boolean; fileCount: number }
        setDicomInfo(data)
      } catch {
        setDicomInfo({ exists: false, fileCount: 0 })
      }
    }
    void checkAvailability()
  }, [caseId])

  if (dicomInfo === null || !dicomInfo.exists) return null

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
    <Button size='icon' onClick={handleDownload} disabled={downloading} title={t('download')}>
      <Download className={`size-4 ${downloading ? 'animate-bounce' : ''}`} />
    </Button>
  )
}
