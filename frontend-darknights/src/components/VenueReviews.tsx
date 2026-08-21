'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Star, MessageSquare, Send, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface Review {
  id: string;
  userId: string;
  userNick: string;
  userFoto?: string;
  rating: number;
  comment: string;
  createdAt: any;
}

interface VenueReviewsProps {
  venueId: string;
  venueName: string;
}

export default function DarkNightsVenueReviews({ venueId, venueName }: VenueReviewsProps) {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const q = query(
          collection(db, 'venues', venueId, 'reviews'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        setReviews(list);
      } catch (err) {
        console.error("Error cargando reseñas:", err);
      }
    };

    if (venueId) fetchReviews();
  }, [venueId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Debes iniciar sesión para dejar una opinión.');
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      const newReview = {
        userId: user.uid,
        userNick: profile?.nick || 'Usuario',
        userFoto: profile?.fotoUrl || '',
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'venues', venueId, 'reviews'), newReview);
      setReviews(prev => [{ id: docRef.id, ...newReview, createdAt: new Date() }, ...prev]);
      setComment('');
    } catch (err) {
      console.error("Error guardando reseña:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '4.9';

  return (
    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 space-y-8 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-red-500" />
            Opiniones & Reseñas
          </h3>
          <p className="text-slate-400 text-xs mt-1">Experiencias reales de la comunidad en {venueName}</p>
        </div>

        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5 self-start sm:self-auto">
          <span className="text-3xl font-black text-white">{avgRating}</span>
          <div className="flex flex-col">
            <div className="flex gap-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`w-4 h-4 ${star <= Math.round(Number(avgRating)) ? 'fill-current' : 'opacity-30'}`} />
              ))}
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{reviews.length} opiniones</span>
          </div>
        </div>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="bg-slate-950/80 p-6 rounded-2xl border border-white/5 space-y-4">
          <h4 className="text-sm font-black text-white uppercase tracking-wider">Deja tu opinión</h4>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium mr-2">Tu valoración:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-125 focus:outline-none"
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'text-amber-400 fill-current'
                      : 'text-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="relative">
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Qué tal el ambiente, la música y las copas? Cuenta tu experiencia..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !comment.trim()}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Publicando...' : 'Publicar Reseña'}
          </button>
        </form>
      ) : (
        <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 text-center text-xs text-slate-400">
          Inicia sesión en la app para compartir tu opinión sobre este local.
        </div>
      )}

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-center py-6 text-slate-500 text-xs font-medium">Sé el primero en dejar una reseña sobre este local.</p>
        ) : (
          reviews.map((rev) => (
            <motion.div
              key={rev.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 space-y-2"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-xs font-black text-red-400 uppercase">
                    {rev.userNick?.[0] || 'U'}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1">
                      {rev.userNick} <UserCheck className="w-3 h-3 text-emerald-400" />
                    </h5>
                    <div className="flex gap-0.5 text-amber-400 mt-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`w-3 h-3 ${star <= rev.rating ? 'fill-current' : 'opacity-20'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed pt-1">{rev.comment}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
