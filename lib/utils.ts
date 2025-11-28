import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type RelativeTimeTranslations = {
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  weeksAgo: string;
  monthsAgo: string;
  yearsAgo: string;
};

export function formatRelativeTime(
  date: Date | string,
  translations: RelativeTimeTranslations
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
    return translations.justNow;
  }
  if (diffMinutes < 60) {
    return translations.minutesAgo.replace('{count}', String(diffMinutes));
  }
  if (diffHours < 24) {
    return translations.hoursAgo.replace('{count}', String(diffHours));
  }
  if (diffDays < 7) {
    return translations.daysAgo.replace('{count}', String(diffDays));
  }
  if (diffWeeks < 4) {
    return translations.weeksAgo.replace('{count}', String(diffWeeks));
  }
  if (diffMonths < 12) {
    return translations.monthsAgo.replace('{count}', String(diffMonths));
  }
  return translations.yearsAgo.replace('{count}', String(diffYears));
}
