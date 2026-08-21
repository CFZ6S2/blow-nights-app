'use client';

import { ReactNode } from 'react';
import RRPPFooter from '@/components/RRPPFooter';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function RRPPLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  
  const showFooter = !pathname.includes('/rrpp/register');

  return (
    <div className="min-h-screen bg-black">
      {children}
      {showFooter && <RRPPFooter />}
    </div>
  );
}
