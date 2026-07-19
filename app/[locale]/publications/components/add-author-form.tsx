'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Download } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ManualEntryForm } from './manual-entry-form'
import { DoiImportPanel } from './doi-import-panel'

type Option = { value: string; label: string }
type Props = { centres: Option[]; users: Option[] }

const TAB_ITEM_CLASS =
  'flex-1 gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-text-secondary transition ' +
  'data-[state=on]:bg-gradient-to-b data-[state=on]:from-coral-500 data-[state=on]:to-coral-600 ' +
  'data-[state=on]:text-white data-[state=on]:shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)]'

export function AddAuthorForm({ centres, users }: Props) {
  const t = useTranslations('publications.authors.add')
  const [tab, setTab] = useState<'manual' | 'doi'>('manual')

  return (
    <div className="space-y-6">
      <ToggleGroup
        type="single"
        value={tab}
        onValueChange={(value) => value && setTab(value as 'manual' | 'doi')}
        className="grid w-full grid-cols-2 gap-3 rounded-2xl border border-line bg-bg-surface p-2 shadow-sm"
      >
        <ToggleGroupItem value="manual" className={TAB_ITEM_CLASS}>
          <Pencil className="h-4 w-4" />
          {t('tabManual')}
        </ToggleGroupItem>
        <ToggleGroupItem value="doi" className={TAB_ITEM_CLASS}>
          <Download className="h-4 w-4" />
          {t('tabDoi')}
        </ToggleGroupItem>
      </ToggleGroup>
      {tab === 'manual' ? <ManualEntryForm centres={centres} users={users} /> : <DoiImportPanel />}
    </div>
  )
}
