'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { useDicomSelectionStore } from '@/lib/stores/dicom-selection-store'

export default function DicomAdminBadge({ caseId }: { caseId: string }) {
  const t = useTranslations('bestof.dicom')
  const casesWithDicoms = useDicomSelectionStore((state) => state.casesWithDicoms)
  const hasDicoms = casesWithDicoms.has(caseId)

  return hasDicoms ? (
    <Badge variant='success' className='text-xs'>
      {t('available')}
    </Badge>
  ) : (
    <Badge variant='danger' className='text-xs'>
      {t('notAvailable')}
    </Badge>
  )
}
