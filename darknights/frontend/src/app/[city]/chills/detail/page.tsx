'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ChillDetailClient from './ChillDetailClient';

function ChillDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (!id) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <span className="material-icons text-6xl text-slate-700 mb-4">explore_off</span>
        <h1 className="text-xl font-black text-white mb-2">Chill no encontrado</h1>
        <p className="text-slate-500 text-sm">Falta el ID del chill.</p>
      </div>
    );
  }

  return <ChillDetailClient chillId={id} />;
}

export default function ChillDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ChillDetailInner />
    </Suspense>
  );
}
