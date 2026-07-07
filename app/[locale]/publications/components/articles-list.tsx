'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/app/i18n/navigation'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import type { ArticleListItem } from '@/lib/services/publications/articles'
import { ARTICLE_STATUSES } from '@/lib/services/publications/articles'

export function ArticlesList({ articles }: { articles: ArticleListItem[] }) {
  const t = useTranslations('publications')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return articles.filter((article) => {
      if (status && article.status !== status) return false
      if (!needle) return true
      return article.title.toLowerCase().includes(needle) || (article.publishedJournal?.name ?? '').toLowerCase().includes(needle)
    })
  }, [articles, query, status])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('articles.search')} className="max-w-sm" />
        <Select value={status} onChange={(event) => setStatus(event.target.value)} className="max-w-[200px]">
          <option value="">{t('articles.allStatuses')}</option>
          {ARTICLE_STATUSES.map((value) => (
            <option key={value} value={value}>{t(`articles.status.${value}`)}</option>
          ))}
        </Select>
        <span className="text-sm text-text-secondary">{filtered.length}</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('articles.colTitle')}</TableHead>
            <TableHead>{t('articles.colJournal')}</TableHead>
            <TableHead>{t('articles.colYear')}</TableHead>
            <TableHead>{t('articles.colStatus')}</TableHead>
            <TableHead>{t('articles.colAuthors')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((article) => (
            <TableRow key={article.id}>
              <TableCell className="font-medium">
                <Link href={`/publications/articles/${article.id}`} className="text-navy-600 underline-offset-4 hover:underline">
                  {article.title}
                </Link>
              </TableCell>
              <TableCell>{article.publishedJournal?.name ?? '—'}</TableCell>
              <TableCell>{article.publishedAt ? new Date(article.publishedAt).getFullYear() : '—'}</TableCell>
              <TableCell><Badge variant="secondary">{t(`articles.status.${article.status}`)}</Badge></TableCell>
              <TableCell>{article._count.authorships}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
