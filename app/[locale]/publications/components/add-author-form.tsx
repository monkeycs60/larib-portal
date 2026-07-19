'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ManualEntryForm } from './manual-entry-form'
import { DoiImportPanel } from './doi-import-panel'

type Option = { value: string; label: string }
type Props = { centres: Option[]; users: Option[] }

export function AddAuthorForm({ centres, users }: Props) {
  const t = useTranslations('publications.authors.add')
  const [tab, setTab] = useState<'manual' | 'doi'>('manual')

  return (
    <div className="space-y-6">
      <ToggleGroup
        type="single"
        value={tab}
        onValueChange={(value) => value && setTab(value as 'manual' | 'doi')}
        className="grid grid-cols-2 gap-2"
      >
        <ToggleGroupItem value="manual">{t('tabManual')}</ToggleGroupItem>
        <ToggleGroupItem value="doi">{t('tabDoi')}</ToggleGroupItem>
      </ToggleGroup>
      {tab === 'manual' ? (
        <ManualEntryForm centres={centres} users={users} />
      ) : (
        <DoiImportPanel />
      )}
    </div>
  )
}
