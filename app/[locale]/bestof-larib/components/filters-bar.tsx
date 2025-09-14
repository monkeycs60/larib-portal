"use client"
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/app/i18n/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

type ExamType = { id: string; name: string }
type DiseaseTag = { id: string; name: string }

export default function FiltersBar({ examTypes, diseaseTags }: { examTypes: ExamType[]; diseaseTags: DiseaseTag[] }) {
  const t = useTranslations('bestof')
  const router = useRouter()
  const pathname = usePathname()

  const url = new URL(typeof window !== 'undefined' ? window.location.href : 'http://localhost')
  const qp = url.searchParams

  const [q, setQ] = useState(qp.get('q') ?? '')
  const [status, setStatus] = useState(qp.get('status') ?? '')
  const [examTypeId, setExamTypeId] = useState(qp.get('examTypeId') ?? '')
  const [diseaseTagId, setDiseaseTagId] = useState(qp.get('diseaseTagId') ?? '')
  const [difficulty, setDifficulty] = useState(qp.get('difficulty') ?? '')

  function applyFilters() {
    const next = new URLSearchParams()
    if (q.trim()) next.set('q', q.trim())
    if (status) next.set('status', status)
    if (examTypeId) next.set('examTypeId', examTypeId)
    if (diseaseTagId) next.set('diseaseTagId', diseaseTagId)
    if (difficulty) next.set('difficulty', difficulty)
    // preserve sort if present
    const current = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const sort = current.get('sort')
    const dir = current.get('dir')
    if (sort) next.set('sort', sort)
    if (dir) next.set('dir', dir)
    router.push(`${pathname}?${next.toString()}`)
  }

  function resetFilters() {
    setQ('')
    setStatus('')
    setExamTypeId('')
    setDiseaseTagId('')
    setDifficulty('')
    const current = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const sort = current.get('sort')
    const dir = current.get('dir')
    const next = new URLSearchParams()
    if (sort) next.set('sort', sort)
    if (dir) next.set('dir', dir)
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-56">
        <label className="block text-xs mb-1">{t('filters.search')}</label>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('filters.searchPlaceholder')} />
      </div>
      <div>
        <label className="block text-xs mb-1">{t('filters.status')}</label>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('filters.any')}</option>
          <option value="PUBLISHED">{t('status.published')}</option>
          <option value="DRAFT">{t('status.draft')}</option>
        </Select>
      </div>
      <div>
        <label className="block text-xs mb-1">{t('filters.exam')}</label>
        <Select value={examTypeId} onChange={(e) => setExamTypeId(e.target.value)}>
          <option value="">{t('filters.any')}</option>
          {examTypes.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className="block text-xs mb-1">{t('filters.disease')}</label>
        <Select value={diseaseTagId} onChange={(e) => setDiseaseTagId(e.target.value)}>
          <option value="">{t('filters.any')}</option>
          {diseaseTags.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className="block text-xs mb-1">{t('filters.difficulty')}</label>
        <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">{t('filters.any')}</option>
          <option value="BEGINNER">{t('difficulty.beginner')}</option>
          <option value="INTERMEDIATE">{t('difficulty.intermediate')}</option>
          <option value="ADVANCED">{t('difficulty.advanced')}</option>
        </Select>
      </div>
      <div className="ml-auto flex gap-2">
        <Button variant="outline" onClick={resetFilters}>{t('filters.reset')}</Button>
        <Button onClick={applyFilters}>{t('filters.apply')}</Button>
      </div>
    </div>
  )
}

