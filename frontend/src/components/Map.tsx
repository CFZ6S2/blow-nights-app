'use client';

import { useState, useEffect, useRef } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '@/context/AuthContext';
import { collection, onSnapshot, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MainMap() {
  const { user, profile } = useAuth();
  const [viewState, setViewState] = useState({
    latitude: 40.4168,
    longitude: -3.7038,
    zoom: 14
  });
  const [usersNearby, setUsersNearby] = useState([]);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Obtener ubicación inicial
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setViewState((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }));
      },
      (err) => console.error("Error getting location", err)
    );

    // Escuchar usuarios cercanos (Simulación simple sin geohash por ahora)
    const q = query(collection(db, 'users'), where('online', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = [];
      snapshot.forEach((doc) => {
        if (doc.id !== user?.uid) {
          users.push({ id: doc.id, ...doc.data() });
        }
      });
      setUsersNearby(users);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleAvailability = async () => {
    const nextState = !isAvailable;
    setIsAvailable(nextState);

    if (nextState) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Actualizar ubicación en Firestore
        await setDoc(doc(db, 'locations', user.uid), {
          lat: latitude,
          lng: longitude,
          updatedAt: new Date()
        });
        // Marcar como disponible
        await setDoc(doc(db, 'users', user.uid), {
          online: true,
          disponibleHasta: new Date(Date.now() + 60 * 60 * 1000) // 1 hora
        }, { merge: true });
      });
    } else {
      await setDoc(doc(db, 'users', user.uid), {
        online: false,
        disponibleHasta: null
      }, { merge: true });
    }
  };

  return (
    <div className="relative w-full h-[60vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <GeolocateControl position="top-left" trackUserLocation showUserHeading />
        <NavigationControl position="top-left" />

        {/* Marcadores de usuarios cercanos */}
        {usersNearby.map((u) => (
          <Marker 
            key={u.id} 
            latitude={u.lat || 40.41} 
            longitude={u.lng || -3.70}
          >
            <div 
              onClick={() => handleOpenChat(u.id)}
              className="relative group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full border-2 border-pink-500 overflow-hidden shadow-lg shadow-pink-500/50 transform group-hover:scale-110 transition-transform">
                <img src={u.fotoUrl || '/globe.svg'} alt={u.nick} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
              
              {/* Tooltip con info */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 border border-white/10 p-2 rounded-lg text-xs whitespace-nowrap z-50">
                <p className="font-bold">{u.nick}, {u.edad}</p>
                <p className="text-slate-400 capitalize">{u.rol} • {u.intencion}</p>
                <p className="text-[8px] text-pink-500 mt-1 font-bold animate-pulse">PULSA PARA HABLAR</p>
              </div>
            </div>
          </Marker>
        ))}
      </Map>

      {/* Botón flotante de Disponibilidad */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xs">
        <button
          onClick={toggleAvailability}
          className={`w-full py-4 rounded-2xl font-bold shadow-2xl transition-all duration-500 flex items-center justify-center gap-3 ${
            isAvailable 
            ? 'bg-green-500 text-white animate-pulse' 
            : 'bg-white/10 backdrop-blur-md text-white border border-white/20'
          }`}
        >
          <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-white' : 'bg-slate-500'}`}></div>
          {isAvailable ? 'ESTÁS DISPONIBLE' : 'PONERME DISPONIBLE'}
        </button>
      </div>
    </div>
  );
}
