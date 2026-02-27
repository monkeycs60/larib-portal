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
