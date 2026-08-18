'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { DEFAULT_CITY } from '@/lib/routes';
import { Building2, QrCode, TrendingUp, Users, CheckCircle2, ArrowRight } from 'lucide-react';

export default function BusinessLandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-fuchsia-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight">BlowNights <span className="text-fuchsia-400">Business</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/${DEFAULT_CITY}/`} className="text-sm font-semibold text-slate-400 hover:text-white hidden md:block transition-colors">
              App de Usuarios
            </Link>
            <Link
              href="/business/login"
              className="px-6 py-2.5 bg-white text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-all"
            >
              Acceso a Locales
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-bold uppercase tracking-wider">
                <SparklesIcon className="w-4 h-4" />
                El SaaS Definitivo para Ocio Nocturno
              </div>
              <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight">
                Controla tu local.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-indigo-400">
                  Multiplica tus ingresos.
                </span>
              </h1>
              <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
                Software integral de ticketing, escáner en puerta ultarrápido (&lt;300ms), control de aforos en tiempo real y cuadre automático de RRPPs.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/business/login"
                  className="px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-fuchsia-500/20 transition-all flex items-center justify-center gap-2"
                >
                  Entrar a tu Panel <ArrowRight className="w-4 h-4" />
                </Link>
                <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white text-sm font-black uppercase tracking-widest border border-white/10 rounded-2xl transition-all flex items-center justify-center">
                  Solicitar Demostración
                </button>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-600/20 to-indigo-600/20 blur-[100px] rounded-full" />
              <div className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-500 to-indigo-500" />
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black">Facturación Hoy</h3>
                    <p className="text-slate-400 text-sm mt-1">Actualizado hace 2 min</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-emerald-400">€ 4,250.00</p>
                    <p className="text-emerald-500/80 text-sm font-bold mt-1">+18.5% vs ayer</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {[
                    { label: 'Entradas Vendidas', value: '342 / 500', icon: QrCode, color: 'text-fuchsia-400' },
                    { label: 'Comisiones RRPP', value: '€ 450.00', icon: Users, color: 'text-indigo-400' },
                    { label: 'Aforo Actual', value: '68%', icon: TrendingUp, color: 'text-amber-400' },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 bg-white/5 rounded-lg ${stat.color}`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-300">{stat.label}</span>
                      </div>
                      <span className="font-black text-lg">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Value Proposition: Anti-Fraud QR */}
      <section className="py-24 bg-black border-t border-white/5 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              El fin de las capturas de pantalla y el fraude en puerta.
            </h2>
            <p className="text-slate-400 text-lg">
              La tecnología de <span className="text-white font-bold">QR Dinámico</span> que utilizan los grandes festivales, ahora integrada en tu suscripción.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Bad Way */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50" />
              <h3 className="text-xl font-bold text-slate-300 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center text-sm">✕</span>
                Ticketing Tradicional (PDFs)
              </h3>
              <ul className="space-y-4">
                {[
                  'Clientes pasando capturas por WhatsApp',
                  'Reventa pirata en la cola de tu local',
                  'El portero pierde tiempo discutiendo',
                  'Pérdida de ingresos por duplicados'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-400 text-sm">
                    <span className="text-red-500/50 shrink-0 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Good Way */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.1)]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_20px_rgba(52,211,153,0.8)]" />
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm shadow-[0_0_15px_currentColor]">✓</span>
                QR Dinámico Blow Nights
              </h3>
              <ul className="space-y-4">
                {[
                  'El código QR muta cada 15 segundos',
                  'Las capturas caducan antes de llegar a puerta',
                  'Escáner ultra-rápido (< 300ms) sin fricción',
                  'Bloqueo atómico: 1 entrada = 1 persona real'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-emerald-100/80 text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-slate-900 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-4xl font-black tracking-tight">Planes diseñados para escalar</h2>
            <p className="text-slate-400">Desde posicionamiento orgánico hasta el control total de tu puerta.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Plan Radar */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 hover:border-slate-700 transition-all">
              <h3 className="text-2xl font-black">Plan Radar</h3>
              <p className="text-slate-400 text-sm mt-2 mb-6">Perfecto para darte a conocer.</p>
              <div className="mb-8">
                <span className="text-4xl font-black">39€</span>
                <span className="text-slate-500 font-medium">/mes</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['Perfil verificado en el mapa', 'Destacado por encima de puntos gratuitos', 'Estadísticas básicas de visitas', 'Soporte estándar'].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-slate-600 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/business/login" className="block w-full py-4 text-center rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all">
                Empezar con Radar
              </Link>
            </div>

            {/* Plan PRO */}
            <div className="relative bg-gradient-to-b from-fuchsia-900/40 to-slate-950 border-2 border-fuchsia-500/50 rounded-3xl p-8 shadow-2xl shadow-fuchsia-900/20 transform md:-translate-y-4">
              <div className="absolute top-0 inset-x-0 flex justify-center -translate-y-1/2">
                <span className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                  El más popular
                </span>
              </div>
              <h3 className="text-2xl font-black text-white">Plan Venue PRO</h3>
              <p className="text-fuchsia-200/60 text-sm mt-2 mb-6">Control absoluto de tu negocio.</p>
              <div className="mb-8">
                <span className="text-4xl font-black text-white">89€</span>
                <span className="text-fuchsia-200/50 font-medium">/mes</span>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  'Todo lo del Plan Radar',
                  'Venta de entradas (Ticketing)',
                  'App de escáner en puerta <300ms',
                  'Panel de comisiones para RRPPs',
                  'Métricas financieras en tiempo real',
                  'Soporte prioritario 24/7'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-fuchsia-100/80 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-fuchsia-400 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/business/login" className="block w-full py-4 text-center rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold transition-all shadow-lg shadow-fuchsia-500/25">
                Activar Plan PRO
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5 text-center">
        <p className="text-slate-600 text-xs font-medium">© {new Date().getFullYear()} BlowNights Business. Todos los derechos reservados.</p>
      </footer>

      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/34600000000?text=Hola,%20me%20gustar%C3%ADa%20solicitar%20una%20demostraci%C3%B3n%20de%20BlowNights%20Business%20para%20mi%20local."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.4)] hover:scale-110 transition-transform flex items-center justify-center group"
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
        </svg>
        <span className="absolute right-full mr-4 bg-slate-900 text-white text-sm px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 shadow-xl">
          Escríbenos por WhatsApp
        </span>
      </a>
    </div>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
