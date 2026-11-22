import { setRequestLocale } from 'next-intl/server';
import { parseAuthError } from '@/judge-signup/state/auth-error';
import { LandingContainer } from '@/landing/containers/LandingContainer';

export default async function HomePage({ params, searchParams }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Read on the server so the landing HTML is rendered without client-only hooks.
  const authError = parseAuthError((await searchParams).auth_error);

  return <LandingContainer locale={locale} authError={authError} />;
}
