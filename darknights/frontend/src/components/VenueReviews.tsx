'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface Review {
  id: string;
  userId: string;
  userNick: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  createdAt: any;
}

interface VenueReviewsProps {
  venueId: string;
  venueName: string;
}

export default function VenueReviews({ venueId, venueName }: VenueReviewsProps) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    if (!venueId) return;

    const q = query(
      collection(db, 'reviews'),
      where('venueId', '==', venueId),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      setReviews(list);
      setLoading(false);

      if (user) {
        setHasReviewed(list.some(r => r.userId === user.uid));
      }
    }, () => setLoading(false));

    return unsub;
  }, [venueId, user]);

  const avgRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  const handleSubmit = async () => {
    if (!user || !profile || rating === 0 || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        venueId,
        userId: user.uid,
        userNick: profile.nick || 'Anon',
        userPhoto: profile.fotoUrl || null,
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      });
      setComment('');
      setRating(0);
      setShowForm(false);
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const StarRow = ({ value, interactive = false }: { value: number; interactive?: boolean }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && setRating(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={`transition-transform ${interactive ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}
        >
          <span className={`material-icons text-lg ${
            star <= (interactive ? (hoverRating || value) : value)
              ? 'text-yellow-400'
              : 'text-slate-700'
          }`}>
            {star <= (interactive ? (hoverRating || value) : Math.round(value)) ? 'star' : 'star_border'}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
          {t('reviews.title')}
        </h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRow value={avgRating} />
            <span className="text-xs font-black text-yellow-400">{avgRating.toFixed(1)}</span>
            <span className="text-[10px] text-slate-600">({reviews.length})</span>
          </div>
        )}
      </div>

      {user && !hasReviewed && (
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-slate-400 hover:text-white hover:border-fuchsia-500/30 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-icons text-sm">rate_review</span>
          {t('reviews.write_review')}
        </button>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4 overflow-hidden"
          >
            <div className="text-center space-y-2">
              <p className="text-xs font-bold text-slate-400">{t('reviews.rate_venue', { name: venueName })}</p>
              <div className="flex justify-center">
                <StarRow value={rating} interactive />
              </div>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('reviews.comment_placeholder')}
              maxLength={500}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-fuchsia-500/50 resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all"
              >
                {t('reviews.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || submitting}
                className="flex-1 py-3 bg-fuchsia-600 rounded-xl text-xs font-black text-white uppercase tracking-wider hover:bg-fuchsia-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? t('reviews.sending') : t('reviews.submit')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white/5 rounded-2xl p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-icons text-3xl text-slate-700">reviews</span>
          <p className="text-xs text-slate-600 mt-2">{t('reviews.no_reviews')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/5 border border-white/[0.06] rounded-2xl p-4 space-y-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 flex-shrink-0">
                  {r.userPhoto ? (
                    <img src={r.userPhoto} alt={r.userNick} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-bold">
                      {r.userNick?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate">{r.userNick}</span>
                    <StarRow value={r.rating} />
                  </div>
                  {r.createdAt && (
                    <span className="text-[9px] text-slate-600">
                      {new Date(r.createdAt.seconds ? r.createdAt.seconds * 1000 : r.createdAt).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>
              </div>
              {r.comment && (
                <p className="text-xs text-slate-400 leading-relaxed">{r.comment}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
