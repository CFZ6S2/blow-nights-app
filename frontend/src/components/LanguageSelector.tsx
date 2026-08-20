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
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999]" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-white/10 transition-colors shadow-lg"
      >
        <span className="text-[14px]">{languages.find(l => l.code === currentLang)?.icon}</span>
        <span>{languages.find(l => l.code === currentLang)?.label}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl w-48"
          >
            <div className="grid grid-cols-2 p-1 gap-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                    currentLang === lang.code 
                      ? 'bg-fuchsia-600/20 text-fuchsia-400' 
                      : 'text-slate-300 hover:bg-white/5'
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
