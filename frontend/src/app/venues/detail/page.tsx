'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { doc, onSnapshot, collection, query, where, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';

export default function VenueDetailPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueId = searchParams?.get('id');

  const [venue, setVenue] = useState<any>(null);
  const [checkinCount, setCheckinCount] = useState(0);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const canceled = searchParams?.get('canceled') === 'true';

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!venueId) return;
    const unsub = onSnapshot(doc(db, 'venues', venueId), (snap) => {
      if (snap.exists()) setVenue({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [venueId]);

  useEffect(() => {
    if (!venueId) return;
    const q = query(
      collection(db, 'checkins'),
      where('venueId', '==', venueId),
      where('expiresAt', '>', Timestamp.now())
    );
    const unsub = onSnapshot(q, (snap) => setCheckinCount(snap.size));
    return unsub;
  }, [venueId]);

  const handlePurchase = async (ticketType: string) => {
    if (!user || purchasing) return;
    setPurchasing(ticketType);
    try {
      const purchaseTicket = httpsCallable(functions, 'purchaseTicket');
      const result = await purchaseTicket({
        venueId,
        ticketType,
        origin: window.location.origin,
      });
      const { url } = result.data as { url: string };
      if (url) window.location.href = url;
    } catch (err: any) {
      console.error('Error purchasing ticket:', err);
      alert(err.message || 'Error al comprar la entrada');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-t-2 border-fuchsia-500 rounded-full" />
      </div>
    );
  }

  if (!venueId) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-500">No se ha especificado un local</p>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-500">Cargando local...</p>
      </div>
    );
  }

  const pricing = venue.ticketPricing || {};
  const isCommunitySpot = venue.type === 'cruising' || venue.type === 'chill';

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-fuchsia-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 p-6 md:p-12 max-w-2xl mx-auto space-y-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
          <span className="material-icons text-sm">arrow_back</span>
          <span className="text-xs font-bold">Volver</span>
        </button>

        <header className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center border-2 ${isCommunitySpot ? (venue.type === 'chill' ? 'border-red-500' : 'border-green-500') : 'border-transparent'}`}>
              <span className={`material-icons text-3xl ${venue.type === 'chill' ? 'text-red-500' : venue.type === 'cruising' ? 'text-green-500' : 'text-fuchsia-400'}`}>
                {venue.type === 'chill' ? 'local_fire_department' : venue.type === 'cruising' ? 'park' : 'nightlife'}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{venue.name}</h1>
              {venue.address && <p className="text-xs text-slate-500">{venue.address}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 px-4 py-2 rounded-2xl">
              <span className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">
                {checkinCount} {checkinCount === 1 ? 'persona va' : 'personas van'}
              </span>
            </div>
            {venue.capacity && (
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Aforo: {venue.capacity}
                </span>
              </div>
            )}
          </div>
        </header>

        {canceled && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl">
            <p className="text-xs text-yellow-400 font-bold">Compra cancelada. Puedes intentarlo de nuevo.</p>
          </div>
        )}

        {venue.description && (
          <section className="bg-white/5 border border-white/10 p-6 rounded-3xl">
            <p className="text-sm text-slate-300 leading-relaxed">{venue.description}</p>
          </section>
        )}

        {isCommunitySpot ? (
          <section className="bg-white/5 border border-white/10 p-8 rounded-3xl text-center space-y-3 mt-8">
            <span className="material-icons text-4xl text-slate-700">forum</span>
            <p className="text-sm text-slate-400">Este es un punto comunitario</p>
            <p className="text-[10px] text-slate-500">Únete al chat de la comunidad o haz Check-in para dejar saber que estás aquí.</p>
            {/* TODO: Add chat link or check-in button here */}
          </section>
        ) : (
          <>
            {Object.keys(pricing).length > 0 && (
              <section className="space-y-4">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Entradas Disponibles</h2>

            {Object.entries(pricing).map(([type, data]: [string, any]) => (
              <motion.div
                key={type}
                whileHover={{ y: -2 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black capitalize">{data.name || type.replace(/_/g, ' ')}</h3>
                    {data.description && (
                      <p className="text-[10px] text-slate-500 mt-1">{data.description}</p>
                    )}
                    <p className="text-lg font-black text-fuchsia-400 mt-2">
                      {data.amount ? (data.amount / 100).toFixed(2) : '0.00'}€
                    </p>
                    {data.quota != null && (
                      <p className="text-[9px] text-slate-600 mt-1">Plazas limitadas: {data.quota}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handlePurchase(type)}
                    disabled={purchasing !== null}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:shadow-[0_10px_30px_rgba(192,38,211,0.3)] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {purchasing === type ? (
                      <span className="material-icons text-sm animate-spin">sync</span>
                    ) : (
                      'Comprar'
                    )}
                  </button>
                </div>
              </motion.div>
                ))}
              </section>
            )}

            {Object.keys(pricing).length === 0 && (
              <section className="bg-white/5 border border-white/10 p-8 rounded-3xl text-center space-y-3">
                <span className="material-icons text-4xl text-slate-700">local_activity</span>
                <p className="text-sm text-slate-500">Este local no tiene entradas a la venta</p>
                <p className="text-[10px] text-slate-600">Puedes hacer check-in desde la pestaña de Locales</p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
