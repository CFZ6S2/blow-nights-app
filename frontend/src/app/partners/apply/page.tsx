'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function PartnerApplicationPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [experience, setExperience] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Cargar ciudades listas para franquicia
    const fetchCities = async () => {
      const q = query(collection(db, 'cities'), where('readyForFranchise', '==', true));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setCities(list);
    };
    fetchCities();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert(t('partners_apply.login_required'));
      router.push('/login?redirect=/partners/apply');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'partner_applications'), {
        userId: user.uid,
        email: user.email,
        name,
        phone,
        cityId: selectedCity,
        experience,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      alert(t('partners_apply.error_submitting'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950" />;

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-purple-500/30 font-sans p-6">
      <div className="max-w-2xl mx-auto pt-12">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm font-bold uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" />
          {t('partners_apply.back')}
        </button>

        {isSuccess ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-green-500/30 rounded-3xl p-12 text-center shadow-2xl">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-black mb-4">{t('partners_apply.success_title')}</h1>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              {t('partners_apply.success_desc')}
            </p>
            <button onClick={() => router.push('/')} className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest text-sm rounded-xl hover:bg-slate-200 transition-colors">
              {t('partners_apply.back_to_home')}
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <h1 className="text-3xl font-black mb-2">{t('partners_apply.form_title')}</h1>
            <p className="text-slate-400 mb-8 text-sm">{t('partners_apply.form_desc')}</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('partners_apply.city_label')}</label>
                <select 
                  required
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all appearance-none"
                >
                  <option value="" disabled>{t('partners_apply.city_placeholder')}</option>
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>{c.name || c.id} ({t('partners_apply.city_active_opportunity')})</option>
                  ))}
                  <option value="other">{t('partners_apply.city_other')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('partners_apply.name_label')}</label>
                <input 
                  required
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('partners_apply.name_placeholder')}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('partners_apply.phone_label')}</label>
                <input 
                  required
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('partners_apply.phone_placeholder')}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('partners_apply.experience_label')}</label>
                <textarea 
                  required
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder={t('partners_apply.experience_placeholder')}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              <div className="pt-4">
                <button 
                  disabled={isSubmitting}
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold uppercase tracking-widest text-sm py-4 rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                >
                  {isSubmitting ? t('partners_apply.submit_loading') : (
                    <>{t('partners_apply.submit_btn')} <Send className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>

      {/* Floating WhatsApp Button */}
      <a 
        href={`https://wa.me/34600000000?text=${encodeURIComponent(t('partners_apply.whatsapp_message'))}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.4)] hover:scale-110 transition-transform flex items-center justify-center group"
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
        </svg>
        <span className="absolute right-full mr-4 bg-slate-900 text-white text-sm px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 shadow-xl">
          {t('partners_apply.whatsapp_tooltip')}
        </span>
      </a>
    </div>
  );
}
