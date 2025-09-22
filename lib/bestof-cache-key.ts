import type { CaseListSortField } from '@/lib/services/bestof-larib';

export type BestofCacheKey = {
  locale: string;
  userId: string | null;
  filters: Record<string, unknown> | null;
  sortField?: CaseListSortField;
  sortDirection?: 'asc' | 'desc';
};

export const serialiseBestofCacheKey = (key: BestofCacheKey): string =>
  JSON.stringify({
    locale: key.locale,
    userId: key.userId ?? null,
    filters: key.filters,
    sortField: key.sortField ?? null,
    sortDirection: key.sortDirection ?? null,
  });
