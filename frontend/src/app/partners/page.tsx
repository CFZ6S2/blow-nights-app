import PartnersLanding from '@/components/PartnersLanding';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blow Nights - Oportunidad de Negocio City Manager',
  description: 'Conviértete en el dueño de tu territorio con el Sistema Operativo del Ocio Nocturno LGTBIQ+.',
};

export default function PartnersPage() {
  return <PartnersLanding />;
}
