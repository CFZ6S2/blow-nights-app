'use client';

import { useState, useEffect } from 'react';
import { getAnalytics, isSupported } from 'firebase/analytics';
import app from '@/lib/firebase';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setVisible(true);
    } else if (consent === 'accepted') {
      initAnalytics();
    }
  }, []);

  const initAnalytics = () => {
    if (typeof window !== 'undefined') {
      isSupported().then((supported) => {
        if (supported) getAnalytics(app);
      });
    }
  };

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    initAnalytics();
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem('cookie_consent', 'rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4">
      <div className="max-w-lg mx-auto bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
        <p className="text-[11px] text-slate-300 leading-relaxed mb-4">
          Usamos cookies esenciales para el funcionamiento de la app y cookies de analítica para mejorar tu experiencia.
          Puedes aceptar todas o rechazar las no esenciales.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            className="flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-white/15 text-slate-400 hover:bg-white/5 transition-all"
          >
            Solo esenciales
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-lg hover:opacity-90 transition-all"
          >
            Aceptar todo
          </button>
        </div>
      </div>
    </div>
  );
}
