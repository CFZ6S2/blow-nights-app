'use client';

import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import Map, { Marker, NavigationControl, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAuth } from '@/context/AuthContext';
import { collection, onSnapshot, query, where, doc, setDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '@/components/Skeleton';
import { useRouter } from 'next/navigation';
import ProfileOverlay from './ProfileOverlay';
import { User, Chill } from '@/types';
import { useCity } from '@/context/CityContext';
import CitySelector from './CitySelector';
import { calculateDistance } from '@/lib/geo';
import SwipeCards from './SwipeCards';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

export type EntityType = 'all' | 'bar' | 'club' | 'cruising' | 'sauna' | 'chill';
export type RadarMode = 'places' | 'users' | 'swipe';

const PLACE_CATEGORIES: { id: EntityType; label: string; icon: string }[] = [
  { id: 'all', label: 'Todo', icon: '✨' },
  { id: 'chill', label: 'Chills & Afters', icon: '🟣' },
  { id: 'bar', label: 'Bares', icon: '🍸' },
  { id: 'club', label: 'Clubs / Fiestas', icon: '🪩' },
  { id: 'cruising', label: 'Cruising', icon: '🌲' },
  { id: 'sauna', label: 'Saunas', icon: '♨️' },
];

// Cambiamos a OpenFreeMap para mayor robustez y velocidad
const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

// Componente de Marcador Memoizado para máximo rendimiento
const UserMarker = memo(({ u, onClick, index }: { u: User, onClick: (id: string) => void, index: number }) => {
  const isBoosted = u.boostedUntil && u.boostedUntil.toDate() > new Date();

  return (
    <Marker 
      latitude={u.lat as number} 
      longitude={u.lng as number}
      anchor="bottom"
    >
      <motion.div 
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: isBoosted ? 1.3 : 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ delay: Math.min(index * 0.01, 0.3), type: "spring", stiffness: 260, damping: 18 }}
        onClick={() => onClick(u.id)}
        className="relative group cursor-pointer"
      >
        {/* Pulso Premium Vivo */}
        {u.online && (
          <motion.div
            className={`absolute inset-0 rounded-full blur-xl -z-10 ${
              isBoosted ? 'bg-gradient-to-r from-yellow-400 to-fuchsia-500' : 'bg-fuchsia-500/40'
            }`}
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
        )}

        <div className={`w-12 h-12 rounded-full border-2 ${
          isBoosted 
          ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.6)]' 
          : u.premium ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.4)]'
        } overflow-hidden shadow-2xl transform group-hover:scale-110 group-active:scale-95 transition-all duration-300`}>
          <motion.img 
            layoutId={`marker-photo-${u.id}`}
            src={u.fotoUrl || '/globe.svg'} 
            alt={u.nick} 
            className="w-full h-full object-cover" 
            loading="lazy"
          />
        </div>
        
        {/* Mood Bubble (Emoji Flotante) */}
        {u.mood && (
          <motion.div 
            initial={{ y: 0 }}
            animate={{ y: [-2, 2, -2] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full w-8 h-8 flex items-center justify-center text-lg shadow-xl"
          >
            {u.mood}
          </motion.div>
        )}

        {/* Badge de estado */}
        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 shadow-md ${u.online ? 'bg-green-500' : 'bg-slate-500'}`}></div>
        
        {/* Badge Verificado Flotante */}
        {u.verified && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-1 -left-1 bg-blue-500 text-white p-0.5 rounded-full shadow-lg border-2 border-slate-950 z-20 flex items-center justify-center"
          >
            <span className="material-icons text-[10px]">verified</span>
          </motion.div>
        )}

        {/* Tooltip con info Rediseñado */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 hidden group-hover:block z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/90 backdrop-blur-xl border border-white/20 p-4 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[160px]"
          >
            <div className="flex items-center gap-3 mb-2">
              <p className="font-black text-base text-white">{u.nick}, {u.edad || '?'}</p>
              {u.verified && <span className="material-icons text-blue-500 text-sm">verified</span>}
              {u.premium && <span className="text-[9px] bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-2 py-0.5 rounded-full font-black shadow-lg shadow-yellow-500/20">VIP</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded-lg bg-white/5 text-[10px] text-slate-300 font-bold capitalize">{u.rol}</span>
              <span className="px-2 py-1 rounded-lg bg-fuchsia-500/10 text-[10px] text-fuchsia-400 font-bold capitalize">{u.intencion}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-center">
              <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Ver Perfil</p>
            </div>
          </motion.div>
          <div className="w-3 h-3 bg-slate-900/90 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b border-white/20"></div>
        </div>
      </motion.div>
    </Marker>
  );
});

UserMarker.displayName = 'UserMarker';

// Componente de Marcador para Locales / Cruising
const VenueMarker = memo(({ v, onClick, index }: { v: any, onClick: (id: string) => void, index: number }) => {
  const isBoosted = v.boostActive || v.subscription?.status === 'active';
  
  // Style mapping
  let bgClass = 'bg-slate-900 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]';
  let iconName = 'place';
  let gradientClass = 'bg-indigo-500/20';
  
  if (v.isClaimed === false) {
    bgClass = 'bg-slate-900 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]';
    iconName = 'storefront';
    gradientClass = 'bg-yellow-500/20';
  } else if (v.type === 'public_cruising' || v.type === 'cruising') {
    bgClass = 'bg-slate-900 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]';
    iconName = 'park';
    gradientClass = 'bg-emerald-500/20';
  } else if (v.type === 'sauna') {
    bgClass = 'bg-slate-900 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]';
    iconName = 'hot_tub';
    gradientClass = 'bg-red-500/20';
  } else if (v.type === 'cruising_bar') {
    bgClass = 'bg-slate-900 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]';
    iconName = 'local_bar';
    gradientClass = 'bg-orange-500/20';
  } else if (v.type === 'club' || v.type === 'nightlife') {
    bgClass = 'bg-slate-900 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]';
    iconName = 'nightlife';
    gradientClass = 'bg-cyan-400/20';
  }

  return (
    <Marker 
      latitude={v.location.latitude} 
      longitude={v.location.longitude}
      anchor="bottom"
    >
      <motion.div 
        initial={{ scale: 0.6, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.05, 0.5), type: "spring", stiffness: 200, damping: 15 }}
        onClick={() => onClick(v.id)}
        className="relative group cursor-pointer"
      >
        {isBoosted && (
          <motion.div
            className="absolute inset-0 rounded-[1rem] bg-yellow-500/30 blur-xl -z-10"
            animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        {!isBoosted && (
          <div className={`absolute inset-0 rounded-[1rem] ${gradientClass} blur-lg -z-10`} />
        )}
        <div className={`w-12 h-12 rounded-[1rem] border-2 flex items-center justify-center shadow-2xl transform group-hover:scale-110 group-active:scale-95 transition-all duration-300 ${
          isBoosted ? 'bg-slate-900 border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.6)]' : bgClass
        }`}>
          {v.coverImage ? (
            <img src={v.coverImage} alt={v.name} className="w-full h-full object-cover rounded-[14px] opacity-80" />
          ) : (
            <span className="material-icons text-white text-2xl">
              {iconName}
            </span>
          )}
        </div>
        
        {(v.boostActive || v.subscription?.status === 'active') && (
          <div className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-300 to-amber-600 border border-yellow-200 text-black p-0.5 rounded-full shadow-lg z-20 flex items-center justify-center animate-pulse">
            <span className="material-icons text-[12px]">star</span>
          </div>
        )}
        
        {/* Tooltip Local */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-50 animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] whitespace-nowrap flex flex-col items-center">
            <p className="font-black text-sm text-white">{v.name}</p>
            {v.isClaimed === false ? (
              <p className="text-[9px] font-bold text-yellow-400 uppercase tracking-widest mt-1">🟡 Pendiente Verificación</p>
            ) : (
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{v.type}</p>
            )}
          </div>
          <div className="w-3 h-3 bg-slate-900/90 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b border-white/20"></div>
        </div>
      </motion.div>
    </Marker>
  );
});

VenueMarker.displayName = 'VenueMarker';

const ChillMarker = memo(({ c, onClick, index }: { c: Chill, onClick: (id: string) => void, index: number }) => {
  const spots = c.max_capacity - c.accepted_users.length;
  const isCommercial = c.type === 'commercial';
  const colorClass = isCommercial ? 'amber' : 'fuchsia';
  
  return (
    <Marker latitude={c.approx_lat} longitude={c.approx_lng} anchor="center">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: Math.min(index * 0.05, 0.5), type: "spring", stiffness: 200 }}
        onClick={() => onClick(c.id)}
        className="relative group cursor-pointer"
      >
        <motion.div
          className={`absolute inset-0 rounded-full ${isCommercial ? 'bg-amber-500/30' : 'bg-fuchsia-500/20'} blur-xl -z-10`}
          animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${isCommercial ? 'from-amber-400 to-orange-500 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'from-fuchsia-600 to-purple-700 border-fuchsia-400 shadow-[0_0_20px_rgba(192,38,211,0.5)]'} border-2 flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <span className="material-icons text-white text-xl">{isCommercial ? 'vpn_key' : 'local_fire_department'}</span>
        </div>
        <div className={`absolute -bottom-1 -right-1 bg-black border ${isCommercial ? 'border-amber-500/50 text-amber-400' : 'border-fuchsia-500/50 text-fuchsia-400'} rounded-full px-1.5 py-0.5 text-[8px] font-black`}>
          {spots > 0 ? spots : '0'}
        </div>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-50 pointer-events-none">
          <div className={`bg-slate-900/90 backdrop-blur-xl border ${isCommercial ? 'border-amber-500/30' : 'border-fuchsia-500/30'} px-4 py-2 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] whitespace-nowrap flex flex-col items-center`}>
            <p className="font-black text-sm text-white">{c.title}</p>
            <p className={`text-[9px] font-bold ${isCommercial ? 'text-amber-400' : 'text-fuchsia-400'}`}>
              {isCommercial ? 'After Privado' : 'Chill Social'} &middot; {spots > 0 ? `${spots} plazas` : 'Lleno'}
            </p>
          </div>
          <div className={`w-3 h-3 bg-slate-900/90 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b ${isCommercial ? 'border-amber-500/30' : 'border-fuchsia-500/30'}`}></div>
        </div>
      </motion.div>
    </Marker>
  );
});

ChillMarker.displayName = 'ChillMarker';

const mapContainerStyle = { width: '100%', height: '100%' };

const IsolatedMap = memo(({
  viewState, setViewState, mapRef, onMapLoad,
  radarFilter, filteredUsers, visibleVenues, visibleChills,
  handleViewProfile, handleVenueClick, handleChillClick
}: any) => {
  return (
    <Map
      {...viewState}
      ref={mapRef}
      onMove={(evt: any) => setViewState(evt.viewState)}
      mapStyle="https://tiles.openfreemap.org/styles/dark"
      style={mapContainerStyle}
      onLoad={onMapLoad}
    >
      <NavigationControl position="top-left" />

      <AnimatePresence>
        {radarFilter.mode === 'users' && filteredUsers.map((u: any, index: number) => (
          <UserMarker 
            key={u.id} 
            u={u} 
            index={index}
            onClick={handleViewProfile} 
          />
        ))}

        {radarFilter.mode === 'places' && visibleVenues.map((v: any, index: number) => (
          <VenueMarker
            key={v.id}
            v={v}
            index={index}
            onClick={handleVenueClick}
          />
        ))}

        {radarFilter.mode === 'places' && visibleChills.map((c: any, index: number) => (
          <ChillMarker
            key={c.id}
            c={c}
            index={index}
            onClick={handleChillClick}
          />
        ))}
      </AnimatePresence>
    </Map>
  );
}, (prev: any, next: any) => {
  return prev.radarFilter === next.radarFilter &&
         prev.filteredUsers === next.filteredUsers &&
         prev.visibleVenues === next.visibleVenues &&
         prev.visibleChills === next.visibleChills &&
         prev.viewState.latitude === next.viewState.latitude &&
         prev.viewState.longitude === next.viewState.longitude &&
         prev.viewState.zoom === next.viewState.zoom;
});

IsolatedMap.displayName = 'IsolatedMap';


export default function MainMap() {
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const mapRef = useRef<MapRef>(null);
  
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  
  const [viewState, setViewState] = useState({
    latitude: 40.485,
    longitude: -3.36,
    zoom: 14
  });
  
  const [usersNearby, setUsersNearby] = useState<User[]>([]);
  const [venuesMap, setVenuesMap] = useState<any[]>([]);
  const [chillsMap, setChillsMap] = useState<Chill[]>([]);
  const { citySlug } = useCity();
  const [isOptimisticAvailable, setIsOptimisticAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [myVenueId, setMyVenueId] = useState<string | undefined>();
  const [showCheckinPrompt, setShowCheckinPrompt] = useState(false);
  
  const [isAddingPin, setIsAddingPin] = useState(false);
  const [newPinType, setNewPinType] = useState('public_cruising');
  const [newPinName, setNewPinName] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);
  
  // Filtro unificado
  const [radarFilter, setRadarFilter] = useState({
    mode: 'places' as RadarMode,
    type: 'all' as EntityType,
    query: ''
  });
  
  // Estados de filtros
  const { currentCity } = useCity();
  const isAvailable = isOptimisticAvailable !== null ? isOptimisticAvailable : !!profile?.online;

  // Vibración háptica
  const triggerHaptic = (intensity = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(intensity);
    }
  };

  // Estados de filtros
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ageRange, setAgeRange] = useState([18, 99]);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [intentionFilter, setIntentionFilter] = useState<string | null>(null);
  const [onlyPremium, setOnlyPremium] = useState(false);
  const [onlyWithPhoto, setOnlyWithPhoto] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState(50); // 50km por defecto

  useEffect(() => {
    if (authLoading || !user) return;

    const q = query(collection(db, 'users'), where('online', '==', true), limit(150));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const users: User[] = [];
        const blockedUsers = profileRef.current?.blockedUsers || [];
        
        snapshot.forEach((doc) => {
          const uData = doc.data();
          if (!blockedUsers.includes(doc.id) && doc.id !== user?.uid && uData.rol !== 'party_only') {
            users.push({ id: doc.id, ...uData } as User);
          }
        });
        setUsersNearby(users);
        setLoading(false);
      },
      (error) => {
        console.error("Map users snapshot error", error);
        setLoading(false);
      }
    );

    const qVenues = query(collection(db, 'venues'), where('isActive', '==', true));
    const unsubVenues = onSnapshot(qVenues, (snapshot) => {
      const v: any[] = [];
      const now = new Date();
      snapshot.forEach(doc => {
        const data = doc.data();
        // Filtrar chills caducados (24h)
        if (data.type === 'chill' && data.expiresAt && data.expiresAt.toDate() < now) {
          return;
        }
        if (data.location?.latitude && data.location?.longitude) {
          v.push({ id: doc.id, ...data });
        }
      });
      setVenuesMap(v);
    });

    let unsubChills = () => {};
    if (citySlug) {
      const qChills = query(
        collection(db, 'chills'),
        where('city_slug', '==', citySlug),
        where('status', 'in', ['active', 'full'])
      );
      unsubChills = onSnapshot(qChills, (snap) => {
        setChillsMap(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chill)));
      });
    }

    return () => {
      unsubscribe();
      unsubVenues();
      unsubChills();
    };
  }, [user, citySlug]);

  const centerOnUser = () => {
    if (!mapRef.current) return;
    triggerHaptic(15);
    
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([longitude, latitude]);
        
        // Animación suave FlyTo
        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          duration: 2000,
          essential: true
        });
      }, (err) => {
        // Silencio: el usuario ya tiene la info en su perfil
      });
    }
  };

  const toggleAvailability = async () => {
    if (!user) return;
    triggerHaptic(20);
    const nextState = !isAvailable;
    
    // Actualización optimista inmediata
    setIsOptimisticAvailable(nextState);

    try {
      if (nextState) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude, longitude } = pos.coords;
          await setDoc(doc(db, 'locations', user.uid as string), {
            lat: latitude,
            lng: longitude,
            updatedAt: new Date()
          });
          await setDoc(doc(db, 'users', user.uid as string), {
            online: true,
            lat: latitude,
            lng: longitude
          }, { merge: true });
          
          // Limpiar estado optimista cuando Firestore haya respondido (opcional, el snapshot lo hará)
          setTimeout(() => setIsOptimisticAvailable(null), 1000);
        });
      } else {
        await setDoc(doc(db, 'users', user?.uid as string), { online: nextState }, { merge: true });
        setTimeout(() => setIsOptimisticAvailable(null), 1000);
      }
    } catch (error) {
      console.error("Error toggling availability", error);
      setIsOptimisticAvailable(null); // Revertir en caso de error
    }
  };

  const handleViewProfile = useCallback((userId: string) => {
    triggerHaptic(15);
    setSelectedProfileId(userId);
  }, []);

  const handleVenueClick = useCallback((id: string) => {
    triggerHaptic(10);
    router.push(`/venues/detail?id=${id}`);
  }, [router]);

  const handleChillClick = useCallback((id: string) => {
    triggerHaptic(10);
    router.push(`/chills/detail?id=${id}`);
  }, [router]);

  const filteredUsers = useMemo(() => {
    return usersNearby.filter((u) => {
      if (typeof u.lat !== 'number' || typeof u.lng !== 'number' || Number.isNaN(u.lat) || Number.isNaN(u.lng)) return false;
      if (u.edad !== null && (u.edad < ageRange[0] || u.edad > ageRange[1])) return false;
      if (roleFilter && u.rol !== roleFilter) return false;
      if (intentionFilter && u.intencion !== intentionFilter) return false;
      if (onlyPremium && !u.premium) return false;
      if (onlyWithPhoto && !u.fotoUrl) return false;
      
      // Filtro de distancia
      if (profile?.lat && u.lat && userLocation) {
        const distance = calculateDistance(userLocation[0], userLocation[1], u.lat as number, u.lng as number);
        if (parseFloat(distance) > distanceFilter) return false;
      }

      // New unified search
      if (radarFilter.query) {
        const q = radarFilter.query.toLowerCase().trim();
        if (!u.nick.toLowerCase().includes(q)) return false;
      }
      
      return true;
    });
  }, [usersNearby, ageRange, roleFilter, intentionFilter, onlyPremium, onlyWithPhoto, distanceFilter, profile?.lat, userLocation, radarFilter.query]);
  
  const visibleVenues = useMemo(() => {
    if (radarFilter.mode !== 'places') return [];
    
    return venuesMap.filter(v => {
      if (radarFilter.type !== 'all') {
        if (radarFilter.type === 'sauna' && v.type !== 'sauna') return false;
        if (radarFilter.type === 'club' && v.type !== 'club' && v.type !== 'nightlife') return false;
        if (radarFilter.type === 'bar' && v.type !== 'cruising_bar') return false;
        if (radarFilter.type === 'cruising' && v.type !== 'public_cruising' && v.type !== 'cruising') return false;
        if (radarFilter.type === 'chill') return false; // chills are handled separately
      }
      if (radarFilter.query) {
        const q = radarFilter.query.toLowerCase().trim();
        if (!v.name?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [venuesMap, radarFilter]);

  const visibleChills = useMemo(() => {
    if (radarFilter.mode !== 'places') return [];
    if (radarFilter.type !== 'all' && radarFilter.type !== 'chill') return [];
    
    return chillsMap.filter(c => {
      if (radarFilter.query) {
        const q = radarFilter.query.toLowerCase().trim();
        if (!c.title?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [chillsMap, radarFilter]);

  const onMapLoad = useCallback((e: any) => {
    const map = e.target;
    
    // Función para inyectar texturas faltantes
    const injectMissingImage = (imageId: string) => {
      if (!map.hasImage(imageId)) {
        const data = new Uint8Array([0, 0, 0, 0]);
        try {
          map.addImage(imageId, { width: 1, height: 1, data: data });
        } catch (err) {}
      }
    };

    // Manejador inmediato
    map.on('styleimagemissing', (ev: any) => {
      injectMissingImage(ev.id);
    });

    // Inyectar proactivamente patrones conocidos que dan guerra
    ['wood-pattern', 'grass-pattern', 'park-pattern'].forEach(injectMissingImage);
  }, []);

  const handleSavePin = async () => {
    if (!newPinName.trim() || !user) return;
    setIsSavingPin(true);
    triggerHaptic(20);
    
    try {
      const expiresAt = newPinType === 'chill' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
      
      const ref = doc(collection(db, 'venues'));
      await setDoc(ref, {
        name: newPinName.trim(),
        type: newPinType,
        location: {
          latitude: viewState.latitude,
          longitude: viewState.longitude
        },
        isActive: true,
        currentCount: 0,
        cityId: profile?.cityId || 'madrid',
        ownerId: 'community',
        createdBy: user.uid,
        createdAt: new Date(),
        ...(expiresAt ? { expiresAt } : {})
      });
      
      setIsAddingPin(false);
      setNewPinName('');
      setNewPinType('cruising_outdoor');
    } catch (e) {
      console.error(e);
      alert('Error al crear el punto');
    } finally {
      setIsSavingPin(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="relative w-full h-[65svh] md:h-[65vh] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-slate-950">
      <motion.div 
        animate={{ 
          filter: selectedProfileId ? 'blur(10px) brightness(0.5)' : 'blur(0px) brightness(1)',
          scale: selectedProfileId ? 0.95 : 1
        }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="w-full h-full"
      >
        <AnimatePresence>
          {loading && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30"
            >
              <Skeleton className="w-full h-full rounded-none" />
            </motion.div>
          )}
        </AnimatePresence>

        {radarFilter.mode === 'swipe' ? (
          <div className="absolute inset-0 z-40 bg-slate-950">
            <SwipeCards 
              users={usersNearby} 
              myVenueId={myVenueId}
              onSwipe={(id, direction) => {
                if (direction === 'up_no_checkin') {
                  setShowCheckinPrompt(true);
                  setRadarFilter(prev => ({ ...prev, mode: 'places' }));
                }
              }} 
            />
          </div>
        ) : null}

        <IsolatedMap
          viewState={viewState}
          setViewState={setViewState}
          mapRef={mapRef}
          onMapLoad={onMapLoad}
          radarFilter={radarFilter}
          filteredUsers={filteredUsers}
          visibleVenues={visibleVenues}
          visibleChills={visibleChills}
          handleViewProfile={handleViewProfile}
          handleVenueClick={handleVenueClick}
          handleChillClick={handleChillClick}
        />

        {/* Crosshair & Pin Creation Overlay */}
        {isAddingPin && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-30">
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative -top-6"
            >
              <div className="w-12 h-12 flex items-center justify-center text-fuchsia-500">
                <span className="material-icons text-4xl shadow-2xl drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]">
                  {newPinType === 'cruising_outdoor' ? 'park' : 'local_fire_department'}
                </span>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-fuchsia-500 rounded-full shadow-[0_0_10px_#d946ef]"></div>
            </motion.div>

            {/* Bottom Sheet Form */}
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute bottom-8 w-[90%] max-w-sm bg-slate-900/95 backdrop-blur-2xl border border-white/10 p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto"
            >
              <h3 className="text-sm font-black text-white mb-4 tracking-tight">{t('map.create_pin', 'Crear Punto Comunitario')}</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setNewPinType('cruising_outdoor')} 
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${newPinType === 'cruising_outdoor' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-black/40 text-slate-400'}`}
                  >
                    Cruising 🌲
                  </button>
                  <button 
                    onClick={() => setNewPinType('sauna')} 
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${newPinType === 'sauna' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-black/40 text-slate-400'}`}
                  >
                    Sauna ♨️
                  </button>
                  <button 
                    onClick={() => setNewPinType('bar')} 
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${newPinType === 'bar' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'bg-black/40 text-slate-400'}`}
                  >
                    Bar 🍸
                  </button>
                  <button 
                    onClick={() => setNewPinType('club')} 
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${newPinType === 'club' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'bg-black/40 text-slate-400'}`}
                  >
                    Discoteca 🪩
                  </button>
                </div>
                <input 
                  value={newPinName}
                  onChange={e => setNewPinName(e.target.value)}
                  placeholder={t('map.pin_name', 'Nombre del lugar...')}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-fuchsia-500 outline-none text-white"
                />
                <button 
                  disabled={!newPinName.trim() || isSavingPin}
                  onClick={handleSavePin}
                  className="w-full bg-white text-black font-black uppercase tracking-widest text-[10px] py-3 rounded-xl disabled:opacity-50 transition-all"
                >
                  {isSavingPin ? t('map.saving', 'Guardando...') : t('map.save', 'Fijar Aquí')}
                </button>
                {newPinType === 'chill' && <p className="text-[9px] text-center text-slate-500 uppercase tracking-widest">Este evento desaparecerá en 24h</p>}
              </div>
            </motion.div>
          </div>
        )}

        {/* Botón flotante de Disponibilidad */}
        {!isAddingPin && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[85%] max-w-xs z-20">
            <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleAvailability}
            className={`w-full py-5 rounded-[2rem] font-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 flex items-center justify-center gap-4 border-2 ${
              isAvailable 
              ? 'bg-green-500 border-green-400 text-white' 
              : 'bg-slate-900/60 backdrop-blur-2xl text-white border-white/10'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-white shadow-[0_0_15px_white] animate-pulse' : 'bg-slate-600'}`}></div>
            <span className="text-xs uppercase tracking-[0.2em]">{isAvailable ? t('map.visible_now', 'VISIBLE AHORA') : t('map.make_visible', 'VOLVERME VISIBLE')}</span>
          </motion.button>
        </div>
        )}
      </motion.div>

      {/* Profile Overlay Renderizado fuera del contenedor blurreado */}
      <AnimatePresence>
        {selectedProfileId && (
          <ProfileOverlay 
            id={selectedProfileId} 
            onClose={() => {
              triggerHaptic(5);
              setSelectedProfileId(null);
            }} 
          />
        )}
      </AnimatePresence>
      </div>

      {/* Controles del Mapa (Fuera del contenedor del mapa) */}
      <div className="flex items-center justify-between px-2 pb-4">
        <CitySelector />
        <div className="flex items-center gap-3">
          {profile?.premium && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { triggerHaptic(10); setIsAddingPin(!isAddingPin); }}
              className={`w-12 h-12 rounded-2xl backdrop-blur-xl text-white border flex items-center justify-center shadow-lg transition-all ${
                isAddingPin ? 'bg-fuchsia-600 border-fuchsia-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="material-icons text-xl">{isAddingPin ? 'close' : 'add_location'}</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={centerOnUser}
            className="w-12 h-12 rounded-2xl bg-white/5 text-white border border-white/10 flex items-center justify-center shadow-lg hover:bg-white/10 transition-all"
          >
            <span className="material-icons text-xl text-fuchsia-400">my_location</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { triggerHaptic(10); setFiltersOpen(true); }}
            className="relative w-12 h-12 rounded-2xl bg-white/5 text-white border border-white/10 flex items-center justify-center shadow-lg hover:bg-white/10 transition-all"
          >
            <span className="material-icons text-xl text-fuchsia-400">tune</span>
            {(roleFilter || intentionFilter || onlyPremium) && (
              <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-fuchsia-500 border-2 border-slate-900 animate-pulse shadow-[0_0_8px_#d946ef]"></div>
            )}
          </motion.button>
        </div>
      </div>

      {/* Drawer de Filtros Premium */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end justify-center px-4 pb-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-lg bg-slate-900 rounded-[2.5rem] p-6 space-y-6 shadow-[0_-20px_80px_rgba(0,0,0,0.8)] border border-white/10 max-h-[85svh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-2">
                <h3 className="text-2xl font-black text-white tracking-tight">{t('map.refine', 'Refinar Búsqueda')}</h3>
                <button 
                  onClick={() => { triggerHaptic(5); setFiltersOpen(false); }}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                >
                  <span className="material-icons text-xl">close</span>
                </button>
              </div>

              {/* Búsqueda Inteligente (Movida desde el mapa) */}
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3 focus-within:border-fuchsia-500 transition-colors">
                  <Search className="text-slate-400 w-5 h-5 ml-1" />
                  <input 
                    type="text" 
                    placeholder={radarFilter.mode === 'places' ? 'Buscar local, fiesta o villa...' : 'Buscar usuarios por nombre...'}
                    value={radarFilter.query}
                    onChange={e => setRadarFilter(prev => ({ ...prev, query: e.target.value }))}
                    className="bg-transparent text-white w-full outline-none text-sm placeholder-slate-500"
                  />
                </div>

                <div className="flex bg-black/40 border border-white/10 rounded-xl p-1">
                  <button 
                    onClick={() => setRadarFilter(prev => ({ ...prev, mode: 'places' }))}
                    className={`flex-1 py-2.5 rounded-lg text-[10px] uppercase font-black transition-all flex items-center justify-center gap-1 ${radarFilter.mode === 'places' ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    <span>📍</span> Lugares
                  </button>
                  <button 
                    onClick={() => setRadarFilter(prev => ({ ...prev, mode: 'users' }))}
                    className={`flex-1 py-2.5 rounded-lg text-[10px] uppercase font-black transition-all flex items-center justify-center gap-1 ${radarFilter.mode === 'users' ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    <span>👥</span> Mapa
                  </button>
                  <button 
                    onClick={() => setRadarFilter(prev => ({ ...prev, mode: 'swipe' }))}
                    className={`flex-1 py-2.5 rounded-lg text-[10px] uppercase font-black transition-all flex items-center justify-center gap-1 ${radarFilter.mode === 'swipe' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'text-slate-400 hover:text-white'}`}
                  >
                    <span>🔥</span> Swipe
                  </button>
                </div>
              </div>

              {radarFilter.mode === 'places' ? (
                // Filtros para LUGARES
                <div className="space-y-4 py-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Categoría de Sitio</p>
                  <div className="grid grid-cols-2 gap-3">
                    {PLACE_CATEGORIES.map(cat => (
                      <button 
                        key={cat.id} 
                        onClick={() => { triggerHaptic(10); setRadarFilter(prev => ({ ...prev, type: cat.id as any })) }}
                        className={`py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${radarFilter.type === cat.id ? "bg-fuchsia-500 text-white shadow-xl shadow-fuchsia-500/20" : "bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10"}`}
                      >
                        <span className="text-lg">{cat.icon}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // Filtros para USUARIOS
                <>
                  <div className="space-y-6 pt-2">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Rango de Edad</p>
                  <p className="text-fuchsia-400 font-black text-lg">{ageRange[0]} - {ageRange[1]}</p>
                </div>
                <div className="space-y-4">
                  <input type="range" min={18} max={99} value={ageRange[0]} onChange={(e) => setAgeRange([Number(e.target.value), ageRange[1]])} className="w-full h-1.5 bg-white/5 rounded-full appearance-none accent-fuchsia-500 cursor-pointer" />
                  <input type="range" min={18} max={99} value={ageRange[1]} onChange={(e) => setAgeRange([ageRange[0], Number(e.target.value)])} className="w-full h-1.5 bg-white/5 rounded-full appearance-none accent-fuchsia-500 cursor-pointer" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Distancia Máxima</p>
                  <p className="text-fuchsia-400 font-black text-lg">{distanceFilter} km</p>
                </div>
                <div className="space-y-4">
                  <input 
                    type="range" 
                    min={1} 
                    max={100} 
                    value={distanceFilter} 
                    onChange={(e) => setDistanceFilter(Number(e.target.value))} 
                    className="w-full h-1.5 bg-white/5 rounded-full appearance-none accent-fuchsia-500 cursor-pointer" 
                  />
                  <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest px-1">
                    <span>1 km</span>
                    <span>100 km</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Rol</p>
                  <div className="grid grid-cols-1 gap-2">
                    {["activo", "pasivo", "versátil"].map((r) => (
                      <button key={r} onClick={() => { triggerHaptic(10); setRoleFilter(roleFilter === r ? null : r); }} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${roleFilter === r ? "bg-fuchsia-500 text-white shadow-xl shadow-fuchsia-500/20" : "bg-white/5 text-slate-400 border border-white/5"}`}>{r}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Busco...</p>
                  <div className="grid grid-cols-1 gap-2">
                    {["conocer", "quedar"].map((i) => (
                      <button key={i} onClick={() => { triggerHaptic(10); setIntentionFilter(intentionFilter === i ? null : i); }} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${intentionFilter === i ? "bg-fuchsia-500 text-white shadow-xl shadow-fuchsia-500/20" : "bg-white/5 text-slate-400 border border-white/5"}`}>{i}</button>
                    ))}
                  </div>
                </div>
              </div>

                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Filtros VIP</p>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        if (!profile?.premium) return router.push('/premium');
                        triggerHaptic(10);
                        setOnlyWithPhoto(!onlyWithPhoto);
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        onlyWithPhoto 
                        ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-400' 
                        : 'bg-white/5 border-white/5 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-sm">{onlyWithPhoto ? 'check_box' : 'check_box_outline_blank'}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Solo con foto</span>
                      </div>
                      {!profile?.premium && <span className="material-icons text-sm text-yellow-500">lock</span>}
                    </button>

                    <button 
                      onClick={() => {
                        if (!profile?.premium) return router.push('/premium');
                        triggerHaptic(10);
                        setOnlyPremium(!onlyPremium);
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        onlyPremium 
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' 
                        : 'bg-white/5 border-white/5 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-sm">{onlyPremium ? 'check_box' : 'check_box_outline_blank'}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Solo VIPs</span>
                      </div>
                      {!profile?.premium && <span className="material-icons text-sm text-yellow-500">lock</span>}
                    </button>
                  </div>
                </div>
                </>
              )}

                <button
                  onClick={() => setFiltersOpen(false)}
                  className="w-full rounded-[2rem] bg-white text-black py-6 text-xs font-black uppercase tracking-[0.3em] hover:bg-slate-200 transition-all shadow-2xl"
                >
                  Ver {filteredUsers.length} resultados
                </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
