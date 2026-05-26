'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

export default function SetupProfilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [nick, setNick] = useState('');
  const [edad, setEdad] = useState('');
  const [rol, setRol] = useState('versátil');
  const [intencion, setIntencion] = useState('conocer');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (profile && profile.edad !== null) {
      router.push('/');
    }
    
    if (profile) {
      setNick(profile.nick || '');
      setImagePreview(profile.fotoUrl || null);
    }
  }, [user, profile, loading, router]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nick || !edad || (!imageFile && !imagePreview)) {
      setError('Por favor, rellena todos los campos y sube una foto.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let fotoUrl = imagePreview;

      if (imageFile) {
        const storageRef = ref(storage, `profilePictures/${user.uid}.jpg`);
        await uploadBytes(storageRef, imageFile);
        fotoUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, 'users', user.uid), {
        nick,
        edad: parseInt(edad),
        rol,
        intencion,
        fotoUrl,
        updatedAt: new Date()
      });

      router.push('/');
    } catch (err) {
      console.error("Error updating profile", err);
      setError('Hubo un error al guardar tu perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6">
      <div className="w-full max-w-xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-white">Completa tu Perfil</h1>
          <p className="text-slate-400">Cuéntanos un poco sobre ti para empezar.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Foto de Perfil */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-32 h-32 group">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-dashed border-purple-500/50 group-hover:border-purple-500 transition-colors">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
                    <span className="text-4xl">📸</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="absolute bottom-0 right-0 bg-purple-600 p-2 rounded-full shadow-lg pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-slate-500">Haz clic para subir tu foto principal</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Nick / Apodo</label>
              <input
                type="text"
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                placeholder="Tu nombre en la app"
                className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Edad</label>
              <input
                type="number"
                value={edad}
                onChange={(e) => setEdad(e.target.value)}
                placeholder="18+"
                min="18"
                max="99"
                className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">¿Cuál es tu rol?</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
              >
                <option value="activo">Activo</option>
                <option value="pasivo">Pasivo</option>
                <option value="versátil">Versátil</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">¿Qué buscas hoy?</label>
              <select
                value={intencion}
                onChange={(e) => setIntencion(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
              >
                <option value="conocer">Conocer gente</option>
                <option value="quedar">Quedar ahora</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-xl transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
          >
            {isSubmitting ? 'Guardando...' : 'Comenzar a ligar'}
          </button>
        </form>
      </div>
    </div>
  );
}
