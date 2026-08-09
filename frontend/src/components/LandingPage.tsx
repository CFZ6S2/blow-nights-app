import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, analytics } from '@/lib/firebase';
import { logEvent } from 'firebase/analytics';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [onlineCount, setOnlineCount] = useState(0);
  const [recentProfiles, setRecentProfiles] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const q = query(collection(db, 'users'), where('online', '==', true), limit(12));
        const snapshot = await getDocs(q);
        setOnlineCount(snapshot.size + 42);
        setRecentProfiles(snapshot.docs.map(doc => doc.data().fotoUrl).filter(Boolean));
      } catch (err) {
        // Silently ignore permission errors for unauthenticated users
        // The landing page will show the default fallback count
      }
    };
    fetchStats();
  }, []);
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-fuchsia-500/30">
      {/* Hero Section */}
      <header className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl opacity-20 pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-fuchsia-600 blur-[120px] rounded-full"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-600 blur-[150px] rounded-full"
          />
        </div>

        <div className="relative z-10 max-w-4xl w-full text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {onlineCount > 0 ? `${onlineCount} chicos online ahora` : 'Únete a +500 chicos cerca'}
              </span>
            </div>
            
            <h1 className="text-5xl md:text-8xl font-[1000] tracking-tighter leading-[0.9] text-white">
              CONECTA CON CHICOS <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500">
                SIN DRAMA NI RUIDO
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
              Perfiles reales, planes directos y máxima seguridad. <br className="hidden md:block" />
              Diseñado exclusivamente para la comunidad gay y bi.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={() => {
                analytics.then(a => a && logEvent(a, 'landing_start_click'));
                onStart();
              }}
              className="w-full sm:w-auto px-12 py-6 rounded-[2rem] bg-white text-black font-[1000] text-sm uppercase tracking-[0.2em] hover:bg-slate-200 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95"
            >
              Empezar ahora
            </button>
            <Link 
              href="/rules"
              className="w-full sm:w-auto px-12 py-6 rounded-[2rem] bg-white/5 text-white border border-white/10 font-[1000] text-sm uppercase tracking-[0.2em] hover:bg-white/10 transition-all backdrop-blur-md"
            >
              Cómo funciona
            </Link>
          </motion.div>

          {/* Social Proof Profile Grid */}
          <div className="mt-20 flex justify-center -space-x-4 overflow-hidden py-4">
            {(recentProfiles.length > 0 ? recentProfiles : [1,2,3,4,5,6]).map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-slate-950 overflow-hidden bg-slate-900 shadow-2xl"
              >
                <img 
                  src={typeof img === 'string' ? img : `https://i.pravatar.cc/150?u=${i}`} 
                  alt="Perfil" 
                  className="w-full h-full object-cover grayscale-[0.5] hover:grayscale-0 transition-all duration-500"
                />
              </motion.div>
            ))}
          </div>

          {/* App Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative mt-20 mx-auto max-w-[280px] md:max-w-[320px]"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 h-[120%] -bottom-[20%]" />
            <div className="relative rounded-[3rem] overflow-hidden border-[8px] border-slate-900 shadow-[0_50px_100px_rgba(0,0,0,0.8)] aspect-[9/19.5]">
              <img 
                src="/gay_dating_app_mockup_1779911851373.png" 
                alt="App Interface" 
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </header>

      {/* Benefits Section */}
      <section className="py-32 px-6 bg-slate-950 relative overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: 'near_me', title: 'Cercanía Real', desc: 'Descubre quién hay a metros de ti con precisión quirúrgica.' },
            { icon: 'verified_user', title: 'Seguridad', desc: 'Reportes instantáneos y moderación activa 24/7.' },
            { icon: 'visibility_off', title: 'Privacidad', desc: 'Álbumes con candado y modo incógnito para pasar desapercibido.' },
            { icon: 'auto_awesome', title: 'Filtros Pro', desc: 'Busca por edad, rol e intenciones. Sin rodeos.' }
          ].map((benefit, i) => (
            <motion.div 
              key={i}
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 20 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-icons text-fuchsia-500 text-2xl">{benefit.icon}</span>
              </div>
              <h3 className="text-xl font-black mb-3 tracking-tight">{benefit.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{benefit.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 px-6 bg-slate-900/30">
        <div className="max-w-4xl mx-auto text-center space-y-20">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-[1000] tracking-tighter">TRES PASOS AL ÉXITO</h2>
            <p className="text-slate-400 font-medium">Olvídate de registros infinitos y preguntas absurdas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-1/2 z-0" />
            
            {[
              { num: '01', title: 'Crea tu perfil', desc: 'Solo nick, edad y tu mejor foto. Nada más.' },
              { num: '02', title: 'Mira el mapa', desc: 'Explora tu zona y mira quién está disponible ahora.' },
              { num: '03', title: 'Habla y queda', desc: 'Mándale un mensaje y concretad un plan real.' }
            ].map((step, i) => (
              <div key={i} className="relative z-10 space-y-6">
                <div className="w-16 h-16 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center mx-auto text-fuchsia-500 font-[1000] text-xl shadow-2xl">
                  {step.num}
                </div>
                <div className="space-y-2">
                  <h4 className="font-black text-lg tracking-tight uppercase">{step.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed px-4">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Community */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-12">
          <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center mx-auto shadow-2xl rotate-12">
            <span className="material-icons text-white text-4xl">security</span>
          </div>
          <div className="space-y-6">
            <h2 className="text-3xl font-[1000] tracking-tight">TU SEGURIDAD ES NUESTRO EJE</h2>
            <p className="text-slate-400 leading-relaxed">
              No somos solo una app más. Moderamos activamente cada reporte y protegemos tus datos con cifrado de grado bancario. Un espacio libre de odio para que seas tú mismo.
            </p>
          </div>
          <button 
            onClick={onStart}
            className="px-12 py-6 rounded-full bg-white text-black font-[1000] text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-105 transition-all"
          >
            Entrar a la comunidad
          </button>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6 bg-slate-900/10">
        <div className="max-w-6xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-6xl font-[1000] tracking-tighter">LO QUE DICEN LOS CHICOS</h2>
            <p className="text-slate-400 font-medium">Miles de conexiones reales cada día.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Alex, 24', text: 'Por fin una app que no está llena de bots. El mapa es súper preciso y he quedado con gente real en mi barrio.', color: 'from-fuchsia-500 to-purple-500' },
              { name: 'Marc, 31', text: 'Lo mejor es la privacidad de los álbumes. Me siento seguro compartiendo mis fotos solo con quien yo quiero.', color: 'from-indigo-500 to-cyan-500' },
              { name: 'Dani, 28', text: 'La fluidez de la app es increíble. Se nota que está bien hecha y el soporte responde rápido.', color: 'from-orange-500 to-rose-500' }
            ].map((t, i) => (
              <div key={i} className="p-8 rounded-[3rem] bg-white/5 border border-white/10 space-y-6 relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${t.color}`} />
                <p className="text-lg font-medium leading-relaxed italic text-white/90">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${t.color}`} />
                  <span className="font-black text-xs uppercase tracking-widest">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto space-y-16">
          <h2 className="text-4xl font-[1000] text-center tracking-tighter">PREGUNTAS FRECUENTES</h2>
          <div className="space-y-6">
            {[
              { q: '¿Es realmente gratuita?', a: 'Sí, las funciones principales como el mapa, chat y fotos son gratis. Tenemos un modo Premium opcional para quien quiera extras.' },
              { q: '¿Cómo protegen mi privacidad?', a: 'Usamos cifrado de grado bancario y permitimos álbumes privados con candado. Tú decides quién ve qué.' },
              { q: '¿Hay perfiles falsos?', a: 'Moderamos la comunidad 24/7 y tenemos un sistema de verificación de fotos para asegurar que todos son quienes dicen ser.' }
            ].map((faq, i) => (
              <div key={i} className="p-8 rounded-[2rem] bg-white/5 border border-white/10 space-y-3">
                <h4 className="font-black text-sm uppercase tracking-widest text-fuchsia-500">{faq.q}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PWA CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-indigo-600 to-fuchsia-600 rounded-[3rem] p-12 md:p-20 text-center space-y-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-700" />
          
          <div className="relative z-10 space-y-6">
            <h2 className="text-4xl md:text-6xl font-[1000] tracking-tighter text-white">LLEVA GAY MEET <br />EN TU BOLSILLO</h2>
            <p className="text-white/80 text-lg md:text-xl font-medium max-w-2xl mx-auto">
              Instala nuestra aplicación para recibir notificaciones en tiempo real, acceso rápido y una experiencia 100% nativa.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('show-pwa-prompt'));
                }}
                className="w-full sm:w-auto px-12 py-6 rounded-full bg-white text-black font-[1000] text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3"
              >
                <span className="material-icons">install_mobile</span>
                Instalar App ahora
              </button>
              <div className="flex items-center gap-2 text-white/60 text-[10px] font-black uppercase tracking-widest">
                <span className="material-icons text-sm">check_circle</span>
                Sin App Store • 100% Seguro
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 text-center space-y-8">
        <div className="flex justify-center gap-8">
          <Link href="/terms" className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-all">Términos</Link>
          <Link href="/privacy" className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-all">Privacidad</Link>
          <Link href="/rules" className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-all">Normas</Link>
        </div>
        <p className="text-[10px] font-medium text-slate-700 uppercase tracking-[0.2em]">© 2026 GAY MEET • Made with ❤️ for the community</p>
      </footer>
    </div>
  );
}
