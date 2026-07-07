'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { searchBacklogAction, importBacklogAction } from '../actions'
import type { PubmedCandidate, ImportReport } from '@/types/publications'

export function BacklogImport() {
  const t = useTranslations('publications')
  const [anchor, setAnchor] = useState('Pezel T')
  const [candidates, setCandidates] = useState<PubmedCandidate[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [report, setReport] = useState<ImportReport | null>(null)

  const { execute: runSearch, isExecuting: searching } = useAction(searchBacklogAction, {
    onSuccess({ data }) {
      const found = data ?? []
      setCandidates(found)
      setSelected(new Set(found.map((paper) => paper.pmid)))
      setReport(null)
    },
    onError() {
      toast.error(t('import.searchError'))
    },
  })

  const { execute: runImport, isExecuting: importing } = useAction(importBacklogAction, {
    onSuccess({ data }) {
      if (!data) return
      setReport(data)
      toast.success(
        t('import.reportBody', {
          created: data.articlesCreated,
          skipped: data.articlesSkipped,
          authors: data.authorsCreated,
          journals: data.journalsCreated,
        }),
      )
    },
    onError() {
      toast.error(t('import.importError'))
    },
  })

  function toggle(pmid: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(pmid)) next.delete(pmid)
      else next.add(pmid)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === candidates.length ? new Set() : new Set(candidates.map((paper) => paper.pmid))))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <label className="text-sm text-text-secondary">{t('import.anchor')}</label>
          <Input value={anchor} onChange={(event) => setAnchor(event.target.value)} placeholder={t('import.anchorHint')} />
        </div>
        <Button onClick={() => runSearch({ anchor })} disabled={searching || anchor.trim().length === 0}>
          {searching ? t('import.searching') : t('import.search')}
        </Button>
      </div>

      {candidates.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">{t('import.found', { count: candidates.length })}</span>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {t('import.selectAll')}
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">{t('import.colSelect')}</TableHead>
                <TableHead>{t('import.colTitle')}</TableHead>
                <TableHead>{t('import.colJournal')}</TableHead>
                <TableHead>{t('import.colYear')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((paper) => (
                <TableRow key={paper.pmid}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(paper.pmid)}
                      onCheckedChange={() => toggle(paper.pmid)}
                      aria-label={paper.title}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{paper.title}</TableCell>
                  <TableCell>{paper.journal || '—'}</TableCell>
                  <TableCell>{paper.year ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button onClick={() => runImport({ pmids: Array.from(selected) })} disabled={importing || selected.size === 0}>
            {importing ? t('import.importing') : t('import.importSelected', { count: selected.size })}
          </Button>
        </>
      )}

      {report && (
        <div className="rounded-lg border border-line bg-bg-surface p-4">
          <p className="font-semibold text-text-primary">{t('import.reportTitle')}</p>
          <p className="text-text-secondary">
            {t('import.reportBody', {
              created: report.articlesCreated,
              skipped: report.articlesSkipped,
              authors: report.authorsCreated,
              journals: report.journalsCreated,
            })}
          </p>
          {report.errors.length > 0 && <p className="text-danger-600">{t('import.reportErrors', { count: report.errors.length })}</p>}
        </div>
      )}
    </div>
  )
}
