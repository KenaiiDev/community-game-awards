import { getLocale } from 'next-intl/server';
import { NotFoundScreen } from '@/not-found/NotFoundScreen';

export default async function NotFound() {
  return <NotFoundScreen locale={await getLocale()} />;
}
