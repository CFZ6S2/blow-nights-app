'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCity } from '@/context/CityContext';
import { useTranslation } from 'react-i18next';

export default function CitySelector({ onCityChange, currentCityId }: { onCityChange?: (cityId: string) => void, currentCityId?: string } = {}) {
  const { cities, currentCity, setCurrentCity, detectedByGPS } = useCity();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  if (!currentCity || cities.length <= 1) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all"
      >
        <span className="material-icons text-sm text-amber-400">location_city</span>
        {currentCity.name}
        <span className="material-icons text-[10px] text-slate-600">expand_more</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-xl flex items-end justify-center p-4"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-slate-900 border border-slate-200 rounded-[2.5rem] p-6 pb-[env(safe-area-inset-bottom)] space-y-4"
            >
              <div className="text-center space-y-1">
                <h3 className="text-sm font-black uppercase tracking-widest">{t('city.select')}</h3>
                <p className="text-[10px] text-slate-500">
                  {detectedByGPS ? t('city.detected') : t('city.manual')}
                </p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cities.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => {
                      setCurrentCity(city);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                      currentCity.id === city.id
                        ? 'bg-amber-500/10 border border-amber-500/20'
                        : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{city.emoji || '🏙️'}</span>
                      <div className="text-left">
                        <p className="text-sm font-black">{city.name}</p>
                        {city.country && (
                          <p className="text-[9px] text-slate-500">{city.country}</p>
                        )}
                      </div>
                    </div>
                    {currentCity.id === city.id && (
                      <span className="material-icons text-amber-400 text-sm">check_circle</span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setOpen(false)}
                className="w-full py-4 rounded-2xl bg-slate-50 text-slate-400 font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-100 transition-all"
              >
                {t('city.close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
