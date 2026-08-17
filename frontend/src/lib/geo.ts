export function fuzzCoordinates(lat: number, lng: number, radiusMeters: number = 150): { lat: number; lng: number } {
  const radiusKm = radiusMeters / 1000;
  const latOffset = (radiusKm / 111.32) * (Math.random() * 2 - 1);
  const lngOffset = (radiusKm / (111.32 * Math.cos(lat * Math.PI / 180))) * (Math.random() * 2 - 1);
  return {
    lat: Math.round((lat + latOffset) * 1000) / 1000,
    lng: Math.round((lng + lngOffset) * 1000) / 1000,
  };
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}
