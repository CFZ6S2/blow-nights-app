'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LoginPage() {
  const { user, loginWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      setError('Error al iniciar sesión con Google.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 selection:bg-fuchsia-500/30 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-fuchsia-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 shadow-[0_50px_100px_rgba(0,0,0,0.5)] space-y-12 relative z-10"
      >
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="w-20 h-20 bg-gradient-to-tr from-fuchsia-600 to-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl rotate-12 mb-6"
          >
            <span className="material-icons text-white text-4xl">favorite</span>
          </motion.div>
          <h1 className="text-5xl font-[1000] tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500">
            GAY MEET
          </h1>
          <p className="text-slate-400 font-medium uppercase text-[10px] tracking-[0.3em]">Acceso Seguro a la Comunidad</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest p-4 rounded-2xl text-center"
          >
            {error}
          </motion.div>
        )}

        <div className="space-y-6">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-4 bg-white text-black font-[1000] py-6 rounded-2xl hover:bg-slate-200 transition-all duration-300 shadow-xl text-[10px] uppercase tracking-[0.2em]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Entrar con Google
          </button>

          <div className="flex justify-between gap-2 pt-4">
            {[
              { icon: 'shield', label: 'Seguro' },
              { icon: 'lock', label: 'Privado' },
              { icon: 'verified', label: 'Real' }
            ].map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-2 opacity-40">
                <span className="material-icons text-lg">{b.icon}</span>
                <span className="text-[7px] font-black uppercase tracking-tighter">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[9px] text-slate-600 uppercase tracking-widest leading-relaxed px-4">
          Al continuar, aceptas nuestros <Link href="/terms" className="text-slate-400 underline">Términos</Link> y <Link href="/privacy" className="text-slate-400 underline">Privacidad</Link>.
        </p>
      </motion.div>
    </div>
  );
}
