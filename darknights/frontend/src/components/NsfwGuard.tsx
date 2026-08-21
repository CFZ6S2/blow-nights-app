'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface NsfwGuardProps {
  src: string;
  alt?: string;
  isNsfw?: boolean;
  nsfwBlur?: boolean;
  className?: string;
}

export default function NsfwGuard({ src, alt = '', isNsfw = false, nsfwBlur = true, className = '' }: NsfwGuardProps) {
  const [revealed, setRevealed] = useState(false);
  const { t } = useTranslation();

  const shouldBlur = isNsfw && nsfwBlur && !revealed;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-all duration-300 ${shouldBlur ? 'blur-xl scale-110' : ''}`}
      />
      {shouldBlur && (
        <button
          onClick={(e) => { e.stopPropagation(); setRevealed(true); }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-slate-200 backdrop-blur-sm"
        >
          <span className="material-icons text-white/80 text-2xl">visibility_off</span>
          <span className="text-[9px] text-white/70 font-black uppercase tracking-widest mt-1">{t('nsfw.tap_to_view')}</span>
        </button>
      )}
    </div>
  );
}
