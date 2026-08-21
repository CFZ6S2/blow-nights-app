'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ticket, Building2, MapPin, Search, ArrowRight, Star, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_CITY } from '@/lib/routes';

interface PublicVenue {
  id: string;
  nombre: string;
  ciudad: string;
  fotoUrl?: string;
  direccion?: string;
  rating?: number;
  slug?: string;
  hasTickets?: boolean;
}

export default function PublicEntradasPage() {
  const { t } = useTranslation();
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPublicVenues = async () => {
      try {
        const q = query(collection(db, 'venues'), where('active', '==', true));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nombre: data.nombre || 'Local Nocturno',
            ciudad: data.ciudad || 'madrid',
            fotoUrl: data.fotoUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop',
            direccion: data.direccion || 'Zona Centro',
            rating: data.rating || 4.8,
            slug: data.slug || doc.id,
            hasTickets: data.hasTickets !== false
          } as PublicVenue;
        });

        // Si no hay datos en Firestore aún, mostramos datos demo atractivos
        if (fetched.length === 0) {
          setVenues([
            { id: '1', nombre: 'Club Matrix Night', ciudad: 'madrid', fotoUrl: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&auto=format&fit=crop', direccion: 'Calle Gran Vía 32', rating: 4.9, slug: 'club-matrix-night', hasTickets: true },
            { id: '2', nombre: 'Velvet Underground', ciudad: 'madrid', fotoUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop', direccion: 'Malasaña 14', rating: 4.7, slug: 'velvet-underground', hasTickets: true },
            { id: '3', nombre: 'Eclipse Rooftop', ciudad: 'barcelona', fotoUrl: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&auto=format&fit=crop', direccion: 'Passeig Marítim 2', rating: 4.8, slug: 'eclipse-rooftop', hasTickets: true }
          ]);
        } else {
          setVenues(fetched);
        }
      } catch (err) {
        console.error("Error cargando locales con entradas:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicVenues();
  }, []);

  const cities = ['all', 'madrid', 'barcelona', 'valencia', 'ibiza', 'sevilla'];

  const filteredVenues = venues.filter(v => {
    const matchCity = selectedCity === 'all' || v.ciudad.toLowerCase() === selectedCity.toLowerCase();
    const matchSearch = v.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || v.direccion?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCity && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-fuchsia-500/30">
      {/* Header Público */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-2xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight">BlowNights <span className="text-fuchsia-400">Entradas</span></span>
          </Link>

          <Link
            href={`/${DEFAULT_CITY}/`}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-white/10"
          >
            Acceder a la App
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-24 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-bold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            Compra 100% Directa y Sin Registro
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            Elige tu local y consigue tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-400 to-indigo-400">entrada digital</span>
          </h1>
          <p className="text-slate-400 text-base md:text-lg">
            Acceso instantáneo con QR dinámico anti-fraude. Sin crear cuenta previa.
          </p>
        </div>

        {/* Buscador y Filtros */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/60 p-4 rounded-3xl border border-white/10 backdrop-blur-xl">
          {/* Campo de Búsqueda */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por local o zona..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500 transition-colors"
            />
          </div>

          {/* Selector de Ciudad */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  selectedCity === city
                    ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-lg shadow-fuchsia-500/25'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {city === 'all' ? 'Todas las ciudades' : city}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Locales */}
        {loading ? (
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-slate-900/40 rounded-3xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredVenues.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-white/5">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-300">No se encontraron locales</h3>
            <p className="text-slate-500 text-sm mt-1">Prueba con otra búsqueda o selecciona todas las ciudades.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {filteredVenues.map((venue) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6 }}
                className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between group"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={venue.fotoUrl}
                    alt={venue.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                  
                  <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 text-xs font-black text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {venue.rating}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-2xl font-black text-white leading-tight">{venue.nombre}</h3>
                    <p className="text-slate-300 text-xs font-medium flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                      {venue.direccion}
                    </p>
                  </div>
                </div>

                <div className="p-6 space-y-4 bg-slate-900">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium border-b border-white/5 pb-4">
                    <span>Entradas oficiales disponibles</span>
                    <span className="text-emerald-400 font-bold">Venta Activa</span>
                  </div>

                  <Link
                    href={`/${venue.slug}/entradas`}
                    className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-fuchsia-500/20 transition-all flex items-center justify-center gap-2 group-hover:gap-3"
                  >
                    <span>Ver Entradas & Entrar</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <footer className="py-8 border-t border-white/5 text-center text-slate-600 text-xs font-medium">
        © {new Date().getFullYear()} BlowNights Ticketing Direct. Compra segura verificada.
      </footer>
    </div>
  );
}
