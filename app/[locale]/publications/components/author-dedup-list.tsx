'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

export type FetchedRow = {
  firstName: string
  lastName: string
  orcid: string | null
  affiliationRaw: string | null
  status: 'existing' | 'new'
  existingId?: string
  selected: boolean
}

type Props = { rows: FetchedRow[]; onChange: (rows: FetchedRow[]) => void }

const AVATAR_PALETTE = [
  'bg-[#FFE4EC] text-[#D61F55]',
  'bg-[#E0EAFF] text-[#3B5BDB]',
  'bg-[#EDE4FF] text-[#7048E8]',
  'bg-[#E3FBEA] text-[#188A42]',
  'bg-[#D8F5F0] text-[#0C8577]',
  'bg-[#FFF0D6] text-[#B7791F]',
]

function avatarClass(seed: string): string {
  let hash = 0
  for (const character of seed) hash = (hash + character.charCodeAt(0)) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[hash]
}

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function AuthorDedupList({ rows, onChange }: Props) {
  const t = useTranslations('publications.authors.add')
  const newRows = rows.filter((row) => row.status === 'new')
  const existingCount = rows.length - newRows.length
  const anyNewSelected = newRows.some((row) => row.selected)

  function toggleRow(index: number) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, selected: !row.selected } : row)))
  }

  function toggleAll() {
    const nextSelected = !anyNewSelected
    onChange(rows.map((row) => (row.status === 'new' ? { ...row, selected: nextSelected } : row)))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          <span className="font-bold text-coral-600">{t('authorsCount')}</span>{' '}
          <span className="text-text-primary">{rows.length}</span> · {existingCount} {t('alreadyInBank').toLowerCase()} · {newRows.length} {t('new').toLowerCase()}
        </p>
        {newRows.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={toggleAll}>
            {anyNewSelected ? t('deselectAll') : t('selectAll')}
          </Button>
        )}
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {rows.map((row, index) => {
          const isNew = row.status === 'new'
          return (
            <li
              key={`${row.lastName}-${index}`}
              className={`flex items-center justify-between gap-3 px-4 py-3 ${isNew && row.selected ? 'bg-coral-50/60' : ''}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Checkbox
                  checked={row.selected}
                  disabled={!isNew}
                  onCheckedChange={() => toggleRow(index)}
                  className="data-[state=checked]:border-coral-600 data-[state=checked]:bg-coral-600"
                />
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarClass(row.lastName)}`}>
                  {initials(row.firstName, row.lastName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-text-primary">
                    {row.firstName} <strong>{row.lastName}</strong>{' '}
                    <Badge variant={isNew ? 'info' : 'warning'}>{isNew ? t('new') : t('alreadyInBank')}</Badge>
                  </p>
                  {row.affiliationRaw && <p className="truncate text-sm text-text-secondary">{row.affiliationRaw}</p>}
                </div>
              </div>
              {row.orcid && (
                <span className="flex shrink-0 items-center gap-1.5 text-sm text-text-secondary">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#A6CE39] text-[8px] font-bold text-white">iD</span>
                  {row.orcid}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
