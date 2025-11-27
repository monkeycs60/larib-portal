import { formatDistanceToNow } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';

export function formatRelativeTime(date: Date | string, locale: 'en' | 'fr'): string {
  const dateObject = typeof date === 'string' ? new Date(date) : date;
  const localeObj = locale === 'fr' ? fr : enUS;

  return formatDistanceToNow(dateObject, {
    addSuffix: true,
    locale: localeObj,
  });
}
