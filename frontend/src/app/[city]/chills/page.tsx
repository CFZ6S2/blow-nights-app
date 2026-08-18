'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCity } from '@/context/CityContext';
import { useChills, useMyChills } from '@/hooks/useChills';
import { useCityRouter } from '@/hooks/useCityRouter';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateDistance } from '@/lib/geo';
import { Chill } from '@/types';
import CitySelector from '@/components/CitySelector';
import CreateChillModal from '@/components/CreateChillModal';
import ChillPaywall from '@/components/ChillPaywall';

function timeLeft(expiresAt: any): string {
  if (!expiresAt) return '';
  const ms = (expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt)).getTime() - Date.now();
  if (ms <= 0) return 'Expirado';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function ChillCard({ chill, userLat, userLng, onClick }: {
  chill: Chill;
  userLat?: number;
  userLng?: number;
  onClick: () => void;
}) {
  const dist = userLat && userLng
    ? calculateDistance(userLat, userLng, chill.approx_lat, chill.approx_lng)
    : null;

  const spots = chill.max_capacity - chill.accepted_users.length;
  const isFull = chill.status === 'full' || spots <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      onClick={onClick}
      className="bg-slate-900/80 border border-white/5 rounded-3xl p-5 cursor-pointer hover:border-fuchsia-500/30 transition-all active:scale-[0.98]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-fuchsia-500/40 flex-shrink-0">
            {chill.host_foto ? (
              <img src={chill.host_foto} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-fuchsia-900/40 flex items-center justify-center">
                <span className="material-icons text-fuchsia-400 text-lg">person</span>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-black text-white text-sm leading-tight">{chill.title}</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">
              {chill.host_nick} {dist && <span>  {dist} km</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            isFull ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
          }`}>
            {isFull ? 'LLENO' : `${spots} plazas`}
          </span>
          <span className="text-[10px] text-slate-600 font-mono">{timeLeft(chill.expires_at)}</span>
        </div>
      </div>

      {chill.description && (
        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{chill.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {chill.tags?.map((tag) => (
          <span key={tag} className="text-[10px] bg-white/5 text-slate-400 px-2 py-0.5 rounded-full font-bold">
            {tag}
          </span>
        ))}

        <div className="flex items-center gap-1 ml-auto">
          <span className="material-icons text-fuchsia-500/60 text-xs">group</span>
          <span className="text-[10px] text-slate-500 font-bold">
            {chill.accepted_users.length}/{chill.max_capacity}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function ChillsPage() {
  const { user, profile, loading: authLoading, hasChillAccess } = useAuth();
  const { cityPath, router } = useCityRouter();
  const { citySlug, currentCity } = useCity();
  const { chills, loading } = useChills(citySlug);
  const { myChills } = useMyChills();
  const [showCreate, setShowCreate] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [tab, setTab] = useState<'feed' | 'mine'>('feed');

  const handleCreateClick = () => {
    if (!hasChillAccess) {
      setShowPaywall(true);
    } else {
      setShowCreate(true);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const userLat = profile?.lat;
  const userLng = profile?.lng;

  const sorted = useMemo(() => {
    if (!userLat || !userLng) return chills;
    return [...chills].sort((a, b) => {
      const dA = parseFloat(calculateDistance(userLat, userLng, a.approx_lat, a.approx_lng));
      const dB = parseFloat(calculateDistance(userLat, userLng, b.approx_lat, b.approx_lng));
      return dA - dB;
    });
  }, [chills, userLat, userLng]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="max-w-md mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black">Chills</h1>
              <span className="material-icons text-fuchsia-400 text-xl">local_fire_department</span>
            </div>
            <CitySelector />
          </div>
          <button
            onClick={handleCreateClick}
            className="w-12 h-12 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/20 transition-all active:scale-90"
          >
            <span className="material-icons text-white">add</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['feed', 'mine'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === t
                  ? 'bg-fuchsia-500 text-white'
                  : 'bg-white/5 text-slate-500 border border-white/5'
              }`}
            >
              {t === 'feed' ? 'Radar' : 'Mis Chills'}
            </button>
          ))}
        </div>

        {/* Feed */}
        {tab === 'feed' && (
          <div className="space-y-3">
            {sorted.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-icons text-5xl text-slate-700 mb-4 block">nightlife</span>
                <p className="text-slate-500 font-bold text-sm">No hay chills activos en {currentCity?.name || 'tu ciudad'}</p>
                <p className="text-slate-600 text-xs mt-1">Se el primero en crear uno</p>
                <button
                  onClick={handleCreateClick}
                  className="mt-6 px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl font-black text-sm transition-all"
                >
                  Crear Chill
                </button>
              </div>
            ) : (
              <AnimatePresence>
                {sorted.map((chill) => (
                  <ChillCard
                    key={chill.id}
                    chill={chill}
                    userLat={userLat}
                    userLng={userLng}
                    onClick={() => router.push(cityPath(`/chills/detail?id=${chill.id}`))}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* My Chills */}
        {tab === 'mine' && (
          <div className="space-y-3">
            {myChills.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-icons text-5xl text-slate-700 mb-4 block">home</span>
                <p className="text-slate-500 font-bold text-sm">No tienes chills activos</p>
                <button
                  onClick={handleCreateClick}
                  className="mt-6 px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl font-black text-sm transition-all"
                >
                  Crear Chill
                </button>
              </div>
            ) : (
              <AnimatePresence>
                {myChills.map((chill) => (
                  <ChillCard
                    key={chill.id}
                    chill={chill}
                    userLat={userLat}
                    userLng={userLng}
                    onClick={() => router.push(cityPath(`/chills/detail?id=${chill.id}`))}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateChillModal
            onClose={() => setShowCreate(false)}
            onCreated={(id) => {
              setShowCreate(false);
              router.push(cityPath(`/chills/detail?id=${id}`));
            }}
          />
        )}
      </AnimatePresence>

      {/* Paywall Modal */}
      <AnimatePresence>
        {showPaywall && (
          <ChillPaywall onClose={() => setShowPaywall(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
