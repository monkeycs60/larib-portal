'use client';

import { create } from 'zustand';
import type { ClinicalCaseWithDisplayTags } from '@/lib/services/bestof-larib';
import { serialiseBestofCacheKey, type BestofCacheKey } from '@/lib/bestof-cache-key';

export type BestofCasesCacheState = {
  entries: Map<string, ClinicalCaseWithDisplayTags[]>;
  put: (key: BestofCacheKey, cases: ClinicalCaseWithDisplayTags[]) => void;
  get: (key: BestofCacheKey) => ClinicalCaseWithDisplayTags[] | undefined;
  clearByPrefix: (prefix: Partial<Pick<BestofCacheKey, 'locale' | 'userId'>>) => void;
  toJSON: () => Record<string, ClinicalCaseWithDisplayTags[]>;
  load: (entries: Record<string, ClinicalCaseWithDisplayTags[]>) => void;
};

export const useBestofCasesCache = create<BestofCasesCacheState>((set, get) => ({
  entries: new Map<string, ClinicalCaseWithDisplayTags[]>(),
  put: (key, cases) => {
    const serialised = serialiseBestofCacheKey(key);
    set((state) => {
      const next = new Map(state.entries);
      next.set(serialised, cases);
      return { entries: next };
    });
  },
  get: (key) => get().entries.get(serialiseBestofCacheKey(key)),
  clearByPrefix: (prefix) => {
    const entries = get().entries;
    const filtered = new Map<string, ClinicalCaseWithDisplayTags[]>();
    entries.forEach((value, serialised) => {
      const parsed = JSON.parse(serialised) as ReturnType<typeof JSON.parse> & BestofCacheKey;
      const matchesLocale = prefix.locale === undefined || parsed.locale === prefix.locale;
      const matchesUser = prefix.userId === undefined || parsed.userId === prefix.userId;
      if (!(matchesLocale && matchesUser)) {
        filtered.set(serialised, value);
      }
    });
    set({ entries: filtered });
  },
  toJSON: () => {
    const entries = get().entries;
    return Object.fromEntries(entries.entries());
  },
  load: (entries) => {
    set({ entries: new Map(Object.entries(entries)) });
  },
}));

export const buildBestofCacheKey = ({
  locale,
  userId,
  filters,
  sortField,
  sortDirection,
}: BestofCacheKey): BestofCacheKey => ({
  locale,
  userId,
  filters,
  sortField,
  sortDirection,
});
