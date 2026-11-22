import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { LandingContainer } from '@/landing/containers/LandingContainer';

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    // useSearchParams (OAuth error from the redirect) needs a Suspense boundary.
    <Suspense>
      <LandingContainer locale={locale} />
    </Suspense>
  );
}
