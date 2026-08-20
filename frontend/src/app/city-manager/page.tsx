'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { TrendingUp, Building2, Ticket, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRequireRole } from '@/hooks/useRequireRole';

export default function CityManagerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isReady } = useRequireRole(['cityAdmin', 'admin', 'superadmin']);
  const router = useRouter();
  const [dataLoading, setDataLoading] = useState(true);
  
  // Data
  const [cityData, setCityData] = useState<any>(null);
  const [venues, setVenues] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    activeVenues: 0,
    monthlyGrossRevenue: 0,
    managerPayoutDue: 0,
    totalTickets: 0
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        // 1. Buscar la ciudad que gestiona este usuario (donde partnerId === user.uid)
        const q = query(collection(db, 'cities'), where('partnerId', '==', user.uid));
        const citySnap = await getDocs(q);
        
        if (citySnap.empty) {
          // No es city manager
          setDataLoading(false);
          return;
        }

        const cityDoc = citySnap.docs[0];
        const cData = { id: cityDoc.id, ...cityDoc.data() };
        setCityData(cData);

        // 2. Buscar los locales (venues) de esta ciudad
        const vQ = query(collection(db, 'venues'), where('cityId', '==', cData.id));
        const vSnap = await getDocs(vQ);
        const vList: any[] = [];
        let mGross = 0;
        let mTickets = 0; // Mock tickets para la demo
        let mActive = 0;

        vSnap.forEach(d => {
          const v: any = { id: d.id, ...d.data() };
          vList.push(v);
          if (v.isActive) mActive++;
          if (v.subscriptionTier === 'ticketing') mGross += 100;
          if (v.subscriptionTier === 'promo') mGross += 60;
          if (v.subscriptionTier === 'basico') mGross += 30;
        });

        setVenues(vList);

        // 3. Buscar ganancias reales (earnings)
        const earnQ = query(collection(db, 'cities', cData.id, 'earnings'));
        const earnSnap = await getDocs(earnQ);
        let realPayout = 0;
        let realTickets = 0;
        
        earnSnap.forEach(d => {
          const e = d.data();
          realPayout += (e.amount || 0);
          if (e.type === 'ticket_fee') {
            realTickets++;
          }
        });

        // 4. Buscar los eventos independientes de esta ciudad
        const eQ = query(collection(db, 'events'), where('cityId', '==', cData.id));
        const eSnap = await getDocs(eQ);
        const eList: any[] = [];
        eSnap.forEach(d => {
          eList.push({ id: d.id, ...d.data() });
        });
        setEvents(eList);

        setMetrics({
          activeVenues: mActive,
          monthlyGrossRevenue: mGross,
          managerPayoutDue: realPayout,
          totalTickets: realTickets
        });

      } catch (err) {
        console.error("Error cargando dashboard:", err);
      } finally {
        setDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, authLoading, router]);

  const handleDeleteVenue = async (venueId: string, venueName: string) => {
    if (!confirm(`¿Seguro que quieres borrar "${venueName}"? Esta acción es irreversible.`)) return;
    try {
      await deleteDoc(doc(db, 'venues', venueId));
      setVenues(prev => prev.filter(v => v.id !== venueId));
    } catch (e) {
      console.error(e);
      alert('Error al borrar el local');
    }
  };

  if (authLoading || dataLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (!cityData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h1>
        <p className="text-slate-400 max-w-md">No tienes ninguna franquicia territorial asignada a esta cuenta. Si has pagado tu canon, por favor espera a que SuperAdmin active tu plaza.</p>
        <button onClick={() => router.push('/')} className="mt-8 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-colors">
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-fuchsia-500/30 pb-20">
      
      {/* HEADER B2B */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">City Manager</h1>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{cityData.name || cityData.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Licencia Activa
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        
        {/* REVENUE DASHBOARD */}
        <section className="mb-12">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Métricas Financieras</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Facturación Global */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="w-24 h-24" />
              </div>
              <p className="text-sm font-bold text-slate-400 mb-1">Facturación SaaS (Mes)</p>
              <p className="text-4xl font-black text-white">{metrics.monthlyGrossRevenue} €</p>
              <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center text-xs text-slate-500 font-medium">
                Generado orgánicamente por los locales de tu zona.
              </div>
            </div>

            {/* Comisión del Manager */}
            <div className="bg-gradient-to-br from-fuchsia-900/40 to-indigo-900/40 border border-fuchsia-500/20 p-6 rounded-3xl relative overflow-hidden group shadow-[0_0_30px_-10px_rgba(168,85,247,0.2)]">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="text-8xl font-black">€</span>
              </div>
              <p className="text-sm font-bold text-fuchsia-300 mb-1">Tu Comisión Neta (50%)</p>
              <p className="text-4xl font-black text-white">{metrics.managerPayoutDue.toFixed(2)} €</p>
              <div className="mt-4 pt-4 border-t border-fuchsia-500/20 flex items-center text-xs text-fuchsia-200/50 font-medium">
                Se liquida automáticamente en tu cuenta Stripe.
              </div>
            </div>

            {/* Tickets */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Ticket className="w-24 h-24" />
              </div>
              <p className="text-sm font-bold text-slate-400 mb-1">Tickets Vendidos</p>
              <p className="text-4xl font-black text-white">{metrics.totalTickets}</p>
              <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center text-xs text-slate-500 font-medium">
                Suma +0,25 € extra por cada ticket procesado.
              </div>
            </div>
          </div>
        </section>

        {/* VENUES LIST */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Censo de Locales</h2>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`https://blownights.com/business?city=${cityData.id}&ref=${user?.uid}`);
                alert('Enlace de afiliado copiado al portapapeles.');
              }}
              className="text-xs bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
            >
              Copiar Link Afiliado
            </button>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            {venues.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Aún no hay locales en tu territorio. Comparte tu enlace de afiliado.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {venues.map(v => (
                  <div key={v.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-xl overflow-hidden flex-shrink-0">
                        {v.coverImage ? (
                          <img src={v.coverImage} alt={v.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Building2 className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{v.name}</h3>
                        <p className="text-xs text-slate-400">{v.type === 'club' ? 'Discoteca' : 'Bar/Pub'} • Creado el {new Date(v.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${v.isActive ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                        {v.isActive ? 'Operativo' : 'Inactivo'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${v.subscriptionTier === 'ticketing' ? 'bg-indigo-500/10 text-indigo-400' : v.subscriptionTier === 'promo' ? 'bg-fuchsia-500/10 text-fuchsia-400' : v.subscriptionTier === 'basico' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                        {v.subscriptionTier === 'ticketing' ? 'TICKETING' : v.subscriptionTier === 'promo' ? 'PROMO' : v.subscriptionTier === 'basico' ? 'BÁSICO' : 'FREE'}
                      </span>
                      <button onClick={() => handleDeleteVenue(v.id, v.name)} className="bg-red-900/50 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-900 transition-colors">
                        Borrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* EVENTS LIST */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Eventos Independientes</h2>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            {events.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Aún no hay eventos independientes registrados en tu territorio.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {events.map(e => (
                  <div key={e.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-xl overflow-hidden flex-shrink-0">
                        {e.banner_url ? (
                          <img src={e.banner_url} alt={e.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Ticket className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{e.title}</h3>
                        <p className="text-xs text-slate-400">
                          {e.start_date?.toDate?.()?.toLocaleDateString() || ''} • {e.stats?.total_sold || 0} Entradas Vendidas
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${e.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                        {e.status === 'active' ? 'Activo' : 'Cerrado'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
