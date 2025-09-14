"use client"
import { useRef, useState } from 'react'
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
  const [dateFrom, setDateFrom] = useState(qp.get('dateFrom') ?? '')
  const [dateTo, setDateTo] = useState(qp.get('dateTo') ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function applyFilters() {
    const next = new URLSearchParams()
    if (q.trim()) next.set('q', q.trim())
    if (status) next.set('status', status)
    if (examTypeId) next.set('examTypeId', examTypeId)
    if (diseaseTagId) next.set('diseaseTagId', diseaseTagId)
    if (difficulty) next.set('difficulty', difficulty)
    if (dateFrom) next.set('dateFrom', dateFrom)
    if (dateTo) next.set('dateTo', dateTo)
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
    setDateFrom('')
    setDateTo('')
    const current = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const sort = current.get('sort')
    const dir = current.get('dir')
    const next = new URLSearchParams()
    if (sort) next.set('sort', sort)
    if (dir) next.set('dir', dir)
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function pushWith(partial: Partial<Record<string, string>>) {
    const current = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    // remove existing filters
    ;['q','status','examTypeId','diseaseTagId','difficulty','dateFrom','dateTo'].forEach((k) => current.delete(k))
    // re-add from state merged with partial
    const merged = {
      q: q.trim(),
      status,
      examTypeId,
      diseaseTagId,
      difficulty,
      dateFrom,
      dateTo,
      ...partial,
    }
    if (merged.q) current.set('q', merged.q)
    if (merged.status) current.set('status', merged.status)
    if (merged.examTypeId) current.set('examTypeId', merged.examTypeId)
    if (merged.diseaseTagId) current.set('diseaseTagId', merged.diseaseTagId)
    if (merged.difficulty) current.set('difficulty', merged.difficulty)
    if (merged.dateFrom) current.set('dateFrom', merged.dateFrom)
    if (merged.dateTo) current.set('dateTo', merged.dateTo)
    router.push(`${pathname}?${current.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-56">
        <label className="block text-xs mb-1">{t('filters.search')}</label>
        <Input
          value={q}
          onChange={(e) => {
            const next = e.target.value
            setQ(next)
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => {
              pushWith({ q: next.trim() })
            }, 400)
          }}
          placeholder={t('filters.searchPlaceholder')}
        />
      </div>
      <div>
        <label className="block text-xs mb-1">{t('filters.status')}</label>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); pushWith({ status: e.target.value }) }}>
          <option value="">{t('filters.any')}</option>
          <option value="PUBLISHED">{t('status.published')}</option>
          <option value="DRAFT">{t('status.draft')}</option>
        </Select>
      </div>
      <div>
        <label className="block text-xs mb-1">{t('filters.exam')}</label>
        <Select value={examTypeId} onChange={(e) => { setExamTypeId(e.target.value); pushWith({ examTypeId: e.target.value }) }}>
          <option value="">{t('filters.any')}</option>
          {examTypes.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className="block text-xs mb-1">{t('filters.disease')}</label>
        <Select value={diseaseTagId} onChange={(e) => { setDiseaseTagId(e.target.value); pushWith({ diseaseTagId: e.target.value }) }}>
          <option value="">{t('filters.any')}</option>
          {diseaseTags.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className="block text-xs mb-1">{t('filters.difficulty')}</label>
        <Select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); pushWith({ difficulty: e.target.value }) }}>
          <option value="">{t('filters.any')}</option>
          <option value="BEGINNER">{t('difficulty.beginner')}</option>
          <option value="INTERMEDIATE">{t('difficulty.intermediate')}</option>
          <option value="ADVANCED">{t('difficulty.advanced')}</option>
        </Select>
      </div>
      <div>
        <label className="block text-xs mb-1">{t('filters.dateFrom')}</label>
        <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); pushWith({ dateFrom: e.target.value }) }} />
      </div>
      <div>
        <label className="block text-xs mb-1">{t('filters.dateTo')}</label>
        <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); pushWith({ dateTo: e.target.value }) }} />
      </div>
      <div className="ml-auto flex gap-2">
        <Button variant="outline" onClick={resetFilters}>{t('filters.reset')}</Button>
      </div>
    </div>
  )
}
