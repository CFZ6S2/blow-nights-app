import PartnersLanding from '@/components/PartnersLanding';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DarkNights - Oportunidad de Negocio City Manager',
  description: 'Conviértete en el dueño de tu territorio con el Sistema Operativo del Ocio Nocturno Liberal.',
};

export default function PartnersPage() {
  return <PartnersLanding />;
}
