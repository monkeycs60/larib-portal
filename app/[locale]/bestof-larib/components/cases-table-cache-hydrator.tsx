'use client';

import { useEffect, useMemo } from 'react';
import type { ClinicalCaseWithDisplayTags } from '@/lib/services/bestof-larib';
import { useBestofCasesCache } from '@/lib/stores/bestof-cases-cache';
import type { BestofCacheKey } from '@/lib/bestof-cache-key';

export default function CasesTableCacheHydrator({
  cacheKey,
  cacheKeyString,
  cases,
}: {
  cacheKey: BestofCacheKey;
  cacheKeyString: string;
  cases: ClinicalCaseWithDisplayTags[];
}) {
  const put = useBestofCasesCache((state) => state.put);
  const stableKey = useMemo<BestofCacheKey>(() => ({ ...cacheKey }), [cacheKeyString]);

  useEffect(() => {
    put(stableKey, cases);
  }, [put, stableKey, cases]);

  return null;
}
