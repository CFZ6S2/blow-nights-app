'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function ChatAudioPlayer({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(p);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className="flex items-center gap-3 min-w-[200px] py-1">
      <audio 
        ref={audioRef} 
        src={url} 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={handleEnded}
        className="hidden"
      />
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
      >
        <span className="material-icons text-white text-xl">
          {isPlaying ? 'pause' : 'play_arrow'}
        </span>
      </motion.button>
      
      <div className="flex-1 h-1.5 bg-white/10 rounded-full relative overflow-hidden">
        <motion.div 
          animate={{ width: `${progress}%` }}
          className="absolute inset-0 bg-white rounded-full shadow-[0_0_10px_white]"
        />
      </div>
      
      <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">
        {isPlaying ? 'Reproduciendo' : 'Nota voz'}
      </span>
    </div>
  );
}
