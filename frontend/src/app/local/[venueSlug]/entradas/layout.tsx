export async function generateStaticParams() {
  return [
    { venueSlug: 'club-matrix-night' },
    { venueSlug: 'velvet-underground' },
    { venueSlug: 'eclipse-rooftop' },
    { venueSlug: 'dark-chamber-club' },
    { venueSlug: 'underground-vault' },
    { venueSlug: 'black-velvet-room' },
  ];
}

export default function VenueSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
