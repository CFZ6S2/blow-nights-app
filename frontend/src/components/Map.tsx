'use client';

import React, { useState, useEffect, useRef, memo } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAuth } from '@/context/AuthContext';
import { collection, onSnapshot, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '@/components/Skeleton';
import { useRouter } from 'next/navigation';
import ProfileOverlay from './ProfileOverlay';

import { calculateDistance } from '@/lib/geo';

// Cambiamos a OpenFreeMap para mayor robustez y velocidad
const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

// Componente de Marcador Memoizado para máximo rendimiento
const UserMarker = memo(({ u, onClick, index }: { u: any, onClick: (id: string) => void, index: number }) => {
  const isBoosted = u.boostedUntil && u.boostedUntil.toDate() > new Date();

  return (
    <Marker 
      latitude={u.lat} 
      longitude={u.lng}
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
              <p className="font-black text-base text-white">{u.nick}, {u.edad}</p>
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

export default function MainMap() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const mapRef = useRef(null);
  
  const [viewState, setViewState] = useState({
    latitude: 40.485,
    longitude: -3.36,
    zoom: 14
  });
  
  const [usersNearby, setUsersNearby] = useState([]);
  const [isOptimisticAvailable, setIsOptimisticAvailable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  // Estados para Modo Viaje
  const [travelSearch, setTravelSearch] = useState('');
  const [isTraveling, setIsTraveling] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Determinar visibilidad (Prioridad: Optimismo local > Estado real del perfil)
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
  const [roleFilter, setRoleFilter] = useState(null);
  const [intentionFilter, setIntentionFilter] = useState(null);
  const [onlyPremium, setOnlyPremium] = useState(false);
  const [onlyWithPhoto, setOnlyWithPhoto] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState(50); // 50km por defecto

  useEffect(() => {
    // Obtener ubicación inicial
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation([longitude, latitude]);
          setViewState((prev) => ({
            ...prev,
            latitude,
            longitude
          }));
        },
        (err) => {
          // Silenciamos el error en la consola del mapa para evitar ruidos
          // El usuario ya recibe el aviso detallado en su pestaña de Perfil
        }
      );
    }

    const q = query(collection(db, 'users'), where('online', '==', true));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const users = [];
        const blockedUsers = profile?.blockedUsers || [];
        
        snapshot.forEach((doc) => {
          if (doc.id !== user?.uid && !blockedUsers.includes(doc.id)) {
            users.push({ id: doc.id, ...doc.data() });
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

    return () => unsubscribe();
  }, [user]);

  const centerOnUser = () => {
    if (!mapRef.current) return;
    triggerHaptic(15);
    
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([longitude, latitude]);
        
        // Animación suave FlyTo
        mapRef.current.flyTo({
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
    triggerHaptic(20);
    const nextState = !isAvailable;
    
    // Actualización optimista inmediata
    setIsOptimisticAvailable(nextState);

    try {
      if (nextState) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude, longitude } = pos.coords;
          await setDoc(doc(db, 'locations', user.uid), {
            lat: latitude,
            lng: longitude,
            updatedAt: new Date()
          });
          await setDoc(doc(db, 'users', user.uid), {
            online: true,
            lat: latitude,
            lng: longitude
          }, { merge: true });
          
          // Limpiar estado optimista cuando Firestore haya respondido (opcional, el snapshot lo hará)
          setTimeout(() => setIsOptimisticAvailable(null), 1000);
        });
      } else {
        await setDoc(doc(db, 'users', user.uid), {
          online: false
        }, { merge: true });
        setTimeout(() => setIsOptimisticAvailable(null), 1000);
      }
    } catch (error) {
      console.error("Error toggling availability", error);
      setIsOptimisticAvailable(null); // Revertir en caso de error
    }
  };

  const handleTravelSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!travelSearch.trim()) return;
    setIsSearching(true);
    triggerHaptic(5);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(travelSearch)}&limit=5`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Error searching location", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (loc: any) => {
    const lat = parseFloat(loc.lat);
    const lon = parseFloat(loc.lon);
    
    setViewState(prev => ({
      ...prev,
      latitude: lat,
      longitude: lon,
      zoom: 14
    }));

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lon, lat],
        zoom: 14,
        duration: 2000
      });
    }

    setSearchResults([]);
    setTravelSearch(loc.display_name.split(',')[0]);
    setIsTraveling(true);
    triggerHaptic(15);
  };

  const handleViewProfile = (userId: string) => {
    triggerHaptic(15);
    setSelectedProfileId(userId);
  };

  const filteredUsers = usersNearby.filter((u) => {
    if (typeof u.lat !== 'number' || typeof u.lng !== 'number' || Number.isNaN(u.lat) || Number.isNaN(u.lng)) return false;
    if (u.edad < ageRange[0] || u.edad > ageRange[1]) return false;
    if (roleFilter && u.rol !== roleFilter) return false;
    if (intentionFilter && u.intencion !== intentionFilter) return false;
    if (onlyPremium && !u.premium) return false;
    if (onlyWithPhoto && !u.fotoUrl) return false;
    
    // Filtro de distancia
    if (profile?.lat && u.lat) {
      const d = parseFloat(calculateDistance(profile.lat, profile.lng, u.lat, u.lng));
      if (d > distanceFilter) return false;
    }
    
    return true;
  });

  const onMapLoad = (e: any) => {
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
  };

  return (
    <div className="relative w-full h-[70vh] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-slate-950">
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

        <Map
          {...viewState}
          ref={mapRef}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
          onLoad={onMapLoad}
          reuseMaps
        >
          <NavigationControl position="top-left" />

          {/* Buscador Modo Viaje */}
          <div className="absolute top-20 left-6 z-20 w-64">
            <div className="relative">
              <form onSubmit={handleTravelSearch} className="relative group">
                <input 
                  type="text" 
                  placeholder="Modo Viaje..."
                  value={travelSearch}
                  onChange={(e) => setTravelSearch(e.target.value)}
                  onFocus={() => { if(!profile?.premium) { triggerHaptic(20); router.push('/premium'); } }}
                  className={`w-full py-3 pl-10 pr-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all ${
                    !profile?.premium ? 'cursor-not-allowed' : 'focus:border-fuchsia-500 focus:bg-slate-800'
                  }`}
                  disabled={!profile?.premium}
                />
                <span className={`material-icons absolute left-3 top-1/2 -translate-y-1/2 text-sm ${!profile?.premium ? 'text-yellow-500' : 'text-slate-500'}`}>
                  {!profile?.premium ? 'lock' : 'travel_explore'}
                </span>
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
                )}
              </form>

              {/* Resultados de búsqueda */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                  >
                    {searchResults.map((loc: any, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSelectLocation(loc)}
                        className="w-full p-4 text-left hover:bg-white/5 transition-all border-b border-white/5 last:border-0 flex items-center gap-3"
                      >
                        <span className="material-icons text-slate-500 text-sm">place</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-white truncate uppercase tracking-widest">{loc.display_name.split(',')[0]}</p>
                          <p className="text-[8px] text-slate-500 truncate uppercase">{loc.display_name.split(',').slice(1).join(',')}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Marcadores de usuarios filtrados */}
          <AnimatePresence>
            {filteredUsers.map((u, index) => (
              <UserMarker 
                key={u.id} 
                u={u} 
                onClick={handleViewProfile} 
                index={index} 
              />
            ))}
          </AnimatePresence>
        </Map>

        {/* Botones Flotantes Superiores */}
        <div className="absolute top-6 right-6 flex flex-col gap-4 z-20">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={centerOnUser}
            className="w-12 h-12 rounded-2xl bg-slate-900/80 backdrop-blur-xl text-white border border-white/10 flex items-center justify-center shadow-2xl hover:bg-slate-800 transition-all"
          >
            <span className="material-icons text-xl text-fuchsia-400">my_location</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { triggerHaptic(10); setFiltersOpen(true); }}
            className="relative w-12 h-12 rounded-2xl bg-slate-900/80 backdrop-blur-xl text-white border border-white/10 flex items-center justify-center shadow-2xl hover:bg-slate-800 transition-all"
          >
            <span className="material-icons text-xl text-fuchsia-400">tune</span>
            {(roleFilter || intentionFilter || onlyPremium) && (
              <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-fuchsia-500 border-2 border-slate-900 animate-pulse shadow-[0_0_8px_#d946ef]"></div>
            )}
          </motion.button>
        </div>

        {/* Botón flotante de Disponibilidad */}
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
            <span className="text-xs uppercase tracking-[0.2em]">{isAvailable ? 'VISIBLE AHORA' : 'VOLVERME VISIBLE'}</span>
          </motion.button>
        </div>
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
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-slate-900 rounded-[3rem] p-10 space-y-10 shadow-[0_-20px_80px_rgba(0,0,0,0.8)] border border-white/10"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-white tracking-tight">Refinar Búsqueda</h3>
                <button 
                  onClick={() => { triggerHaptic(5); setFiltersOpen(false); }}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                >
                  <span className="material-icons text-xl">close</span>
                </button>
              </div>

              <div className="space-y-6">
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
