import { CITY_SLUGS } from '@/lib/routes';

export function generateStaticParams() {
  return CITY_SLUGS.map((city) => ({ city }));
}

export default function CityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
