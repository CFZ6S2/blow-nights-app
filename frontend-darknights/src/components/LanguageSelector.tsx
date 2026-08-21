'use client';

import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // To avoid hydration mismatch if i18n is not ready
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) return null;

  const currentLang = i18n.language || 'es';

  const languages = [
    { code: 'es', label: 'ES', icon: '🇪🇸' },
    { code: 'en', label: 'EN', icon: '🇬🇧' },
    { code: 'de', label: 'DE', icon: '🇩🇪' },
    { code: 'pt', label: 'PT', icon: '🇵🇹' },
    { code: 'ca', label: 'CA', icon: '🏴󠁥󠁳󠁣󠁴󠁿' }, // Using general flag or abbreviation
    { code: 'fr', label: 'FR', icon: '🇫🇷' },
    { code: 'it', label: 'IT', icon: '🇮🇹' },
    { code: 'el', label: 'GR', icon: '🇬🇷' },
    { code: 'ru', label: 'RU', icon: '🇷🇺' },
    { code: 'ar', label: 'AR', icon: '🇸🇦' }
  ];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="fixed top-4 right-4 z-[999999] pointer-events-auto" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 bg-slate-900/95 text-white backdrop-blur-2xl border border-red-500/50 px-3.5 py-2 rounded-full text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all shadow-[0_10px_25px_rgba(0,0,0,0.8)] active:scale-95"
      >
        <span className="text-[16px]">{languages.find(l => l.code === currentLang)?.icon}</span>
        <span>{languages.find(l => l.code === currentLang)?.label}</span>
        <span className="text-[9px] text-red-400 ml-0.5">▼</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-white/10 rounded-xl overflow-hidden shadow-2xl w-48"
          >
            <div className="grid grid-cols-2 p-1 gap-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                    currentLang === lang.code 
                      ? 'bg-slate-900/20 text-slate-800' 
                      : 'text-slate-600 hover:bg-white/5'
                  }`}
                >
                  <span className="text-[14px]">{lang.icon}</span>
                  {lang.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
