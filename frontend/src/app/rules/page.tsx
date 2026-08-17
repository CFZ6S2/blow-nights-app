'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function RulesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 md:p-20 selection:bg-fuchsia-500/30">
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-20">
        <button 
          onClick={() => router.back()}
          className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
        >
          <span className="material-icons">chevron_left</span>
        </button>
        <h1 className="text-xl font-black uppercase tracking-[0.3em] bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 to-indigo-500">
          Normas de la Comunidad
        </h1>
        <div className="w-12" /> {/* Spacer */}
      </header>

      <main className="max-w-4xl mx-auto space-y-20">
        <div className="text-center space-y-6">
          <h2 className="text-5xl md:text-7xl font-[1000] tracking-tighter leading-none">
            LAS 4 REGLAS <br />
            <span className="text-slate-500">DE ORO</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto font-medium">
            Blow Nights es un espacio seguro y real. Para mantenerlo así, todos seguimos estos principios fundamentales.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { 
              num: '01', 
              title: 'Respeto Total', 
              icon: 'favorite',
              desc: 'Cero tolerancia al odio, acoso o discriminación. Tratamos a los demás como queremos ser tratados. La educación es la base de cualquier conexión.',
              color: 'from-pink-500 to-rose-500'
            },
            { 
              num: '02', 
              title: 'Autenticidad', 
              icon: 'verified',
              desc: 'Nada de fotos de paisajes, famosos o perfiles falsos. Queremos verte a ti. La honestidad en tu perfil es lo que genera confianza real.',
              color: 'from-fuchsia-500 to-purple-500'
            },
            { 
              num: '03', 
              title: 'Privacidad', 
              icon: 'visibility_off',
              desc: 'Respeta el álbum privado de los demás. El consentimiento es sagrado. Lo que ocurre en los chats se queda en los chats. Cuidamos tus datos.',
              color: 'from-purple-500 to-indigo-500'
            },
            { 
              num: '04', 
              title: 'Seguridad', 
              icon: 'security',
              desc: 'Solo para mayores de 18 años. Si ves algo sospechoso, repórtalo en el acto. Nuestro equipo revisa cada reporte manualmente en menos de 24h.',
              color: 'from-indigo-500 to-blue-500'
            }
          ].map((rule, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-10 rounded-[3rem] bg-white/5 border border-white/10 space-y-8 relative overflow-hidden group"
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${rule.color}`} />
              
              <div className="flex justify-between items-start">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${rule.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <span className="material-icons text-3xl text-white">{rule.icon}</span>
                </div>
                <span className="text-4xl font-[1000] text-white/5 tracking-tighter">{rule.num}</span>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-black tracking-tight uppercase">{rule.title}</h3>
                <p className="text-slate-400 leading-relaxed font-medium text-sm">
                  {rule.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <section className="bg-gradient-to-br from-fuchsia-600/20 to-indigo-600/20 p-12 rounded-[3.5rem] border border-white/10 text-center space-y-8">
          <h3 className="text-3xl font-[1000] tracking-tight">¿HAS VISTO ALGO INAPROPIADO?</h3>
          <p className="text-slate-300 font-medium max-w-xl mx-auto">
            Usa el botón de reporte en el perfil de cualquier usuario. Bloquea al instante si te sientes incómodo. Tu bienestar es nuestra prioridad número uno.
          </p>
          <button 
            onClick={() => router.push('/')}
            className="px-12 py-6 rounded-full bg-white text-black font-[1000] text-xs uppercase tracking-[0.3em] hover:scale-105 transition-all"
          >
            Acepto y Entiendo
          </button>
        </section>
      </main>

      <footer className="mt-32 text-center text-[10px] font-medium text-slate-700 uppercase tracking-[0.2em] pb-10">
        © 2026 BLOW NIGHTS • SEGURIDAD Y CONFIANZA
      </footer>
    </div>
  );
}
