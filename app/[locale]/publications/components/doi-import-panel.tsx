'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from '@/app/i18n/navigation'
import { applicationLink } from '@/lib/application-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchPublicationAuthorsAction, addAuthorsFromPublicationAction } from '@/app/[locale]/publications/actions'
import { AuthorDedupList, type FetchedRow } from './author-dedup-list'

type PublicationMeta = { title: string; journal: string | null; year: number | null; doi: string | null }
type Props = { locale: string }

export function DoiImportPanel({ locale }: Props) {
  const t = useTranslations('publications.authors.add')
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [meta, setMeta] = useState<PublicationMeta | null>(null)
  const [rows, setRows] = useState<FetchedRow[]>([])

  const fetchAction = useAction(fetchPublicationAuthorsAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      setMeta(data.publication)
      setRows(data.authors.map((author) => ({ ...author, selected: author.status === 'new' })))
    },
    onError: () => toast.error(t('fetchError')),
  })

  const addAction = useAction(addAuthorsFromPublicationAction, {
    onSuccess: ({ data }) => {
      if (!data) return
      toast.success(t('importedToast', { count: data.created }))
      router.push(applicationLink(locale, '/publications/authors'))
    },
    onError: () => toast.error(t('fetchError')),
  })

  const selectedRows = rows.filter((row) => row.selected && row.status === 'new')

  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-xl border p-6">
        <Label>{t('identifierLabel')}</Label>
        <div className="flex gap-2">
          <Input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="10.1056/NEJMoa2501144 or 40218847"
          />
          <Button type="button" disabled={!identifier || fetchAction.isPending} onClick={() => fetchAction.execute({ identifier })}>
            {t('fetch')}
          </Button>
        </div>
        <p className="text-sm text-text-secondary">{t('identifierHint')}</p>
      </div>

      {!meta ? (
        <div className="rounded-xl border p-10 text-center">
          <p className="font-semibold">{t('emptyTitle')}</p>
          <p className="text-text-secondary">{t('emptyBody')}</p>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border p-6">
          <div>
            <p className="text-xs font-semibold text-primary">{t('publicationFound')}</p>
            <h3 className="text-lg font-bold">{meta.title}</h3>
            <p className="text-sm text-text-secondary">
              {meta.journal} · {meta.year} · {meta.doi}
            </p>
          </div>
          <AuthorDedupList rows={rows} onChange={setRows} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">{t('willBeAdded', { count: selectedRows.length })}</span>
            <Button
              type="button"
              disabled={selectedRows.length === 0 || addAction.isPending}
              onClick={() =>
                addAction.execute({
                  authors: selectedRows.map((row) => ({
                    firstName: row.firstName,
                    lastName: row.lastName,
                    orcid: row.orcid ?? null,
                    affiliationRaw: row.affiliationRaw ?? null,
                  })),
                })
              }
            >
              {t('addNToBank', { count: selectedRows.length })}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
