import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Venue } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function VenueCatalogTab({ venue }: { venue: Venue }) {
  const { t } = useTranslation();
  const [pricing, setPricing] = useState(venue.ticketPricing || {});
  const [saving, setSaving] = useState(false);

  // Nuevo producto form
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newPriceId, setNewPriceId] = useState('');
  const [newQuota, setNewQuota] = useState('');

  const handleSave = async (updatedPricing: any) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'venues', venue.id), {
        ticketPricing: updatedPricing
      });
      setPricing(updatedPricing);
      alert('Catálogo guardado.');
    } catch (e) {
      console.error(e);
      alert('Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = () => {
    if (!newKey || !newName || !newPriceId) {
      alert('Llave, Nombre y Stripe Price ID son obligatorios.');
      return;
    }
    const updated = {
      ...pricing,
      [newKey]: {
        name: newName,
        description: newDesc,
        amount: newAmount ? parseInt(newAmount) : 0,
        stripePriceId: newPriceId,
        quota: newQuota ? parseInt(newQuota) : null
      }
    };
    handleSave(updated);
    setNewKey(''); setNewName(''); setNewDesc(''); setNewAmount(''); setNewPriceId(''); setNewQuota('');
  };

  const handleDelete = (key: string) => {
    if (confirm('¿Eliminar producto?')) {
      const updated = { ...pricing };
      delete updated[key];
      handleSave(updated);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-slate-50 backdrop-blur-xl border border-slate-200 p-6 md:p-8 rounded-[2rem] shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <span className="material-icons text-blue-400">inventory_2</span>
            </div>
            <h3 className="text-lg font-black uppercase tracking-widest text-white">
              {t('sales_catalog')}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-200 px-3 py-1 rounded-full border border-slate-200">
            {Object.keys(pricing).length} Productos
          </span>
        </div>
        
        {Object.keys(pricing).length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <span className="material-icons text-5xl text-white/10">production_quantity_limits</span>
            <p className="text-sm text-slate-500">No tienes productos en venta actualmente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {Object.entries(pricing).map(([key, item]: [string, any]) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={key} 
                  className="group bg-gradient-to-br from-black/60 to-black/30 border border-slate-200 p-5 rounded-3xl flex items-center justify-between hover:border-slate-200 hover:shadow-lg transition-all"
                >
                  <div>
                    <h4 className="text-sm font-black text-white capitalize">{item.name || key}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{item.description || 'Sin descripción'}</p>
                    
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                        {item.amount ? (item.amount/100).toFixed(2) : '0.00'}€
                      </span>
                      {item.quota && (
                        <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20 flex items-center gap-1">
                          <span className="material-icons text-[10px]">confirmation_number</span>
                          Límite: {item.quota}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(key)}
                    className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors border border-red-500/20 opacity-0 group-hover:opacity-100"
                  >
                    <span className="material-icons text-[18px]">delete_outline</span>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-gradient-to-br from-slate-800/20 to-blue-900/20 backdrop-blur-xl border border-amber-500/20 p-6 md:p-8 rounded-[2rem] shadow-2xl space-y-6"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
            <span className="material-icons text-white">add_circle_outline</span>
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-amber-200">
            {t('add_new_product')}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="col-span-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-amber-300/70 mb-2">ID Interno (sin espacios)</label>
            <input
              type="text"
              placeholder="ej: copa_anticipada"
              value={newKey}
              onChange={e => setNewKey(e.target.value.toLowerCase().replace(/\s/g, '_'))}
              className="w-full bg-slate-200 border border-amber-500/20 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all placeholder:text-white/20"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-amber-300/70 mb-2">Nombre Público</label>
            <input
              type="text"
              placeholder="ej: Entrada General"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full bg-slate-200 border border-amber-500/20 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all placeholder:text-white/20"
            />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-amber-300/70 mb-2">Descripción Corta</label>
            <input
              type="text"
              placeholder="ej: Incluye acceso rápido y 1 consumición"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="w-full bg-slate-200 border border-amber-500/20 rounded-2xl px-4 py-4 text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all placeholder:text-white/20"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-amber-300/70 mb-2">Precio en Céntimos</label>
            <div className="relative">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-amber-300/50 text-sm">euro</span>
              <input
                type="number"
                placeholder="ej: 1500 (15.00€)"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                className="w-full bg-slate-200 border border-amber-500/20 rounded-2xl pl-11 pr-4 py-4 text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all placeholder:text-white/20"
              />
            </div>
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-amber-300/70 mb-2">Stripe Price ID</label>
            <div className="relative">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-amber-300/50 text-sm">payment</span>
              <input
                type="text"
                placeholder="price_1Nxy..."
                value={newPriceId}
                onChange={e => setNewPriceId(e.target.value)}
                className="w-full bg-slate-200 border border-amber-500/20 rounded-2xl pl-11 pr-4 py-4 text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono text-xs placeholder:text-white/20"
              />
            </div>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-amber-300/70 mb-2">Stock (Vacío = Ilimitado)</label>
            <div className="relative">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-amber-300/50 text-sm">inventory</span>
              <input
                type="number"
                placeholder="ej: 100"
                value={newQuota}
                onChange={e => setNewQuota(e.target.value)}
                className="w-full bg-slate-200 border border-amber-500/20 rounded-2xl pl-11 pr-4 py-4 text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all placeholder:text-white/20"
              />
            </div>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: saving ? 1 : 1.02 }}
          whileTap={{ scale: saving ? 1 : 0.98 }}
          onClick={handleAddProduct}
          disabled={saving || !newKey || !newName || !newPriceId}
          className="w-full py-5 mt-4 rounded-2xl bg-white text-slate-800 text-xs font-black uppercase tracking-[0.2em] disabled:opacity-50 transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2"
        >
          <span className="material-icons text-sm">add</span>
          {t('create_product')}
        </motion.button>
      </motion.div>
    </div>
  );
}
