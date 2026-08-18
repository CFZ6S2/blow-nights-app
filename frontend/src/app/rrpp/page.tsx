'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RRPPDashboardClient from './RRPPDashboardClient';

function RRPPInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <span className="material-icons text-6xl text-red-500 mb-4">error_outline</span>
        <h1 className="text-xl font-bold text-white mb-2">Token no proporcionado</h1>
        <p className="text-slate-400">Necesitas un enlace valido de promotor.</p>
      </div>
    );
  }

  return <RRPPDashboardClient token={token} />;
}

export default function RRPPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center font-bold text-slate-500">Cargando Panel RRPP...</div>
    }>
      <RRPPInner />
    </Suspense>
  );
}
