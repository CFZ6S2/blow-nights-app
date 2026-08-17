'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Detectar plataforma
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    // Verificar si ya está en modo standalone (instalada)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || (window.navigator as any).standalone 
                         || document.referrer.includes('android-app://');

    if (isIos) setPlatform('ios');
    else if (isAndroid) setPlatform('android');

    if (!isStandalone) {
      // Para Android: escuchar el evento de instalación
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowPrompt(true);
      });

      // Para iOS: mostrar el aviso después de unos segundos
      if (isIos) {
        const timer = setTimeout(() => setShowPrompt(true), 5000);
        
        // Listener manual para volver a mostrarlo
        const handleManualShow = () => setShowPrompt(true);
        window.addEventListener('show-pwa-prompt', handleManualShow);

        return () => {
          clearTimeout(timer);
          window.removeEventListener('show-pwa-prompt', handleManualShow);
        };
      }
    }
  }, []);

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 left-4 right-4 z-[90]"
      >
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
            <span className="material-icons text-white text-3xl">download_for_offline</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-black text-white tracking-tight uppercase mb-1">Instala Blow Nights</h4>
            <p className="text-[10px] text-slate-400 leading-tight">
              {platform === 'ios' 
                ? 'Pulsa [Compartir] y luego "Añadir a pantalla de inicio"' 
                : 'Añade la app a tu pantalla de inicio para una experiencia nativa.'}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {platform === 'android' && deferredPrompt && (
              <button 
                onClick={handleInstallAndroid}
                className="px-6 py-3 rounded-full bg-white text-black font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                Instalar
              </button>
            )}
            <button 
              onClick={() => setShowPrompt(false)}
              className="px-6 py-3 rounded-full bg-white/5 text-slate-400 font-black text-[10px] uppercase tracking-widest border border-white/5 hover:bg-white/10 transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Indicador visual para iOS */}
        {platform === 'ios' && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 rotate-45 border-r border-b border-white/10" />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
