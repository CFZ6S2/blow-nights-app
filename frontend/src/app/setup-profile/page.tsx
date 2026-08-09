'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

export default function SetupProfilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [nick, setNick] = useState('');
  const [edad, setEdad] = useState('');
  const [rol, setRol] = useState('versátil');
  const [intencion, setIntencion] = useState('conocer');
  const [bio, setBio] = useState('');
  const [altura, setAltura] = useState(null);
  const [peso, setPeso] = useState(null);
  const [complexion, setComplexion] = useState(null);
  const [intereses, setIntereses] = useState([]);
  const [mood, setMood] = useState(null);
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [extraPhotosFiles, setExtraPhotosFiles] = useState([]);
  const [extraPhotosPreview, setExtraPhotosPreview] = useState([]);
  const [privatePhotosFiles, setPrivatePhotosFiles] = useState([]);
  const [privatePhotosPreview, setPrivatePhotosPreview] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (profile && profile.edad !== null && !profile.needsUpdate) {
      // Si el perfil ya está completo y no forzamos actualización, vamos al home
      router.push('/');
    }
    
    if (profile) {
      setNick(profile.nick || '');
      setEdad(profile.edad?.toString() || '');
      setRol(profile.rol || 'versátil');
      setIntencion(profile.intencion || 'conocer');
      setBio(profile.bio || '');
      setAltura(profile.altura || null);
      setPeso(profile.peso || null);
      setComplexion(profile.complexion || null);
      setIntereses(profile.intereses || []);
      setMood(profile.mood || null);
      setImagePreview(profile.fotoUrl || null);
      setExtraPhotosPreview(profile.extraPhotos || []);
      setPrivatePhotosPreview(profile.privatePhotos || []);
    }
  }, [user, profile, loading, router]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleExtraPhotosChange = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = [...extraPhotosFiles, ...files].slice(0, 5);
    setExtraPhotosFiles(newFiles);
    
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setExtraPhotosPreview(newPreviews);
  };
  
  const handlePrivatePhotosChange = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = [...privatePhotosFiles, ...files].slice(0, 5);
    setPrivatePhotosFiles(newFiles);
    
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPrivatePhotosPreview(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nick || !edad || (!imageFile && !imagePreview)) {
      setError('Por favor, rellena los datos básicos y sube una foto principal.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Subir foto principal
      let fotoUrl = imagePreview;
      if (imageFile) {
        const storageRef = ref(storage, `profilePictures/${user.uid}/main.jpg`);
        await uploadBytes(storageRef, imageFile);
        fotoUrl = await getDownloadURL(storageRef);
      }

      // 2. Subir fotos extra
      let extraPhotosUrls = extraPhotosPreview;
      if (extraPhotosFiles.length > 0) {
        const uploadPromises = extraPhotosFiles.map(async (file, index) => {
          const storageRef = ref(storage, `profilePictures/${user.uid}/extra-${Date.now()}-${index}.jpg`);
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
        });
        const newUrls = await Promise.all(uploadPromises);
        extraPhotosUrls = [...extraPhotosPreview.filter(url => !url.startsWith('blob:')), ...newUrls];
      }
      
      // 3. Subir fotos privadas
      let privatePhotosUrls = privatePhotosPreview;
      if (privatePhotosFiles.length > 0) {
        const uploadPromises = privatePhotosFiles.map(async (file, index) => {
          const storageRef = ref(storage, `profilePictures/${user.uid}/private-${Date.now()}-${index}.jpg`);
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
        });
        const newUrls = await Promise.all(uploadPromises);
        privatePhotosUrls = [...privatePhotosPreview.filter(url => !url.startsWith('blob:')), ...newUrls];
      }

      const isUserAdmin = user?.email === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'cesar.herrera.rojo@gmail.com');
      const isPremium = isUserAdmin || !!profile?.premium;


      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }

      await setDoc(doc(db, 'users', user.uid), {
        nick: nick || '',
        edad: parseInt(edad) || 0,
        rol: rol || 'versátil',
        intencion: intencion || 'conocer',
        bio: bio || '',
        altura: altura ? parseInt(altura.toString()) : null,
        peso: peso ? parseInt(peso.toString()) : null,
        complexion: complexion || null,
        intereses: intereses || [],
        mood: mood || null,
        fotoUrl: fotoUrl || null,
        extraPhotos: extraPhotosUrls || [],
        privatePhotos: privatePhotosUrls || [],
        updatedAt: new Date(),
        needsUpdate: false,
        isAdmin: isUserAdmin,
        premium: isPremium
      }, { merge: true });

      router.push('/');
    } catch (err) {
      console.error("Error updating profile", err);
      if (err.code === 'storage/unauthorized' || err.code === 'storage/retry-limit-exceeded') {
        setError('Error de permisos en las fotos. Por favor, asegúrate de que el almacenamiento está activado.');
      } else {
        setError('Hubo un error al guardar tu perfil. Revisa tu conexión o las fotos.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  const nextStep = () => {
    if (currentStep === 1 && (!nick || !edad || (!imageFile && !imagePreview))) {
      setError('Nick, edad y foto principal son obligatorios.');
      return;
    }
    setError('');
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 pb-24 selection:bg-fuchsia-500/30">
      <div className="w-full max-w-xl space-y-8">
        {/* Progress Bar */}
        <div className="flex gap-2">
          {[...Array(totalSteps)].map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: currentStep > i ? '100%' : '0%' }}
                className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500"
              />
            </div>
          ))}
        </div>

        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl space-y-10">
          <header className="text-center space-y-4">
            <div className="inline-block p-4 rounded-[1.5rem] bg-gradient-to-tr from-fuchsia-500 to-indigo-500 shadow-2xl mb-2">
              <span className="material-icons text-white text-3xl">
                {currentStep === 1 ? 'face' : currentStep === 2 ? 'info' : 'photo_library'}
              </span>
            </div>
            <div>
              <h1 className="text-4xl font-[1000] tracking-tighter text-white">
                {currentStep === 1 ? 'TU IDENTIDAD' : currentStep === 2 ? 'MÁS SOBRE TI' : 'TU GALERÍA'}
              </h1>
              <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] mt-2">
                Paso {currentStep} de {totalSteps}
              </p>
            </div>
          </header>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest p-4 rounded-2xl text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-8">
            {currentStep === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                {/* Foto Principal */}
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative w-40 h-40 group">
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-white/5 group-hover:border-fuchsia-500 transition-all duration-500 shadow-2xl">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-700">
                          <span className="material-icons text-5xl">add_a_photo</span>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="absolute bottom-2 right-2 bg-white text-black p-3 rounded-2xl shadow-2xl pointer-events-none group-hover:scale-110 transition-transform">
                      <span className="material-icons text-sm">edit</span>
                    </div>
                  </div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Toca para subir tu foto principal</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Tu Apodo</label>
                    <input
                      type="text"
                      value={nick}
                      onChange={(e) => setNick(e.target.value)}
                      placeholder="Ej: Marc"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Edad</label>
                    <input
                      type="number"
                      value={edad}
                      onChange={(e) => setEdad(e.target.value)}
                      placeholder="25"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Tu Rol</label>
                    <select
                      value={rol}
                      onChange={(e) => setRol(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none appearance-none"
                    >
                      <option value="activo">Activo</option>
                      <option value="pasivo">Pasivo</option>
                      <option value="versátil">Versátil</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Intención</label>
                    <select
                      value={intencion}
                      onChange={(e) => setIntencion(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none appearance-none"
                    >
                      <option value="conocer">Conocer</option>
                      <option value="quedar">Quedar</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">¿Cómo te sientes hoy? (Mood)</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { emoji: '🔥', label: 'Hot' },
                      { emoji: '🍕', label: 'Hambre' },
                      { emoji: '😴', label: 'Cansado' },
                      { emoji: '🎮', label: 'Gaming' },
                      { emoji: '💪', label: 'Gym' },
                      { emoji: '🎥', label: 'Cine' },
                      { emoji: '🍺', label: 'Cañas' },
                      { emoji: '🎒', label: 'Viaje' },
                      { emoji: '🏠', label: 'Chill' },
                      { emoji: '💬', label: 'Chat' }
                    ].map((m) => (
                      <button
                        key={m.label}
                        type="button"
                        onClick={() => setMood(m.emoji)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all ${
                          mood === m.emoji 
                          ? 'bg-fuchsia-600 border-fuchsia-500 shadow-lg' 
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="text-xl">{m.emoji}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/60">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Intereses / Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {['Plan Tranquilo', 'Fiesta', 'Gimnasio', 'Cine', 'Gaming', 'Viajes', 'Música', 'Gastronomía', 'Solo Chat', 'Quedada Real'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (intereses.includes(tag)) {
                            setIntereses(intereses.filter(i => i !== tag));
                          } else if (intereses.length < 5) {
                            setIntereses([...intereses, tag]);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                          intereses.includes(tag) 
                          ? 'bg-fuchsia-600 border-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20' 
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <p className="text-[8px] text-slate-600 uppercase tracking-widest ml-2">Elige hasta 5 tags</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Sobre ti</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Algo corto y directo..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 text-white font-bold outline-none resize-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Altura</label>
                    <input type="number" value={altura || ''} onChange={(e) => setAltura(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-center font-bold" placeholder="180" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Peso</label>
                    <input type="number" value={peso || ''} onChange={(e) => setPeso(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-center font-bold" placeholder="75" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Cuerpo</label>
                    <select value={complexion || ''} onChange={(e) => setComplexion(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold text-xs appearance-none">
                      <option value="">--</option>
                      <option value="delgado">Delgado</option>
                      <option value="normal">Normal</option>
                      <option value="musculado">Fuerte</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Galería Pública</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {extraPhotosPreview.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/5 shadow-xl">
                        <img src={url} alt={`Extra ${idx}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {extraPhotosPreview.length < 5 && (
                      <div className="relative aspect-square rounded-[1.5rem] overflow-hidden bg-white/5 border-2 border-dashed border-white/10 hover:border-fuchsia-500/50 transition-all flex items-center justify-center cursor-pointer">
                        <span className="material-icons text-slate-600">add</span>
                        <input type="file" accept="image/*" multiple onChange={handleExtraPhotosChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                    <span className="material-icons text-xs">lock</span> Álbum Privado
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {privatePhotosPreview.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/5 shadow-xl">
                        <img src={url} alt={`Privada ${idx}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {privatePhotosPreview.length < 5 && (
                      <div className="relative aspect-square rounded-[1.5rem] overflow-hidden bg-white/5 border-2 border-dashed border-yellow-500/20 hover:border-yellow-500/50 transition-all flex items-center justify-center cursor-pointer">
                        <span className="material-icons text-slate-600">lock_outline</span>
                        <input type="file" accept="image/*" multiple onChange={handlePrivatePhotosChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-6 rounded-[2rem] text-xs uppercase tracking-widest transition-all border border-white/10"
              >
                Atrás
              </button>
            )}
            
            {currentStep < totalSteps ? (
              <button
                onClick={nextStep}
                className="flex-[2] bg-white text-black font-black py-6 rounded-[2rem] text-xs uppercase tracking-[0.3em] hover:bg-slate-200 transition-all shadow-2xl active:scale-95"
              >
                Continuar
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex-[2] bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-black py-6 rounded-[2rem] text-xs uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(192,38,211,0.3)] transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}`}
              >
                {isSubmitting ? 'Guardando...' : 'Finalizar Perfil'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[9px] text-slate-600 uppercase tracking-[0.2em]">
          Tus datos están protegidos por cifrado de grado bancario. <br />
          Al continuar, aceptas nuestras <Link href="/rules" className="underline text-slate-500">Normas de la Comunidad</Link>.
        </p>
      </div>
    </div>
  );
}
