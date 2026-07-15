'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Select } from '@/components/ui/select'
import { updateArticleTypeAction } from '../actions'
import { ARTICLE_TYPE_VALUES, normalizeArticleType, type ArticleTypeValue } from '@/lib/publications/article-type'

export function ArticleTypeSelect({ id, type }: { id: string; type: string }) {
  const t = useTranslations('publications')
  const router = useRouter()
  const { execute, isExecuting } = useAction(updateArticleTypeAction, {
    onSuccess() {
      toast.success(t('myPub.typeSaved'))
      router.refresh()
    },
    onError() {
      toast.error(t('articles.actionError'))
    },
  })
  return (
    <Select
      defaultValue={normalizeArticleType(type)}
      disabled={isExecuting}
      onChange={(event) => execute({ id, type: event.target.value as ArticleTypeValue })}
      className="max-w-[220px]"
    >
      {ARTICLE_TYPE_VALUES.map((value) => (
        <option key={value} value={value}>
          {t(`myPub.type.${value}`)}
        </option>
      ))}
    </Select>
  )
}
