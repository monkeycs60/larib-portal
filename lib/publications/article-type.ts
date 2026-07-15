export const ARTICLE_TYPE_VALUES = ['ORIGINAL', 'LETTER', 'REVIEW', 'EDITORIAL'] as const
export type ArticleTypeValue = (typeof ARTICLE_TYPE_VALUES)[number]

// Map PubMed <PublicationType> values onto the 4 categories we track.
export function classifyArticleType(publicationTypes: string[]): ArticleTypeValue {
  const types = publicationTypes.map((value) => value.toLowerCase())
  const has = (needle: string) => types.some((value) => value.includes(needle))
  if (has('editorial')) return 'EDITORIAL'
  if (has('letter')) return 'LETTER'
  if (has('review') || has('meta-analysis')) return 'REVIEW'
  return 'ORIGINAL'
}

// Collapse any stored ArticleType (the enum has 7 values) onto the 4 we display.
export function normalizeArticleType(type: string): ArticleTypeValue {
  if (type === 'EDITORIAL') return 'EDITORIAL'
  if (type === 'LETTER') return 'LETTER'
  if (type === 'REVIEW' || type === 'META_ANALYSIS') return 'REVIEW'
  return 'ORIGINAL'
}

export const ARTICLE_TYPE_BAR_HEX: Record<ArticleTypeValue, string> = {
  ORIGINAL: '#64748B',
  LETTER: '#0EA5E9',
  REVIEW: '#7C3AED',
  EDITORIAL: '#D97706',
}

export const ARTICLE_TYPE_BADGE: Record<ArticleTypeValue, string> = {
  ORIGINAL: 'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-white/10 dark:border-white/10',
  LETTER: 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-500/15 dark:border-sky-500/30',
  REVIEW: 'text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-500/15 dark:border-violet-500/30',
  EDITORIAL: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/15 dark:border-amber-500/30',
}
