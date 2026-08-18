'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AmbassadorDashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [affiliatedVenues, setAffiliatedVenues] = useState<any[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [monthEarned, setMonthEarned] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && profile && profile.role !== 'ambassador' && profile.role !== 'superadmin') {
      router.push('/');
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user) return;

    const unsubVenues = onSnapshot(
      query(collection(db, 'venues'), where('ambassadorId', '==', user.uid)),
      (snap) => {
        const v: any[] = [];
        snap.forEach(d => v.push({ id: d.id, ...d.data() }));
        setAffiliatedVenues(v);
      }
    );

    const unsubEarnings = onSnapshot(
      query(
        collection(db, 'users', user.uid, 'earnings'),
        orderBy('timestamp', 'desc'),
        limit(50)
      ),
      (snap) => {
        const e: any[] = [];
        let total = 0;
        let month = 0;
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        snap.forEach(d => {
          const raw = d.data() as any;
          const data = { id: d.id, ...raw };
          e.push(data);
          total += raw.amount || 0;
          if (raw.timestamp?.toDate() >= monthStart) {
            month += raw.amount || 0;
          }
        });
        setEarnings(e);
        setTotalEarned(total);
        setMonthEarned(month);
      }
    );

    return () => { unsubVenues(); unsubEarnings(); };
  }, [user]);

  if (loading || !profile) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 pb-32">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <span className="material-icons text-yellow-400 text-2xl">handshake</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-yellow-400">Ambassador Panel</h1>
            <p className="text-xs text-slate-400">{profile.nick || (profile as any).email || ''} · Blow Nights Partner</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-yellow-900/30 to-black border border-yellow-500/20 p-6 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-1">Ganado este mes</p>
          <p className="text-3xl font-black font-mono">{monthEarned.toFixed(2)} <span className="text-lg text-yellow-500">€</span></p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total acumulado</p>
          <p className="text-3xl font-black font-mono">{totalEarned.toFixed(2)} <span className="text-lg text-slate-400">€</span></p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Locales afiliados</p>
          <p className="text-3xl font-black font-mono">{affiliatedVenues.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-300 mb-4">Mis Locales</h2>
          <div className="space-y-3">
            {affiliatedVenues.length === 0 && (
              <p className="text-sm text-slate-500">Aún no tienes locales vinculados. El admin te los asignará.</p>
            )}
            {affiliatedVenues.map(v => (
              <div key={v.id} className="bg-black/30 border border-white/5 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold">{v.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">{v.type} · {v.cityId || 'Sin ciudad'}</p>
                </div>
                <span className={`text-[9px] px-2 py-1 rounded-full font-bold uppercase ${v.isActive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                  {v.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 p-6 rounded-2xl h-[60vh] flex flex-col">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-300 mb-4">Historial de Comisiones</h2>
          <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
            {earnings.length === 0 && (
              <p className="text-sm text-slate-500">Las comisiones aparecerán aquí cuando se vendan tickets en tus locales.</p>
            )}
            {earnings.map(e => (
              <div key={e.id} className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5">
                <div>
                  <p className="text-xs font-bold">{e.type === 'ticket_fee' ? 'Comisión ticket' : e.type}</p>
                  <p className="text-[10px] text-slate-500">
                    {e.venueId || ''} {e.eventId ? `· ${e.eventId}` : ''}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    {e.timestamp?.toDate()?.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) || ''}
                  </p>
                </div>
                <span className="font-mono font-bold text-green-400">+{e.amount?.toFixed(2)} €</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8 p-4 bg-yellow-900/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
        <span className="material-icons text-yellow-400">info</span>
        <div className="text-xs text-yellow-200/70">
          <p className="font-bold text-yellow-400 mb-1">¿Cómo funciona?</p>
          <p>Cada vez que se vende un ticket en uno de tus locales afiliados, recibes automáticamente tu comisión via Stripe Connect. Las transferencias se procesan en tiempo real y aparecen aquí al instante.</p>
        </div>
      </div>
    </div>
  );
}
