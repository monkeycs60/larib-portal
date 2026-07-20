'use client'

import { useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/app/i18n/navigation'
import type { CentreAuthor } from '@/lib/services/publications/centres'

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

export function CentreAuthorsPanel({ authors }: { authors: CentreAuthor[] }) {
  const t = useTranslations('publications.centres')
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm">
          <span className="font-bold uppercase tracking-[0.12em] text-coral-600">{t('linkedAuthors')}</span>{' '}
          <span className="rounded-full bg-gray-100 px-2 text-xs font-bold text-gray-600">{authors.length}</span>
        </p>
        <Link href="/publications/admin/authors" className="inline-flex items-center gap-1 text-sm font-bold text-coral-600 hover:gap-2">
          {t('openInAuthors')} <ArrowRight className="size-4" />
        </Link>
      </div>
      {authors.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">{t('noAuthors')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {authors.map((author) => (
            <div key={author.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg-surface px-3 py-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarClass(author.lastName)}`}>
                  {`${author.firstName.charAt(0)}${author.lastName.charAt(0)}`.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-text-primary">
                    {author.firstName} <strong>{author.lastName}</strong>
                    {author.type === 'OUR_TEAM' && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-coral-500 align-middle" />}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    {[author.degrees, `${author.publications} ${t('pubs')}`].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <span
                className={
                  author.type === 'OUR_TEAM'
                    ? 'shrink-0 whitespace-nowrap rounded-full border border-coral-200 bg-coral-50 px-2.5 py-0.5 text-xs font-semibold text-coral-600'
                    : 'shrink-0 whitespace-nowrap rounded-full border border-line bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600'
                }
              >
                {author.type === 'OUR_TEAM' ? t('ourTeam') : t('external')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
