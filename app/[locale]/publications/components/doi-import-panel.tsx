'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { FileText, UserPlus, Link as LinkIcon } from 'lucide-react'
import { useRouter } from '@/app/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchPublicationAuthorsAction, addAuthorsFromPublicationAction } from '@/app/[locale]/publications/actions'
import { AuthorDedupList, type FetchedRow } from './author-dedup-list'

type PublicationMeta = { title: string; journal: string | null; year: number | null; doi: string | null }

const CARD_CLASS = 'rounded-2xl border border-line bg-bg-surface p-6 shadow-sm'
const CORAL_BUTTON_CLASS =
  'gap-2 bg-gradient-to-b from-coral-500 to-coral-600 text-white shadow-[0_10px_22px_-8px_rgba(214,31,85,0.6)] hover:brightness-105'

export function DoiImportPanel() {
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
      router.push('/publications/authors')
    },
    onError: () => toast.error(t('fetchError')),
  })

  const selectedRows = rows.filter((row) => row.selected && row.status === 'new')

  return (
    <div className="space-y-6">
      <div className={`${CARD_CLASS} space-y-2`}>
        <Label className="text-text-primary">{t('identifierLabel')}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              className="pl-9"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="10.1056/NEJMoa2501144 or 40218847"
            />
          </div>
          <Button type="button" className={CORAL_BUTTON_CLASS} disabled={!identifier || fetchAction.isPending} onClick={() => fetchAction.execute({ identifier })}>
            {t('fetch')}
          </Button>
        </div>
        <p className="text-sm text-text-secondary">{t('identifierHint')}</p>
      </div>

      {!meta ? (
        <div className={`${CARD_CLASS} flex flex-col items-center gap-3 py-14 text-center`}>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-50 text-coral-600">
            <FileText className="h-6 w-6" />
          </span>
          <p className="text-lg font-bold text-text-primary">{t('emptyTitle')}</p>
          <p className="max-w-sm text-sm text-text-secondary">{t('emptyBody')}</p>
        </div>
      ) : (
        <div className={`${CARD_CLASS} space-y-5`}>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-600">{t('publicationFound')}</p>
            <h3 className="text-lg font-bold text-text-primary">{meta.title}</h3>
            <p className="text-sm text-text-secondary">
              {[meta.journal, meta.year, meta.doi && `DOI ${meta.doi}`].filter(Boolean).join(' · ')}
            </p>
          </div>
          <AuthorDedupList rows={rows} onChange={setRows} />
          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="text-sm text-text-secondary">{t('willBeAdded', { count: selectedRows.length })}</span>
            <Button
              type="button"
              className={CORAL_BUTTON_CLASS}
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
              <UserPlus className="h-4 w-4" />
              {t('addNToBank', { count: selectedRows.length })}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
