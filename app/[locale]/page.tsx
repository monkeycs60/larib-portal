import { getTranslations } from 'next-intl/server';

export default async function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  
  return (
    <div>
      <h1>{t('title')}</h1>
    </div>
  );
}