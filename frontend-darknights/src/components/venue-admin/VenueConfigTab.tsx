import { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Venue } from '@/types';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function VenueConfigTab({ venue }: { venue: Venue }) {
  const { t } = useTranslation();
  const [name, setName] = useState(venue.name || '');
  const [description, setDescription] = useState(venue.description || '');
  const [address, setAddress] = useState(venue.address || '');
  const [type, setType] = useState(venue.type || 'bar');
  const [externalTicketUrl, setExternalTicketUrl] = useState(venue.externalTicketUrl || '');
  const [isActive, setIsActive] = useState(venue.isActive !== false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'venues', venue.id), {
        name,
        description,
        address,
        type,
        externalTicketUrl,
        isActive
      });
      alert('Configuración guardada correctamente.');
    } catch (e) {
      console.error(e);
      alert('Error al guardar configuración.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVenue = async () => {
    if (confirm('¿Seguro que quieres borrar este punto? Se eliminará permanentemente.')) {
      try {
        await deleteDoc(doc(db, 'venues', venue.id));
        alert('Punto eliminado correctamente.');
        // The parent component listens to firestore onSnapshot and will auto-remove it from the list
      } catch (e) {
        console.error(e);
        alert('Error al borrar el punto.');
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-2xl space-y-6"
    >
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/20 flex items-center justify-center border border-slate-700/30">
          <span className="material-icons text-slate-800">tune</span>
        </div>
        <h3 className="text-lg font-black uppercase tracking-widest text-slate-900">
          {t('venue_profile')}
        </h3>
      </div>
      
      <div className="space-y-5">
        <motion.div whileHover={{ scale: 1.01 }} className="group">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 transition-colors group-focus-within:text-slate-800">{t('official_name')}</label>
          <div className="relative">
            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">storefront</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-sm text-slate-900 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-fuchsia-500 transition-all shadow-inner"
            />
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.01 }} className="group">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 transition-colors group-focus-within:text-slate-800">{t('description_bio')}</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-sm text-slate-900 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-fuchsia-500 transition-all resize-none shadow-inner"
          />
        </motion.div>

        <motion.div whileHover={{ scale: 1.01 }} className="group">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 transition-colors group-focus-within:text-slate-800">{t('physical_address')}</label>
          <div className="relative">
            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">location_on</span>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-sm text-slate-900 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-fuchsia-500 transition-all shadow-inner"
            />
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.01 }} className="group">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 transition-colors group-focus-within:text-slate-800">URL de Ticketera Externa (Opcional)</label>
          <div className="relative">
            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">link</span>
            <input
              type="url"
              value={externalTicketUrl}
              onChange={e => setExternalTicketUrl(e.target.value)}
              placeholder="https://fourvenues.com/..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-sm text-slate-900 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-fuchsia-500 transition-all shadow-inner"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-2 ml-1">Si rellenas este campo, los usuarios verán un botón de compra que los redirigirá aquí.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.div whileHover={{ scale: 1.01 }} className="group">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 transition-colors group-focus-within:text-slate-800">{t('venue_type')}</label>
            <div className="relative">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">category</span>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-sm text-slate-900 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-fuchsia-500 transition-all shadow-inner appearance-none"
              >
                <option value="bar">Bar</option>
                <option value="club">Discoteca</option>
                <option value="sauna">Sauna</option>
                <option value="cruising">Cruising</option>
              </select>
            </div>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.01 }} className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{t('visibility')}</label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-fuchsia-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
              </div>
              <span className={`text-sm font-bold ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                {isActive ? 'Activo en el mapa' : 'Oculto'}
              </span>
            </label>
          </motion.div>
        </div>

        <motion.button
          whileHover={{ scale: saving ? 1 : 1.02 }}
          whileTap={{ scale: saving ? 1 : 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="w-full py-5 mt-6 rounded-2xl bg-gradient-to-r from-slate-800 to-indigo-600 text-slate-900 text-xs font-black uppercase tracking-[0.2em] disabled:opacity-50 transition-all hover:shadow-[0_0_30px_rgba(192,38,211,0.3)] flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="material-icons animate-spin text-sm">sync</span>
              Guardando...
            </>
          ) : (
            <>
              <span className="material-icons text-sm">save</span>
              {t('save_configuration')}
            </>
          )}
        </motion.button>

        {/* Zona de Peligro / Borrado Admin */}
        <div className="mt-8 p-4 bg-red-950/20 border border-red-500/30 rounded-xl flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-red-400">Eliminar este punto</h4>
            <p className="text-xs text-slate-500">
              Se eliminará permanentemente de la base de datos y del mapa público.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDeleteVenue}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-slate-900 text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer whitespace-nowrap ml-4"
          >
            🗑️ {t('delete_point')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
