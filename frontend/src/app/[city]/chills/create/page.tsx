'use client';

import React, { useState, useEffect } from 'react';
import { useCityRouter } from '@/hooks/useCityRouter';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChillType } from '@/types';
import { MapPin, Users, Ticket, CheckCircle2, AlertCircle, Sparkles, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function CreateChillPage() {
  const { user, profile } = useAuth();
  const { isReady } = useRequireAuth();
  const { cityPath, router } = useCityRouter();
  const { t } = useTranslation();

  const [type, setType] = useState<ChillType>('social');
  const [title, setTitle] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('10');
  const [exactAddress, setExactAddress] = useState('');
  const [price, setPrice] = useState('20');
  const [instructions, setInstructions] = useState('');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (isReady && !user) {
      router.push(cityPath());
    }
  }, [isReady, user, router, cityPath]);

  // Jitter algorithm: offset by roughly 0-500 meters
  const applyJitter = (lat: number, lng: number) => {
    const jitterLat = (Math.random() - 0.5) * 0.009;
    const jitterLng = (Math.random() - 0.5) * 0.009;
    return {
      lat: lat + jitterLat,
      lng: lng + jitterLng
    };
  };

  const handleGetLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => {
          setError(t('chills.create.location_error', 'No se pudo obtener la ubicación. Habilita el GPS.'));
        }
      );
    }
  };

  const handleBuyDummyCredits = async () => {
    if (!user) return;
    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', user.uid), {
        qrCredits: increment(20)
      });
      // the profile context will update automatically
    } catch (err: any) {
      setError('Error al comprar créditos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!userLocation) {
      setError(t('chills.create.needs_location', 'Debes permitir el acceso a tu ubicación para crear un evento.'));
      return;
    }
    if (!title || !exactAddress || !maxCapacity) {
      setError(t('chills.create.missing_fields', 'Por favor, rellena todos los campos obligatorios.'));
      return;
    }
    
    if (!disclaimerAccepted) {
      setError('Debes aceptar las Condiciones de Uso y el Descargo de Responsabilidad para crear el evento.');
      return;
    }

    if (type === 'commercial' && (!profile?.qrCredits || profile.qrCredits <= 0)) {
      setError('No tienes Créditos QR para gestionar la puerta. Compra un pack primero.');
      return;
    }

    setLoading(true);

    try {
      const fuzzyLocation = applyJitter(userLocation.lat, userLocation.lng);
      
      // Calculate TTL (8 hours from now)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);

      const chillData = {
        host_uid: user?.uid || '',
        host_nick: profile?.nick || '',
        host_foto: profile?.fotoUrl || '',
        city_slug: profile?.cityId || 'madrid',
        title,
        type,
        priceCents: type === 'commercial' ? parseInt(price) * 100 : 0,
        approx_lat: fuzzyLocation.lat,
        approx_lng: fuzzyLocation.lng,
        exact_address: exactAddress,
        instructions,
        max_capacity: parseInt(maxCapacity),
        accepted_users: [],
        pending_users: [],
        denied_users: [],
        status: 'active',
        created_at: serverTimestamp(),
        starts_at: serverTimestamp(),
        expires_at: expiresAt,
      };

      const docRef = await addDoc(collection(db, 'chills'), chillData);
      
      // Redirect to host dashboard
      router.push(cityPath(`/chills/manage?id=${docRef.id}`));
    } catch (err: any) {
      console.error("Error creating chill:", err);
      setError(err.message || 'Error al crear el evento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 pt-8 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-fuchsia-500 to-amber-500 bg-clip-text text-transparent text-center">
          ¿Qué tipo de reunión vas a organizar?
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Toggle Type Refined */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setType('social')}
              className={`p-4 rounded-2xl border-2 transition-all flex items-start gap-4 text-left ${
                type === 'social' 
                  ? 'border-fuchsia-500 bg-fuchsia-500/10' 
                  : 'border-gray-800 bg-gray-900 hover:border-gray-700'
              }`}
            >
              <div className={`p-3 rounded-full ${type === 'social' ? 'bg-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)]' : 'bg-gray-800 text-gray-400'}`}>
                <Users size={24} />
              </div>
              <div>
                <h3 className={`font-bold text-lg ${type === 'social' ? 'text-fuchsia-400' : 'text-white'}`}>
                  🟣 Chill Social (0€)
                </h3>
                <p className="text-xs text-gray-400 mt-1">Reunión 100% gratuita para amigos y conocidos. Admisión manual, sin venta de entradas.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setType('commercial')}
              className={`p-4 rounded-2xl border-2 transition-all flex items-start gap-4 text-left ${
                type === 'commercial' 
                  ? 'border-amber-500 bg-amber-500/10' 
                  : 'border-gray-800 bg-gray-900 hover:border-gray-700'
              }`}
            >
              <div className={`p-3 rounded-full ${type === 'commercial' ? 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-gray-800 text-gray-400'}`}>
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className={`font-bold text-lg ${type === 'commercial' ? 'text-amber-400' : 'text-white'}`}>
                  🟡 After Privado / Cover
                </h3>
                <p className="text-xs text-gray-400 mt-1">Fiesta en villa o piso grande. Fija el precio de la entrada y gestiona el aforo con escáner QR.</p>
              </div>
            </button>
          </div>

          {/* Dummy QR Pack Topup (Commercial Only) */}
          {type === 'commercial' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-200 font-bold">Saldo SaaS QRs</p>
                <p className="text-2xl font-black text-amber-500">{profile?.qrCredits || 0} <span className="text-sm font-medium text-amber-500/70">QRs disp.</span></p>
              </div>
              <button 
                type="button"
                onClick={handleBuyDummyCredits}
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)] transition"
              >
                <CreditCard size={16} /> + 20 QRs (10€)
              </button>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                {t('chills.create.name_label', 'Título del Evento')}
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t('chills.create.name_placeholder', 'Ej. After Chill en Retiro')}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-fuchsia-500 outline-none"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-1">
                  <Users size={16} />
                  {t('chills.create.capacity', 'Aforo Máx.')}
                </label>
                <input
                  type="number"
                  value={maxCapacity}
                  onChange={e => setMaxCapacity(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-fuchsia-500 outline-none"
                />
              </div>

              {type === 'commercial' && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-amber-500 mb-1 flex items-center gap-1">
                    <Ticket size={16} />
                    {t('chills.create.price', 'Cover (€)')}
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full bg-gray-900 border border-amber-500/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-800">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t('chills.create.location_section', 'Ubicación y Privacidad')}
              </label>
              
              {!userLocation ? (
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <MapPin size={18} />
                  {t('chills.create.get_location', 'Usar mi ubicación actual')}
                </button>
              ) : (
                <div className="w-full py-3 bg-green-500/10 text-green-400 rounded-xl flex items-center justify-center gap-2 border border-green-500/20">
                  <CheckCircle2 size={18} />
                  {t('chills.create.location_ok', 'Ubicación capturada (con ofuscación)')}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {t('chills.create.privacy_note', 'En el mapa solo se mostrará un área aproximada de 500m. La dirección exacta solo se revelará a quienes tú aceptes.')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                {t('chills.create.exact_address', 'Dirección Exacta (Privada)')}
              </label>
              <input
                type="text"
                value={exactAddress}
                onChange={e => setExactAddress(e.target.value)}
                placeholder={t('chills.create.address_placeholder', 'Ej. Calle Goya 45, 2º B')}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-fuchsia-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                {t('chills.create.instructions', 'Instrucciones Privadas para la puerta')}
              </label>
              <input
                type="text"
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder={t('chills.create.inst_placeholder', 'Ej. Toca el timbre 2B y pregunta por Alex')}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-fuchsia-500 outline-none"
              />
            </div>

          </div>
          
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl mt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={disclaimerAccepted}
                onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-700 bg-gray-800 text-fuchsia-500 focus:ring-fuchsia-500/50"
              />
              <span className="text-xs text-gray-400 leading-relaxed">
                <strong className="text-white">Acepto las Condiciones de Uso:</strong> Declaro que soy el único responsable de la organización, seguridad y admisión de mi reunión privada. Reconozco que Blow Nights es un mero proveedor técnico de control de accesos y no responde por cancelaciones, transacciones entre particulares ni incidencias en recintos privados.
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl flex items-start gap-2">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all mt-4 ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02]'
            } ${
              type === 'commercial' 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] text-gray-950' 
                : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 shadow-[0_0_20px_rgba(217,70,239,0.3)]'
            }`}
          >
            {loading ? t('common.loading', 'Cargando...') : type === 'commercial' ? 'Abrir Puertas (Comercial)' : 'Crear Chill Social'}
          </button>
        </form>
      </div>
    </div>
  );
}
