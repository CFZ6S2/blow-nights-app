'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ImageModal({ url, isOpen, onClose }: { url: string, isOpen: boolean, onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12"
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-white/90 backdrop-blur-2xl"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative max-w-full max-h-full z-10"
          >
            <img 
              src={url} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] rounded-3xl shadow-2xl border border-slate-200 object-contain"
            />
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 hover:bg-slate-100 transition-all"
            >
              <span className="material-icons text-white">close</span>
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
