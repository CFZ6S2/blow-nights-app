'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import RRPPDashboardClient from './RRPPDashboardClient';
import { ArrowRight, Plus } from 'lucide-react';

function RRPPInner() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  
  const [selectedToken, setSelectedToken] = useState<string | null>(tokenParam);
  const [promoterDocs, setPromoterDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    if (tokenParam) {
      setSelectedToken(tokenParam);
    }
  }, [tokenParam]);

  useEffect(() => {
    if (!user || selectedToken) {
      setLoadingDocs(false);
      return;
    }

    const fetchPromoters = async () => {
      try {
        const q = query(collectionGroup(db, 'promoters'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as any),
          eventId: d.ref.parent.parent?.id
        }));
        
        setPromoterDocs(docs);
        if (docs.length === 1 && !docs[0].is_closed) {
          setSelectedToken(docs[0].access_token);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDocs(false);
      }
    };

    fetchPromoters();
  }, [user, selectedToken]);

  if (authLoading || loadingDocs) {
    return <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-slate-500 font-bold">Cargando Panel RRPP...</div>;
  }

  if (!user && !selectedToken) {
    if (typeof window !== 'undefined') router.push('/rrpp/register');
    return null;
  }

  if (selectedToken) {
    return (
      <div className="relative">
        {!tokenParam && (
          <button 
            onClick={() => setSelectedToken(null)}
            className="absolute top-6 left-6 z-50 bg-black/50 p-2 rounded-full border border-white/10 text-white"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        )}
        <RRPPDashboardClient token={selectedToken} />
      </div>
    );
  }

  if (profile?.role !== 'rrpp') {
    if (typeof window !== 'undefined') router.push('/rrpp/register');
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-md mx-auto pt-12">
        <header className="mb-8">
          <div className="inline-block px-3 py-1 bg-fuchsia-900/30 text-fuchsia-400 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 border border-fuchsia-500/20">
            Panel RRPP
          </div>
          <h1 className="text-3xl font-black mb-2">Mis Listas</h1>
          <p className="text-sm text-slate-400">Selecciona el evento que quieres gestionar.</p>
        </header>

        {promoterDocs.length === 0 ? (
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 text-center mb-6">
            <h3 className="font-bold mb-2">No tienes listas activas</h3>
            <p className="text-sm text-slate-400 mb-6">Crea una nueva fiesta para empezar a vender.</p>
            <button 
              onClick={() => router.push('/rrpp/create')}
              className="bg-fuchsia-600 text-white font-bold px-6 py-3 rounded-xl w-full text-sm uppercase tracking-widest"
            >
              Crear Nueva Fiesta
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {promoterDocs.map(doc => (
              <button 
                key={doc.id}
                onClick={() => setSelectedToken(doc.access_token)}
                className={`w-full bg-slate-900 border border-white/5 p-6 rounded-3xl text-left flex items-center justify-between transition-colors ${doc.is_closed ? 'opacity-50' : 'hover:border-fuchsia-500/30'}`}
              >
                <div>
                  <h3 className="font-bold text-lg mb-1">{doc.name}</h3>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">{doc.is_closed ? 'Cerrada' : 'Activa'}</p>
                </div>
                <ArrowRight className="text-slate-500" />
              </button>
            ))}
            
            <button 
              onClick={() => router.push('/rrpp/create')}
              className="w-full bg-transparent border-2 border-dashed border-white/10 hover:border-white/30 text-slate-400 hover:text-white p-6 rounded-3xl flex items-center justify-center gap-2 transition-colors mt-6 font-bold"
            >
              <Plus className="w-5 h-5" />
              Crear Nueva Fiesta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RRPPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center font-bold text-slate-500">Cargando...</div>
    }>
      <RRPPInner />
    </Suspense>
  );
}
