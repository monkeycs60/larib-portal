'use client';

import { formatRelativeTime } from '@/lib/format-relative-time';
import { useLocale } from 'next-intl';

interface RelativeTimeProps {
  date: Date | string;
  fallback?: string;
}

export function RelativeTime({ date, fallback = '-' }: RelativeTimeProps) {
  const locale = useLocale() as 'en' | 'fr';

  if (!date) {
    return <span>{fallback}</span>;
  }

  try {
    return <span>{formatRelativeTime(date, locale)}</span>;
  } catch {
    return <span>{fallback}</span>;
  }
}
