export const CITY_SLUGS = ['madrid'] as const;

export type CitySlug = (typeof CITY_SLUGS)[number];

export const DEFAULT_CITY: CitySlug = 'madrid';

export function cityPath(citySlug: string | null | undefined, path: string = '') {
  const city = citySlug || DEFAULT_CITY;
  return `/${city}${path}`;
}
