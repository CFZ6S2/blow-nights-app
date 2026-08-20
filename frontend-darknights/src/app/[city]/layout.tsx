import { CITY_SLUGS } from '@/lib/routes';
import { ClientCityGuard } from './ClientCityGuard';

export async function generateStaticParams() {
  const cities = new Set(CITY_SLUGS);
  try {
    const res = await fetch('https://firestore.googleapis.com/v1/projects/gay-meet-app-mvp-26/databases/(default)/documents/cities');
    if (res.ok) {
      const data = await res.json();
      if (data.documents) {
        data.documents.forEach((doc: any) => {
          const id = doc.name.split('/').pop();
          if (id) cities.add(id);
        });
      }
    }
  } catch (e) {
    console.warn('Failed to fetch cities for static generation, falling back to default.', e);
  }
  return Array.from(cities).map((city) => ({ city }));
}

export default function CityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClientCityGuard />
      {children}
    </>
  );
}
