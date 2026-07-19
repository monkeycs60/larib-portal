'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
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

export function AuthorDedupList({ rows, onChange }: Props) {
  const t = useTranslations('publications.authors.add')

  function toggleRow(index: number) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, selected: !row.selected } : row)))
  }

  return (
    <ul className="divide-y rounded-lg border">
      {rows.map((row, index) => (
        <li key={`${row.lastName}-${index}`} className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Checkbox checked={row.selected} disabled={row.status === 'existing'} onCheckedChange={() => toggleRow(index)} />
            <div>
              <p>
                {row.firstName} <strong>{row.lastName}</strong>{' '}
                <Badge variant={row.status === 'existing' ? 'secondary' : 'default'}>
                  {row.status === 'existing' ? t('alreadyInBank') : t('new')}
                </Badge>
              </p>
              <p className="text-sm text-text-secondary">{row.affiliationRaw}</p>
            </div>
          </div>
          {row.orcid && <span className="text-sm text-text-secondary">{row.orcid}</span>}
        </li>
      ))}
    </ul>
  )
}
