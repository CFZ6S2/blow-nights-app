'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useCity } from '@/context/CityContext';
import { createChill } from '@/hooks/useChills';
import { useTranslation } from 'react-i18next';

const TAG_OPTIONS = ['Previa', 'After', 'Piscina', 'Terraza', 'Fiesta', 'Cena', 'Chill', 'Juegos'];

export default function CreateChillModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { profile } = useAuth();
  const { citySlug } = useCity();
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('10');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 3));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return setError(t('chill_modal.err_no_name'));
    if (!address.trim()) return setError(t('chill_modal.err_no_address'));
    if (!profile?.lat || !profile?.lng) return setError(t('chill_modal.err_no_location'));
    if (!citySlug) return setError(t('chill_modal.err_no_city'));

    setSubmitting(true);
    setError('');

    try {
      const result = await createChill({
        title: title.trim(),
        description: description.trim(),
        exact_address: address.trim(),
        approx_lat: profile.lat,
        approx_lng: profile.lng,
        max_capacity: parseInt(capacity) || 10,
        city_slug: citySlug,
        tags,
      });
      onCreated(result.chillId);
    } catch (e: any) {
      setError(e.message || t('chill_modal.err_create'));
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-white/10 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black">{t('chill_modal.title')}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t('chill_modal.plan_name')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('chill_modal.ph_plan_name')}
              maxLength={60}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t('chill_modal.desc_label')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('chill_modal.ph_desc')}
              maxLength={300}
              rows={3}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">
              {t('chill_modal.address_label')} <span className="text-fuchsia-400">{t('chill_modal.address_private')}</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('chill_modal.ph_address')}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500"
            />
            <p className="text-[10px] text-slate-600 mt-1.5 flex items-center gap-1">
              <span className="material-icons text-xs">lock</span>
              {t('chill_modal.address_hint')}
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t('chill_modal.max_capacity')}</label>
            <div className="flex gap-2">
              {['5', '10', '15', '20'].map((n) => (
                <button
                  key={n}
                  onClick={() => setCapacity(n)}
                  className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                    capacity === n
                      ? 'bg-fuchsia-500 text-white'
                      : 'bg-white/5 text-slate-400 border border-white/5'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{t('chill_modal.tags_label')}</label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    tags.includes(tag)
                      ? 'bg-fuchsia-500 text-white'
                      : 'bg-white/5 text-slate-400 border border-white/5'
                  }`}
                >
                  {t(`tags.${tag.toLowerCase()}`, tag)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl font-black text-lg shadow-[0_0_40px_-10px_rgba(192,38,211,0.5)] transition-all active:scale-95"
          >
            {submitting ? t('chill_modal.creating') : t('chill_modal.btn_create')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
