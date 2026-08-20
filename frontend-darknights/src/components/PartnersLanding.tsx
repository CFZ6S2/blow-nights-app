'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTranslation } from 'react-i18next';

// Simple Icons SVG
const MapIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
);
const TicketIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
);
const UsersIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
);
const MoonIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
);

export default function PartnersLanding() {
  const { t } = useTranslation();
  const [hotCities, setHotCities] = useState<any[]>([]);

  useEffect(() => {
    const fetchHotCities = async () => {
      try {
        const q = query(collection(db, 'cities'), where('readyForFranchise', '==', true));
        const snap = await getDocs(q);
        const cities: any[] = [];
        snap.forEach(d => cities.push({ id: d.id, ...d.data() }));
        setHotCities(cities);
      } catch(e) {
        console.error("Error fetching hot cities", e);
      }
    };
    fetchHotCities();
  }, []);
  return (
    <div className="min-h-screen bg-neutral-950 text-slate-900 selection:bg-purple-500/30 font-sans">
      
      {/* HEADER NAVIGATION */}
      <header className="fixed top-0 w-full z-50 bg-neutral-950/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center font-bold text-lg">B</div>
            <span className="font-bold text-xl tracking-tight">DarkNights</span>
          </div>
          <Link href="mailto:partners@darknights.com" className="px-5 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-colors">
            {t('request_territory')}
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        {/* Abstract background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-block py-1 px-3 rounded-full bg-purple-500/10 text-purple-400 font-medium text-sm mb-6 border border-purple-500/20">
              {t('opportunity_city_managers')}
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]"
          >
            El <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">{t('operating_system')}</span><br />{t('lgtbiq_nightlife')}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-neutral-400 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Las apps de citas y las ticketeras genéricas son obsoletas. Únete a la plataforma definitiva que unifica radar social, venta de entradas, RRPPs y afters privados. Operamos la tecnología, tú lideras tu ciudad.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="mailto:partners@darknights.com" className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-slate-900 font-bold text-lg hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.5)] transition-all transform hover:scale-105">
              {t('contact_team')}
            </Link>
            <Link href="#motores" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 text-slate-900 font-semibold text-lg border border-white/10 hover:bg-white/10 transition-colors">
              {t('view_business_model')}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CIUDADES CALIENTES - FRANCHISE TRIGGER */}
      {hotCities.length > 0 && (
        <section className="py-12 bg-neutral-900 border-t border-b border-purple-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-8">
              <span className="inline-block px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-bold uppercase tracking-widest mb-3">
                {t('immediate_opportunities')}
              </span>
              <h2 className="text-3xl font-bold">Plazas con tracción listas para operar</h2>
              <p className="text-neutral-400 mt-2 max-w-xl mx-auto text-sm">
                Estos territorios ya tienen locales usando la plataforma y pagando su cuota. Reclama la plaza hoy y empieza a cobrar su margen mañana.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotCities.map(city => (
                <div key={city.id} className="bg-black/50 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <MapIcon />
                  </div>
                  <h3 className="text-2xl font-black capitalize mb-1">{city.name || city.slug || city.id}</h3>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-bold text-green-400">{city.activeVenuesCount || 2} locales activos</span>
                  </div>
                  <Link href={`mailto:partners@darknights.com?subject=Solicitud Franquicia ${city.slug}`} className="block w-full py-3 text-center bg-white/5 hover:bg-purple-600 border border-white/10 hover:border-purple-500 rounded-xl font-bold transition-all">
                    {t('request_exclusivity')}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LOS 4 MOTORES */}
      <section id="motores" className="py-24 px-6 border-t border-white/10 bg-neutral-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">{t('four_engines_title')}</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">Infraestructura probada y lista para desplegar en tu ciudad en 48 horas.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Motor 1 */}
            <div className="bg-neutral-900 border border-white/5 p-8 rounded-3xl hover:border-purple-500/50 transition-colors group">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TicketIcon />
              </div>
              <h3 className="text-2xl font-bold mb-3">1. Ticketing & Control de Puerta</h3>
              <p className="text-neutral-400 mb-4">Cobros online directos mediante Stripe. El local emite factura (0 riesgo para ti). Escáner de porteros vía navegador (&lt;300ms) sin apps ni colas.</p>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-2"></span>Split de pagos automatizado</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-2"></span>Venta anticipada sin fricción</li>
              </ul>
            </div>
            
            {/* Motor 2 */}
            <div className="bg-neutral-900 border border-white/5 p-8 rounded-3xl hover:border-pink-500/50 transition-colors group">
              <div className="w-16 h-16 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <UsersIcon />
              </div>
              <h3 className="text-2xl font-bold mb-3">2. Sistema RRPP y Bizum</h3>
              <p className="text-neutral-400 mb-4">Emisión libre de QR y cobro en mano/Bizum sin intermediación. Liquidación a dos bandas a final de la noche que evita discrepancias de caja.</p>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-pink-500 mr-2"></span>Enlaces /rrpp que se autodestruyen</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-pink-500 mr-2"></span>Gestión ultra-rápida por WhatsApp</li>
              </ul>
            </div>
            
            {/* Motor 3 */}
            <div className="bg-neutral-900 border border-white/5 p-8 rounded-3xl hover:border-blue-500/50 transition-colors group">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MoonIcon />
              </div>
              <h3 className="text-2xl font-bold mb-3">3. Afters / Chills Privados</h3>
              <p className="text-neutral-400 mb-4">El negocio de las 05:00 AM. Radar difuso de afters bajo &quot;Hard Paywall&quot;. Para ver la ubicación y chatear, el usuario paga una membresía VIP.</p>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>Autodestrucción a las 8h (TTL)</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>Ingreso altísimo por suscripciones</li>
              </ul>
            </div>
            
            {/* Motor 4 */}
            <div className="bg-neutral-900 border border-white/5 p-8 rounded-3xl hover:border-green-500/50 transition-colors group">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MapIcon />
              </div>
              <h3 className="text-2xl font-bold mb-3">4. Radar Social en Vivo</h3>
              <p className="text-neutral-400 mb-4">Directorio interactivo de discotecas, bares de copas y saunas. Aforos en tiempo real y check-in presencial para ver quién está en cada local.</p>
              <ul className="space-y-2 text-sm text-neutral-500">
                <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span>Interacción sin fricción</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span>Retención brutal de usuarios</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* MODELO ECONOMICO */}
      <section className="py-24 px-6 border-t border-white/10 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-purple-400 font-semibold tracking-wider uppercase text-sm mb-2 block">Revenue Split</span>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">{t('economic_model')}</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">Un modelo diseñado para que el City Manager gane por dos vías: comisión de entradas y suscripciones VIP de usuarios. Todo liquidado automáticamente a tu cuenta bancaria vía Stripe.</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-neutral-400">
                  <th className="py-4 px-6 font-medium">Canal de Ingreso</th>
                  <th className="py-4 px-6 font-medium">Tarifa PVP</th>
                  <th className="py-4 px-6 font-semibold text-slate-900">Socio Local (Tú)</th>
                  <th className="py-4 px-6 font-medium">Plataforma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="py-5 px-6 font-medium">Venta de Entradas (City Manager)</td>
                  <td className="py-5 px-6 text-neutral-400">5% + 0,50€</td>
                  <td className="py-5 px-6 font-bold text-green-400">4% + 0,25€</td>
                  <td className="py-5 px-6 text-neutral-400">1% + 0,25€</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors border-l-4 border-l-amber-500 bg-amber-500/5">
                  <td className="py-5 px-6 font-medium text-amber-500">Plan Radar & Promo (SaaS sin Ticketing)*</td>
                  <td className="py-5 px-6 text-neutral-400">39,00€ / mes</td>
                  <td className="py-5 px-6 font-bold text-amber-500">15,60€ / mes</td>
                  <td className="py-5 px-6 text-neutral-400">23,40€ / mes</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors border-l-4 border-l-amber-500 bg-amber-500/5">
                  <td className="py-5 px-6 font-medium text-amber-500">Plan Venue PRO (SaaS + Ticketing)*</td>
                  <td className="py-5 px-6 text-neutral-400">89,00€ / mes</td>
                  <td className="py-5 px-6 font-bold text-amber-500">35,60€ / mes</td>
                  <td className="py-5 px-6 text-neutral-400">53,40€ / mes</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors border-l-4 border-l-amber-500 bg-amber-500/5">
                  <td className="py-5 px-6 font-medium text-amber-500">Ticketing (Partner Asociado)*</td>
                  <td className="py-5 px-6 text-neutral-400">5% + 0,50€</td>
                  <td className="py-5 px-6 font-bold text-amber-500">2% + 0,25€</td>
                  <td className="py-5 px-6 text-neutral-400">3% + 0,25€</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="py-5 px-6 font-medium">Pase Fin de Semana VIP (48h)</td>
                  <td className="py-5 px-6 text-neutral-400">10,00€</td>
                  <td className="py-5 px-6 font-bold text-green-400">4,00€ (40%)</td>
                  <td className="py-5 px-6 text-neutral-400">6,00€ (60%)</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors bg-white/[0.02]">
                  <td className="py-5 px-6 font-medium flex items-center">
                    Blow VIP Mensual 
                    <span className="ml-3 text-[10px] uppercase font-bold bg-purple-500/20 text-purple-400 py-1 px-2 rounded-full">Popular</span>
                  </td>
                  <td className="py-5 px-6 text-neutral-400">20,00€/mes</td>
                  <td className="py-5 px-6 font-bold text-green-400">8,00€/mes (40%)</td>
                  <td className="py-5 px-6 text-neutral-400">12,00€/mes (60%)</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="py-5 px-6 font-medium">Blow VIP Temporada (3 Meses)</td>
                  <td className="py-5 px-6 text-neutral-400">50,00€</td>
                  <td className="py-5 px-6 font-bold text-green-400">20,00€ (40%)</td>
                  <td className="py-5 px-6 text-neutral-400">30,00€ (60%)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PROYECCIONES FINANCIERAS */}
      <section className="py-24 px-6 border-t border-white/10 bg-gradient-to-b from-neutral-950 to-neutral-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">{t('financial_projection')}</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">Estimación de rentabilidad para una ciudad con circuito nocturno activo. Un modelo de alto margen (canon de 5.000€/año) que recuperas en el primer cuatrimestre.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Inicial */}
            <div className="bg-neutral-900 border border-white/10 p-8 rounded-3xl flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-neutral-300">Fase Inicial</h3>
                <p className="text-sm text-neutral-500">1-2 locales captados</p>
              </div>
              <div className="text-4xl font-bold mb-6">~15.100€ <span className="text-base font-normal text-neutral-500">/ año netos</span></div>
              
              <div className="space-y-4 mb-8 flex-grow text-sm">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-400">Tickets/mes</span>
                  <span className="font-semibold">1.500 (18€/ud)</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-400">Ingreso Ticketing</span>
                  <span className="font-semibold text-green-400">+17.460€</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-400">Usuarios VIP</span>
                  <span className="font-semibold">50 activos</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-400">Ingreso Suscripciones</span>
                  <span className="font-semibold text-green-400">+2.640€</span>
                </div>
                <div className="flex justify-between pb-2 text-red-400">
                  <span>Canon anual</span>
                  <span>-5.000€</span>
                </div>
              </div>
            </div>

            {/* Moderado */}
            <div className="bg-neutral-800 border-2 border-purple-500 p-8 rounded-3xl flex flex-col relative transform md:-translate-y-4 shadow-[0_0_40px_-10px_rgba(168,85,247,0.3)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-500 text-slate-900 text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                Objetivo Realista
              </div>
              <div className="mb-6 mt-2">
                <h3 className="text-xl font-semibold text-slate-900">Fase Moderada</h3>
                <p className="text-sm text-purple-300">2-3 locales / 1 sesión fuerte</p>
              </div>
              <div className="text-5xl font-bold mb-6 text-slate-900">~35.100€ <span className="text-lg font-normal text-purple-300">/ año</span></div>
              
              <div className="space-y-4 mb-8 flex-grow text-sm">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-neutral-300">Tickets/mes</span>
                  <span className="font-semibold text-slate-900">3.000 (20€/ud)</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-neutral-300">Ingreso Ticketing</span>
                  <span className="font-semibold text-green-400">+37.800€</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-neutral-300">Usuarios VIP</span>
                  <span className="font-semibold text-slate-900">150 activos</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-neutral-300">Ingreso Suscripciones</span>
                  <span className="font-semibold text-green-400">+7.920€</span>
                </div>
                <div className="flex justify-between pb-2 text-red-400">
                  <span>Canon anual</span>
                  <span>-5.000€</span>
                </div>
              </div>
              <p className="text-xs text-neutral-400 text-center italic">*3.000 tickets/mes son apenas el 5-8% del ocio de una capital.</p>
            </div>

            {/* Alto Rendimiento */}
            <div className="bg-neutral-900 border border-white/10 p-8 rounded-3xl flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-neutral-300">Fase Consolidada</h3>
                <p className="text-sm text-neutral-500">Circuito completo dominado</p>
              </div>
              <div className="text-4xl font-bold mb-6">~72.600€ <span className="text-base font-normal text-neutral-500">/ año netos</span></div>
              
              <div className="space-y-4 mb-8 flex-grow text-sm">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-400">Tickets/mes</span>
                  <span className="font-semibold">6.000 (20€/ud)</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-400">Ingreso Ticketing</span>
                  <span className="font-semibold text-green-400">+75.600€</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-400">Usuarios VIP</span>
                  <span className="font-semibold">300 activos</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-400">Ingreso Suscripciones</span>
                  <span className="font-semibold text-green-400">+15.840€</span>
                </div>
                <div className="flex justify-between pb-2 text-red-400">
                  <span>Canon anual</span>
                  <span>-5.000€</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REPARTO Y CONDICIONES (CTA BOTTOM) */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent -z-10" />
        <div className="max-w-4xl mx-auto bg-neutral-900/50 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-[2.5rem] text-center">
          <h2 className="text-3xl font-bold mb-6">{t('launch_48h')}</h2>
          <p className="text-neutral-400 text-lg mb-8 max-w-2xl mx-auto">
            Te entregamos la plataforma operativa en tu ciudad (`[ciudad].darknights.com`), vinculada a tu cuenta de Stripe. Arranca ofreciendo un "Piloto sin Fricción" a los garitos 100% gratis la primera sesión para demostrar el valor.
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="text-left bg-black/40 p-4 rounded-2xl w-full md:w-auto border border-white/5">
              <span className="block text-sm text-neutral-500 mb-1">City Manager (Exclusivo)</span>
              <span className="text-2xl font-bold">5.000 € <span className="text-sm font-normal text-neutral-500">/ año</span></span>
            </div>
            
            <Link href="mailto:partners@darknights.com" className="w-full md:w-auto px-10 py-5 rounded-2xl bg-white text-black font-bold text-lg hover:bg-neutral-200 transition-colors shadow-xl">
              {t('request_interview')}
            </Link>
          </div>
          <p className="mt-6 text-sm text-neutral-500">Solo 1 licencia exclusiva por área metropolitana.</p>
          
          <div className="mt-12 pt-12 border-t border-white/10 text-left">
            <h3 className="text-xl font-bold mb-3 text-amber-500 flex items-center gap-2">
              <span className="material-icons">star</span> ¿Vives en una macro-ciudad (Madrid/Barcelona)?
            </h3>
            <p className="text-neutral-400 text-sm mb-4">
              Aplica a la figura de <strong>Partner Asociado</strong>. Sin exclusividad territorial y sin canon de entrada (0€). Cobra comisión (2% + 0,10€) por cada entrada de los locales que afilies a la red. Tus locales tendrán visibilidad plus (anclados arriba y destacados en oro en el mapa).
            </p>
            <Link href="mailto:partners@darknights.com?subject=Partner%20Asociado" className="inline-block text-amber-400 font-bold text-sm hover:text-amber-300">
              Aplicar como Partner Asociado &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-12 px-6 text-center text-neutral-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center font-bold text-xs text-slate-900">B</div>
            <span className="font-semibold text-neutral-400">DarkNights Network</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} DarkNights. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
