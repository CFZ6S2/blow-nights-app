import { CITY_SLUGS } from '@/lib/routes';
import { ClientCityGuard } from './ClientCityGuard';

export function generateStaticParams() {
  return CITY_SLUGS.map((city) => ({ city }));
}

export default function CityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClientCityGuard />
      {children}
    </>
  );
}
