'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/app/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multiselect';

type ExamType = { id: string; name: string };
type DiseaseTag = { id: string; name: string };
type SimpleTag = { id: string; name: string };

export default function UserProfileFilters({
  data,
}: {
  data: {
    examTypes: ExamType[];
    diseaseTags: DiseaseTag[];
    adminTags: SimpleTag[];
  };
}) {
  const { examTypes, diseaseTags, adminTags } = data;
  const tFilters = useTranslations('bestof.filters');
  const tDifficulty = useTranslations('bestof.difficulty');
  const router = useRouter();
  const pathname = usePathname();

  const url = new URL(typeof window !== 'undefined' ? window.location.href : 'http://localhost');
  const qp = url.searchParams;

  const qpArray = (key: string) => {
    const all = url.searchParams.getAll(key);
    const single = url.searchParams.get(key);
    if (all && all.length > 1) return all;
    return single ? [single] : [];
  };

  const [examTypeIds, setExamTypeIds] = useState<string[]>(qpArray('examTypeId'));
  const [diseaseTagIds, setDiseaseTagIds] = useState<string[]>(qpArray('diseaseTagId'));
  const [difficulties, setDifficulties] = useState<string[]>(qpArray('difficulty'));
  const [adminTagIds, setAdminTagIds] = useState<string[]>(qpArray('adminTagId'));
  const [dateFrom, setDateFrom] = useState(qp.get('dateFrom') ?? '');
  const [dateTo, setDateTo] = useState(qp.get('dateTo') ?? '');
  const [datePreset, setDatePreset] = useState(qp.get('datePreset') ?? '');

  function resetFilters() {
    setExamTypeIds([]);
    setDiseaseTagIds([]);
    setDifficulties([]);
    setAdminTagIds([]);
    setDateFrom('');
    setDateTo('');
    setDatePreset('');
    router.replace(pathname, { scroll: false });
  }

  function pushWith(partial: Partial<Record<string, string | string[]>>) {
    const current = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');

    ['examTypeId', 'diseaseTagId', 'difficulty', 'adminTagId', 'dateFrom', 'dateTo', 'datePreset'].forEach(
      (k) => current.delete(k),
    );

    const merged = {
      examTypeId: examTypeIds,
      diseaseTagId: diseaseTagIds,
      difficulty: difficulties,
      adminTagId: adminTagIds,
      dateFrom,
      dateTo,
      datePreset,
      ...partial,
    };

    if (merged.examTypeId) {
      const v = merged.examTypeId;
      (Array.isArray(v) ? v : [v]).forEach((val) => current.append('examTypeId', val));
    }
    if (merged.diseaseTagId) {
      const v = merged.diseaseTagId;
      (Array.isArray(v) ? v : [v]).forEach((val) => current.append('diseaseTagId', val));
    }
    if (merged.difficulty) {
      const v = merged.difficulty;
      (Array.isArray(v) ? v : [v]).forEach((val) => current.append('difficulty', val));
    }
    if (merged.adminTagId) {
      const v = merged.adminTagId;
      (Array.isArray(v) ? v : [v]).forEach((val) => current.append('adminTagId', val));
    }
    if (merged.dateFrom) current.set('dateFrom', merged.dateFrom);
    if (merged.dateTo) current.set('dateTo', merged.dateTo);
    if (merged.datePreset) current.set('datePreset', merged.datePreset);
    router.replace(`${pathname}?${current.toString()}`, { scroll: false });
  }

  function formatYYYYMMDD(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  function applyPreset(preset: string) {
    const now = new Date();
    const startOfDay = (d: Date) => {
      const c = new Date(d);
      c.setHours(0, 0, 0, 0);
      return c;
    };
    const endOfDay = (d: Date) => {
      const c = new Date(d);
      c.setHours(23, 59, 59, 999);
      return c;
    };
    const startOfWeek = (d: Date) => {
      const c = new Date(d);
      const day = c.getDay() || 7;
      c.setDate(c.getDate() - (day - 1));
      return startOfDay(c);
    };
    const endOfWeek = (d: Date) => {
      const c = startOfWeek(d);
      c.setDate(c.getDate() + 6);
      return endOfDay(c);
    };
    const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = (d: Date) => endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));

    let from = '';
    let to = '';
    switch (preset) {
      case 'today':
        from = formatYYYYMMDD(now);
        to = formatYYYYMMDD(now);
        break;
      case 'yesterday': {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        from = formatYYYYMMDD(y);
        to = formatYYYYMMDD(y);
        break;
      }
      case 'last7': {
        const s = new Date(now);
        s.setDate(now.getDate() - 6);
        from = formatYYYYMMDD(s);
        to = formatYYYYMMDD(now);
        break;
      }
      case 'last30': {
        const s = new Date(now);
        s.setDate(now.getDate() - 29);
        from = formatYYYYMMDD(s);
        to = formatYYYYMMDD(now);
        break;
      }
      case 'thisWeek':
        from = formatYYYYMMDD(startOfWeek(now));
        to = formatYYYYMMDD(endOfWeek(now));
        break;
      case 'lastWeek': {
        const lastWeekRef = new Date(now);
        lastWeekRef.setDate(now.getDate() - 7);
        from = formatYYYYMMDD(startOfWeek(lastWeekRef));
        to = formatYYYYMMDD(endOfWeek(lastWeekRef));
        break;
      }
      case 'thisMonth':
        from = formatYYYYMMDD(startOfMonth(now));
        to = formatYYYYMMDD(endOfMonth(now));
        break;
      case 'lastMonth': {
        const ref = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        from = formatYYYYMMDD(startOfMonth(ref));
        to = formatYYYYMMDD(endOfMonth(ref));
        break;
      }
      case '':
        from = '';
        to = '';
        break;
      default:
        from = dateFrom;
        to = dateTo;
    }
    setDateFrom(from);
    setDateTo(to);
    pushWith({ datePreset: preset, dateFrom: from, dateTo: to });
  }

  return (
    <div className='flex flex-wrap items-end gap-2'>
      <div className='min-w-44'>
        <label className='block text-xs mb-1'>{tFilters('exam')}</label>
        <MultiSelect
          options={examTypes.map((ex) => ({ label: ex.name, value: ex.id }))}
          defaultValue={examTypeIds}
          onValueChange={(vals) => {
            setExamTypeIds(vals);
            pushWith({ examTypeId: vals });
          }}
          placeholder={tFilters('any')}
          maxCount={2}
          responsive
        />
      </div>

      <div className='min-w-44'>
        <label className='block text-xs mb-1'>{tFilters('disease')}</label>
        <MultiSelect
          options={diseaseTags.map((d) => ({ label: d.name, value: d.id }))}
          defaultValue={diseaseTagIds}
          onValueChange={(vals) => {
            setDiseaseTagIds(vals);
            pushWith({ diseaseTagId: vals });
          }}
          placeholder={tFilters('any')}
          maxCount={2}
          responsive
        />
      </div>

      <div className='min-w-44'>
        <label className='block text-xs mb-1'>{tFilters('difficulty')}</label>
        <MultiSelect
          options={[
            { label: tDifficulty('beginner'), value: 'BEGINNER' },
            { label: tDifficulty('intermediate'), value: 'INTERMEDIATE' },
            { label: tDifficulty('advanced'), value: 'ADVANCED' },
          ]}
          defaultValue={difficulties}
          onValueChange={(vals) => {
            setDifficulties(vals);
            pushWith({ difficulty: vals });
          }}
          placeholder={tFilters('any')}
          maxCount={3}
          responsive
        />
      </div>

      <div className='min-w-44'>
        <label className='block text-xs mb-1'>{tFilters('adminTag')}</label>
        <MultiSelect
          options={adminTags.map((tag) => ({ label: tag.name, value: tag.id }))}
          defaultValue={adminTagIds}
          onValueChange={(vals) => {
            setAdminTagIds(vals);
            pushWith({ adminTagId: vals });
          }}
          placeholder={tFilters('any')}
          maxCount={2}
          responsive
        />
      </div>

      <div>
        <label className='block text-xs mb-1'>{tFilters('createdAtRange')}</label>
        <Select
          value={datePreset}
          onChange={(e) => {
            const v = e.target.value;
            setDatePreset(v);
            applyPreset(v);
          }}
        >
          <option value=''>{tFilters('any')}</option>
          <option value='today'>{tFilters('today')}</option>
          <option value='yesterday'>{tFilters('yesterday')}</option>
          <option value='thisWeek'>{tFilters('thisWeek')}</option>
          <option value='lastWeek'>{tFilters('lastWeek')}</option>
          <option value='thisMonth'>{tFilters('thisMonth')}</option>
          <option value='lastMonth'>{tFilters('lastMonth')}</option>
          <option value='last7'>{tFilters('last7')}</option>
          <option value='last30'>{tFilters('last30')}</option>
          <option value='custom'>{tFilters('custom')}</option>
        </Select>
      </div>

      {datePreset === 'custom' ? (
        <>
          <div>
            <label className='block text-xs mb-1'>{tFilters('dateFrom')}</label>
            <Input
              type='date'
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                pushWith({
                  dateFrom: e.target.value,
                  datePreset: 'custom',
                });
              }}
            />
          </div>
          <div>
            <label className='block text-xs mb-1'>{tFilters('dateTo')}</label>
            <Input
              type='date'
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                pushWith({
                  dateTo: e.target.value,
                  datePreset: 'custom',
                });
              }}
            />
          </div>
        </>
      ) : null}

      <div className='ml-auto'>
        <Button variant='outline' size='sm' onClick={resetFilters}>
          {tFilters('reset')}
        </Button>
      </div>
    </div>
  );
}
