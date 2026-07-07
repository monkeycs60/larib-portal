'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Select } from '@/components/ui/select'
import { updateArticleStatusAction } from '../actions'
import { ARTICLE_STATUSES, type ArticleStatusValue } from '@/lib/services/publications/articles'

export function ArticleStatusSelect({ id, status }: { id: string; status: ArticleStatusValue }) {
  const t = useTranslations('publications')
  const router = useRouter()
  const { execute, isExecuting } = useAction(updateArticleStatusAction, {
    onSuccess() {
      toast.success(t('articles.statusSaved'))
      router.refresh()
    },
    onError() {
      toast.error(t('articles.actionError'))
    },
  })
  return (
    <Select
      defaultValue={status}
      disabled={isExecuting}
      onChange={(event) => execute({ id, status: event.target.value as ArticleStatusValue })}
      className="max-w-[220px]"
    >
      {ARTICLE_STATUSES.map((value) => (
        <option key={value} value={value}>{t(`articles.status.${value}`)}</option>
      ))}
    </Select>
  )
}
