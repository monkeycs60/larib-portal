import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type RelativeTimeFormatter = (key: string, values?: Record<string, number>) => string;

export function formatRelativeTime(
  date: Date | string,
  t: RelativeTimeFormatter
): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - targetDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMinutes < 1) {
    return t('relativeTime.justNow');
  }
  if (diffMinutes < 60) {
    return t('relativeTime.minutesAgo', { count: diffMinutes });
  }
  if (diffHours < 24) {
    return t('relativeTime.hoursAgo', { count: diffHours });
  }
  if (diffDays < 7) {
    return t('relativeTime.daysAgo', { count: diffDays });
  }
  if (diffWeeks < 4) {
    return t('relativeTime.weeksAgo', { count: diffWeeks });
  }
  if (diffMonths < 12) {
    return t('relativeTime.monthsAgo', { count: diffMonths });
  }
  return t('relativeTime.yearsAgo', { count: diffYears });
}
